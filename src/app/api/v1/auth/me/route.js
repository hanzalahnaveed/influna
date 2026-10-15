import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ user: null }, { status: 401 });

    const creatorProfile = user.role === "CREATOR"
        ? await prisma.creatorProfile.findUnique({ where: { ownerUserId: user.id }, select: { id: true } })
        : null;

    return NextResponse.json({
        user: { ...user, creator_profile_id: creatorProfile?.id ?? null },
    });
}
