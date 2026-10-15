import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function error(message, status) {
    return NextResponse.json({ error: message }, { status });
}

export async function POST(request, context) {
    const user = await getCurrentUser();
    if (!user) return error("Authentication required.", 401);
    if (user.role !== "CREATOR") return error("Creator account required.", 403);

    const { id: creatorId, socialAccountId } = await context.params;
    let body;
    try {
        body = await request.json();
    } catch {
        return error("Request body must be valid JSON.", 400);
    }

    const note = body?.request_note == null ? null : body.request_note;
    const evidenceUrl = body?.evidence_url == null || body.evidence_url === "" ? null : body.evidence_url;
    if (note !== null && (typeof note !== "string" || note.trim().length > 1000)) {
        return error("Request note must be 1,000 characters or fewer.", 400);
    }
    if (evidenceUrl !== null) {
        if (typeof evidenceUrl !== "string" || evidenceUrl.length > 2048) return error("Evidence URL is invalid.", 400);
        try {
            const parsed = new URL(evidenceUrl);
            if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
        } catch {
            return error("Evidence URL must be a valid HTTP or HTTPS URL.", 400);
        }
    }

    try {
        const account = await prisma.socialAccount.findFirst({
            where: { id: socialAccountId, creatorId, creator: { ownerUserId: user.id } },
            select: { id: true, verifiedAt: true, verificationStatus: true },
        });
        if (!account) return error("Social account not found.", 404);
        if (account.verifiedAt || account.verificationStatus === "VERIFIED") {
            return error("This social account is already verified.", 409);
        }
        if (account.verificationStatus === "PENDING") {
            return error("A verification request is already pending review.", 409);
        }

        const updated = await prisma.socialAccount.update({
            where: { id: socialAccountId },
            data: {
                verificationStatus: "PENDING",
                verificationRequestedAt: new Date(),
                verificationRequestNote: note?.trim() || null,
                verificationEvidenceUrl: evidenceUrl,
                verificationReviewedAt: null,
                verificationReviewedByUserId: null,
                verificationReviewNote: null,
                verifiedAt: null,
            },
            select: { id: true, verificationStatus: true, verificationRequestedAt: true },
        });
        return NextResponse.json({
            social_account_id: updated.id,
            verification_status: updated.verificationStatus.toLowerCase(),
            requested_at: updated.verificationRequestedAt.toISOString(),
            message: "Verification request submitted. A reviewer must approve it before the account is marked verified.",
        }, { status: 201 });
    } catch (cause) {
        console.error("Failed to submit verification request:", cause);
        return error("Unable to submit verification request.", 500);
    }
}
