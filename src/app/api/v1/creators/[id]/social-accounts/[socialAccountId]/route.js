import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_request, context) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    if (user.role !== "CREATOR") return NextResponse.json({ error: "Creator account required." }, { status: 403 });

    const { id: creatorId, socialAccountId } = await context.params;
    try {
        const account = await prisma.socialAccount.findFirst({
            where: { id: socialAccountId, creatorId, creator: { ownerUserId: user.id } },
            select: { id: true },
        });
        if (!account) return NextResponse.json({ error: "Social account not found." }, { status: 404 });
        await prisma.socialAccount.delete({ where: { id: account.id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to remove social account:", error);
        return NextResponse.json({ error: "Unable to remove social account." }, { status: 500 });
    }
}
