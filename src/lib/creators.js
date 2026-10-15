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

export function serializeCreator(creator) {
    return {
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
                verification_status: account.verifiedAt ? "verified" : account.connectedAt ? "connected_unverified" : "unverified",
                is_verified: Boolean(account.verifiedAt),
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
