import { NextResponse } from "next/server";
import { createSession, normalizeEmail, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request) {
    let body;
    try { body = await request.json(); } catch {
        return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }
    const email = normalizeEmail(body?.email);
    const password = body?.password;
    if (!email || typeof password !== "string" || password.length > 128) {
        return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !(await verifyPassword(password, user.passwordHash))) {
            return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
        }
        await createSession(user.id);
        return NextResponse.json({ user: { id: user.id, email: user.email, role: user.role } });
    } catch (error) {
        console.error("Login failed:", error);
        return NextResponse.json({ error: "Unable to sign in." }, { status: 500 });
    }
}
