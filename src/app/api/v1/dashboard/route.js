import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export async function GET() {
    const auth = await requireRole("BRAND");
    if (auth.response) return auth.response;
    try {
        const groupedCounts = await prisma.campaign.groupBy({
            where: { ownerUserId: auth.user.id },
            by: ["status"],
            _count: { _all: true },
        });
        const counts = Object.fromEntries(
            groupedCounts.map(({ status, _count }) => [status, _count._all]),
        );

        return NextResponse.json({
            totalCampaigns: groupedCounts.reduce((total, item) => total + item._count._all, 0),
            activeCampaigns: counts.Active ?? 0,
            draftCampaigns: counts.Draft ?? 0,
            completedCampaigns: counts.Completed ?? 0,
            cancelledCampaigns: counts.Cancelled ?? 0,
        });
    } catch (error) {
        console.error("Failed to load dashboard summary:", error);
        return NextResponse.json({ error: "Unable to load dashboard summary." }, { status: 500 });
    }
}
