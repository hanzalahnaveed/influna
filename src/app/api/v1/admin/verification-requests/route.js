import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const auth = await requireRole("ADMIN");
    if (auth.response) return auth.response;

    try {
        const accounts = await prisma.socialAccount.findMany({
            where: { verificationStatus: "PENDING" },
            select: {
                id: true,
                platform: true,
                handle: true,
                profileUrl: true,
                verificationRequestedAt: true,
                verificationRequestNote: true,
                verificationEvidenceUrl: true,
                creator: {
                    select: {
                        id: true,
                        displayName: true,
                        country: true,
                        city: true,
                        ownerUserId: true,
                    },
                },
            },
            orderBy: { verificationRequestedAt: "asc" },
            take: 100,
        });
        return NextResponse.json({
            count: accounts.length,
            requests: accounts.map((account) => ({
                social_account_id: account.id,
                platform: account.platform,
                handle: account.handle,
                profile_url: account.profileUrl,
                requested_at: account.verificationRequestedAt?.toISOString() ?? null,
                request_note: account.verificationRequestNote,
                evidence_url: account.verificationEvidenceUrl,
                creator: {
                    id: account.creator.id,
                    display_name: account.creator.displayName,
                    country: account.creator.country,
                    city: account.creator.city,
                    owner_user_id: account.creator.ownerUserId,
                },
            })),
        });
    } catch (cause) {
        console.error("Failed to list verification requests:", cause);
        return NextResponse.json({ error: "Unable to load verification requests." }, { status: 500 });
    }
}
