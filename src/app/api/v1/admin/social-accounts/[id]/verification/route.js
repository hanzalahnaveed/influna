import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function error(message, status) {
    return NextResponse.json({ error: message }, { status });
}

export async function PATCH(request, context) {
    const auth = await requireRole("ADMIN");
    if (auth.response) return auth.response;

    const { id } = await context.params;
    let body;
    try {
        body = await request.json();
    } catch {
        return error("Request body must be valid JSON.", 400);
    }

    const decision = body?.decision;
    const reviewNote = body?.review_note == null ? null : body.review_note;
    if (!["verified", "rejected"].includes(decision)) {
        return error('Decision must be either "verified" or "rejected".', 400);
    }
    if (reviewNote !== null && (typeof reviewNote !== "string" || reviewNote.trim().length > 1000)) {
        return error("Review note must be 1,000 characters or fewer.", 400);
    }

    try {
        const account = await prisma.socialAccount.findUnique({
            where: { id },
            select: { id: true, verificationStatus: true, verificationRequestedAt: true },
        });
        if (!account) return error("Social account not found.", 404);
        if (account.verificationStatus !== "PENDING" || !account.verificationRequestedAt) {
            return error("Only pending verification requests can be reviewed.", 409);
        }

        const reviewedAt = new Date();
        const updated = await prisma.socialAccount.update({
            where: { id },
            data: {
                verificationStatus: decision === "verified" ? "VERIFIED" : "REJECTED",
                verifiedAt: decision === "verified" ? reviewedAt : null,
                verificationReviewedAt: reviewedAt,
                verificationReviewedByUserId: auth.user.id,
                verificationReviewNote: reviewNote?.trim() || null,
            },
            select: {
                id: true,
                platform: true,
                handle: true,
                verificationStatus: true,
                verificationRequestedAt: true,
                verificationReviewedAt: true,
                verificationReviewNote: true,
                verifiedAt: true,
            },
        });
        return NextResponse.json({
            social_account_id: updated.id,
            platform: updated.platform,
            handle: updated.handle,
            verification_status: updated.verificationStatus.toLowerCase(),
            requested_at: updated.verificationRequestedAt?.toISOString() ?? null,
            reviewed_at: updated.verificationReviewedAt?.toISOString() ?? null,
            review_note: updated.verificationReviewNote,
            verified_at: updated.verifiedAt?.toISOString() ?? null,
        });
    } catch (cause) {
        console.error("Failed to review social account verification:", cause);
        return error("Unable to review verification request.", 500);
    }
}
