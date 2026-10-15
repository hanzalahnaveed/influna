import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

const currencies = new Set(["USD", "PKR", "GBP", "EUR", "AED", "SAR", "INR", "CAD", "AUD"]);
const statuses = new Set(["PLANNED", "PROCESSING", "PAID", "CANCELLED"]);
const jsonError = (error, status) => NextResponse.json({ error }, { status });

function serialize(record) {
    return {
        id: record.id,
        campaign_creator_id: record.campaignCreatorId,
        campaign_id: record.campaignCreator.campaignId,
        campaign_title: record.campaignCreator.campaign?.campaignDetails?.campaign_title || "Untitled campaign",
        creator_name: record.campaignCreator.creator?.displayName || "Creator",
        amount: Number(record.amount),
        currency: record.currency,
        status: record.status,
        due_at: record.dueAt?.toISOString() ?? null,
        paid_at: record.paidAt?.toISOString() ?? null,
        reference: record.reference,
        note: record.note,
        created_at: record.createdAt.toISOString(),
        updated_at: record.updatedAt.toISOString(),
    };
}

export async function GET() {
    const user = await getCurrentUser();
    if (!user) return jsonError("Authentication required.", 401);
    if (!["BRAND", "CREATOR"].includes(user.role)) return jsonError("Brand or creator account required.", 403);
    try {
        const records = await prisma.campaignPaymentRecord.findMany({
            where: user.role === "BRAND"
                ? { campaignCreator: { campaign: { ownerUserId: user.id } } }
                : { campaignCreator: { creator: { ownerUserId: user.id } } },
            include: { campaignCreator: { include: { campaign: { select: { campaignDetails: true } }, creator: { select: { displayName: true } } } } },
            orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
        });
        return NextResponse.json({ role: user.role, payments: records.map(serialize) });
    } catch (error) {
        console.error("Failed to list payment records:", error);
        return jsonError("Unable to load payment records.", 500);
    }
}

export async function POST(request) {
    const user = await getCurrentUser();
    if (!user) return jsonError("Authentication required.", 401);
    if (user.role !== "BRAND") return jsonError("Only the campaign-owning brand can create payment records.", 403);
    let body;
    try { body = await request.json(); } catch { return jsonError("Request body must be valid JSON.", 400); }
    const campaignCreatorId = typeof body?.campaign_creator_id === "string" ? body.campaign_creator_id : "";
    const amount = Number(body?.amount);
    const currency = String(body?.currency || "USD").toUpperCase();
    if (!campaignCreatorId) return jsonError("campaign_creator_id is required.", 400);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 9999999999.99) return jsonError("Amount must be greater than zero and within the supported limit.", 400);
    if (!currencies.has(currency)) return jsonError("Unsupported currency.", 400);
    if (body.note !== undefined && (typeof body.note !== "string" || body.note.length > 2000)) return jsonError("Note must be 2,000 characters or fewer.", 400);
    if (body.reference !== undefined && (typeof body.reference !== "string" || body.reference.length > 200)) return jsonError("Reference must be 200 characters or fewer.", 400);
    let dueAt = null;
    if (body.due_at) {
        dueAt = new Date(body.due_at);
        if (Number.isNaN(dueAt.getTime())) return jsonError("due_at must be a valid date.", 400);
    }
    try {
        const link = await prisma.campaignCreator.findFirst({
            where: { id: campaignCreatorId, campaign: { ownerUserId: user.id } },
            select: { id: true, status: true, proposalStatus: true, agreedFee: true, feeCurrency: true, creator: { select: { ownerUserId: true } }, campaign: { select: { campaignDetails: true } } },
        });
        if (!link) return jsonError("Collaboration not found.", 404);
        if (link.proposalStatus !== "AGREED" || link.agreedFee === null) return jsonError("Agree the collaboration fee before creating payment records.", 409);
        if (!["Accepted", "ContentSubmitted", "ChangesRequested", "Approved", "Completed"].includes(link.status)) {
            return jsonError("The creator must accept the collaboration before payment records can be created.", 409);
        }
        if (currency !== link.feeCurrency) return jsonError("Payment currency must match the agreed collaboration fee currency.", 409);
        const existingTotal = await prisma.campaignPaymentRecord.aggregate({
            where: { campaignCreatorId: link.id, status: { not: "CANCELLED" } },
            _sum: { amount: true },
        });
        const alreadyRecorded = Number(existingTotal._sum.amount || 0);
        const agreedFee = Number(link.agreedFee);
        if (alreadyRecorded + amount > agreedFee + 0.000001) {
            return jsonError("Total non-cancelled payment records cannot exceed the agreed collaboration fee.", 409);
        }
        const record = await prisma.campaignPaymentRecord.create({
            data: { campaignCreatorId: link.id, amount, currency, dueAt, note: body.note?.trim() || null, reference: body.reference?.trim() || null, createdByUserId: user.id },
            include: { campaignCreator: { include: { campaign: { select: { campaignDetails: true } }, creator: { select: { displayName: true, ownerUserId: true } } } } },
        });
        await createNotification({
            userId: record.campaignCreator.creator.ownerUserId,
            type: "PAYMENT_PLANNED",
            title: "Payment record created",
            message: `A ${currency} ${amount.toFixed(2)} payment record was created for ${record.campaignCreator.campaign.campaignDetails?.campaign_title || "your campaign collaboration"}.`,
            href: "/dashboard/commercials",
        });
        return NextResponse.json(serialize(record), { status: 201 });
    } catch (error) {
        console.error("Failed to create payment record:", error);
        return jsonError("Unable to create payment record.", 500);
    }
}
