import { NextResponse } from "next/server";
import { creatorPatchSchema, serializeCreator } from "@/lib/creators";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireRole } from "@/lib/auth";

function jsonError(message, status, details) {
    return NextResponse.json({ error: message, ...(details && { details }) }, { status });
}

const creatorInclude = {
    socialAccounts: {
        orderBy: { createdAt: "asc" },
        include: {
            snapshots: { orderBy: { observedAt: "desc" }, take: 1 },
            audienceInsights: { orderBy: { observedAt: "desc" }, take: 1 },
        },
    },
};

export async function GET(_request, context) {
    const { id } = await context.params;
    try {
        const user = await getCurrentUser();
        const creator = await prisma.creatorProfile.findUnique({ where: { id }, include: creatorInclude });
        if (!creator || (!creator.isPublic && creator.ownerUserId !== user?.id)) return jsonError("Creator not found.", 404);
        return NextResponse.json(serializeCreator(creator));
    } catch (error) {
        console.error("Failed to load creator:", error);
        return jsonError("Unable to load creator.", 500);
    }
}

export async function PATCH(request, context) {
    const auth = await requireRole("CREATOR");
    if (auth.response) return auth.response;
    const { id } = await context.params;
    let body;
    try {
        body = await request.json();
    } catch {
        return jsonError("Request body must be valid JSON.", 400);
    }

    const parsed = creatorPatchSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid creator data.", 400, parsed.error.flatten());
    const input = parsed.data;

    try {
        const existing = await prisma.creatorProfile.findFirst({ where: { id, ownerUserId: auth.user.id } });
        if (!existing) return jsonError("Creator not found.", 404);

        const creator = await prisma.creatorProfile.update({
            where: { id },
            data: {
                ...(input.display_name !== undefined ? { displayName: input.display_name } : {}),
                ...(input.bio !== undefined ? { bio: input.bio } : {}),
                ...(input.categories !== undefined ? { categories: input.categories } : {}),
                ...(input.country !== undefined ? { country: input.country } : {}),
                ...(input.city !== undefined ? { city: input.city } : {}),
                ...(input.languages !== undefined ? { languages: input.languages } : {}),
                ...(input.is_public !== undefined ? { isPublic: input.is_public } : {}),
            },
            include: creatorInclude,
        });
        return NextResponse.json(serializeCreator(creator));
    } catch (error) {
        console.error("Failed to update creator:", error);
        return jsonError("Unable to update creator.", 500);
    }
}
