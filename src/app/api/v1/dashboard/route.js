import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const groupedCounts = await prisma.campaign.groupBy({
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
