import { NextResponse } from "next/server";
import { creatorInputSchema, serializeCreator } from "@/lib/creators";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

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

export async function GET(request) {
    const query = request.nextUrl.searchParams;
    const search = query.get("search")?.trim();
    const country = query.get("country")?.trim();

    try {
        const creators = await prisma.creatorProfile.findMany({
            where: {
                isPublic: true,
                ...(country ? { country: { equals: country, mode: "insensitive" } } : {}),
                ...(search ? {
                    OR: [
                        { displayName: { contains: search, mode: "insensitive" } },
                        { bio: { contains: search, mode: "insensitive" } },
                        { categories: { hasSome: [search.toLowerCase(), search] } },
                    ],
                } : {}),
            },
            include: creatorInclude,
            orderBy: { createdAt: "desc" },
            take: 100,
        });
        return NextResponse.json(creators.map(serializeCreator));
    } catch (error) {
        console.error("Failed to list creators:", error);
        return jsonError("Unable to load creators.", 500);
    }
}

export async function POST(request) {
    const auth = await requireRole("CREATOR");
    if (auth.response) return auth.response;
    let body;
    try {
        body = await request.json();
    } catch {
        return jsonError("Request body must be valid JSON.", 400);
    }

    const parsed = creatorInputSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid creator data.", 400, parsed.error.flatten());
    const input = parsed.data;

    try {
        const profileData = {
            displayName: input.display_name,
            bio: input.bio ?? null,
            categories: input.categories ?? [],
            country: input.country ?? null,
            city: input.city ?? null,
            languages: input.languages ?? [],
            isPublic: input.is_public ?? false,
        };
        const socialAccounts = input.social_accounts?.length ? {
            create: input.social_accounts.map((account) => ({
                platform: account.platform,
                handle: account.handle.replace(/^@/, ""),
                profileUrl: account.profile_url ?? null,
            })),
        } : undefined;

        const creator = await prisma.creatorProfile.upsert({
            where: { ownerUserId: auth.user.id },
            create: {
                ...profileData,
                ownerUserId: auth.user.id,
                socialAccounts,
            },
            update: {
                ...profileData,
                socialAccounts,
            },
            include: creatorInclude,
        });
        return NextResponse.json(serializeCreator(creator, { includePrivateVerificationFeedback: true }), { status: 201 });
    } catch (error) {
        if (error?.code === "P2002") return jsonError("That social platform and handle are already registered.", 409);
        console.error("Failed to create creator:", error);
        return jsonError("Unable to create creator.", 500);
    }
}
