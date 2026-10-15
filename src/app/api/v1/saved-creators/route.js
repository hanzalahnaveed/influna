import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeCreator } from "@/lib/creators";

const jsonError = (message, status) => NextResponse.json({ error: message }, { status });
const creatorInclude = {
    socialAccounts: {
        orderBy: { createdAt: "asc" },
        include: {
            snapshots: { orderBy: { observedAt: "desc" }, take: 1 },
            audienceInsights: { orderBy: { observedAt: "desc" }, take: 1 },
        },
    },
};

export async function GET() {
    const auth = await requireRole("BRAND");
    if (auth.response) return auth.response;
    try {
        const saved = await prisma.savedCreator.findMany({
            where: { userId: auth.user.id, creator: { isPublic: true } },
            include: { creator: { include: creatorInclude } },
            orderBy: { createdAt: "desc" },
        });
        return NextResponse.json({
            creators: saved.map((item) => ({
                saved_at: item.createdAt.toISOString(),
                ...serializeCreator(item.creator),
            })),
        });
    } catch (error) {
        console.error("Failed to load saved creators:", error);
        return jsonError("Unable to load saved creators.", 500);
    }
}

export async function POST(request) {
    const auth = await requireRole("BRAND");
    if (auth.response) return auth.response;
    let body;
    try { body = await request.json(); } catch { return jsonError("Request body must be valid JSON.", 400); }
    const creatorId = typeof body?.creator_id === "string" ? body.creator_id.trim() : "";
    if (!creatorId) return jsonError("creator_id is required.", 400);
    try {
        const creator = await prisma.creatorProfile.findFirst({
            where: { id: creatorId, isPublic: true },
            select: { id: true },
        });
        if (!creator) return jsonError("Public creator profile not found.", 404);
        await prisma.savedCreator.create({ data: { userId: auth.user.id, creatorId: creator.id } });
        return NextResponse.json({ saved: true, creator_id: creator.id }, { status: 201 });
    } catch (error) {
        if (error?.code === "P2002") return jsonError("Creator is already saved.", 409);
        console.error("Failed to save creator:", error);
        return jsonError("Unable to save creator.", 500);
    }
}
