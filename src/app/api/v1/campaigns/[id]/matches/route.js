import { NextResponse } from "next/server";
import { scoreCreatorForCampaign } from "@/lib/matching";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

function jsonError(message, status) {
    return NextResponse.json({ error: message }, { status });
}

export async function POST(request, context) {
    const auth = await requireRole("BRAND");
    if (auth.response) return auth.response;
    const { id: campaignId } = await context.params;
    const limitValue = Number(request.nextUrl.searchParams.get("limit") ?? 25);
    const limit = Number.isFinite(limitValue) ? Math.min(50, Math.max(1, Math.floor(limitValue))) : 25;

    try {
        const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, ownerUserId: auth.user.id } });
        if (!campaign) return jsonError("Campaign not found.", 404);

        const creators = await prisma.creatorProfile.findMany({
            where: { isPublic: true },
            include: { socialAccounts: { include: {
                snapshots: { orderBy: { observedAt: "desc" }, take: 1 },
                audienceInsights: { orderBy: { observedAt: "desc" }, take: 1 },
            } } },
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
                social_accounts: item.creator.socialAccounts.map((account) => ({
                    id: account.id,
                    platform: account.platform,
                    handle: account.handle,
                    profile_url: account.profileUrl,
                    latest_metrics: account.snapshots?.[0] ? {
                        observed_at: account.snapshots[0].observedAt.toISOString(),
                        data_source: account.snapshots[0].dataSource,
                        follower_count: account.snapshots[0].followerCount,
                        engagement_rate: account.snapshots[0].engagementRate,
                    } : null,
                    latest_audience_insight: account.audienceInsights?.[0] ? {
                        observed_at: account.audienceInsights[0].observedAt.toISOString(),
                        data_source: account.audienceInsights[0].dataSource,
                        age_breakdown: account.audienceInsights[0].ageBreakdown,
                        gender_breakdown: account.audienceInsights[0].genderBreakdown,
                        country_breakdown: account.audienceInsights[0].countryBreakdown,
                    } : null,
                })),
                status: saved.status,
                match_score: item.match_score,
                match_reasons: item.match_reasons,
                score_type: item.score_type,
                note: item.note,
            };
        }));

        return NextResponse.json({
            campaign_id: campaignId,
            matching_method: "rule_based_v2",
            count: matches.length,
            matches,
            disclaimer: "Scores are explainable profile-fit estimates, not predictions. Missing metrics are not treated as mismatches; creator-provided metrics are not independently verified.",
        });
    } catch (error) {
        console.error("Failed to match creators:", error);
        return jsonError("Unable to calculate creator matches.", 500);
    }
}
