import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

function jsonError(message, status) {
    return NextResponse.json({ error: message }, { status });
}

export async function PATCH(request, context) {
    const { id: campaignId, campaignCreatorId, shipmentId } = await context.params;
    let body;
    try { body = await request.json(); } catch { return jsonError("Request body must be valid JSON.", 400); }
    const action = body?.action;
    if (!["update_tracking", "mark_shipped", "mark_delivered", "confirm_received"].includes(action)) {
        return jsonError("Unsupported shipment action.", 400);
    }
    const isCreator = action === "confirm_received";
    const auth = await requireRole(isCreator ? "CREATOR" : "BRAND");
    if (auth.response) return auth.response;

    for (const key of ["carrier", "tracking_number", "tracking_url", "notes"]) {
        if (body[key] !== undefined && body[key] !== null && typeof body[key] !== "string") {
            return jsonError(key + " must be a string.", 400);
        }
    }
    if ((body.carrier?.length ?? 0) > 100 || (body.tracking_number?.length ?? 0) > 160 || (body.tracking_url?.length ?? 0) > 2048 || (body.notes?.length ?? 0) > 2000) {
        return jsonError("Carrier, tracking details, or notes exceed the allowed length.", 400);
    }
    let trackingUrl;
    if (body.tracking_url !== undefined) {
        trackingUrl = null;
        if (body.tracking_url?.trim()) {
            try {
                const parsed = new URL(body.tracking_url.trim());
                if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Invalid protocol");
                trackingUrl = parsed.toString();
            } catch { return jsonError("tracking_url must be a valid HTTP or HTTPS URL.", 400); }
        }
    }

    try {
        const shipment = await prisma.campaignShipment.findFirst({
            where: {
                id: shipmentId,
                campaignCreatorId,
                campaignCreator: {
                    campaignId,
                    ...(isCreator
                        ? { creator: { ownerUserId: auth.user.id } }
                        : { campaign: { ownerUserId: auth.user.id } }),
                },
            },
            select: { id: true, status: true, campaignCreator: { select: { status: true } } },
        });
        if (!shipment) return jsonError("Shipment not found.", 404);
        if (["Cancelled", "Declined", "Withdrawn"].includes(shipment.campaignCreator.status)) {
            return jsonError("This collaboration is no longer active.", 409);
        }

        const now = new Date();
        let whereStatus;
        let data;
        if (action === "update_tracking") {
            if (shipment.status === "Received") return jsonError("Tracking details cannot be changed after receipt is confirmed.", 409);
            data = {
                ...(body.carrier !== undefined ? { carrier: body.carrier?.trim() || null } : {}),
                ...(body.tracking_number !== undefined ? { trackingNumber: body.tracking_number?.trim() || null } : {}),
                ...(trackingUrl !== undefined ? { trackingUrl } : {}),
                ...(body.notes !== undefined ? { notes: body.notes?.trim() || null } : {}),
            };
            if (Object.keys(data).length === 0) return jsonError("Provide at least one tracking field to update.", 400);
            whereStatus = { in: ["Preparing", "Shipped", "Delivered"] };
        } else if (action === "mark_shipped") {
            whereStatus = "Preparing";
            data = { status: "Shipped", shippedAt: now };
        } else if (action === "mark_delivered") {
            whereStatus = "Shipped";
            data = { status: "Delivered", deliveredAt: now };
        } else {
            whereStatus = "Delivered";
            data = { status: "Received", receivedAt: now };
        }

        const updatedCount = await prisma.campaignShipment.updateMany({
            where: { id: shipment.id, status: whereStatus },
            data,
        });
        if (updatedCount.count !== 1) return jsonError("Shipment status changed or the requested transition is not allowed. Refresh and try again.", 409);
        const updated = await prisma.campaignShipment.findUnique({ where: { id: shipment.id } });
        return NextResponse.json({
            shipment: {
                id: updated.id,
                campaign_creator_id: updated.campaignCreatorId,
                carrier: updated.carrier,
                tracking_number: updated.trackingNumber,
                tracking_url: updated.trackingUrl,
                status: updated.status,
                notes: updated.notes,
                shipped_at: updated.shippedAt?.toISOString() ?? null,
                delivered_at: updated.deliveredAt?.toISOString() ?? null,
                received_at: updated.receivedAt?.toISOString() ?? null,
                updated_at: updated.updatedAt.toISOString(),
            },
        });
    } catch (error) {
        console.error("Failed to update shipment:", error);
        return jsonError("Unable to update shipment tracking.", 500);
    }
}
