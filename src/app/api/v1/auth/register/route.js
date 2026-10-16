import { NextResponse } from "next/server";
import { createSession, hashPassword, isValidEmail, normalizeEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request) {
    let body;
    try { body = await request.json(); } catch {
        return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }

    const email = normalizeEmail(body?.email);
    const password = body?.password;
    const role = body?.role;
    const displayName = typeof body?.display_name === "string" ? body.display_name.trim() : "";

    if (!isValidEmail(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    if (typeof password !== "string" || password.length < 4 || password.length > 128) {
        return NextResponse.json({ error: "Password must be between 4 and 128 characters." }, { status: 400 });
    }
    if (!["BRAND", "CREATOR"].includes(role)) return NextResponse.json({ error: "Role must be BRAND or CREATOR." }, { status: 400 });
    if (role === "CREATOR" && (displayName.length < 2 || displayName.length > 100)) {
        return NextResponse.json({ error: "Creator accounts require a display_name between 2 and 100 characters." }, { status: 400 });
    }

    try {
        const passwordHash = await hashPassword(password);
        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                role,
                ...(role === "CREATOR" ? { creatorProfile: { create: { displayName, isPublic: false } } } : {}),
            },
            select: { id: true, email: true, role: true },
        });
        await createSession(user.id);
        return NextResponse.json({ user }, { status: 201 });
    } catch (error) {
        if (error?.code === "P2002") return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
        console.error("Registration failed:", error);
        return NextResponse.json({ error: "Unable to create account." }, { status: 500 });
    }
}
