import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const platforms = ["Instagram", "TikTok", "YouTube", "Facebook", "Other"];
const currencies = ["USD", "PKR", "GBP", "EUR", "AED", "SAR", "INR", "CAD", "AUD"];
const schema = z.object({
    platform: z.enum(platforms),
    deliverable_type: z.string().trim().min(2).max(120),
    price: z.number().finite().positive().max(9999999999.99),
    currency: z.enum(currencies).default("USD"),
    notes: z.string().trim().max(1000).optional().nullable(),
    is_public: z.boolean().optional(),
}).strict();
const error = (message, status, details) => NextResponse.json({ error: message, ...(details ? { details } : {}) }, { status });

async function ownedProfile(userId) {
    return prisma.creatorProfile.findUnique({ where: { ownerUserId: userId }, select: { id: true } });
}
function serialize(card) {
    return { id: card.id, platform: card.platform, deliverable_type: card.deliverableType, price: Number(card.price), currency: card.currency, notes: card.notes, is_public: card.isPublic, created_at: card.createdAt.toISOString(), updated_at: card.updatedAt.toISOString() };
}

export async function GET() {
    const auth = await requireRole("CREATOR");
    if (auth.response) return auth.response;
    try {
        const profile = await ownedProfile(auth.user.id);
        if (!profile) return NextResponse.json({ rate_cards: [] });
        const cards = await prisma.creatorRateCard.findMany({ where: { creatorId: profile.id }, orderBy: [{ platform: "asc" }, { deliverableType: "asc" }] });
        return NextResponse.json({ rate_cards: cards.map(serialize), currencies, platforms });
    } catch (err) {
        console.error("Unable to load creator rate cards:", err);
        return error("Unable to load rate cards.", 500);
    }
}

export async function POST(request) {
    const auth = await requireRole("CREATOR");
    if (auth.response) return auth.response;
    let body;
    try { body = await request.json(); } catch { return error("Request body must be valid JSON.", 400); }
    const parsed = schema.safeParse(body);
    if (!parsed.success) return error("Invalid rate card.", 400, parsed.error.flatten());
    try {
        const profile = await ownedProfile(auth.user.id);
        if (!profile) return error("Create your creator profile before adding rates.", 409);
        const input = parsed.data;
        const card = await prisma.creatorRateCard.upsert({
            where: { creatorId_platform_deliverableType: { creatorId: profile.id, platform: input.platform, deliverableType: input.deliverable_type } },
            create: { creatorId: profile.id, platform: input.platform, deliverableType: input.deliverable_type, price: input.price, currency: input.currency, notes: input.notes || null, isPublic: input.is_public ?? true },
            update: { price: input.price, currency: input.currency, notes: input.notes || null, isPublic: input.is_public ?? true },
        });
        return NextResponse.json(serialize(card), { status: 201 });
    } catch (err) {
        console.error("Unable to save creator rate card:", err);
        return error("Unable to save rate card.", 500);
    }
}

export async function PATCH(request) {
    const auth = await requireRole("CREATOR");
    if (auth.response) return auth.response;
    let body;
    try { body = await request.json(); } catch { return error("Request body must be valid JSON.", 400); }
    if (typeof body?.id !== "string" || !body.id) return error("Rate card id is required.", 400);
    const parsed = schema.partial().safeParse(Object.fromEntries(Object.entries(body).filter(([key]) => key !== "id")));
    if (!parsed.success || Object.keys(parsed.data || {}).length === 0) return error("Provide valid rate card fields.", 400, parsed.error?.flatten());
    try {
        const profile = await ownedProfile(auth.user.id);
        if (!profile) return error("Creator profile not found.", 404);
        const existing = await prisma.creatorRateCard.findFirst({ where: { id: body.id, creatorId: profile.id } });
        if (!existing) return error("Rate card not found.", 404);
        const input = parsed.data;
        const updated = await prisma.creatorRateCard.update({ where: { id: existing.id }, data: {
            ...(input.platform !== undefined ? { platform: input.platform } : {}),
            ...(input.deliverable_type !== undefined ? { deliverableType: input.deliverable_type } : {}),
            ...(input.price !== undefined ? { price: input.price } : {}),
            ...(input.currency !== undefined ? { currency: input.currency } : {}),
            ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
            ...(input.is_public !== undefined ? { isPublic: input.is_public } : {}),
        } });
        return NextResponse.json(serialize(updated));
    } catch (err) {
        console.error("Unable to update creator rate card:", err);
        return error(err?.code === "P2002" ? "A rate already exists for this platform and deliverable." : "Unable to update rate card.", err?.code === "P2002" ? 409 : 500);
    }
}

export async function DELETE(request) {
    const auth = await requireRole("CREATOR");
    if (auth.response) return auth.response;
    let body;
    try { body = await request.json(); } catch { return error("Request body must be valid JSON.", 400); }
    if (typeof body?.id !== "string" || !body.id) return error("Rate card id is required.", 400);
    try {
        const profile = await ownedProfile(auth.user.id);
        if (!profile) return error("Creator profile not found.", 404);
        const result = await prisma.creatorRateCard.deleteMany({ where: { id: body.id, creatorId: profile.id } });
        return result.count ? NextResponse.json({ deleted: true }) : error("Rate card not found.", 404);
    } catch (err) {
        console.error("Unable to delete creator rate card:", err);
        return error("Unable to delete rate card.", 500);
    }
}
