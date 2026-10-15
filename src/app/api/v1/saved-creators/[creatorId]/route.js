import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_request, context) {
    const auth = await requireRole("BRAND");
    if (auth.response) return auth.response;
    const { creatorId } = await context.params;
    try {
        const result = await prisma.savedCreator.deleteMany({
            where: { userId: auth.user.id, creatorId },
        });
        if (!result.count) return NextResponse.json({ error: "Saved creator not found." }, { status: 404 });
        return NextResponse.json({ saved: false, creator_id: creatorId });
    } catch (error) {
        console.error("Failed to remove saved creator:", error);
        return NextResponse.json({ error: "Unable to remove saved creator." }, { status: 500 });
    }
}
