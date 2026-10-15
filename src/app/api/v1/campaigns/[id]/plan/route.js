import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

const error = (message, status, details) => NextResponse.json({ error: message, ...(details ? { details } : {}) }, { status });
const itemSchema = z.object({
    creator_id: z.string().min(1),
    rate_card_id: z.string().min(1),
    quantity: z.number().int().min(1).max(100),
    notes: z.string().trim().max(1000).optional().nullable(),
});
const bodySchema = z.object({ items: z.array(itemSchema).max(250) }).strict();

async function ownedCampaign(campaignId, userId) {
    return prisma.campaign.findFirst({ where: { id: campaignId, ownerUserId: userId } });
}
function campaignBudget(campaign) {
    const info = campaign?.paymentInformation && typeof campaign.paymentInformation === "object" ? campaign.paymentInformation : {};
    const amount = Number(info.campaign_budget);
    return Number.isFinite(amount) && amount > 0 ? { amount, currency: String(info.budget_currency || "USD").toUpperCase() } : null;
}
function serializeItem(item) {
    return {
        id: item.id, creator_id: item.creatorId, creator_name: item.creator.displayName,
        rate_card_id: item.rateCardId, deliverable_type: item.deliverableType, platform: item.platform,
        unit_price: Number(item.unitPrice), currency: item.currency, quantity: item.quantity,
        subtotal: Number(item.unitPrice) * item.quantity, notes: item.notes,
        current_rate: item.rateCard ? Number(item.rateCard.price) : null,
        current_rate_currency: item.rateCard?.currency ?? null,
        created_at: item.createdAt.toISOString(), updated_at: item.updatedAt.toISOString(),
    };
}

export async function GET(_request, context) {
    const auth = await requireRole("BRAND");
    if (auth.response) return auth.response;
    const { id: campaignId } = await context.params;
    try {
        const campaign = await ownedCampaign(campaignId, auth.user.id);
        if (!campaign) return error("Campaign not found.", 404);
        const [links, items] = await Promise.all([
            prisma.campaignCreator.findMany({
                where: { campaignId },
                select: {
                    creatorId: true, status: true, matchScore: true,
                    creator: { select: { id: true, displayName: true, country: true, city: true, rateCards: { where: { isPublic: true }, orderBy: [{ platform: "asc" }, { deliverableType: "asc" }] } } },
                },
                orderBy: [{ matchScore: "desc" }, { createdAt: "desc" }],
            }),
            prisma.campaignPlanItem.findMany({
                where: { campaignId },
                include: { creator: { select: { displayName: true } }, rateCard: { select: { price: true, currency: true } } },
                orderBy: [{ createdAt: "asc" }],
            }),
        ]);
        return NextResponse.json({
            campaign_id: campaignId, budget: campaignBudget(campaign),
            creators: links.map(link => ({
                creator_id: link.creator.id, display_name: link.creator.displayName,
                location: [link.creator.city, link.creator.country].filter(Boolean).join(", "),
                status: link.status, match_score: link.matchScore,
                rate_cards: link.creator.rateCards.map(rate => ({
                    id: rate.id, platform: rate.platform, deliverable_type: rate.deliverableType,
                    price: Number(rate.price), currency: rate.currency, notes: rate.notes,
                })),
            })),
            items: items.map(serializeItem),
        });
    } catch (err) {
        console.error("Unable to load campaign plan:", err);
        return error("Unable to load campaign plan.", 500);
    }
}

export async function PUT(request, context) {
    const auth = await requireRole("BRAND");
    if (auth.response) return auth.response;
    const { id: campaignId } = await context.params;
    let body;
    try { body = await request.json(); } catch { return error("Request body must be valid JSON.", 400); }
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return error("Invalid campaign plan.", 400, parsed.error.flatten());
    try {
        const campaign = await ownedCampaign(campaignId, auth.user.id);
        if (!campaign) return error("Campaign not found.", 404);
        const dedupe = new Set();
        for (const item of parsed.data.items) {
            const key = item.creator_id + ":" + item.rate_card_id;
            if (dedupe.has(key)) return error("A deliverable rate can only be added once per creator. Change its quantity instead.", 400);
            dedupe.add(key);
        }
        const links = await prisma.campaignCreator.findMany({
            where: { campaignId, creatorId: { in: [...new Set(parsed.data.items.map(item => item.creator_id))] } },
            select: { creatorId: true },
        });
        const linkedIds = new Set(links.map(link => link.creatorId));
        const rateIds = [...new Set(parsed.data.items.map(item => item.rate_card_id))];
        const rates = await prisma.creatorRateCard.findMany({ where: { id: { in: rateIds }, isPublic: true }, select: { id: true, creatorId: true, platform: true, deliverableType: true, price: true, currency: true } });
        const rateById = new Map(rates.map(rate => [rate.id, rate]));
        for (const item of parsed.data.items) {
            const rate = rateById.get(item.rate_card_id);
            if (!linkedIds.has(item.creator_id)) return error("Add this creator to the campaign before including them in the plan.", 400);
            if (!rate || rate.creatorId !== item.creator_id) return error("A selected rate is unavailable or does not belong to this creator.", 400);
        }
        const result = await prisma.$transaction(async tx => {
            await tx.campaignPlanItem.deleteMany({ where: { campaignId } });
            if (parsed.data.items.length) {
                await tx.campaignPlanItem.createMany({
                    data: parsed.data.items.map(item => {
                        const rate = rateById.get(item.rate_card_id);
                        return {
                            campaignId, creatorId: item.creator_id, rateCardId: rate.id,
                            deliverableType: rate.deliverableType, platform: rate.platform,
                            unitPrice: rate.price, currency: rate.currency, quantity: item.quantity,
                            notes: item.notes || null,
                        };
                    }),
                });
            }
            return tx.campaignPlanItem.findMany({
                where: { campaignId }, include: { creator: { select: { displayName: true } }, rateCard: { select: { price: true, currency: true } } },
                orderBy: [{ createdAt: "asc" }],
            });
        });
        return NextResponse.json({ campaign_id: campaignId, budget: campaignBudget(campaign), items: result.map(serializeItem), count: result.length });
    } catch (err) {
        console.error("Unable to save campaign plan:", err);
        return error("Unable to save campaign plan.", 500);
    }
}
