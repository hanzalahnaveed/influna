import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

function jsonError(message, status) {
    return NextResponse.json({ error: message }, { status });
}

export async function POST(request, context) {
    const auth = await requireRole("BRAND");
    if (auth.response) return auth.response;

    const { id: campaignId } = await context.params;
    let body;
    try {
        body = await request.json();
    } catch {
        return jsonError("Request body must be valid JSON.", 400);
    }
    if (typeof body?.creator_id !== "string" || !body.creator_id.trim()) {
        return jsonError("creator_id is required.", 400);
    }
    const creatorId = body.creator_id.trim();

    try {
        const campaign = await prisma.campaign.findFirst({
            where: { id: campaignId, ownerUserId: auth.user.id },
            select: { id: true },
        });
        if (!campaign) return jsonError("Campaign not found.", 404);

        const link = await prisma.campaignCreator.findFirst({
            where: { campaignId, creatorId },
            select: { id: true, status: true, creator: { select: { displayName: true } } },
        });
        if (!link) return jsonError("This creator is not linked to the campaign.", 404);
        if (link.status !== "Accepted") {
            return jsonError("The creator must accept the collaboration before deliverables can be created.", 409);
        }

        const planItems = await prisma.campaignPlanItem.findMany({
            where: { campaignId, creatorId },
            orderBy: [{ createdAt: "asc" }],
        });
        if (!planItems.length) return jsonError("There are no planned deliverables for this creator.", 400);

        const result = await prisma.$transaction(async (tx) => {
            const existing = await tx.campaignDeliverable.findMany({
                where: { campaignCreatorId: link.id },
                select: { description: true },
            });
            const existingMarkers = new Set(
                existing.map((item) => item.description?.match(/\[campaign-plan-item:([^\]]+)\]/)?.[1]).filter(Boolean),
            );
            const pending = planItems.filter((item) => !existingMarkers.has(item.id));
            if (!pending.length) return { created: 0, total: planItems.length };

            await tx.campaignDeliverable.createMany({
                data: pending.map((item) => {
                    const estimate = `Planning estimate: ${item.currency} ${Number(item.unitPrice).toFixed(2)} per unit; quantity ${item.quantity}; estimated line total ${item.currency} ${(Number(item.unitPrice) * item.quantity).toFixed(2)}. This is not a negotiated or agreed fee.`;
                    const note = [item.notes?.trim(), estimate, `[campaign-plan-item:${item.id}]`].filter(Boolean).join("\n\n");
                    const quantity = item.quantity > 1 ? ` (quantity: ${item.quantity})` : "";
                    return {
                        campaignCreatorId: link.id,
                        title: `${item.platform} · ${item.deliverableType}${quantity}`.slice(0, 160),
                        description: note.slice(0, 4000),
                    };
                }),
            });
            return { created: pending.length, total: planItems.length };
        });

        return NextResponse.json({
            campaign_id: campaignId,
            creator_id: creatorId,
            creator_name: link.creator.displayName,
            created_count: result.created,
            planned_count: result.total,
            message: result.created ? "Planned deliverables were added to the accepted collaboration." : "All planned deliverables were already transferred.",
        });
    } catch (error) {
        console.error("Failed to create deliverables from campaign plan:", error);
        return jsonError("Unable to create deliverables from campaign plan.", 500);
    }
}
