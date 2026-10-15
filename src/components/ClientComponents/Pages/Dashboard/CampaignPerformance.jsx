"use client";

import { useEffect, useState } from "react";
import { FiActivity, FiBarChart2, FiCheckCircle, FiClock, FiRefreshCw, FiTrendingUp, FiUsers } from "react-icons/fi";

const inputClass = "mt-1 w-full rounded-lg border border-[#D9DEE7] bg-white px-3 py-2 text-sm outline-none focus:border-[#FA8500] focus:ring-2 focus:ring-orange-100";
const primary = "inline-flex items-center justify-center gap-2 rounded-lg bg-[#FA8500] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#E77700] disabled:cursor-not-allowed disabled:opacity-50";
const secondary = "inline-flex items-center justify-center gap-2 rounded-lg border border-[#D9DEE7] bg-white px-3 py-2 text-sm font-semibold text-[#495057] transition hover:bg-[#F8F9FA] disabled:cursor-not-allowed disabled:opacity-50";
const metricFields = [
    ["impressions", "Impressions"], ["reach", "Reach"], ["likes", "Likes"], ["comments", "Comments"],
    ["shares", "Shares"], ["saves", "Saves"], ["clicks", "Link clicks"], ["conversions", "Conversions"],
];

function count(value) {
    return new Intl.NumberFormat("en").format(value || 0);
}
function dateLabel(value) {
    return value ? new Date(value).toLocaleDateString() : "—";
}
function emptyDraft() {
    return { platform: "Instagram", content_url: "", published_at: "", impressions: "", reach: "", likes: "", comments: "", shares: "", saves: "", clicks: "", conversions: "", attributed_revenue: "", currency: "USD", notes: "" };
}
function MetricCard({ label, value, hint, icon: Icon }) {
    return <article className="rounded-xl border border-[#E3E7ED] bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3"><p className="text-sm text-[#6B7280]">{label}</p><span className="rounded-lg bg-orange-50 p-2 text-[#FA8500]"><Icon size={18} /></span></div>
        <p className="mt-3 text-2xl font-bold tracking-tight">{count(value)}</p>
        {hint && <p className="mt-1 text-xs text-[#6B7280]">{hint}</p>}
    </article>;
}

