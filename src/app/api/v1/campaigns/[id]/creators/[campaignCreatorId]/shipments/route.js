import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

function jsonError(message, status) {
    return NextResponse.json({ error: message }, { status });
}

async function findOwnedLink(campaignId, campaignCreatorId, user) {
    return prisma.campaignCreator.findFirst({
        where: {
            id: campaignCreatorId,
            campaignId,
            ...(user.role === "BRAND"
                ? { campaign: { ownerUserId: user.id } }
                : { creator: { ownerUserId: user.id } }),
        },
        select: { id: true, status: true },
    });
}

function serializeShipment(item) {
    if (!item) return null;
    return {
        id: item.id,
        campaign_creator_id: item.campaignCreatorId,
        carrier: item.carrier,
        tracking_number: item.trackingNumber,
        tracking_url: item.trackingUrl,
        status: item.status,
        notes: item.notes,
        shipped_at: item.shippedAt?.toISOString() ?? null,
        delivered_at: item.deliveredAt?.toISOString() ?? null,
        received_at: item.receivedAt?.toISOString() ?? null,
        created_at: item.createdAt.toISOString(),
        updated_at: item.updatedAt.toISOString(),
    };
}

export async function GET(_request, context) {
    const auth = await requireRole("BRAND", "CREATOR");
    if (auth.response) return auth.response;
    const { id: campaignId, campaignCreatorId } = await context.params;
    try {
        const link = await findOwnedLink(campaignId, campaignCreatorId, auth.user);
        if (!link) return jsonError("Campaign collaboration not found.", 404);
        const shipment = await prisma.campaignShipment.findUnique({ where: { campaignCreatorId: link.id } });
        return NextResponse.json({ campaign_id: campaignId, campaign_creator_id: link.id, shipment: serializeShipment(shipment) });
    } catch (error) {
        console.error("Failed to load shipment:", error);
        return jsonError("Unable to load shipment tracking.", 500);
    }
}

export async function POST(request, context) {
    const auth = await requireRole("BRAND");
    if (auth.response) return auth.response;
    const { id: campaignId, campaignCreatorId } = await context.params;
    let body;
    try { body = await request.json(); } catch { return jsonError("Request body must be valid JSON.", 400); }

    for (const key of ["carrier", "tracking_number", "tracking_url", "notes"]) {
        if (body[key] !== undefined && body[key] !== null && typeof body[key] !== "string") {
            return jsonError(key + " must be a string.", 400);
        }
    }
    if ((body.carrier?.length ?? 0) > 100 || (body.tracking_number?.length ?? 0) > 160 || (body.tracking_url?.length ?? 0) > 2048 || (body.notes?.length ?? 0) > 2000) {
        return jsonError("Carrier, tracking details, or notes exceed the allowed length.", 400);
    }
    let trackingUrl = null;
    if (body.tracking_url?.trim()) {
        try {
            const parsed = new URL(body.tracking_url.trim());
            if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Invalid protocol");
            trackingUrl = parsed.toString();
        } catch { return jsonError("tracking_url must be a valid HTTP or HTTPS URL.", 400); }
    }
    if (!body.carrier?.trim() && !body.tracking_number?.trim() && !trackingUrl) {
        return jsonError("Provide a carrier, tracking number, or tracking URL.", 400);
    }

    try {
        const link = await findOwnedLink(campaignId, campaignCreatorId, auth.user);
        if (!link) return jsonError("Campaign collaboration not found.", 404);
        if (!["Accepted", "ContentSubmitted", "ChangesRequested", "Approved", "Completed"].includes(link.status)) {
            return jsonError("Shipping can be recorded after the creator accepts the collaboration.", 409);
        }
        const existing = await prisma.campaignShipment.findUnique({ where: { campaignCreatorId: link.id } });
        if (existing) return jsonError("A shipment already exists for this collaboration. Update its tracking details instead.", 409);
        const item = await prisma.campaignShipment.create({
            data: {
                campaignCreatorId: link.id,
                carrier: body.carrier?.trim() || null,
                trackingNumber: body.tracking_number?.trim() || null,
                trackingUrl,
                notes: body.notes?.trim() || null,
            },
        });
        return NextResponse.json({ shipment: serializeShipment(item) }, { status: 201 });
    } catch (error) {
        if (error?.code === "P2002") return jsonError("A shipment already exists for this collaboration.", 409);
        console.error("Failed to create shipment:", error);
        return jsonError("Unable to create shipment tracking.", 500);
    }
}
