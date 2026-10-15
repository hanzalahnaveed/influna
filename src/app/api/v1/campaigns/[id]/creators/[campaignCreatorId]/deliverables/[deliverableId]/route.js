import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

function jsonError(message, status) {
    return NextResponse.json({ error: message }, { status });
}

export async function PATCH(request, context) {
    const { id: campaignId, campaignCreatorId, deliverableId } = await context.params;
    let body;
    try {
        body = await request.json();
    } catch {
        return jsonError("Request body must be valid JSON.", 400);
    }
    const action = body?.action;
    if (!["submit", "request_changes", "approve"].includes(action)) {
        return jsonError("action must be submit, request_changes, or approve.", 400);
    }
    const isCreator = action === "submit";
    const auth = await requireRole(isCreator ? "CREATOR" : "BRAND");
    if (auth.response) return auth.response;

    for (const key of ["content_url", "creator_note", "review_note"]) {
        if (body[key] !== undefined && body[key] !== null && typeof body[key] !== "string") {
            return jsonError(`${key} must be a string.`, 400);
        }
    }
    if ((body.creator_note?.length ?? 0) > 2000 || (body.review_note?.length ?? 0) > 2000) {
        return jsonError("Notes must be 2,000 characters or fewer.", 400);
    }
    if (isCreator) {
        if (typeof body.content_url !== "string" || !body.content_url.trim()) {
            return jsonError("content_url is required when submitting work.", 400);
        }
        if (body.content_url.trim().length > 2048) return jsonError("content_url must be 2,048 characters or fewer.", 400);
        try {
            const url = new URL(body.content_url.trim());
            if (!["http:", "https:"].includes(url.protocol)) throw new Error("Unsupported protocol");
        } catch {
            return jsonError("content_url must be a valid HTTP or HTTPS URL.", 400);
        }
    }
    if (action === "request_changes" && !body.review_note?.trim()) {
        return jsonError("review_note is required when requesting revisions.", 400);
    }

    try {
        const deliverable = await prisma.campaignDeliverable.findFirst({
            where: {
                id: deliverableId,
                campaignCreatorId,
                campaignCreator: {
                    campaignId,
                    ...(isCreator
                        ? { creator: { ownerUserId: auth.user.id } }
                        : { campaign: { ownerUserId: auth.user.id } }),
                },
            },
            include: { submissions: { orderBy: { version: "desc" }, take: 1 } },
        });
        if (!deliverable) return jsonError("Deliverable not found.", 404);
        if (["Cancelled", "Completed", "Declined"].includes(deliverable.campaignCreator.status)) {
            return jsonError("This collaboration is no longer active.", 409);
        }
        if (isCreator && deliverable.campaignCreator.status !== "Accepted") {
            return jsonError("The creator must accept the collaboration before submitting deliverables.", 409);
        }

        const latest = deliverable.submissions[0];
        const now = new Date();
        if (action === "submit") {
            if (!["Pending", "ChangesRequested"].includes(deliverable.status)) {
                return jsonError("This deliverable is not accepting a submission right now.", 409);
            }
            const submission = await prisma.$transaction(async (tx) => {
                // Claim the pending/revision state before creating a version. Concurrent
                // submissions then cannot create the same version or overwrite each other.
                const claimed = await tx.campaignDeliverable.updateMany({
                    where: {
                        id: deliverable.id,
                        status: { in: ["Pending", "ChangesRequested"] },
                    },
                    data: { status: "Submitted" },
                });
                if (claimed.count !== 1) throw new Error("DELIVERABLE_STATE_CONFLICT");
                return tx.deliverableSubmission.create({
                    data: {
                        deliverableId: deliverable.id,
                        version: (latest?.version ?? 0) + 1,
                        contentUrl: body.content_url.trim(),
                        creatorNote: body.creator_note?.trim() || null,
                        status: "Submitted",
                        submittedAt: now,
                    },
                });
            });
            return NextResponse.json({
                deliverable_id: deliverable.id,
                status: "Submitted",
                submission: {
                    id: submission.id,
                    version: submission.version,
                    content_url: submission.contentUrl,
                    creator_note: submission.creatorNote,
                    status: submission.status,
                    submitted_at: submission.submittedAt.toISOString(),
                },
            }, { status: 201 });
        }

        if (deliverable.status !== "Submitted" || !latest || latest.status !== "Submitted") {
            return jsonError("Only the latest pending submission can be reviewed.", 409);
        }
        const nextStatus = action === "approve" ? "Approved" : "ChangesRequested";
        const updated = await prisma.$transaction(async (tx) => {
            // Only one reviewer can claim the submitted state. This prevents an
            // approval and a revision request from racing and overwriting each other.
            const claimed = await tx.campaignDeliverable.updateMany({
                where: { id: deliverable.id, status: "Submitted" },
                data: { status: nextStatus },
            });
            if (claimed.count !== 1) throw new Error("DELIVERABLE_STATE_CONFLICT");
            const submissionUpdate = await tx.deliverableSubmission.updateMany({
                where: { id: latest.id, status: "Submitted" },
                data: {
                    status: nextStatus,
                    reviewNote: body.review_note?.trim() || null,
                    reviewedAt: now,
                },
            });
            if (submissionUpdate.count !== 1) throw new Error("SUBMISSION_STATE_CONFLICT");
            return tx.deliverableSubmission.findUnique({ where: { id: latest.id } });
        });

        // Reconcile collaboration completion after the deliverable transaction commits.
        // Checking outside that transaction avoids two final approvals each seeing the
        // other's uncommitted deliverable and leaving the collaboration stuck as Accepted.
        let collaborationStatus = deliverable.campaignCreator.status;
        if (action === "approve") {
            const remaining = await prisma.campaignDeliverable.count({
                where: { campaignCreatorId, status: { not: "Approved" } },
            });
            if (remaining === 0) {
                await prisma.campaignCreator.updateMany({
                    where: { id: campaignCreatorId, status: "Accepted" },
                    data: {
                        status: "Approved",
                        reviewNote: body.review_note?.trim() || null,
                        reviewedAt: now,
                    },
                });
            }
            const collaboration = await prisma.campaignCreator.findUnique({
                where: { id: campaignCreatorId },
                select: { status: true },
            });
            collaborationStatus = collaboration?.status ?? collaborationStatus;
        }
        return NextResponse.json({
            deliverable_id: deliverable.id,
            status: nextStatus,
            collaboration_status: collaborationStatus,
            submission: {
                id: updated.id,
                version: updated.version,
                content_url: updated.contentUrl,
                creator_note: updated.creatorNote,
                status: updated.status,
                submitted_at: updated.submittedAt.toISOString(),
                review_note: updated.reviewNote,
                reviewed_at: updated.reviewedAt?.toISOString() ?? null,
            },
        });
    } catch (error) {
        if (["DELIVERABLE_STATE_CONFLICT", "SUBMISSION_STATE_CONFLICT"].includes(error?.message)) {
            return jsonError("This deliverable changed while the request was being processed. Refresh and try again.", 409);
        }
        console.error("Failed to update deliverable:", error);
        return jsonError("Unable to update deliverable.", 500);
    }
}
