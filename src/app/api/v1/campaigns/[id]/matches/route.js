import { NextResponse } from "next/server";
import { scoreCreatorForCampaign } from "@/lib/matching";
import { assessCreatorDataQuality, getCreatorSource } from "@/lib/creators";
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
            } }, rateCards: { where: { isPublic: true }, orderBy: [{ platform: "asc" }, { price: "asc" }] } },
            orderBy: { createdAt: "desc" },
            take: 500,
        });

        const ranked = creators.map((creator) => ({
            creator,
            ...scoreCreatorForCampaign(campaign, creator),
        })).sort((a, b) => b.match_score - a.match_score || b.match_confidence - a.match_confidence).slice(0, limit);

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
            const profileSource = getCreatorSource(item.creator);
            const paymentInformation = campaign.paymentInformation && typeof campaign.paymentInformation === "object" ? campaign.paymentInformation : {};
            const budgetValue = Number(paymentInformation.campaign_budget);
            const budgetCurrency = String(paymentInformation.budget_currency || "USD").toUpperCase();
            const budget = Number.isFinite(budgetValue) && budgetValue > 0 ? budgetValue : null;
            const publicRates = (item.creator.rateCards || []).map((rate) => ({
                id: rate.id, platform: rate.platform, deliverable_type: rate.deliverableType,
                price: Number(rate.price), currency: rate.currency, notes: rate.notes,
            }));
            const comparableRates = publicRates.filter((rate) => rate.currency === budgetCurrency);
            const cheapestComparable = comparableRates.length ? Math.min(...comparableRates.map((rate) => rate.price)) : null;
            const pricingFit = budget === null
                ? { status: "budget_not_set", label: "Set a campaign budget to compare rates", budget: null, currency: budgetCurrency, cheapest_rate: cheapestComparable }
                : cheapestComparable === null
                    ? { status: publicRates.length ? "currency_mismatch" : "no_public_rate", label: publicRates.length ? "No rate in campaign currency" : "No public rate card", budget, currency: budgetCurrency, cheapest_rate: null }
                    : cheapestComparable <= budget
                        ? { status: "within_budget", label: "At least one listed rate is within budget", budget, currency: budgetCurrency, cheapest_rate: cheapestComparable }
                        : { status: "over_budget", label: "Lowest listed rate exceeds budget", budget, currency: budgetCurrency, cheapest_rate: cheapestComparable };
            return {
                campaign_creator_id: saved.id,
                rate_cards: publicRates,
                pricing_fit: pricingFit,
                creator_id: item.creator.id,
                profile_source: profileSource.key,
                profile_source_label: profileSource.label,
                profile_source_description: profileSource.description,
                data_quality: assessCreatorDataQuality(item.creator),
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
                    account_data_source: account.dataSource,
                    verification_status: account.verifiedAt || account.verificationStatus === "VERIFIED"
                        ? "verified"
                        : account.verificationStatus === "PENDING"
                            ? "pending"
                            : account.verificationStatus === "REJECTED"
                                ? "rejected"
                                : account.connectedAt ? "connected_unverified" : "unverified",
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
                match_confidence: item.match_confidence,
                criteria_coverage: item.criteria_coverage,
                data_quality_confidence: item.data_quality_confidence,
                metrics_freshness: item.metrics_freshness,
                metrics_age_days: item.metrics_age_days,
                recommendation_tier: item.recommendation_tier,
                recommendation_label: item.recommendation_label,
                match_reasons: item.match_reasons,
                match_factors: item.match_factors,
                missing_data: item.missing_data,
                score_type: item.score_type,
                note: item.note,
            };
        }));

        return NextResponse.json({
            campaign_id: campaignId,
            matching_method: "rule_based_v4",
            count: matches.length,
            matches,
            budget: (() => { const info = campaign.paymentInformation && typeof campaign.paymentInformation === "object" ? campaign.paymentInformation : {}; const amount = Number(info.campaign_budget); return Number.isFinite(amount) && amount > 0 ? { amount, currency: String(info.budget_currency || "USD").toUpperCase() } : null; })(),
            disclaimer: "Profile-fit scores reflect criterion matches and are not reduced because profile fields or metrics are missing. Confidence combines criterion coverage with profile completeness, metric recency, account verification when metrics are used, and source reliability. Synthetic profiles are fictional benchmarks and their confidence is capped; they are not real creator recommendations. Budget fit compares the lowest public rate-card price in the campaign currency against the total campaign budget; it does not estimate total creator costs, convert currencies, or replace negotiation. Scores are not predictions of campaign performance."
        });
    } catch (error) {
        console.error("Failed to match creators:", error);
        return jsonError("Unable to calculate creator matches.", 500);
    }
}
