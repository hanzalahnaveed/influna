import { NextResponse } from "next/server";
import { scoreCreatorForCampaign } from "@/lib/matching";
import { prisma } from "@/lib/prisma";

function jsonError(message, status) {
    return NextResponse.json({ error: message }, { status });
}

export async function POST(request, context) {
    const { id: campaignId } = await context.params;
    const limitValue = Number(request.nextUrl.searchParams.get("limit") ?? 25);
    const limit = Number.isFinite(limitValue) ? Math.min(50, Math.max(1, Math.floor(limitValue))) : 25;

    try {
        const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
        if (!campaign) return jsonError("Campaign not found.", 404);

        const creators = await prisma.creatorProfile.findMany({
            where: { isPublic: true },
            include: { socialAccounts: { select: { id: true, platform: true, handle: true } } },
            orderBy: { createdAt: "desc" },
            take: 500,
        });

        const ranked = creators.map((creator) => ({
            creator,
            ...scoreCreatorForCampaign(campaign, creator),
        })).sort((a, b) => b.match_score - a.match_score).slice(0, limit);

        const matches = await Promise.all(ranked.map(async (item) => {
            const saved = await prisma.campaignCreator.upsert({
                where: { campaignId_creatorId: { campaignId, creatorId: item.creator.id } },
                create: {
                    campaignId,
                    creatorId: item.creator.id,
                    status: "Suggested",
                    matchScore: item.match_score,
                    matchReasons: item.match_reasons,
                },
                update: {
                    matchScore: item.match_score,
                    matchReasons: item.match_reasons,
                },
            });
            return {
                campaign_creator_id: saved.id,
                creator_id: item.creator.id,
                display_name: item.creator.displayName,
                categories: item.creator.categories,
                country: item.creator.country,
                city: item.creator.city,
                languages: item.creator.languages,
                social_accounts: item.creator.socialAccounts,
                status: saved.status,
                match_score: item.match_score,
                match_reasons: item.match_reasons,
                score_type: item.score_type,
                note: item.note,
            };
        }));

        return NextResponse.json({
            campaign_id: campaignId,
            matching_method: "rule_based_v1",
            count: matches.length,
            matches,
            disclaimer: "Scores indicate preliminary profile fit only; they do not predict reach, conversions, authenticity, or campaign success.",
        });
    } catch (error) {
        console.error("Failed to match creators:", error);
        return jsonError("Unable to calculate creator matches.", 500);
    }
}
