import { z } from "zod";

const nonEmptyString = z.string().trim().min(1).max(200);

export const creatorInputSchema = z.object({
    display_name: nonEmptyString,
    bio: z.string().trim().max(2000).optional().nullable(),
    categories: z.array(nonEmptyString).max(30).optional(),
    country: z.string().trim().max(100).optional().nullable(),
    city: z.string().trim().max(100).optional().nullable(),
    languages: z.array(nonEmptyString).max(20).optional(),
    is_public: z.boolean().optional(),
    social_accounts: z.array(z.object({
        platform: z.enum(["Instagram", "TikTok", "YouTube", "Facebook", "Other"]),
        handle: nonEmptyString,
        profile_url: z.string().url().optional().nullable(),
    }).strict()).max(10).optional(),
}).strict();

export const creatorPatchSchema = creatorInputSchema.omit({ social_accounts: true }).partial();

export const metricSnapshotSchema = z.object({
    data_source: z.literal("creator_provided"),
    observed_at: z.string().datetime().optional(),
    follower_count: z.number().int().nonnegative().optional().nullable(),
    following_count: z.number().int().nonnegative().optional().nullable(),
    post_count: z.number().int().nonnegative().optional().nullable(),
    average_views: z.number().nonnegative().optional().nullable(),
    average_likes: z.number().nonnegative().optional().nullable(),
    average_comments: z.number().nonnegative().optional().nullable(),
    engagement_rate: z.number().min(0).max(100).optional().nullable(),
    raw_metrics: z.record(z.string(), z.unknown()).optional(),
}).strict();

export function getCreatorSource(creator) {
    if (creator.ownerUserId) {
        return { key: "creator_submitted", label: "Creator-submitted profile", description: "Profile information was submitted by the creator; social metrics may still be unverified." };
    }

    const accounts = creator.socialAccounts ?? [];
    const sources = accounts.flatMap((account) => [
        account.dataSource,
        account.snapshots?.[0]?.dataSource,
    ]).filter(Boolean);

    if (sources.includes("synthetic_dataset")) {
        return { key: "synthetic_dataset", label: "Synthetic benchmark profile", description: "Fictional benchmark data for development and evaluation; not a real creator or live platform metrics." };
    }

    if (sources.some((source) => source !== "creator_provided")) {
        return { key: "public_dataset_reference", label: "Public-dataset reference", description: "Imported reference data from a dataset; not independently verified or live platform metrics." };
    }

    return { key: "unknown_source", label: "Source not recorded", description: "The profile's origin is not recorded. Review provenance before relying on its information." };
}


const QUALITY_FRESH_DAYS = 30;
const QUALITY_STALE_DAYS = 90;

