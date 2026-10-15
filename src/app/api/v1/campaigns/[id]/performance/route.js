import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const currencies = new Set(["USD", "PKR", "GBP", "EUR", "AED", "SAR", "INR", "CAD", "AUD"]);
const allowedStatuses = new Set(["Accepted", "ContentSubmitted", "ChangesRequested", "Approved", "Completed"]);
const jsonError = (message, status) => NextResponse.json({ error: message }, { status });

function validDate(value) {
    if (value === undefined || value === null || value === "") return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
}

function validMetric(value, field) {
    if (value === undefined || value === null || value === "") return null;
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < 0 || number > 2147483647) {
        throw new Error(field + " must be a whole number between 0 and 2,147,483,647.");
    }
    return number;
}

function serializeSnapshot(snapshot) {
    return {
        id: snapshot.id,
        platform: snapshot.platform,
        content_url: snapshot.contentUrl,
        published_at: snapshot.publishedAt?.toISOString() ?? null,
        captured_at: snapshot.capturedAt.toISOString(),
        impressions: snapshot.impressions,
        reach: snapshot.reach,
        likes: snapshot.likes,
        comments: snapshot.comments,
        shares: snapshot.shares,
        saves: snapshot.saves,
        clicks: snapshot.clicks,
        conversions: snapshot.conversions,
        attributed_revenue: snapshot.attributedRevenue === null ? null : Number(snapshot.attributedRevenue),
        currency: snapshot.currency,
        data_source: snapshot.dataSource,
        notes: snapshot.notes,
    };
}

export async function GET(_request, context) {
    const auth = await requireRole("BRAND");
    if (auth.response) return auth.response;
    const { id: campaignId } = await context.params;

    try {
        const campaign = await prisma.campaign.findFirst({
            where: { id: campaignId, ownerUserId: auth.user.id },
            select: { id: true, campaignDetails: true, status: true },
        });
        if (!campaign) return jsonError("Campaign not found.", 404);

        const links = await prisma.campaignCreator.findMany({
            where: { campaignId },
            include: {
                creator: { select: { id: true, displayName: true } },
                performanceSnapshots: { orderBy: { capturedAt: "desc" }, take: 100 },
            },
            orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        });

        const creators = links.map((link) => ({
            campaign_creator_id: link.id,
            creator_id: link.creatorId,
            creator_name: link.creator.displayName,
            collaboration_status: link.status,
            eligible_for_tracking: allowedStatuses.has(link.status),
            snapshots: link.performanceSnapshots.map(serializeSnapshot),
        }));
        const allSnapshots = creators.flatMap((creator) => creator.snapshots);
        const sum = (key) => allSnapshots.reduce((total, item) => total + (item[key] || 0), 0);
        return NextResponse.json({
            campaign: {
                id: campaign.id,
                title: campaign.campaignDetails?.campaign_title || "Untitled campaign",
                status: campaign.status,
            },
            totals: {
                creator_collaborations: links.length,
                tracked_collaborations: creators.filter((creator) => creator.snapshots.length > 0).length,
                performance_records: allSnapshots.length,
                impressions: sum("impressions"),
                reach: sum("reach"),
                engagements: sum("likes") + sum("comments") + sum("shares") + sum("saves"),
                clicks: sum("clicks"),
                conversions: sum("conversions"),
            },
            creators,
        });
    } catch (error) {
        console.error("Failed to load campaign performance:", error);
        return jsonError("Unable to load campaign performance.", 500);
    }
}

export async function POST(request, context) {
    const auth = await requireRole("BRAND");
    if (auth.response) return auth.response;
    const { id: campaignId } = await context.params;

    let body;
    try {
        body = await request.json();
    } catch {
        return jsonError("Request body must be valid JSON.", 400);
    }
    if (typeof body?.campaign_creator_id !== "string" || !body.campaign_creator_id.trim()) {
        return jsonError("campaign_creator_id is required.", 400);
    }
    if (typeof body?.platform !== "string" || !body.platform.trim() || body.platform.trim().length > 40) {
        return jsonError("platform is required and must be 40 characters or fewer.", 400);
    }
    if (body.content_url !== undefined && body.content_url !== null && body.content_url !== "") {
        if (typeof body.content_url !== "string") return jsonError("content_url must be a URL string.", 400);
        try {
            const url = new URL(body.content_url);
            if (!["http:", "https:"].includes(url.protocol)) throw new Error();
        } catch {
            return jsonError("content_url must be a valid HTTP or HTTPS URL.", 400);
        }
    }
    if (body.notes !== undefined && body.notes !== null && (typeof body.notes !== "string" || body.notes.length > 2000)) {
        return jsonError("notes must be 2,000 characters or fewer.", 400);
    }

    const publishedAt = validDate(body.published_at);
    const capturedAt = validDate(body.captured_at);
    if (publishedAt === undefined || capturedAt === undefined) {
        return jsonError("published_at and captured_at must be valid dates.", 400);
    }
    const currency = String(body.currency || "USD").toUpperCase();
    if (!currencies.has(currency)) return jsonError("Unsupported currency.", 400);

    let metrics;
    let revenue = null;
    try {
        metrics = {
            impressions: validMetric(body.impressions, "impressions"),
            reach: validMetric(body.reach, "reach"),
            likes: validMetric(body.likes, "likes"),
            comments: validMetric(body.comments, "comments"),
            shares: validMetric(body.shares, "shares"),
            saves: validMetric(body.saves, "saves"),
            clicks: validMetric(body.clicks, "clicks"),
            conversions: validMetric(body.conversions, "conversions"),
        };
        if (body.attributed_revenue !== undefined && body.attributed_revenue !== null && body.attributed_revenue !== "") {
            revenue = Number(body.attributed_revenue);
            if (!Number.isFinite(revenue) || revenue < 0 || revenue > 9999999999.99) {
                return jsonError("attributed_revenue must be a non-negative amount within the supported limit.", 400);
            }
            revenue = Math.round(revenue * 100) / 100;
        }
    } catch (error) {
        return jsonError(error.message, 400);
    }
    if (Object.values(metrics).every((value) => value === null) && revenue === null) {
        return jsonError("Enter at least one performance metric or attributed revenue amount.", 400);
    }

    try {
        const link = await prisma.campaignCreator.findFirst({
            where: {
                id: body.campaign_creator_id,
                campaignId,
                campaign: { ownerUserId: auth.user.id },
            },
            select: { id: true, status: true },
        });
        if (!link) return jsonError("Campaign collaboration not found.", 404);
        if (!allowedStatuses.has(link.status)) {
            return jsonError("Performance can be recorded after the creator accepts the collaboration.", 409);
        }

        const snapshot = await prisma.campaignPerformanceSnapshot.create({
            data: {
                campaignCreatorId: link.id,
                platform: body.platform.trim(),
                contentUrl: body.content_url?.trim() || null,
                publishedAt,
                capturedAt: capturedAt || new Date(),
                ...metrics,
                attributedRevenue: revenue,
                currency,
                dataSource: "MANUAL",
                notes: body.notes?.trim() || null,
                createdByUserId: auth.user.id,
            },
        });
        return NextResponse.json({ performance: serializeSnapshot(snapshot) }, { status: 201 });
    } catch (error) {
        console.error("Failed to record campaign performance:", error);
        return jsonError("Unable to record campaign performance.", 500);
    }
}
