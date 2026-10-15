import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request, context) {
    const { id } = await context.params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    if (user.role !== "CREATOR") return NextResponse.json({ error: "Creator account required." }, { status: 403 });
    try {
        const creator = await prisma.creatorProfile.findFirst({ where: { id, ownerUserId: user.id }, select: { id: true } });
        if (!creator) return NextResponse.json({ error: "Creator not found." }, { status: 404 });

        const links = await prisma.campaignCreator.findMany({
            where: { creatorId: id, status: { in: ["Applied", "Invited", "Accepted", "Declined", "ContentSubmitted", "ChangesRequested", "Approved", "Completed", "Cancelled"] } },
            include: { campaign: { select: { id: true, campaignDetails: true, targetingCriteria: true, platformDetails: true, status: true } } },
            orderBy: [{ invitedAt: "desc" }, { updatedAt: "desc" }],
        });

        return NextResponse.json({
            creator_id: id,
            invitations: links.map((link) => ({
                campaign_creator_id: link.id,
                campaign_id: link.campaignId,
                campaign_title: link.campaign.campaignDetails?.campaign_title || "Untitled campaign",
                campaign_status: link.campaign.status,
                campaign_details: link.campaign.campaignDetails,
                targeting_criteria: link.campaign.targetingCriteria,
                platform_details: link.campaign.platformDetails,
                status: link.status,
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
            })),
        });
    } catch (error) {
        console.error("Failed to list creator invitations:", error);
        return NextResponse.json({ error: "Unable to load creator invitations." }, { status: 500 });
    }
}
