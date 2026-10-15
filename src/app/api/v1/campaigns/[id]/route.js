import { NextResponse } from "next/server";
import {
    campaignInputSchema,
    getCampaignValidationErrors,
    serializeCampaign,
} from "@/lib/campaigns";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

function jsonError(message, status, details) {
    return NextResponse.json({ error: message, ...(details && { details }) }, { status });
}

export async function GET(_request, context) {
    const auth = await requireRole("BRAND");
    if (auth.response) return auth.response;
    const { id } = await context.params;
    try {
        const campaign = await prisma.campaign.findUnique({ where: { id, ownerUserId: auth.user.id } });
        if (!campaign) return jsonError("Campaign not found.", 404);
        return NextResponse.json(serializeCampaign(campaign));
    } catch (error) {
        console.error("Failed to load campaign:", error);
        return jsonError("Unable to load campaign.", 500);
    }
}

export async function PUT(request, context) {
    const auth = await requireRole("BRAND");
    if (auth.response) return auth.response;
    const { id } = await context.params;
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

    try {
        const existing = await prisma.campaign.findFirst({ where: { id, ownerUserId: auth.user.id } });
        if (!existing) return jsonError("Campaign not found.", 404);

        const input = parsed.data;
        const next = {
            campaign_details: {
                ...existing.campaignDetails,
                ...input.campaign_details,
            },
            targeting_criteria: {
                ...existing.targetingCriteria,
                ...input.targeting_criteria,
            },
            platform_details: {
                ...existing.platformDetails,
                ...input.platform_details,
            },
            payment_information: {
                ...existing.paymentInformation,
                ...input.payment_information,
            },
            status: input.status ?? existing.status,
        };

        if (next.status !== "Draft") {
            const errors = getCampaignValidationErrors(next);
            if (errors.length > 0) {
                return jsonError("Campaign is incomplete or invalid.", 422, errors);
            }
        }

        const updated = await prisma.campaign.update({
            where: { id },
            data: {
                campaignDetails: next.campaign_details,
                targetingCriteria: next.targeting_criteria,
                platformDetails: next.platform_details,
                paymentInformation: next.payment_information,
                status: next.status,
            },
        });
        return NextResponse.json(serializeCampaign(updated));
    } catch (error) {
        console.error("Failed to update campaign:", error);
        return jsonError("Unable to update campaign.", 500);
    }
}

export async function DELETE(_request, context) {
    const auth = await requireRole("BRAND");
    if (auth.response) return auth.response;
    const { id } = await context.params;
    try {
        const result = await prisma.campaign.deleteMany({ where: { id, ownerUserId: auth.user.id } });
        if (result.count === 0) return jsonError("Campaign not found.", 404);
        return new Response(null, { status: 204 });
    } catch (error) {
        console.error("Failed to delete campaign:", error);
        return jsonError("Unable to delete campaign.", 500);
    }
}
