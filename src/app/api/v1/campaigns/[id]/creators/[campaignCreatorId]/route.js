import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { campaignCreatorTransitions as transitions } from "@/lib/campaign-workflow.mjs";
import { createNotification } from "@/lib/notifications";

function jsonError(message, status) {
    return NextResponse.json({ error: message }, { status });
}



export async function PATCH(request, context) {
    const { id: campaignId, campaignCreatorId } = await context.params;
    let body;
    try {
        body = await request.json();
    } catch {
        return jsonError("Request body must be valid JSON.", 400);
    }

    if (!body || typeof body.action !== "string" || !transitions[body.action]) {
        return jsonError("Unsupported workflow action.", 400);
    }
    for (const key of ["content_url", "content_note", "review_note"]) {
        if (body[key] !== undefined && body[key] !== null && typeof body[key] !== "string") {
            return jsonError(`${key} must be a string.`, 400);
        }
    }
    if (body.content_url !== undefined && body.content_url !== null) {
        if (body.content_url.trim().length > 2048) {
            return jsonError("content_url must be 2,048 characters or fewer.", 400);
        }
        if (body.content_url.trim()) {
            try {
                const url = new URL(body.content_url.trim());
                if (!["http:", "https:"].includes(url.protocol)) throw new Error("Invalid protocol");
            } catch {
                return jsonError("content_url must be a valid HTTP or HTTPS URL.", 400);
            }
        }
    }
    if (body.content_note?.length > 2000 || body.review_note?.length > 2000) {
        return jsonError("Notes must be 2,000 characters or fewer.", 400);
    }

    const isCreatorResponse = ["accept", "decline", "submit_content", "withdraw_application"].includes(body.action);
    const auth = await requireRole(isCreatorResponse ? "CREATOR" : "BRAND");
    if (auth.response) return auth.response;

    const transition = transitions[body.action];
    try {
        const link = await prisma.campaignCreator.findFirst({
            where: {
                id: campaignCreatorId,
                campaignId,
                ...(isCreatorResponse
                    ? { creator: { ownerUserId: auth.user.id } }
                    : { campaign: { ownerUserId: auth.user.id } }),
            },
            select: { id: true, status: true, creator: { select: { ownerUserId: true, displayName: true } }, campaign: { select: { ownerUserId: true, campaignDetails: true } } },
        });
        if (!link) return jsonError("Campaign creator record not found.", 404);
        if (["submit_content", "request_changes", "approve_content"].includes(body.action)) {
            const deliverableCount = await prisma.campaignDeliverable.count({
                where: { campaignCreatorId: link.id },
            });
            if (deliverableCount > 0) {
                return jsonError("This collaboration uses deliverable-level review. Manage submissions in the Deliverables & revisions workflow.", 409);
            }
        }
        if (!transition.from.includes(link.status)) {
            return jsonError(`Cannot perform "${body.action}" while status is "${link.status}".`, 409);
        }

        // Do not cancel a collaboration after approved work or a shipment has
        // reached the creator. Those records represent operational commitments
        // that should not be silently invalidated by a status change.
        if (body.action === "cancel") {
            const [approvedDeliverables, shipment] = await Promise.all([
                prisma.campaignDeliverable.count({
                    where: { campaignCreatorId: link.id, status: "Approved" },
                }),
                prisma.campaignShipment.findUnique({
                    where: { campaignCreatorId: link.id },
                    select: { status: true },
                }),
            ]);
            if (approvedDeliverables > 0) {
                return jsonError("A collaboration with approved deliverables cannot be cancelled. Resolve the collaboration explicitly instead.", 409);
            }
            if (shipment && ["Delivered", "Received"].includes(shipment.status)) {
                return jsonError("A collaboration cannot be cancelled after its shipment has been delivered. Resolve the shipment first.", 409);
            }
        }

        // Completion is the final brand-side transition. If deliverables were
        // defined, every one must be approved before the collaboration closes.
        if (body.action === "complete") {
            const [deliverableCount, unapprovedCount, shipment] = await Promise.all([
                prisma.campaignDeliverable.count({ where: { campaignCreatorId: link.id } }),
                prisma.campaignDeliverable.count({
                    where: { campaignCreatorId: link.id, status: { not: "Approved" } },
                }),
                prisma.campaignShipment.findUnique({
                    where: { campaignCreatorId: link.id },
                    select: { status: true },
                }),
            ]);
            if (deliverableCount > 0 && unapprovedCount > 0) {
                return jsonError("All collaboration deliverables must be approved before completion.", 409);
            }
            if (shipment && shipment.status !== "Received") {
                return jsonError("Confirm receipt of the product shipment before completing this collaboration.", 409);
            }
        }

        if (body.action === "submit_content" && !body.content_url?.trim()) {
            return jsonError("Provide content_url when submitting content.", 400);
        }
        if (body.action === "request_changes" && !body.review_note?.trim()) {
            return jsonError("Provide review_note describing the requested changes.", 400);
        }

        const now = new Date();
        const data = { status: transition.to };
        if (body.action === "invite") data.invitedAt = now;
        if (["accept", "accept_application"].includes(body.action)) data.acceptedAt = now;
        if (["decline", "decline_application"].includes(body.action)) data.declinedAt = now;
        if (body.action === "submit_content") {
            data.contentUrl = body.content_url.trim();
            data.contentNote = body.content_note?.trim() || null;
            data.contentSubmittedAt = now;
            data.reviewNote = null;
            data.reviewedAt = null;
        }
        if (body.action === "request_changes") {
            data.reviewNote = body.review_note.trim();
            data.reviewedAt = now;
        }
        if (body.action === "approve_content") {
            data.reviewNote = body.review_note?.trim() || null;
            data.reviewedAt = now;
        }
        if (body.action === "complete") data.completedAt = now;

        // Apply the transition only if the status is still one of the allowed source states.
        // This prevents concurrent requests from overwriting a newer workflow decision.
        const changed = await prisma.campaignCreator.updateMany({
            where: { id: link.id, status: { in: transition.from } },
            data,
        });
        if (changed.count !== 1) {
            const current = await prisma.campaignCreator.findUnique({
                where: { id: link.id },
                select: { status: true },
            });
            return jsonError(
                `Cannot perform "${body.action}" while status is "${current?.status ?? "unknown"}".`,
                409,
            );
        }
        const updated = await prisma.campaignCreator.findUnique({
            where: { id: link.id },
        });
        if (!updated) return jsonError("Campaign creator record not found.", 404);

        const campaignTitle = link.campaign.campaignDetails?.campaign_title || "Untitled campaign";
        const creatorName = link.creator.displayName || "The creator";
        const eventByAction = {
            invite: { userId: link.creator.ownerUserId, type: "campaign_invitation", title: "New campaign invitation", message: "You have been invited to “" + campaignTitle + "”.", href: "/dashboard/creator-invitations" },
            accept: { userId: link.campaign.ownerUserId, type: "campaign_response", title: "Invitation accepted", message: creatorName + " accepted the invitation to “" + campaignTitle + "”.", href: "/dashboard/campaign-workflow" },
            decline: { userId: link.campaign.ownerUserId, type: "campaign_response", title: "Invitation declined", message: creatorName + " declined the invitation to “" + campaignTitle + "”.", href: "/dashboard/campaign-workflow" },
            accept_application: { userId: link.creator.ownerUserId, type: "campaign_response", title: "Application accepted", message: "Your application to “" + campaignTitle + "” was accepted.", href: "/dashboard/creator-invitations" },
            decline_application: { userId: link.creator.ownerUserId, type: "campaign_response", title: "Application update", message: "Your application to “" + campaignTitle + "” was declined.", href: "/dashboard/creator-invitations" },
            withdraw_application: { userId: link.campaign.ownerUserId, type: "campaign_response", title: "Application withdrawn", message: creatorName + " withdrew their application to “" + campaignTitle + "”.", href: "/dashboard/campaign-workflow" },
            submit_content: { userId: link.campaign.ownerUserId, type: "content_submission", title: "Content submitted", message: creatorName + " submitted content for “" + campaignTitle + "”.", href: "/dashboard/deliverables" },
            request_changes: { userId: link.creator.ownerUserId, type: "content_review", title: "Changes requested", message: "The brand requested changes for “" + campaignTitle + "”.", href: "/dashboard/deliverables" },
            approve_content: { userId: link.creator.ownerUserId, type: "content_review", title: "Content approved", message: "Your content for “" + campaignTitle + "” was approved.", href: "/dashboard/deliverables" },
            complete: { userId: link.creator.ownerUserId, type: "collaboration_completed", title: "Collaboration completed", message: "The collaboration for “" + campaignTitle + "” has been marked complete.", href: "/dashboard/creator-invitations" },
            cancel: { userId: link.creator.ownerUserId, type: "collaboration_cancelled", title: "Collaboration cancelled", message: "The collaboration for “" + campaignTitle + "” was cancelled.", href: "/dashboard/creator-invitations" },
        };
        if (eventByAction[body.action]) await createNotification(eventByAction[body.action]);

        return NextResponse.json({
            campaign_creator_id: updated.id,
            campaign_id: updated.campaignId,
            creator_id: updated.creatorId,
            status: updated.status,
            invited_at: updated.invitedAt?.toISOString() ?? null,
            accepted_at: updated.acceptedAt?.toISOString() ?? null,
            declined_at: updated.declinedAt?.toISOString() ?? null,
            content_url: updated.contentUrl,
            content_note: updated.contentNote,
            content_submitted_at: updated.contentSubmittedAt?.toISOString() ?? null,
            review_note: updated.reviewNote,
            reviewed_at: updated.reviewedAt?.toISOString() ?? null,
            completed_at: updated.completedAt?.toISOString() ?? null,
            updated_at: updated.updatedAt.toISOString(),
        });
    } catch (error) {
        console.error("Failed to update campaign creator workflow:", error);
        return jsonError("Unable to update campaign workflow.", 500);
    }
}
