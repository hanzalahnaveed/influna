import { cookies } from "next/headers";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { prisma } from "@/lib/prisma";

const scrypt = promisify(scryptCallback);
export const SESSION_COOKIE = "influna_session";
const SESSION_DAYS = 14;

export function normalizeEmail(value) {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isValidEmail(value) {
    return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function hashPassword(password) {
    const salt = randomBytes(16).toString("hex");
    const derived = await scrypt(password, salt, 64);
    return `scrypt$${salt}$${Buffer.from(derived).toString("hex")}`;
}

export async function verifyPassword(password, stored) {
    try {
        const [algorithm, salt, expectedHex] = stored.split("$");
        if (algorithm !== "scrypt" || !salt || !expectedHex) return false;
        const expected = Buffer.from(expectedHex, "hex");
        const actual = Buffer.from(await scrypt(password, salt, expected.length));
        return expected.length === actual.length && timingSafeEqual(expected, actual);
    } catch {
        return false;
    }
}

function tokenDigest(token) {
    return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId) {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
    await prisma.session.create({
        data: { userId, tokenHash: tokenDigest(token), expiresAt },
    });
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        expires: expiresAt,
    });
}

export async function destroySession() {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (token) {
        await prisma.session.deleteMany({ where: { tokenHash: tokenDigest(token) } });
    }
    cookieStore.set(SESSION_COOKIE, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        expires: new Date(0),
    });
}

export async function getCurrentUser() {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const session = await prisma.session.findUnique({
        where: { tokenHash: tokenDigest(token) },
        include: { user: { select: { id: true, email: true, role: true } } },
    });
    if (!session) return null;
    if (session.expiresAt <= new Date()) {
        await prisma.session.deleteMany({ where: { id: session.id } });
        return null;
    }
    return session.user;
}

export async function requireRole(...roles) {
    const user = await getCurrentUser();
    if (!user) return { user: null, response: Response.json({ error: "Authentication required." }, { status: 401 }) };
    if (roles.length && !roles.includes(user.role)) {
        return { user: null, response: Response.json({ error: "You do not have permission to perform this action." }, { status: 403 }) };
    }
    return { user, response: null };
}
