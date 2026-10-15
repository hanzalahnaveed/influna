import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request) {
    const auth = await requireRole("BRAND", "CREATOR", "ADMIN");
    if (auth.response) return auth.response;

    const search = request.nextUrl.searchParams;
    const unreadOnly = search.get("unread") === "true";
    const limit = Math.min(100, Math.max(1, Number.parseInt(search.get("limit") || "50", 10) || 50));
    try {
        const where = { userId: auth.user.id, ...(unreadOnly ? { readAt: null } : {}) };
        const [items, unreadCount] = await Promise.all([
            prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: limit }),
            prisma.notification.count({ where: { userId: auth.user.id, readAt: null } }),
        ]);
        return NextResponse.json({
            notifications: items.map((item) => ({
                id: item.id,
                type: item.type,
                title: item.title,
                message: item.message,
                href: item.href,
                is_read: Boolean(item.readAt),
                read_at: item.readAt?.toISOString() ?? null,
                created_at: item.createdAt.toISOString(),
            })),
            unread_count: unreadCount,
        }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        console.error("Failed to load notifications:", error);
        return NextResponse.json({ error: "Unable to load notifications." }, { status: 500 });
    }
}

export async function PATCH(request) {
    const auth = await requireRole("BRAND", "CREATOR", "ADMIN");
    if (auth.response) return auth.response;
    let body;
    try { body = await request.json(); } catch {
        return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }
    const now = new Date();
    try {
        if (body?.action === "mark_all_read") {
            const result = await prisma.notification.updateMany({
                where: { userId: auth.user.id, readAt: null },
                data: { readAt: now },
            });
            return NextResponse.json({ updated_count: result.count });
        }
        if (body?.action === "mark_read" && typeof body.id === "string" && body.id.length <= 100) {
            const result = await prisma.notification.updateMany({
                where: { id: body.id, userId: auth.user.id, readAt: null },
                data: { readAt: now },
            });
            if (result.count === 0) {
                const exists = await prisma.notification.findFirst({ where: { id: body.id, userId: auth.user.id }, select: { id: true } });
                if (!exists) return NextResponse.json({ error: "Notification not found." }, { status: 404 });
            }
            return NextResponse.json({ id: body.id, is_read: true });
        }
        return NextResponse.json({ error: "Use action mark_read with an id or mark_all_read." }, { status: 400 });
    } catch (error) {
        console.error("Failed to update notifications:", error);
        return NextResponse.json({ error: "Unable to update notifications." }, { status: 500 });
    }
}
