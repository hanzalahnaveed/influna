import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request, context) {
    const auth = await requireRole("BRAND");
    if (auth.response) return auth.response;
    const { id: campaignId } = await context.params;

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }

    const creatorIds = Array.isArray(body?.creator_ids)
        ? [...new Set(body.creator_ids.filter((id) => typeof id === "string").map((id) => id.trim()).filter(Boolean))]
        : [];
    if (!creatorIds.length) {
        return NextResponse.json({ error: "Provide at least one creator_id." }, { status: 400 });
    }
    if (creatorIds.length > 100) {
        return NextResponse.json({ error: "You can add at most 100 creators at a time." }, { status: 400 });
    }

    try {
        const campaign = await prisma.campaign.findFirst({
            where: { id: campaignId, ownerUserId: auth.user.id },
            select: { id: true, status: true },
        });
        if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
        if (campaign.status !== "Active" && campaign.status !== "Draft") {
            return NextResponse.json({ error: "Creators can only be added to active or draft campaigns." }, { status: 409 });
        }

        const saved = await prisma.savedCreator.findMany({
            where: { userId: auth.user.id, creatorId: { in: creatorIds }, creator: { isPublic: true } },
            select: { creatorId: true },
        });
        const allowedIds = saved.map((item) => item.creatorId);
        if (!allowedIds.length) {
            return NextResponse.json({ error: "None of the selected creators are in your saved shortlist." }, { status: 404 });
        }

        const existing = await prisma.campaignCreator.findMany({
            where: { campaignId, creatorId: { in: allowedIds } },
            select: { creatorId: true },
        });
        const existingIds = new Set(existing.map((item) => item.creatorId));
        const toCreate = allowedIds.filter((id) => !existingIds.has(id));
        if (toCreate.length) {
            await prisma.campaignCreator.createMany({
                data: toCreate.map((creatorId) => ({
                    campaignId,
                    creatorId,
                    status: "Suggested",
                    matchReasons: ["Added from saved creator shortlist"],
                })),
                skipDuplicates: true,
            });
        }

        const added = await prisma.campaignCreator.count({ where: { campaignId, creatorId: { in: toCreate } } });
        return NextResponse.json({
            campaign_id: campaignId,
            added_count: added,
            already_linked_count: allowedIds.length - added,
            message: added ? `Added ${added} creator(s) to the campaign workflow as suggestions.` : "All selected creators are already linked to this campaign.",
        }, { status: added ? 201 : 200 });
    } catch (error) {
        console.error("Failed to add saved creators to campaign:", error);
        return NextResponse.json({ error: "Unable to add saved creators to this campaign." }, { status: 500 });
    }
}
