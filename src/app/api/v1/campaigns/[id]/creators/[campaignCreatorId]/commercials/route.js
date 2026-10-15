import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const currencies = new Set(["USD", "PKR", "GBP", "EUR", "AED", "SAR", "INR", "CAD", "AUD"]);
const jsonError = (error, status) => NextResponse.json({ error }, { status });

function serialize(link) {
    return {
        campaign_creator_id: link.id,
        campaign_id: link.campaignId,
        campaign_title: link.campaign?.campaignDetails?.campaign_title || "Untitled campaign",
        creator_id: link.creatorId,
        creator_name: link.creator?.displayName,
        proposal_status: link.proposalStatus,
        proposed_fee: link.proposedFee === null ? null : Number(link.proposedFee),
        counter_fee: link.counterFee === null ? null : Number(link.counterFee),
        agreed_fee: link.agreedFee === null ? null : Number(link.agreedFee),
        currency: link.feeCurrency,
        payment_terms: link.paymentTerms,
        proposal_note: link.proposalNote,
        counter_note: link.counterNote,
        proposal_sent_at: link.proposalSentAt?.toISOString() ?? null,
        proposal_responded_at: link.proposalRespondedAt?.toISOString() ?? null,
    };
}

async function getOwnedLink(campaignId, campaignCreatorId, user) {
    return prisma.campaignCreator.findFirst({
        where: {
            id: campaignCreatorId,
            campaignId,
            ...(user.role === "BRAND" ? { campaign: { ownerUserId: user.id } } : { creator: { ownerUserId: user.id } }),
        },
        include: {
            campaign: { select: { campaignDetails: true } },
            creator: { select: { displayName: true } },
        },
    });
}

export async function GET(_request, context) {
    const user = await getCurrentUser();
    if (!user) return jsonError("Authentication required.", 401);
    if (!["BRAND", "CREATOR"].includes(user.role)) return jsonError("Brand or creator account required.", 403);
    const { id: campaignId, campaignCreatorId } = await context.params;
    try {
        const link = await getOwnedLink(campaignId, campaignCreatorId, user);
        if (!link) return jsonError("Collaboration not found.", 404);
        return NextResponse.json(serialize(link));
    } catch (error) {
        console.error("Failed to load commercial terms:", error);
        return jsonError("Unable to load commercial terms.", 500);
    }
}

export async function PATCH(request, context) {
    const user = await getCurrentUser();
    if (!user) return jsonError("Authentication required.", 401);
    if (!["BRAND", "CREATOR"].includes(user.role)) return jsonError("Brand or creator account required.", 403);
    let body;
    try { body = await request.json(); } catch { return jsonError("Request body must be valid JSON.", 400); }
    if (!body || typeof body.action !== "string") return jsonError("A valid commercial action is required.", 400);

    const { id: campaignId, campaignCreatorId } = await context.params;
    try {
        const link = await getOwnedLink(campaignId, campaignCreatorId, user);
        if (!link) return jsonError("Collaboration not found.", 404);
        const now = new Date();
        let data;

        if (user.role === "BRAND" && body.action === "send_offer") {
            const fee = Number(body.amount);
            const currency = String(body.currency || "USD").toUpperCase();
            if (!Number.isFinite(fee) || fee <= 0 || fee > 9999999999.99) return jsonError("Offer amount must be greater than zero and within the supported limit.", 400);
            if (!currencies.has(currency)) return jsonError("Unsupported currency.", 400);
            if (typeof body.payment_terms !== "string" || !body.payment_terms.trim() || body.payment_terms.length > 2000) return jsonError("Payment terms are required and must be 2,000 characters or fewer.", 400);
            if (body.note !== undefined && (typeof body.note !== "string" || body.note.length > 2000)) return jsonError("Offer note must be 2,000 characters or fewer.", 400);
            if (link.proposalStatus === "AGREED") return jsonError("Agreed commercial terms cannot be overwritten. Create an explicit amendment workflow in a future release.", 409);
            data = { proposalStatus: "OFFERED", proposedFee: fee, counterFee: null, agreedFee: null, feeCurrency: currency, paymentTerms: body.payment_terms.trim(), proposalNote: body.note?.trim() || null, counterNote: null, proposalSentAt: now, proposalRespondedAt: null };
        } else if (user.role === "CREATOR" && body.action === "accept_offer") {
            if (link.proposalStatus !== "OFFERED" || link.proposedFee === null) return jsonError("There is no offer awaiting acceptance.", 409);
            data = { proposalStatus: "AGREED", agreedFee: link.proposedFee, proposalRespondedAt: now };
        } else if (user.role === "CREATOR" && body.action === "reject_offer") {
            if (link.proposalStatus !== "OFFERED") return jsonError("There is no offer awaiting a response.", 409);
            data = { proposalStatus: "REJECTED", proposalRespondedAt: now };
        } else if (user.role === "CREATOR" && body.action === "counter_offer") {
            const fee = Number(body.amount);
            if (link.proposalStatus !== "OFFERED" && link.proposalStatus !== "COUNTERED") return jsonError("A counteroffer requires an existing offer.", 409);
            if (!Number.isFinite(fee) || fee <= 0 || fee > 9999999999.99) return jsonError("Counteroffer amount must be greater than zero and within the supported limit.", 400);
            if (body.note !== undefined && (typeof body.note !== "string" || body.note.length > 2000)) return jsonError("Counteroffer note must be 2,000 characters or fewer.", 400);
            data = { proposalStatus: "COUNTERED", counterFee: fee, counterNote: body.note?.trim() || null, proposalRespondedAt: now };
        } else if (user.role === "BRAND" && body.action === "accept_counter") {
            if (link.proposalStatus !== "COUNTERED" || link.counterFee === null) return jsonError("There is no counteroffer awaiting acceptance.", 409);
            data = { proposalStatus: "AGREED", agreedFee: link.counterFee, proposalRespondedAt: now };
        } else {
            return jsonError("This action is not permitted for your role or current proposal status.", 403);
        }

        const updated = await prisma.campaignCreator.update({ where: { id: link.id }, data, include: { campaign: { select: { campaignDetails: true } }, creator: { select: { displayName: true } } } });
        return NextResponse.json(serialize(updated));
    } catch (error) {
        console.error("Failed to update commercial terms:", error);
        return jsonError("Unable to update commercial terms.", 500);
    }
}