export default function CampaignPerformance() {
    const [campaigns, setCampaigns] = useState([]);
    const [campaignId, setCampaignId] = useState("");
    const [report, setReport] = useState(null);
    const [drafts, setDrafts] = useState({});
    const [loadingCampaigns, setLoadingCampaigns] = useState(true);
    const [loadingReport, setLoadingReport] = useState(false);
    const [savingId, setSavingId] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    async function loadCampaigns() {
        setLoadingCampaigns(true);
        try {
            const response = await fetch("/api/v1/campaigns", { cache: "no-store" });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Unable to load campaigns.");
            setCampaigns(data);
            setCampaignId((current) => current || data[0]?.id || "");
        } catch (err) {
            setError(err.message || "Unable to load campaigns.");
        } finally {
            setLoadingCampaigns(false);
        }
    }

    async function loadReport(id = campaignId) {
        if (!id) { setReport(null); return; }
        setLoadingReport(true);
        setError("");
        try {
            const response = await fetch("/api/v1/campaigns/" + encodeURIComponent(id) + "/performance", { cache: "no-store" });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Unable to load campaign performance.");
            setReport(data);
        } catch (err) {
            setError(err.message || "Unable to load campaign performance.");
        } finally {
            setLoadingReport(false);
        }
    }

    useEffect(() => { loadCampaigns(); }, []);
    useEffect(() => { if (campaignId) loadReport(campaignId); else setReport(null); }, [campaignId]);

    function updateDraft(id, field, value) {
        setDrafts((current) => ({ ...current, [id]: { ...emptyDraft(), ...current[id], [field]: value } }));
    }

    async function saveSnapshot(creator) {
        const draft = { ...emptyDraft(), ...drafts[creator.campaign_creator_id] };
        setSavingId(creator.campaign_creator_id);
        setError("");
        setNotice("");
        try {
            const payload = { ...draft, campaign_creator_id: creator.campaign_creator_id };
            for (const field of metricFields.map(([key]) => key)) {
                payload[field] = draft[field] === "" ? null : Number(draft[field]);
            }
            payload.attributed_revenue = draft.attributed_revenue === "" ? null : Number(draft.attributed_revenue);
            payload.published_at = draft.published_at || null;
            const response = await fetch("/api/v1/campaigns/" + encodeURIComponent(campaignId) + "/performance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Unable to save performance record.");
            setDrafts((current) => ({ ...current, [creator.campaign_creator_id]: emptyDraft() }));
            setNotice("Performance record saved for " + creator.creator_name + ".");
            await loadReport(campaignId);
        } catch (err) {
            setError(err.message || "Unable to save performance record.");
        } finally {
            setSavingId("");
        }
    }

    return <main className="flex flex-col gap-6 pb-8 text-[#212529]">
        <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#FA8500]">Campaign intelligence</p>
                <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">Performance tracking</h1>
                <p className="mt-1 max-w-2xl text-sm text-[#6B7280]">Capture creator content results over time and compare campaign outcomes using recorded metrics.</p>
            </div>
            <button className={secondary} type="button" disabled={loadingReport || loadingCampaigns} onClick={() => { loadCampaigns(); loadReport(); }}><FiRefreshCw size={14} /> Refresh</button>
        </header>

        <div role="note" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900">
            Metrics entered here are manually reported, not verified by Instagram or another social platform. Each record is a time-stamped snapshot; totals across snapshots may include repeated reporting periods and should not be interpreted as unique campaign reach.
        </div>
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}

        <section className="rounded-xl border border-[#E3E7ED] bg-white p-4 shadow-sm sm:p-5">
            <label className="block max-w-2xl text-xs font-semibold text-[#495057]">Campaign
                <select className={inputClass} value={campaignId} onChange={(event) => setCampaignId(event.target.value)} disabled={loadingCampaigns}>
                    <option value="">Select a campaign...</option>
                    {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.campaign_details?.campaign_title || "Untitled campaign"} · {campaign.status}</option>)}
                </select>
            </label>
        </section>

        {loadingReport && !report ? <div className="rounded-xl border border-[#E3E7ED] bg-white p-8 text-center text-sm text-[#6B7280]">Loading performance data…</div> : null}
        {!loadingCampaigns && !campaignId && <div className="rounded-xl border border-dashed border-[#CBD2DC] bg-white p-10 text-center"><FiBarChart2 size={28} className="mx-auto text-[#9CA3AF]" /><p className="mt-3 font-semibold">No campaigns available</p><p className="mt-1 text-sm text-[#6B7280]">Create a campaign first, then link creators to it.</p></div>}

        {report && <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                <MetricCard label="Creators linked" value={report.totals.creator_collaborations} hint="In this campaign" icon={FiUsers} />
                <MetricCard label="Tracked creators" value={report.totals.tracked_collaborations} hint="At least one saved snapshot" icon={FiCheckCircle} />
                <MetricCard label="Performance records" value={report.totals.performance_records} hint="Time-stamped entries" icon={FiClock} />
                <MetricCard label="Impressions" value={report.totals.impressions} hint="Sum of recorded snapshots" icon={FiActivity} />
                <MetricCard label="Engagements" value={report.totals.engagements} hint="Likes, comments, shares and saves" icon={FiTrendingUp} />
                <MetricCard label="Clicks / conversions" value={report.totals.clicks} hint={count(report.totals.conversions) + " recorded conversions"} icon={FiBarChart2} />
            </section>

            <section className="flex flex-col gap-4">
                <div><h2 className="text-lg font-semibold">Creator performance</h2><p className="mt-1 text-sm text-[#6B7280]">Record a new snapshot for each eligible collaboration. Older snapshots remain available below the form.</p></div>
                {report.creators.length === 0 ? <div className="rounded-xl border border-dashed border-[#CBD2DC] bg-white p-10 text-center text-sm text-[#6B7280]">No creators are linked to this campaign yet. Add creators through Creator Workflow first.</div> : report.creators.map((creator) => {
                    const draft = { ...emptyDraft(), ...drafts[creator.campaign_creator_id] };
                    const saving = savingId === creator.campaign_creator_id;
                    const latest = creator.snapshots[0];
                    return <article key={creator.campaign_creator_id} className="rounded-xl border border-[#E3E7ED] bg-white p-4 shadow-sm sm:p-5">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div><h3 className="font-semibold">{creator.creator_name}</h3><p className="mt-1 text-xs text-[#6B7280]">Collaboration status: {creator.collaboration_status}</p></div>
                            <span className={"inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold " + (creator.snapshots.length ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600")}>{creator.snapshots.length ? creator.snapshots.length + " snapshot(s)" : "Not tracked yet"}</span>
                        </div>
                        {latest && <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {[["Latest impressions", latest.impressions], ["Latest reach", latest.reach], ["Latest engagements", (latest.likes || 0) + (latest.comments || 0) + (latest.shares || 0) + (latest.saves || 0)], ["Latest conversions", latest.conversions]].map(([label, value]) => <div key={label} className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-[#6B7280]">{label}</p><p className="mt-1 text-lg font-bold">{value === null || value === undefined ? "—" : count(value)}</p></div>)}
                        </div>}
                        {!creator.eligible_for_tracking ? <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-[#6B7280]">Performance entry becomes available after the creator accepts the collaboration.</p> : <form className="mt-4 border-t border-[#EEF0F3] pt-4" onSubmit={(event) => { event.preventDefault(); saveSnapshot(creator); }}>
                            <h4 className="text-sm font-semibold">Record performance snapshot</h4>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <label className="text-xs font-medium text-[#495057]">Platform
                                    <select className={inputClass} value={draft.platform} onChange={(event) => updateDraft(creator.campaign_creator_id, "platform", event.target.value)}>
                                        {["Instagram", "TikTok", "YouTube", "Facebook", "Other"].map((platform) => <option key={platform}>{platform}</option>)}
                                    </select>
                                </label>
                                <label className="text-xs font-medium text-[#495057]">Content URL (optional)<input className={inputClass} type="url" placeholder="https://..." value={draft.content_url} onChange={(event) => updateDraft(creator.campaign_creator_id, "content_url", event.target.value)} /></label>
                                <label className="text-xs font-medium text-[#495057]">Publish date (optional)<input className={inputClass} type="date" value={draft.published_at} onChange={(event) => updateDraft(creator.campaign_creator_id, "published_at", event.target.value)} /></label>
                                <label className="text-xs font-medium text-[#495057]">Revenue currency<select className={inputClass} value={draft.currency} onChange={(event) => updateDraft(creator.campaign_creator_id, "currency", event.target.value)}>{["USD", "PKR", "GBP", "EUR", "AED", "SAR", "INR", "CAD", "AUD"].map((currency) => <option key={currency}>{currency}</option>)}</select></label>
                                {metricFields.map(([key, label]) => <label key={key} className="text-xs font-medium text-[#495057]">{label}<input className={inputClass} type="number" min="0" step="1" inputMode="numeric" value={draft[key]} onChange={(event) => updateDraft(creator.campaign_creator_id, key, event.target.value)} placeholder="Not provided" /></label>)}
                                <label className="text-xs font-medium text-[#495057]">Attributed revenue<input className={inputClass} type="number" min="0" step="0.01" value={draft.attributed_revenue} onChange={(event) => updateDraft(creator.campaign_creator_id, "attributed_revenue", event.target.value)} placeholder="Optional" /></label>
                                <label className="text-xs font-medium text-[#495057] sm:col-span-2">Notes (optional)<input className={inputClass} maxLength={2000} value={draft.notes} onChange={(event) => updateDraft(creator.campaign_creator_id, "notes", event.target.value)} placeholder="Reporting period, source, context…" /></label>
                            </div>
                            <div className="mt-4 flex flex-wrap items-center gap-3"><button className={primary} type="submit" disabled={saving}>{saving ? "Saving snapshot…" : "Save performance snapshot"}</button><span className="text-xs text-[#6B7280]">Leave unknown metrics blank; enter zero only when the value is confirmed to be zero.</span></div>
                        </form>}
                        {creator.snapshots.length > 0 && <div className="mt-5 border-t border-[#EEF0F3] pt-4"><h4 className="text-sm font-semibold">Snapshot history</h4><div className="mt-2 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="text-[#6B7280]"><tr><th className="py-2 pr-3">Captured</th><th className="py-2 pr-3">Platform</th><th className="py-2 pr-3">Impressions</th><th className="py-2 pr-3">Reach</th><th className="py-2 pr-3">Engagements</th><th className="py-2 pr-3">Clicks</th><th className="py-2 pr-3">Conversions</th><th className="py-2 pr-3">Revenue</th></tr></thead><tbody>{creator.snapshots.map((snapshot) => <tr key={snapshot.id} className="border-t border-[#EEF0F3]"><td className="py-2 pr-3">{dateLabel(snapshot.captured_at)}</td><td className="py-2 pr-3">{snapshot.platform}</td><td className="py-2 pr-3">{snapshot.impressions === null ? "—" : count(snapshot.impressions)}</td><td className="py-2 pr-3">{snapshot.reach === null ? "—" : count(snapshot.reach)}</td><td className="py-2 pr-3">{count((snapshot.likes || 0) + (snapshot.comments || 0) + (snapshot.shares || 0) + (snapshot.saves || 0))}</td><td className="py-2 pr-3">{snapshot.clicks === null ? "—" : count(snapshot.clicks)}</td><td className="py-2 pr-3">{snapshot.conversions === null ? "—" : count(snapshot.conversions)}</td><td className="py-2 pr-3">{snapshot.attributed_revenue === null ? "—" : new Intl.NumberFormat("en", { style: "currency", currency: snapshot.currency, maximumFractionDigits: 2 }).format(snapshot.attributed_revenue)}</td></tr>)}</tbody></table></div></div>}
                    </article>;
                })}
            </section>
        </>}
    </main>;
}
