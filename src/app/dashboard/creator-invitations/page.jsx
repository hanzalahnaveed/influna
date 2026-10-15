"use client";

import { useEffect, useState } from "react";
import { FiCheck, FiClock, FiRefreshCw, FiXCircle } from "react-icons/fi";

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
    const [creatorId, setCreatorId] = useState("");
    const [invitations, setInvitations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [contentDrafts, setContentDrafts] = useState({});

    useEffect(() => {
        let cancelled = false;
        async function loadCurrentCreator() {
            try {
                const response = await fetch("/api/v1/auth/me", { cache: "no-store" });
                const data = await response.json();
                if (!response.ok || !data?.user) throw new Error("Please sign in with a creator account to view invitations.");
                if (data.user.role !== "CREATOR" || !data.user.creator_profile_id) {
                    throw new Error("This page is available to creator accounts only.");
                }
                if (!cancelled) setCreatorId(data.user.creator_profile_id);
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || "Could not load the signed-in creator account.");
                    setLoading(false);
                }
            }
        }
        loadCurrentCreator();
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

    async function submitContent(invitation) {
        const draft = contentDrafts[invitation.campaign_creator_id] || {};
        if (!draft.content_url?.trim()) {
            setError("Enter the published content URL before submitting.");
            return;
        }
        setBusyId(invitation.campaign_creator_id);
        setError("");
        setNotice("");
        try {
            const response = await fetch(`/api/v1/campaigns/${encodeURIComponent(invitation.campaign_id)}/creators/${encodeURIComponent(invitation.campaign_creator_id)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "submit_content", content_url: draft.content_url.trim(), content_note: draft.content_note || "" }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not submit content.");
            setNotice("Content submission recorded. The brand can now review it.");
            setContentDrafts((current) => ({ ...current, [invitation.campaign_creator_id]: { content_url: "", content_note: "" } }));
            await loadInvitations(creatorId);
        } catch (err) {
            setError(err.message || "Could not submit content.");
        } finally {
            setBusyId("");
        }
    }

    return (
        <main className="flex flex-col gap-6 pb-8 text-[#212529]">
            <header>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#FA8500]">Creator portal</p>
                <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">Applications & collaborations</h1>
                <p className="mt-1 max-w-2xl text-sm text-[#6B7280]">Track your campaign applications, review invitations, and follow accepted collaborations from your creator account.</p>
            </header>

            {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {notice && <div role="status" className="rounded-lg border border-[#FAD7AE] bg-[#FFF7ED] px-4 py-3 text-sm text-[#8A4B08]">{notice}</div>}

            <section className="rounded-xl border border-[#E3E7ED] bg-white p-4 shadow-sm sm:p-5">
                <p className="text-xs font-semibold text-[#495057]">Signed-in creator account</p>
                <p className="mt-1 text-sm text-[#6B7280]">Your invitations are loaded for your own creator profile. You cannot switch to another creator's inbox.</p>
                <button type="button" className={secondaryButton + " mt-3"} onClick={() => loadInvitations()} disabled={!creatorId || loading}><FiRefreshCw size={14} /> Refresh inbox</button>
            </section>

            <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Applications, invitations and collaborations</h2>
                    <span className="text-xs text-[#6B7280]">{invitations.length} records</span>
                </div>
                {loading ? <div className="rounded-xl border border-[#E3E7ED] bg-white p-10 text-center text-sm text-[#6B7280]">Loading invitations...</div>
                    : !creatorId ? <div className="rounded-xl border border-dashed border-[#CBD2DC] bg-white p-10 text-center text-sm text-[#6B7280]">Sign in with a creator account to view your invitation inbox.</div>
                    : invitations.length === 0 ? <div className="rounded-xl border border-dashed border-[#CBD2DC] bg-white p-10 text-center text-sm text-[#6B7280]">No applications or invitations yet. Explore active campaigns or wait for a brand to invite your creator profile.</div>
                    : invitations.map((invitation) => (
                        <article key={invitation.campaign_creator_id} className="rounded-xl border border-[#E3E7ED] bg-white p-4 shadow-sm sm:p-5">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <h3 className="text-base font-semibold">{invitation.campaign_title}</h3>
                                    <p className="mt-1 text-xs text-[#6B7280]">{invitation.status === "Applied" ? `Applied ${formatDate(invitation.updated_at) || "recently"}` : invitation.invited_at ? `Invited ${formatDate(invitation.invited_at)}` : "Invitation date unavailable"}</p>
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
                            {["Accepted", "ChangesRequested"].includes(invitation.status) && <form className="mt-4 flex flex-col gap-3 rounded-lg border border-[#E3E7ED] bg-[#F8F9FA] p-4" onSubmit={(event) => { event.preventDefault(); submitContent(invitation); }}>
                                <div><h4 className="text-sm font-semibold">Submit or resubmit content</h4><p className="mt-1 text-xs text-[#6B7280]">Paste the URL of your draft or published content. This records the link; it does not upload a file.</p></div>
                                <label className="text-xs font-semibold text-[#495057]">Content URL
                                    <input className="mt-1 w-full rounded-lg border border-[#D9DEE7] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#FA8500]" type="url" required value={(contentDrafts[invitation.campaign_creator_id] || {}).content_url || ""} onChange={(event) => setContentDrafts((current) => ({ ...current, [invitation.campaign_creator_id]: { ...current[invitation.campaign_creator_id], content_url: event.target.value } }))} placeholder="https://..." />
                                </label>
                                <label className="text-xs font-semibold text-[#495057]">Note (optional)
                                    <textarea className="mt-1 w-full rounded-lg border border-[#D9DEE7] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#FA8500]" rows={2} maxLength={2000} value={(contentDrafts[invitation.campaign_creator_id] || {}).content_note || ""} onChange={(event) => setContentDrafts((current) => ({ ...current, [invitation.campaign_creator_id]: { ...current[invitation.campaign_creator_id], content_note: event.target.value } }))} placeholder="Add context for the brand..." />
                                </label>
                                <div><button type="submit" className={primaryButton} disabled={busyId === invitation.campaign_creator_id}><FiCheck size={14} /> {busyId === invitation.campaign_creator_id ? "Submitting..." : invitation.status === "ChangesRequested" ? "Resubmit content" : "Submit content"}</button></div>
                            </form>}
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
