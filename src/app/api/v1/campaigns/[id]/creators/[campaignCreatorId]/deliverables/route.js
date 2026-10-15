import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

function jsonError(message, status) {
    return NextResponse.json({ error: message }, { status });
}

async function findOwnedLink(campaignId, campaignCreatorId, user) {
    return prisma.campaignCreator.findFirst({
        where: {
            id: campaignCreatorId,
            campaignId,
            ...(user.role === "BRAND"
                ? { campaign: { ownerUserId: user.id } }
                : { creator: { ownerUserId: user.id } }),
        },
        select: { id: true, campaignId: true, creatorId: true, status: true },
    });
}

export async function GET(_request, context) {
    const auth = await requireRole("BRAND", "CREATOR");
    if (auth.response) return auth.response;
    const { id: campaignId, campaignCreatorId } = await context.params;
    try {
        const link = await findOwnedLink(campaignId, campaignCreatorId, auth.user);
        if (!link) return jsonError("Campaign collaboration not found.", 404);
        const deliverables = await prisma.campaignDeliverable.findMany({
            where: { campaignCreatorId: link.id },
            include: { submissions: { orderBy: { version: "desc" } } },
            orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
        });
        return NextResponse.json({
            campaign_id: campaignId,
            campaign_creator_id: link.id,
            deliverables: deliverables.map((item) => ({
                id: item.id,
                title: item.title,
                description: item.description,
                due_at: item.dueAt?.toISOString() ?? null,
                status: item.status,
                created_at: item.createdAt.toISOString(),
                updated_at: item.updatedAt.toISOString(),
                submissions: item.submissions.map((submission) => ({
                    id: submission.id,
                    version: submission.version,
                    content_url: submission.contentUrl,
                    creator_note: submission.creatorNote,
                    status: submission.status,
                    submitted_at: submission.submittedAt.toISOString(),
                    review_note: submission.reviewNote,
                    reviewed_at: submission.reviewedAt?.toISOString() ?? null,
                })),
            })),
        });
    } catch (error) {
        console.error("Failed to list deliverables:", error);
        return jsonError("Unable to load deliverables.", 500);
    }
}

export async function POST(request, context) {
    const auth = await requireRole("BRAND");
    if (auth.response) return auth.response;
    const { id: campaignId, campaignCreatorId } = await context.params;
    let body;
    try {
        body = await request.json();
    } catch {
        return jsonError("Request body must be valid JSON.", 400);
    }
    if (typeof body?.title !== "string" || !body.title.trim() || body.title.trim().length > 160) {
        return jsonError("title is required and must be 160 characters or fewer.", 400);
    }
    if (body.description !== undefined && body.description !== null && typeof body.description !== "string") {
        return jsonError("description must be a string.", 400);
    }
    if (body.description?.length > 4000) return jsonError("description must be 4,000 characters or fewer.", 400);
    let dueAt = null;
    if (body.due_at) {
        dueAt = new Date(body.due_at);
        if (Number.isNaN(dueAt.getTime())) return jsonError("due_at must be a valid date.", 400);
    }
    try {
        const link = await findOwnedLink(campaignId, campaignCreatorId, auth.user);
        if (!link) return jsonError("Campaign collaboration not found.", 404);
        if (link.status !== "Accepted") {
            return jsonError("Deliverables can only be defined after the creator accepts the collaboration.", 409);
        }
        const item = await prisma.campaignDeliverable.create({
            data: {
                campaignCreatorId: link.id,
                title: body.title.trim(),
                description: body.description?.trim() || null,
                dueAt,
            },
        });
        return NextResponse.json({
            id: item.id,
            title: item.title,
            description: item.description,
            due_at: item.dueAt?.toISOString() ?? null,
            status: item.status,
            submissions: [],
        }, { status: 201 });
    } catch (error) {
        console.error("Failed to create deliverable:", error);
        return jsonError("Unable to create deliverable.", 500);
    }
}
