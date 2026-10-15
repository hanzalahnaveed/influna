import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

function jsonError(message, status) {
    return NextResponse.json({ error: message }, { status });
}

async function getOwnedCreator(userId) {
    return prisma.creatorProfile.findUnique({
        where: { ownerUserId: userId },
        select: { id: true, displayName: true },
    });
}

function serializeCampaign(campaign) {
    const link = campaign.creatorLinks[0] ?? null;
    return {
        id: campaign.id,
        title: campaign.campaignDetails?.campaign_title || "Untitled campaign",
        objective: campaign.campaignDetails?.campaign_objective || campaign.campaignDetails?.campaign_goal || null,
        description: campaign.campaignDetails?.campaign_description || null,
        start_date: campaign.campaignDetails?.campaign_start_date || null,
        end_date: campaign.campaignDetails?.campaign_end_date || null,
        targeting_criteria: campaign.targetingCriteria,
        platform_details: campaign.platformDetails,
        payment_model: campaign.paymentInformation?.campaign_payment_model || null,
        status: link?.status || null,
        campaign_creator_id: link?.id || null,
        match_score: link?.matchScore ?? null,
        applied_at: link?.status === "Applied" ? link.updatedAt.toISOString() : null,
    };
}

export async function GET() {
    const auth = await requireRole("CREATOR");
    if (auth.response) return auth.response;

    try {
        const creator = await getOwnedCreator(auth.user.id);
        if (!creator) return jsonError("Create your creator profile before browsing campaigns.", 409);

        const campaigns = await prisma.campaign.findMany({
            where: { status: "Active" },
            include: {
                creatorLinks: {
                    where: { creatorId: creator.id },
                    select: { id: true, status: true, matchScore: true, updatedAt: true },
                    take: 1,
                },
            },
            orderBy: { updatedAt: "desc" },
            take: 100,
        });

        return NextResponse.json({
            campaigns: campaigns.map(serializeCampaign),
            count: campaigns.length,
        });
    } catch (error) {
        console.error("Failed to list creator-facing campaigns:", error);
        return jsonError("Unable to load available campaigns.", 500);
    }
}

export async function POST(request) {
    const auth = await requireRole("CREATOR");
    if (auth.response) return auth.response;

    let body;
    try {
        body = await request.json();
    } catch {
        return jsonError("Request body must be valid JSON.", 400);
    }

    if (typeof body?.campaign_id !== "string" || !body.campaign_id.trim()) {
        return jsonError("campaign_id is required.", 400);
    }

    try {
        const creator = await getOwnedCreator(auth.user.id);
        if (!creator) return jsonError("Create your creator profile before applying to campaigns.", 409);

        const campaign = await prisma.campaign.findFirst({
            where: { id: body.campaign_id.trim(), status: "Active" },
            select: { id: true, ownerUserId: true, campaignDetails: true },
        });
        if (!campaign) return jsonError("Campaign is not available for applications.", 404);

        const existing = await prisma.campaignCreator.findUnique({
            where: { campaignId_creatorId: { campaignId: campaign.id, creatorId: creator.id } },
        });

        if (existing?.status === "Applied") {
            return NextResponse.json({
                campaign_id: campaign.id,
                campaign_creator_id: existing.id,
                status: existing.status,
                already_applied: true,
            });
        }

        if (existing && !["Suggested", "Withdrawn"].includes(existing.status)) {
            return jsonError(`You cannot apply while this campaign record is "${existing.status}".`, 409);
        }

        const application = existing
            ? await prisma.campaignCreator.update({
                where: { id: existing.id },
                data: { status: "Applied" },
            })
            : await prisma.campaignCreator.create({
                data: {
                    campaignId: campaign.id,
                    creatorId: creator.id,
                    status: "Applied",
                },
            });

        await createNotification({
            userId: campaign.ownerUserId,
            type: "campaign_application",
            title: "New campaign application",
            message: (creator.displayName || "A creator") + ' applied to “' + (campaign.campaignDetails?.campaign_title || "Untitled campaign") + '”.',
            href: "/dashboard/campaign-workflow",
        });

        return NextResponse.json({
            campaign_id: application.campaignId,
            campaign_creator_id: application.id,
            status: application.status,
            already_applied: false,
        }, { status: 201 });
    } catch (error) {
        if (error?.code === "P2002") {
            return jsonError("An application or collaboration already exists for this campaign.", 409);
        }
        console.error("Failed to apply to campaign:", error);
        return jsonError("Unable to submit campaign application.", 500);
    }
}
