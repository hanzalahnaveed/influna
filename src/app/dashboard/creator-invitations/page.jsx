"use client";

import { useEffect, useState } from "react";
import { FiCheck, FiClock, FiRefreshCw, FiXCircle } from "react-icons/fi";

const inputClass = "w-full rounded-lg border border-[#D9DEE7] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#FA8500]";
const primaryButton = "inline-flex items-center justify-center gap-2 rounded-lg bg-[#FA8500] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e87900] disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = "inline-flex items-center justify-center gap-2 rounded-lg border border-[#D9DEE7] bg-white px-4 py-2.5 text-sm font-semibold text-[#495057] transition hover:bg-[#F8F9FA] disabled:cursor-not-allowed disabled:opacity-50";

function humanize(value) {
    return value?.replace(/([a-z])([A-Z])/g, "$1 $2") || "Unknown";
}

function formatDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toLocaleString();
}

export default function CreatorInvitationsPage() {
    const [creators, setCreators] = useState([]);
    const [creatorId, setCreatorId] = useState("");
    const [invitations, setInvitations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    useEffect(() => {
        let cancelled = false;
        async function loadCreators() {
            try {
                const response = await fetch("/api/v1/creators", { cache: "no-store" });
                const data = await response.json();
                if (!response.ok) throw new Error(data?.error || "Could not load creator profiles.");
                if (cancelled) return;
                setCreators(Array.isArray(data) ? data : []);
                if (Array.isArray(data) && data.length) setCreatorId(data[0].id);
            } catch (err) {
                if (!cancelled) setError(err.message || "Could not load creator profiles.");
            }
        }
        loadCreators();
        return () => { cancelled = true; };
    }, []);

    async function loadInvitations(id = creatorId) {
        if (!id) {
            setInvitations([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError("");
        try {
            const response = await fetch(`/api/v1/creators/${encodeURIComponent(id)}/invitations`, { cache: "no-store" });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not load invitations.");
            setInvitations(data.invitations || []);
        } catch (err) {
            setError(err.message || "Could not load invitations.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (creatorId) loadInvitations(creatorId);
        else { setInvitations([]); setLoading(false); }
    }, [creatorId]);

    async function respond(invitation, action) {
        setBusyId(invitation.campaign_creator_id);
        setError("");
        setNotice("");
        try {
            const response = await fetch(`/api/v1/campaigns/${encodeURIComponent(invitation.campaign_id)}/creators/${encodeURIComponent(invitation.campaign_creator_id)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not update invitation.");
            setNotice(`Response recorded: ${humanize(data.status)}.`);
            await loadInvitations(creatorId);
        } catch (err) {
            setError(err.message || "Could not update invitation.");
        } finally {
            setBusyId("");
        }
    }

    return (
        <main className="flex flex-col gap-6 pb-8 text-[#212529]">
            <header>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#FA8500]">Creator portal · prototype</p>
                <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">Campaign invitations</h1>
                <p className="mt-1 max-w-2xl text-sm text-[#6B7280]">Review campaign details and record whether a creator accepts or declines an invitation.</p>
            </header>

            <div role="note" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900">
                Prototype only: select a profile to preview its inbox. This is not yet a private creator account. Authentication and ownership checks must be implemented before real creators use this page.
            </div>
            {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {notice && <div role="status" className="rounded-lg border border-[#FAD7AE] bg-[#FFF7ED] px-4 py-3 text-sm text-[#8A4B08]">{notice}</div>}

            <section className="rounded-xl border border-[#E3E7ED] bg-white p-4 shadow-sm sm:p-5">
                <label className="block text-xs font-semibold text-[#495057]">Preview creator profile
                    <select className={inputClass + " mt-1"} value={creatorId} onChange={(event) => setCreatorId(event.target.value)}>
                        <option value="">Select a creator...</option>
                        {creators.map((creator) => <option key={creator.id} value={creator.id}>{creator.display_name}</option>)}
                    </select>
                </label>
                <button type="button" className={secondaryButton + " mt-3"} onClick={() => loadInvitations()} disabled={!creatorId || loading}><FiRefreshCw size={14} /> Refresh inbox</button>
            </section>

            <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Invitations and collaborations</h2>
                    <span className="text-xs text-[#6B7280]">{invitations.length} records</span>
                </div>
                {loading ? <div className="rounded-xl border border-[#E3E7ED] bg-white p-10 text-center text-sm text-[#6B7280]">Loading invitations...</div>
                    : !creatorId ? <div className="rounded-xl border border-dashed border-[#CBD2DC] bg-white p-10 text-center text-sm text-[#6B7280]">Select a creator profile to preview its invitation inbox.</div>
                    : invitations.length === 0 ? <div className="rounded-xl border border-dashed border-[#CBD2DC] bg-white p-10 text-center text-sm text-[#6B7280]">No invitations yet. Campaign teams can record an invitation from Creator Workflow.</div>
                    : invitations.map((invitation) => (
                        <article key={invitation.campaign_creator_id} className="rounded-xl border border-[#E3E7ED] bg-white p-4 shadow-sm sm:p-5">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <h3 className="text-base font-semibold">{invitation.campaign_title}</h3>
                                    <p className="mt-1 text-xs text-[#6B7280]">{invitation.invited_at ? `Invited ${formatDate(invitation.invited_at)}` : "Invitation date unavailable"}</p>
                                </div>
                                <span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">{humanize(invitation.status)}</span>
                            </div>
                            {invitation.campaign_details?.campaign_description && <p className="mt-3 text-sm leading-6 text-[#495057]">{invitation.campaign_details.campaign_description}</p>}
                            <div className="mt-4 grid gap-3 rounded-lg bg-[#F8F9FA] p-3 sm:grid-cols-3">
                                <div><p className="text-xs text-[#6B7280]">Goal</p><p className="mt-1 text-sm font-medium">{invitation.campaign_details?.campaign_goal || invitation.campaign_details?.goal || "Not specified"}</p></div>
                                <div><p className="text-xs text-[#6B7280]">Platform</p><p className="mt-1 text-sm font-medium">{invitation.platform_details?.platform || invitation.platform_details?.primary_platform || "Not specified"}</p></div>
                                <div><p className="text-xs text-[#6B7280]">Profile fit</p><p className="mt-1 text-sm font-medium">{invitation.match_score == null ? "Not scored" : `${Math.round(invitation.match_score)}%`}</p></div>
                            </div>
                            {invitation.content_url && <p className="mt-3 text-sm"><a className="text-[#B85E00] underline" href={invitation.content_url} target="_blank" rel="noreferrer">View submitted content</a></p>}
                            {invitation.review_note && <p className="mt-2 rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm text-amber-900">Review feedback: {invitation.review_note}</p>}
                            {invitation.status === "Invited" && <div className="mt-4 flex flex-wrap gap-2">
                                <button type="button" className={primaryButton} disabled={busyId === invitation.campaign_creator_id} onClick={() => respond(invitation, "accept")}><FiCheck size={14} /> Accept invitation</button>
                                <button type="button" className={secondaryButton} disabled={busyId === invitation.campaign_creator_id} onClick={() => respond(invitation, "decline")}><FiXCircle size={14} /> Decline</button>
                                {busyId === invitation.campaign_creator_id && <span className="self-center text-xs text-[#6B7280]"><FiClock className="mr-1 inline" /> Saving response...</span>}
                            </div>}
                        </article>
                    ))}
            </section>
        </main>
    );
}
