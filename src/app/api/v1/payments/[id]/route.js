import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

const statuses = new Set(["PLANNED", "PROCESSING", "PAID", "CANCELLED"]);
const jsonError = (error, status) => NextResponse.json({ error }, { status });

export async function PATCH(request, context) {
    const user = await getCurrentUser();
    if (!user) return jsonError("Authentication required.", 401);
    if (user.role !== "BRAND") return jsonError("Only the campaign-owning brand can update payment records.", 403);
    const { id } = await context.params;
    let body;
    try { body = await request.json(); } catch { return jsonError("Request body must be valid JSON.", 400); }
    if (!body || typeof body.status !== "string" || !statuses.has(body.status)) return jsonError("A valid payment status is required.", 400);
    if (body.note !== undefined && (typeof body.note !== "string" || body.note.length > 2000)) return jsonError("Note must be 2,000 characters or fewer.", 400);
    if (body.reference !== undefined && (typeof body.reference !== "string" || body.reference.length > 200)) return jsonError("Reference must be 200 characters or fewer.", 400);
    try {
        const existing = await prisma.campaignPaymentRecord.findFirst({
            where: { id, campaignCreator: { campaign: { ownerUserId: user.id } } },
            include: { campaignCreator: { select: { id: true, campaignId: true, status: true, campaign: { select: { campaignDetails: true } }, creator: { select: { displayName: true, ownerUserId: true } } } } },
        });
        if (!existing) return jsonError("Payment record not found.", 404);
        if (["PAID", "CANCELLED"].includes(existing.status) && body.status !== existing.status) return jsonError("Paid and cancelled payment records are final and cannot be reopened.", 409);
        if (existing.status === "PLANNED" && body.status === "PROCESSING" || existing.status === "PLANNED" && body.status === "PAID" || existing.status === "PLANNED" && body.status === "CANCELLED" || existing.status === "PROCESSING" && ["PAID", "CANCELLED", "PROCESSING"].includes(body.status)) {
            const updated = await prisma.campaignPaymentRecord.update({
                where: { id },
                data: {
                    status: body.status,
                    ...(body.status === "PAID" ? { paidAt: existing.paidAt || new Date() } : {}),
                    ...(body.note !== undefined ? { note: body.note.trim() || null } : {}),
                    ...(body.reference !== undefined ? { reference: body.reference.trim() || null } : {}),
                },
                include: { campaignCreator: { include: { campaign: { select: { campaignDetails: true } }, creator: { select: { displayName: true } } } } },
            });
            if (updated.status !== existing.status) {
                const campaignTitle = updated.campaignCreator.campaign.campaignDetails?.campaign_title || "your campaign collaboration";
                const isPaid = updated.status === "PAID";
                await createNotification({
                    userId: updated.campaignCreator.creator.ownerUserId,
                    type: isPaid ? "PAYMENT_PAID" : updated.status === "PROCESSING" ? "PAYMENT_PROCESSING" : "PAYMENT_CANCELLED",
                    title: isPaid ? "Payment marked as paid" : updated.status === "PROCESSING" ? "Payment processing started" : "Payment record cancelled",
                    message: `${updated.currency} ${Number(updated.amount).toFixed(2)} for ${campaignTitle} is now ${updated.status.toLowerCase()}.`,
                    href: "/dashboard/commercials",
                });
            }
            return NextResponse.json({
                id: updated.id, campaign_creator_id: updated.campaignCreatorId, campaign_id: updated.campaignCreator.campaignId,
                campaign_title: updated.campaignCreator.campaign.campaignDetails?.campaign_title || "Untitled campaign",
                creator_name: updated.campaignCreator.creator.displayName, amount: Number(updated.amount), currency: updated.currency,
                status: updated.status, due_at: updated.dueAt?.toISOString() ?? null, paid_at: updated.paidAt?.toISOString() ?? null,
                reference: updated.reference, note: updated.note, created_at: updated.createdAt.toISOString(), updated_at: updated.updatedAt.toISOString(),
            });
        }
        return jsonError("Invalid payment status transition.", 409);
    } catch (error) {
        console.error("Failed to update payment record:", error);
        return jsonError("Unable to update payment record.", 500);
    }
}
