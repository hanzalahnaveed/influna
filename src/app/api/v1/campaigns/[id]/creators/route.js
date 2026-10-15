import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

function jsonError(message, status) {
    return NextResponse.json({ error: message }, { status });
}

export async function GET(_request, context) {
    const auth = await requireRole("BRAND");
    if (auth.response) return auth.response;
    const { id: campaignId } = await context.params;
    try {
        const campaign = await prisma.campaign.findUnique({ where: { id: campaignId, ownerUserId: auth.user.id }, select: { id: true } });
        if (!campaign) return jsonError("Campaign not found.", 404);

        const links = await prisma.campaignCreator.findMany({
            where: { campaignId },
            include: {
                _count: { select: { deliverables: true } },
                creator: {
                    include: {
                        socialAccounts: {
                            select: {
                                id: true,
                                platform: true,
                                handle: true,
                                profileUrl: true,
                                dataSource: true,
                                connectedAt: true,
                                verifiedAt: true,
                                snapshots: {
                                    select: {
                                        dataSource: true,
                                        observedAt: true,
                                        followerCount: true,
                                        averageViews: true,
                                        averageLikes: true,
                                        averageComments: true,
                                        engagementRate: true,
                                    },
                                    orderBy: { observedAt: "desc" },
                                    take: 1,
                                },
                            },
                            orderBy: { createdAt: "asc" },
                        },
                    },
                },
            },
            orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        });

        return NextResponse.json({
            campaign_id: campaignId,
            count: links.length,
            creators: links.map((link) => ({
                campaign_creator_id: link.id,
                creator_id: link.creatorId,
                display_name: link.creator.displayName,
                bio: link.creator.bio,
                categories: link.creator.categories,
                country: link.creator.country,
                city: link.creator.city,
                languages: link.creator.languages,
                social_accounts: link.creator.socialAccounts,
                status: link.status,
                deliverable_count: link._count.deliverables,
                match_score: link.matchScore,
                match_reasons: link.matchReasons,
                invited_at: link.invitedAt?.toISOString() ?? null,
                accepted_at: link.acceptedAt?.toISOString() ?? null,
                declined_at: link.declinedAt?.toISOString() ?? null,
                content_url: link.contentUrl,
                content_note: link.contentNote,
                content_submitted_at: link.contentSubmittedAt?.toISOString() ?? null,
                review_note: link.reviewNote,
                reviewed_at: link.reviewedAt?.toISOString() ?? null,
                completed_at: link.completedAt?.toISOString() ?? null,
                created_at: link.createdAt.toISOString(),
                updated_at: link.updatedAt.toISOString(),
            })),
        });
    } catch (error) {
        console.error("Failed to list campaign creators:", error);
        return jsonError("Unable to load campaign workflow.", 500);
    }
}
