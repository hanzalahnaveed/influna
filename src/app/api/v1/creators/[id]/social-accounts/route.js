import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const platforms = ["Instagram", "TikTok", "YouTube", "Facebook", "Other"];

export async function POST(request, context) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    if (user.role !== "CREATOR") return NextResponse.json({ error: "Creator account required." }, { status: 403 });

    const { id: creatorId } = await context.params;
    let body;
    try { body = await request.json(); } catch {
        return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }

    const platform = body?.platform;
    const handle = typeof body?.handle === "string" ? body.handle.trim().replace(/^@/, "") : "";
    const profileUrl = body?.profile_url == null || body.profile_url === "" ? null : body.profile_url;
    if (!platforms.includes(platform)) return NextResponse.json({ error: "Unsupported social platform." }, { status: 400 });
    if (!handle || handle.length > 200) return NextResponse.json({ error: "Handle is required and must be 200 characters or fewer." }, { status: 400 });
    if (profileUrl !== null) {
        if (typeof profileUrl !== "string" || profileUrl.length > 2048) return NextResponse.json({ error: "Profile URL is invalid." }, { status: 400 });
        try { const parsed = new URL(profileUrl); if (!["http:", "https:"].includes(parsed.protocol)) throw new Error(); } catch {
            return NextResponse.json({ error: "Profile URL must be a valid HTTP or HTTPS URL." }, { status: 400 });
        }
    }

    try {
        const creator = await prisma.creatorProfile.findFirst({ where: { id: creatorId, ownerUserId: user.id }, select: { id: true } });
        if (!creator) return NextResponse.json({ error: "Creator profile not found." }, { status: 404 });
        const account = await prisma.socialAccount.create({
            data: { creatorId, platform, handle, profileUrl, dataSource: "creator_provided" },
            select: { id: true, platform: true, handle: true, profileUrl: true, dataSource: true, createdAt: true },
        });
        return NextResponse.json({
            account: {
                id: account.id,
                platform: account.platform,
                handle: account.handle,
                profile_url: account.profileUrl,
                account_data_source: account.dataSource,
                created_at: account.createdAt.toISOString(),
            },
        }, { status: 201 });
    } catch (error) {
        if (error?.code === "P2002") return NextResponse.json({ error: "That platform and handle are already registered." }, { status: 409 });
        console.error("Failed to add social account:", error);
        return NextResponse.json({ error: "Unable to add social account." }, { status: 500 });
    }
}
