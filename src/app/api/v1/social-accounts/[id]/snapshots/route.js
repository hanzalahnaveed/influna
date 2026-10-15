import { NextResponse } from "next/server";
import { metricSnapshotSchema } from "@/lib/creators";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

function jsonError(message, status, details) {
    return NextResponse.json({ error: message, ...(details && { details }) }, { status });
}

export async function POST(request, context) {
    const auth = await requireRole("CREATOR");
    if (auth.response) return auth.response;
    const { id: socialAccountId } = await context.params;
    let body;
    try {
        body = await request.json();
    } catch {
        return jsonError("Request body must be valid JSON.", 400);
    }

    const parsed = metricSnapshotSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid metric snapshot.", 400, parsed.error.flatten());
    const input = parsed.data;

    try {
        const account = await prisma.socialAccount.findFirst({ where: { id: socialAccountId, creator: { ownerUserId: auth.user.id } } });
        if (!account) return jsonError("Social account not found.", 404);

        const snapshot = await prisma.socialAccountSnapshot.create({
            data: {
                socialAccountId,
                dataSource: input.data_source,
                observedAt: input.observed_at ? new Date(input.observed_at) : new Date(),
                followerCount: input.follower_count ?? null,
                followingCount: input.following_count ?? null,
                postCount: input.post_count ?? null,
                averageViews: input.average_views ?? null,
                averageLikes: input.average_likes ?? null,
                averageComments: input.average_comments ?? null,
                engagementRate: input.engagement_rate ?? null,
                rawMetrics: input.raw_metrics ?? {},
            },
        });

        return NextResponse.json({
            id: snapshot.id,
            social_account_id: snapshot.socialAccountId,
            observed_at: snapshot.observedAt.toISOString(),
            data_source: snapshot.dataSource,
            follower_count: snapshot.followerCount,
            following_count: snapshot.followingCount,
            post_count: snapshot.postCount,
            average_views: snapshot.averageViews,
            average_likes: snapshot.averageLikes,
            average_comments: snapshot.averageComments,
            engagement_rate: snapshot.engagementRate,
        }, { status: 201 });
    } catch (error) {
        console.error("Failed to record metric snapshot:", error);
        return jsonError("Unable to record metric snapshot.", 500);
    }
}
