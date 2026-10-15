import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function jsonError(message, status) {
    return NextResponse.json({ error: message }, { status });
}

export async function GET() {
    const auth = await requireRole("BRAND");
    if (auth.response) return auth.response;

    try {
        const campaigns = await prisma.campaign.findMany({
            where: { ownerUserId: auth.user.id },
            include: {
                creatorLinks: {
                    include: {
                        deliverables: {
                            select: { id: true, status: true, dueAt: true, updatedAt: true },
                        },
                    },
                },
            },
            orderBy: { updatedAt: "desc" },
        });

        const now = new Date();
        const reports = campaigns.map((campaign) => {
            const links = campaign.creatorLinks;
            const deliverables = links.flatMap((link) => link.deliverables);
            const countStatus = (status) => links.filter((link) => link.status === status).length;
            const approvedDeliverables = deliverables.filter((item) => item.status === "Approved").length;
            const overdueDeliverables = deliverables.filter((item) =>
                item.dueAt && item.dueAt < now && !["Approved", "Completed"].includes(item.status)
            ).length;
            const dueDeliverables = deliverables.filter((item) => item.dueAt);
            const onTimeApproved = dueDeliverables.filter((item) =>
                item.status === "Approved" && item.updatedAt <= item.dueAt
            ).length;

            return {
                id: campaign.id,
                title: campaign.campaignDetails?.campaign_title || "Untitled campaign",
                status: campaign.status,
                created_at: campaign.createdAt.toISOString(),
                updated_at: campaign.updatedAt.toISOString(),
                creators: {
                    total: links.length,
                    average_match_score: links.filter((link) => Number.isFinite(link.matchScore)).length
                        ? Math.round(links.reduce((sum, link) => sum + (Number.isFinite(link.matchScore) ? link.matchScore : 0), 0) / links.filter((link) => Number.isFinite(link.matchScore)).length)
                        : null,
                    suggested: countStatus("Suggested"),
                    invited: countStatus("Invited"),
                    applied: countStatus("Applied"),
                    accepted: countStatus("Accepted"),
                    declined: countStatus("Declined"),
                    submitted: countStatus("ContentSubmitted"),
                    changes_requested: countStatus("ChangesRequested"),
                    approved: countStatus("Approved"),
                    completed: countStatus("Completed"),
                    cancelled: countStatus("Cancelled"),
                    withdrawn: countStatus("Withdrawn"),
                },
                deliverables: {
                    total: deliverables.length,
                    pending: deliverables.filter((item) => item.status === "Pending").length,
                    submitted: deliverables.filter((item) => item.status === "Submitted").length,
                    changes_requested: deliverables.filter((item) => item.status === "ChangesRequested").length,
                    approved: approvedDeliverables,
                    overdue: overdueDeliverables,
                    completion_rate: deliverables.length ? Math.round((approvedDeliverables / deliverables.length) * 100) : null,
                    approved_by_deadline: onTimeApproved,
                    approved_with_deadline: deliverables.filter((item) => item.status === "Approved" && item.dueAt).length,
                    with_deadline: dueDeliverables.length,
                    on_time_approval_rate: deliverables.filter((item) => item.status === "Approved" && item.dueAt).length
                        ? Math.round((onTimeApproved / deliverables.filter((item) => item.status === "Approved" && item.dueAt).length) * 100)
                        : null,
                },
                acceptance_rate: (() => {
                    const acceptedPath = links.filter((link) => ["Accepted", "ContentSubmitted", "ChangesRequested", "Approved", "Completed"].includes(link.status)).length;
                    const decided = acceptedPath + countStatus("Declined");
                    return decided ? Math.round((acceptedPath / decided) * 100) : null;
                })(),
            };
        });

        const totals = reports.reduce((sum, report) => ({
            campaigns: sum.campaigns + 1,
            creators: sum.creators + report.creators.total,
            active_collaborations: sum.active_collaborations + report.creators.accepted + report.creators.submitted + report.creators.changes_requested + report.creators.approved,
            completed_collaborations: sum.completed_collaborations + report.creators.completed,
            deliverables: sum.deliverables + report.deliverables.total,
            approved_deliverables: sum.approved_deliverables + report.deliverables.approved,
            overdue_deliverables: sum.overdue_deliverables + report.deliverables.overdue,
            on_time_approved_deliverables: sum.on_time_approved_deliverables + report.deliverables.approved_by_deadline,
            approved_deliverables_with_deadline: sum.approved_deliverables_with_deadline + report.deliverables.approved_with_deadline,
            deliverables_with_deadline: sum.deliverables_with_deadline + report.deliverables.with_deadline,
        }), {
            campaigns: 0, creators: 0, active_collaborations: 0, completed_collaborations: 0,
            deliverables: 0, approved_deliverables: 0, overdue_deliverables: 0,
            on_time_approved_deliverables: 0, approved_deliverables_with_deadline: 0, deliverables_with_deadline: 0,
        });
        totals.on_time_approval_rate = totals.approved_deliverables_with_deadline
            ? Math.round((totals.on_time_approved_deliverables / totals.approved_deliverables_with_deadline) * 100)
            : null;

        return NextResponse.json({ generated_at: now.toISOString(), totals, campaigns: reports });
    } catch (error) {
        console.error("Failed to build campaign reports:", error);
        return jsonError("Unable to load campaign reports.", 500);
    }
}
