"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiBarChart2, FiCheckCircle, FiClock, FiRefreshCw, FiUsers, FiAlertTriangle } from "react-icons/fi";

const secondary = "inline-flex items-center justify-center gap-2 rounded-lg border border-[#D9DEE7] bg-white px-3 py-2 text-sm font-semibold text-[#495057] transition hover:bg-[#F8F9FA] disabled:cursor-not-allowed disabled:opacity-50";

function number(value) {
    return new Intl.NumberFormat("en").format(value || 0);
}
function dateLabel(value) {
    return value ? new Date(value).toLocaleDateString() : "—";
}
function Metric({ label, value, hint, icon: Icon, warning = false }) {
    return <article className="rounded-xl border border-[#E3E7ED] bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3"><p className="text-sm text-[#6B7280]">{label}</p><span className={"rounded-lg p-2 " + (warning ? "bg-amber-50 text-amber-700" : "bg-orange-50 text-[#FA8500]")}><Icon size={18} /></span></div>
        <p className="mt-3 text-2xl font-bold tracking-tight">{typeof value === "string" ? value : number(value)}</p>
        {hint && <p className="mt-1 text-xs text-[#6B7280]">{hint}</p>}
    </article>;
}

export default function CampaignReportsPage() {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    async function loadReport() {
        setLoading(true);
        setError("");
        try {
            const response = await fetch("/api/v1/reports/campaigns", { cache: "no-store" });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not load campaign reports.");
            setReport(data);
        } catch (err) {
            setError(err.message || "Could not load campaign reports.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { loadReport(); }, []);

    const totals = report?.totals;
    return <main className="flex flex-col gap-6 pb-8 text-[#212529]">
        <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#FA8500]">Campaign intelligence</p>
                <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">Campaign reports</h1>
                <p className="mt-1 max-w-2xl text-sm text-[#6B7280]">Track collaboration progress, deliverable approvals, and overdue work across your campaigns.</p>
            </div>
            <button className={secondary} type="button" onClick={loadReport} disabled={loading}><FiRefreshCw size={14} /> Refresh</button>
        </header>

        <div role="note" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900">
            These are operational workflow metrics from Influna records, not verified social-platform reach, engagement, sales, or ROI. Shipment and campaign activity are entered manually.
        </div>
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {loading && !report ? <div className="rounded-xl border border-[#E3E7ED] bg-white p-8 text-center text-sm text-[#6B7280]">Loading reports…</div> : null}
        {report && <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                <Metric label="Campaigns" value={totals.campaigns} hint="All campaigns you own" icon={FiBarChart2} />
                <Metric label="Creator collaborations" value={totals.creators} hint="Unique campaign-creator records" icon={FiUsers} />
                <Metric label="Completed collaborations" value={totals.completed_collaborations} hint={totals.active_collaborations + " currently in progress"} icon={FiCheckCircle} />
                <Metric label="Overdue deliverables" value={totals.overdue_deliverables} hint="Past deadline and not approved" icon={FiAlertTriangle} warning={totals.overdue_deliverables > 0} />
                <Metric label="Approved deliverables" value={totals.approved_deliverables} hint={totals.deliverables + " total deliverables"} icon={FiCheckCircle} />
                <Metric label="On-time approval rate" value={totals.on_time_approval_rate === null ? "—" : totals.on_time_approval_rate + "%"} hint="Approved items with deadlines" icon={FiClock} />
            </section>

            <section className="rounded-xl border border-[#E3E7ED] bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-lg font-semibold">Campaign breakdown</h2><p className="mt-1 text-sm text-[#6B7280]">Per-campaign collaboration funnel and deliverable status.</p></div><p className="text-xs text-[#6B7280]">Updated {new Date(report.generated_at).toLocaleString()}</p></div>
                {report.campaigns.length === 0 ? <div className="py-10 text-center"><p className="font-semibold">No campaigns yet</p><p className="mt-1 text-sm text-[#6B7280]">Create a campaign to start tracking its progress.</p><Link href="/dashboard/campaign" className="mt-4 inline-flex rounded-lg bg-[#FA8500] px-4 py-2.5 text-sm font-semibold text-white">Open campaigns</Link></div> : <div className="mt-4 space-y-4">
                    {report.campaigns.map((campaign) => <article key={campaign.id} className="rounded-xl border border-[#E3E7ED] p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="font-semibold">{campaign.title}</h3><p className="mt-1 text-xs text-[#6B7280]">Created {dateLabel(campaign.created_at)} · Campaign status: {campaign.status}</p></div><Link href="/dashboard/campaign-workflow" className="text-sm font-semibold text-[#B85F00] hover:underline">Open workflow →</Link></div>
                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
                            <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-[#6B7280]">Creators</p><p className="mt-1 text-xl font-bold">{number(campaign.creators.total)}</p></div>
                            <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-[#6B7280]">Accepted / in progress</p><p className="mt-1 text-xl font-bold">{number(campaign.creators.accepted + campaign.creators.submitted + campaign.creators.changes_requested + campaign.creators.approved)}</p></div>
                            <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-[#6B7280]">Deliverables approved</p><p className="mt-1 text-xl font-bold">{campaign.deliverables.approved} / {campaign.deliverables.total}</p></div>
                            <div className={"rounded-lg p-3 " + (campaign.deliverables.overdue ? "bg-amber-50" : "bg-slate-50")}><p className="text-xs text-[#6B7280]">Overdue</p><p className="mt-1 text-xl font-bold">{number(campaign.deliverables.overdue)}</p></div>
                            <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-[#6B7280]">Creator acceptance</p><p className="mt-1 text-xl font-bold">{campaign.acceptance_rate === null ? "—" : campaign.acceptance_rate + "%"}</p></div>
                            <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-[#6B7280]">Average profile fit</p><p className="mt-1 text-xl font-bold">{campaign.creators.average_match_score === null ? "—" : campaign.creators.average_match_score + "%"}</p></div>
                            <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-[#6B7280]">On-time approvals</p><p className="mt-1 text-xl font-bold">{campaign.deliverables.on_time_approval_rate === null ? "—" : campaign.deliverables.on_time_approval_rate + "%"}</p></div>
                        </div>
                        {campaign.deliverables.total > 0 ? <div className="mt-4"><div className="mb-1 flex items-center justify-between text-xs"><span className="font-medium text-[#495057]">Deliverable approval progress</span><span className="font-semibold">{campaign.deliverables.completion_rate}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#FA8500] transition-all" style={{ width: campaign.deliverables.completion_rate + "%" }} /></div><div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{campaign.deliverables.pending} pending</span><span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-700">{campaign.deliverables.submitted} submitted</span><span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">{campaign.deliverables.changes_requested} revisions</span><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">{campaign.deliverables.approved} approved</span></div></div> : <p className="mt-4 text-xs text-[#6B7280]">No deliverable requirements have been added to this campaign yet.</p>}
                    </article>)}
                </div>}
            </section>
        </>}
    </main>;
}