export function assessCreatorDataQuality(creator, now = new Date()) {
    const accounts = creator.socialAccounts ?? [];
    const checks = [
        ["bio", Boolean(creator.bio?.trim())],
        ["categories", Boolean(creator.categories?.length)],
        ["location", Boolean(creator.country?.trim() || creator.city?.trim())],
        ["languages", Boolean(creator.languages?.length)],
        ["social_accounts", accounts.length > 0],
        ["profile_links", accounts.some((account) => Boolean(account.profileUrl))],
    ];
    const missingFields = checks.filter(([, complete]) => !complete).map(([field]) => field);
    const completenessScore = Math.round((checks.filter(([, complete]) => complete).length / checks.length) * 100);
    const snapshots = accounts.flatMap((account) => {
        const snapshot = account.snapshots?.[0];
        return snapshot ? [{ account, snapshot }] : [];
    });
    const datedSnapshots = snapshots.map(({ account, snapshot }) => ({
        account,
        snapshot,
        observedAt: new Date(snapshot.observedAt),
    })).filter(({ observedAt }) => !Number.isNaN(observedAt.getTime()));
    datedSnapshots.sort((a, b) => b.observedAt.getTime() - a.observedAt.getTime());
    const latest = datedSnapshots[0] ?? null;
    const ageDays = latest ? Math.max(0, (now.getTime() - latest.observedAt.getTime()) / 86400000) : null;
    const metricsFreshness = !latest
        ? "no_metrics"
        : ageDays <= QUALITY_FRESH_DAYS
            ? "recent"
            : ageDays <= QUALITY_STALE_DAYS
                ? "aging"
                : "stale";
    const verifiedAccountCount = accounts.filter((account) =>
        Boolean(account.verifiedAt) || account.verificationStatus === "VERIFIED"
    ).length;
    const source = getCreatorSource(creator);
    const warnings = [];
    if (source.key === "synthetic_dataset") warnings.push("Fictional synthetic benchmark profile; not a real creator.");
    if (source.key === "public_dataset_reference") warnings.push("Public-dataset reference; not independently verified as live platform data.");
    if (source.key === "unknown_source") warnings.push("Profile origin is not recorded.");
    if (!accounts.length) warnings.push("No social accounts are listed.");
    if (accounts.length && !snapshots.length) warnings.push("No social metric snapshots are available.");
    if (metricsFreshness === "aging") warnings.push("Latest available metrics are more than 30 days old.");
    if (metricsFreshness === "stale") warnings.push("Latest available metrics are more than 90 days old.");
    if (accounts.length > verifiedAccountCount) warnings.push("Some social accounts are not verified.");
    if (missingFields.length) warnings.push("Profile information is incomplete.");

    return {
        profile_completeness_score: completenessScore,
        profile_completeness_label: completenessScore >= 85 ? "Complete profile" : completenessScore >= 60 ? "Partially complete" : "Limited profile data",
        completed_fields: checks.filter(([, complete]) => complete).length,
        total_fields: checks.length,
        missing_fields: missingFields,
        metrics_freshness: metricsFreshness,
        latest_metrics_observed_at: latest ? latest.observedAt.toISOString() : null,
        latest_metrics_age_days: ageDays === null ? null : Math.floor(ageDays),
        metric_account_count: snapshots.length,
        social_account_count: accounts.length,
        verified_account_count: verifiedAccountCount,
        warnings,
        note: "Data quality measures profile completeness, metric availability and recency, and account verification status. It does not establish authenticity or predict campaign performance.",
    };
}

export function serializeCreator(creator, { includePrivateVerificationFeedback = false } = {}) {
    const profileSource = getCreatorSource(creator);
    return {
        profile_source: profileSource.key,
        profile_source_label: profileSource.label,
        profile_source_description: profileSource.description,
        data_quality: assessCreatorDataQuality(creator),
        id: creator.id,
        display_name: creator.displayName,
        bio: creator.bio,
        categories: creator.categories,
        country: creator.country,
        city: creator.city,
        languages: creator.languages,
        is_public: creator.isPublic,
        created_at: creator.createdAt.toISOString(),
        updated_at: creator.updatedAt.toISOString(),
        social_accounts: (creator.socialAccounts ?? []).map((account) => {
            const snapshot = account.snapshots?.[0] ?? null;
            const audience = account.audienceInsights?.[0] ?? null;
            return {
                id: account.id,
                platform: account.platform,
                handle: account.handle,
                profile_url: account.profileUrl,
                account_data_source: account.dataSource,
                connected_at: account.connectedAt?.toISOString() ?? null,
                verified_at: account.verifiedAt?.toISOString() ?? null,
                verification_status: account.verifiedAt || account.verificationStatus === "VERIFIED"
                    ? "verified"
                    : account.verificationStatus === "PENDING"
                        ? "pending"
                        : account.verificationStatus === "REJECTED"
                            ? "rejected"
                            : account.connectedAt ? "connected_unverified" : "unverified",
                verification_requested_at: account.verificationRequestedAt?.toISOString() ?? null,
                verification_reviewed_at: account.verificationReviewedAt?.toISOString() ?? null,
                ...(includePrivateVerificationFeedback ? { verification_review_note: account.verificationReviewNote ?? null } : {}),
                is_verified: Boolean(account.verifiedAt) && account.verificationStatus === "VERIFIED",
                latest_metrics: snapshot ? {
                    observed_at: snapshot.observedAt.toISOString(),
                    data_source: snapshot.dataSource,
                    follower_count: snapshot.followerCount,
                    following_count: snapshot.followingCount,
                    post_count: snapshot.postCount,
                    average_views: snapshot.averageViews,
                    average_likes: snapshot.averageLikes,
                    average_comments: snapshot.averageComments,
                    engagement_rate: snapshot.engagementRate,
                } : null,
                latest_audience_insight: audience ? {
                    observed_at: audience.observedAt.toISOString(),
                    data_source: audience.dataSource,
                    country_breakdown: audience.countryBreakdown,
                    age_breakdown: audience.ageBreakdown,
                    gender_breakdown: audience.genderBreakdown,
                } : null,
            };
        }),
    };
}
