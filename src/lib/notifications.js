import { prisma } from "@/lib/prisma";

export async function createNotification({ userId, type, title, message, href = null }) {
    if (!userId || !type || !title || !message) return null;
    try {
        return await prisma.notification.create({
            data: {
                userId,
                type: String(type).slice(0, 60),
                title: String(title).slice(0, 160),
                message: String(message).slice(0, 500),
                href: typeof href === "string" && href.startsWith("/") && !href.startsWith("//") ? href.slice(0, 500) : null,
            },
        });
    } catch (error) {
        // Notification delivery must not roll back a successfully completed business action.
        console.error("Failed to create in-app notification:", error);
        return null;
    }
}
