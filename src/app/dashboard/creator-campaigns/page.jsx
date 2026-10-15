"use client";

import { useCallback, useEffect, useState } from "react";
import { FiBriefcase, FiCheck, FiRefreshCw, FiSearch } from "react-icons/fi";

const primaryButton = "inline-flex items-center justify-center gap-2 rounded-lg bg-[#FA8500] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e87900] disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = "inline-flex items-center justify-center gap-2 rounded-lg border border-[#D9DEE7] bg-white px-3 py-2 text-sm font-semibold text-[#495057] transition hover:bg-[#F8F9FA] disabled:cursor-not-allowed disabled:opacity-50";
const fieldClass = "w-full rounded-lg border border-[#D9DEE7] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#FA8500]";

function humanize(value) {
    return value?.replace(/([a-z])([A-Z])/g, "$1 $2") || "Not applied";
}

function formatDate(value) {
    if (!value) return "Not specified";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Not specified" : date.toLocaleDateString();
}

function applicationStyle(status) {
    if (["Accepted", "Approved", "Completed"].includes(status)) return "bg-emerald-50 text-emerald-700";
    if (["Declined", "Cancelled"].includes(status)) return "bg-red-50 text-red-700";
    if (["Applied", "Invited", "ChangesRequested"].includes(status)) return "bg-amber-50 text-amber-800";
    return "bg-slate-100 text-slate-700";
}

export default function CreatorCampaignsPage() {
    const [campaigns, setCampaigns] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const loadCampaigns = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const response = await fetch("/api/v1/creator/campaigns", { cache: "no-store" });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not load campaigns.");
            setCampaigns(data.campaigns || []);
        } catch (err) {
            setError(err.message || "Could not load campaigns.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

    async function apply(campaign) {
        setBusyId(campaign.id);
        setError("");
        setNotice("");
        try {
            const response = await fetch("/api/v1/creator/campaigns", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ campaign_id: campaign.id }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not apply to campaign.");
            setNotice(data.already_applied ? "You have already applied to this campaign." : "Application submitted. You can track its status here.");
            await loadCampaigns();
        } catch (err) {
            setError(err.message || "Could not apply to campaign.");
        } finally {
            setBusyId("");
        }
    }

    const visibleCampaigns = campaigns.filter((campaign) => {
        const query = search.trim().toLowerCase();
        if (!query) return true;
        return [
            campaign.title,
            campaign.objective,
            campaign.description,
            campaign.targeting_criteria?.campaign_location,
            campaign.targeting_criteria?.campaign_interest,
            campaign.platform_details?.campaign_platform,
            campaign.platform_details?.platform,
        ].some((value) => String(value || "").toLowerCase().includes(query));
    });

    return (
        <main className="flex flex-col gap-6 pb-8 text-[#212529]">
            <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#FA8500]">Creator marketplace</p>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">Explore campaigns</h1>
                    <p className="mt-1 max-w-2xl text-sm text-[#6B7280]">Find active campaigns, review their brief and targeting, and apply from your own creator account.</p>
                </div>
                <button type="button" className={secondaryButton} onClick={loadCampaigns} disabled={loading}><FiRefreshCw size={14} /> Refresh</button>
            </header>

            <div role="note" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900">
                Campaigns are shown only when a brand has made them Active. Applying records your interest in Influna; it does not send an external message or guarantee selection.
            </div>
            {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {notice && <div role="status" className="rounded-lg border border-[#FAD7AE] bg-[#FFF7ED] px-4 py-3 text-sm text-[#8A4B08]">{notice}</div>}

            <label className="relative block">
                <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={16} />
                <input className={fieldClass + " pl-9"} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by campaign, objective, platform, or interest..." />
            </label>

            <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Available campaigns</h2>
                    <span className="text-xs text-[#6B7280]">{visibleCampaigns.length} shown · {campaigns.length} total</span>
                </div>
                {loading ? <div className="rounded-xl border border-[#E3E7ED] bg-white p-10 text-center text-sm text-[#6B7280]">Loading campaigns...</div>
                    : visibleCampaigns.length === 0 ? <div className="rounded-xl border border-dashed border-[#CBD2DC] bg-white px-6 py-12 text-center">
                        <FiBriefcase size={28} className="mx-auto text-[#9CA3AF]" />
                        <h3 className="mt-3 font-semibold">{campaigns.length ? "No campaigns match your search" : "No active campaigns yet"}</h3>
                        <p className="mx-auto mt-1 max-w-lg text-sm text-[#6B7280]">{campaigns.length ? "Try another campaign name, platform, or interest." : "When brands publish active campaigns, they will appear here for you to review and apply."}</p>
                    </div>
                    : visibleCampaigns.map((campaign) => {
                        const status = campaign.status;
                        const canApply = !status || ["Suggested", "Withdrawn"].includes(status);
                        return (
                            <article key={campaign.id} className="rounded-xl border border-[#E3E7ED] bg-white p-4 shadow-sm sm:p-5">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-base font-semibold">{campaign.title}</h3>
                                        {campaign.objective && <p className="mt-1 text-sm font-medium text-[#495057]">{campaign.objective}</p>}
                                        {campaign.description && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#6B7280]">{campaign.description}</p>}
                                    </div>
                                    {status ? <span className={"w-fit rounded-full px-3 py-1.5 text-xs font-semibold " + applicationStyle(status)}>{humanize(status)}</span> : <span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">Open</span>}
                                </div>

                                <div className="mt-4 grid gap-3 rounded-lg bg-[#F8F9FA] p-3 sm:grid-cols-2 lg:grid-cols-4">
                                    <div><p className="text-xs text-[#6B7280]">Platform</p><p className="mt-1 text-sm font-medium">{campaign.platform_details?.campaign_platform || campaign.platform_details?.platform || campaign.platform_details?.primary_platform || "Not specified"}</p></div>
                                    <div><p className="text-xs text-[#6B7280]">Target location</p><p className="mt-1 text-sm font-medium">{campaign.targeting_criteria?.campaign_location || "Not specified"}</p></div>
                                    <div><p className="text-xs text-[#6B7280]">Start date</p><p className="mt-1 text-sm font-medium">{formatDate(campaign.start_date)}</p></div>
                                    <div><p className="text-xs text-[#6B7280]">End date</p><p className="mt-1 text-sm font-medium">{formatDate(campaign.end_date)}</p></div>
                                    {campaign.payment_model && <div><p className="text-xs text-[#6B7280]">Payment model</p><p className="mt-1 text-sm font-medium">{campaign.payment_model}</p></div>}
                                    {campaign.targeting_criteria?.campaign_interest && <div className="sm:col-span-2"><p className="text-xs text-[#6B7280]">Interests</p><p className="mt-1 text-sm font-medium">{String(campaign.targeting_criteria.campaign_interest)}</p></div>}
                                </div>

                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                    {canApply && <button type="button" className={primaryButton} onClick={() => apply(campaign)} disabled={busyId === campaign.id}><FiCheck size={14} /> {busyId === campaign.id ? "Applying..." : "Apply to campaign"}</button>}
                                    {status === "Applied" && <p className="text-sm text-[#6B7280]">Application recorded. Track its status in <a className="font-semibold text-[#B85E00] underline" href="/dashboard/creator-invitations">Applications & collaborations</a>.</p>}
                                    {status === "Accepted" && <p className="text-sm text-[#6B7280]">Your application was accepted. Review requirements in <a className="font-semibold text-[#B85E00] underline" href="/dashboard/deliverables">Deliverables</a>.</p>}
                                    {status === "Invited" && <p className="text-sm text-[#6B7280]">You have an invitation. Open <a className="font-semibold text-[#B85E00] underline" href="/dashboard/creator-invitations">Applications & collaborations</a> to respond.</p>}
                                    {status === "Declined" && <p className="text-sm text-[#6B7280]">The brand declined this application.</p>}
                                    {!canApply && status !== "Applied" && <p className="text-sm text-[#6B7280]">This campaign already has an invitation or collaboration record for your profile.</p>}
                                </div>
                            </article>
                        );
                    })}
            </section>
        </main>
    );
}
