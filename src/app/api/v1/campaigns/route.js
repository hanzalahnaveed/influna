import { NextResponse } from "next/server";
import {
    campaignInputSchema,
    campaignStatusSchema,
    getCampaignValidationErrors,
    serializeCampaign,
} from "@/lib/campaigns";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

function jsonError(message, status, details) {
    return NextResponse.json({ error: message, ...(details && { details }) }, { status });
}

export async function GET(request) {
    const auth = await requireRole("BRAND");
    if (auth.response) return auth.response;
    const status = request.nextUrl.searchParams.get("status");
    if (status && !campaignStatusSchema.safeParse(status).success) {
        return jsonError("Invalid campaign status.", 400);
    }

    try {
        const campaigns = await prisma.campaign.findMany({
            where: { ownerUserId: auth.user.id, ...(status ? { status } : {}) },
            orderBy: { createdAt: "desc" },
        });
        return NextResponse.json(campaigns.map(serializeCampaign));
    } catch (error) {
        console.error("Failed to list campaigns:", error);
        return jsonError("Unable to load campaigns.", 500);
    }
}

export async function POST(request) {
    const auth = await requireRole("BRAND");
    if (auth.response) return auth.response;
    let body;
    try {
        body = await request.json();
    } catch {
        return jsonError("Request body must be valid JSON.", 400);
    }

    const parsed = campaignInputSchema.safeParse(body);
    if (!parsed.success) {
        return jsonError("Invalid campaign data.", 400, parsed.error.flatten());
    }

    const input = parsed.data;
    const status = input.status ?? "Active";
    const campaign = {
        campaign_details: input.campaign_details ?? {},
        targeting_criteria: input.targeting_criteria ?? {},
        platform_details: input.platform_details ?? {},
        payment_information: input.payment_information ?? {},
    };

    if (status !== "Draft") {
        const errors = getCampaignValidationErrors(campaign);
        if (errors.length > 0) {
            return jsonError("Campaign is incomplete or invalid.", 422, errors);
        }
    }

    try {
        const created = await prisma.campaign.create({
            data: {
                ownerUserId: auth.user.id,
                campaignDetails: campaign.campaign_details,
                targetingCriteria: campaign.targeting_criteria,
                platformDetails: campaign.platform_details,
                paymentInformation: campaign.payment_information,
                status,
            },
        });
        return NextResponse.json(serializeCampaign(created), { status: 201 });
    } catch (error) {
        console.error("Failed to create campaign:", error);
        return jsonError("Unable to create campaign.", 500);
    }
}
