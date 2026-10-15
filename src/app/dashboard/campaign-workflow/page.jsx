"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiCheck, FiClock, FiExternalLink, FiRefreshCw, FiSend, FiUsers, FiXCircle } from "react-icons/fi";

const buttonPrimary = "inline-flex items-center justify-center gap-2 rounded-lg bg-[#FA8500] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#e87900] disabled:cursor-not-allowed disabled:opacity-50";
const buttonSecondary = "inline-flex items-center justify-center gap-2 rounded-lg border border-[#D9DEE7] bg-white px-3 py-2 text-xs font-semibold text-[#495057] transition hover:bg-[#F8F9FA] disabled:cursor-not-allowed disabled:opacity-50";
const inputClass = "w-full rounded-lg border border-[#D9DEE7] bg-white px-3 py-2 text-sm outline-none focus:border-[#FA8500]";
const statuses = ["Suggested", "Applied", "Invited", "Accepted", "Declined", "ContentSubmitted", "ChangesRequested", "Approved", "Completed", "Cancelled"];

function humanize(value) {
    return value?.replace(/([a-z])([A-Z])/g, "$1 $2") || "Unknown";
}

function statusStyle(status) {
    if (["Approved", "Completed", "Accepted"].includes(status)) return "bg-emerald-50 text-emerald-700";
    if (["Declined", "Cancelled"].includes(status)) return "bg-red-50 text-red-700";
    if (["Applied", "Invited", "ContentSubmitted", "ChangesRequested"].includes(status)) return "bg-amber-50 text-amber-800";
    return "bg-slate-100 text-slate-700";
}

function formatDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toLocaleString();
}

export default function CampaignWorkflowPage() {
    const [campaigns, setCampaigns] = useState([]);
    const [campaignId, setCampaignId] = useState("");
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState("");
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [drafts, setDrafts] = useState({});

    const loadCampaigns = useCallback(async () => {
        try {
            const response = await fetch("/api/v1/campaigns", { cache: "no-store" });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not load campaigns.");
            setCampaigns(Array.isArray(data) ? data : []);
            if (!campaignId && Array.isArray(data) && data.length) setCampaignId(data[0].id);
        } catch (err) {
            setError(err.message || "Could not load campaigns.");
        }
    }, [campaignId]);

    const loadRecords = useCallback(async () => {
        if (!campaignId) {
            setRecords([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError("");
        try {
            const response = await fetch(`/api/v1/campaigns/${encodeURIComponent(campaignId)}/creators`, { cache: "no-store" });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not load campaign workflow.");
            setRecords(data.creators || []);
        } catch (err) {
            setError(err.message || "Could not load campaign workflow.");
        } finally {
            setLoading(false);
        }
    }, [campaignId]);

    useEffect(() => { loadCampaigns(); }, [loadCampaigns]);
    useEffect(() => { loadRecords(); }, [loadRecords]);

    const counts = useMemo(() => statuses.reduce((result, status) => {
        result[status] = records.filter((record) => record.status === status).length;
        return result;
    }, {}), [records]);

    async function generateMatches() {
        if (!campaignId) return;
        setGenerating(true);
        setError("");
        setNotice("");
        try {
            const response = await fetch(`/api/v1/campaigns/${encodeURIComponent(campaignId)}/matches?limit=25`, { method: "POST" });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not generate creator suggestions.");
            await loadRecords();
            setNotice(`Loaded ${data.count || 0} suggested creator matches. Review candidates before manually recording invitations.`);
        } catch (err) {
            setError(err.message || "Could not generate creator suggestions.");
        } finally {
            setGenerating(false);
        }
    }

    async function runAction(record, action) {
        const draft = drafts[record.campaign_creator_id] || {};
        if (action === "submit_content" && !draft.content_url?.trim()) {
            setError("Enter a content URL before recording a submission.");
            return;
        }
        if (action === "request_changes" && !draft.review_note?.trim()) {
            setError("Describe the changes required before requesting revisions.");
            return;
        }
        setBusyId(record.campaign_creator_id);
        setError("");
        setNotice("");
        try {
            const response = await fetch(`/api/v1/campaigns/${encodeURIComponent(campaignId)}/creators/${encodeURIComponent(record.campaign_creator_id)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action,
                    ...(action === "submit_content" ? { content_url: draft.content_url, content_note: draft.content_note || "" } : {}),
                    ...(["request_changes", "approve_content"].includes(action) ? { review_note: draft.review_note || "" } : {}),
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Workflow action failed.");
            setNotice(`${record.display_name}: status updated to ${humanize(data.status)}.`);
            setDrafts((current) => ({ ...current, [record.campaign_creator_id]: { ...current[record.campaign_creator_id], review_note: "" } }));
            await loadRecords();
        } catch (err) {
            setError(err.message || "Workflow action failed.");
        } finally {
            setBusyId("");
        }
    }

    const selectedCampaign = campaigns.find((campaign) => campaign.id === campaignId);

    return (
        <main className="flex flex-col gap-6 pb-8 text-[#212529]">
            <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#FA8500]">Campaign operations</p>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">Creator workflow</h1>
                    <p className="mt-1 max-w-2xl text-sm text-[#6B7280]">Review creator applications and track each collaboration from invitation through content approval and completion.</p>
                </div>
                <button className={buttonSecondary} type="button" onClick={() => { loadCampaigns(); loadRecords(); }}><FiRefreshCw size={14} /> Refresh</button>
            </header>

            <div role="note" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900">
                This is a manual workflow tracker. Brand and creator actions are restricted to their authenticated accounts, but recording an invitation does not send an email or social-platform message. Use test data until the remaining security and account-verification work is complete.
            </div>

            {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {notice && <div role="status" className="rounded-lg border border-[#FAD7AE] bg-[#FFF7ED] px-4 py-3 text-sm text-[#8A4B08]">{notice}</div>}

            <section className="rounded-xl border border-[#E3E7ED] bg-white p-4 shadow-sm sm:p-5">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                    <label className="text-xs font-semibold text-[#495057]">Campaign
                        <select className={inputClass + " mt-1"} value={campaignId} onChange={(event) => setCampaignId(event.target.value)}>
                            <option value="">Select a campaign...</option>
                            {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.campaign_details?.campaign_title || "Untitled campaign"} · {campaign.status}</option>)}
                        </select>
                    </label>
                    <button className={buttonPrimary} type="button" onClick={generateMatches} disabled={!campaignId || generating}>
                        <FiUsers size={14} /> {generating ? "Finding creators..." : "Generate suggestions"}
                    </button>
                </div>
                {selectedCampaign && <p className="mt-3 text-xs text-[#6B7280]">Selected: <span className="font-medium text-[#495057]">{selectedCampaign.campaign_details?.campaign_title || "Untitled campaign"}</span></p>}
            </section>

            <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {[
                    ["Suggested", "Suggested"],
                    ["Applications", "Applied"],
                    ["Invited", "Invited"],
                    ["Accepted", "Accepted"],
                    ["In review", "ContentSubmitted"],
                    ["Completed", "Completed"],
                ].map(([label, key]) => (
                    <div key={key} className="rounded-xl border border-[#E3E7ED] bg-white p-4">
                        <p className="text-xs text-[#6B7280]">{label}</p>
                        <p className="mt-1 text-2xl font-bold">{counts[key] || 0}</p>
                    </div>
                ))}
            </section>

            <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Campaign creators</h2>
                    <span className="text-xs text-[#6B7280]">{records.length} records</span>
                </div>
                {loading ? (
                    <div className="rounded-xl border border-[#E3E7ED] bg-white p-10 text-center text-sm text-[#6B7280]">Loading workflow...</div>
                ) : !campaignId ? (
                    <div className="rounded-xl border border-dashed border-[#CBD2DC] bg-white p-10 text-center text-sm text-[#6B7280]">Create or select a campaign to manage creator workflow.</div>
                ) : records.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#CBD2DC] bg-white px-6 py-12 text-center">
                        <FiUsers size={28} className="mx-auto text-[#9CA3AF]" />
                        <h3 className="mt-3 font-semibold">No creators linked yet</h3>
                        <p className="mx-auto mt-1 max-w-lg text-sm text-[#6B7280]">Generate suggestions to rank available creator profiles against this campaign. Matching is preliminary profile fit, not predicted performance.</p>
                    </div>
                ) : records.map((record) => {
                    const draft = drafts[record.campaign_creator_id] || {};
                    const busy = busyId === record.campaign_creator_id;
                    const setDraft = (key, value) => setDrafts((current) => ({ ...current, [record.campaign_creator_id]: { ...current[record.campaign_creator_id], [key]: value } }));
                    return (
                        <article key={record.campaign_creator_id} className="rounded-xl border border-[#E3E7ED] bg-white p-4 shadow-sm sm:p-5">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="flex min-w-0 items-start gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FFF0DF] font-bold text-[#B85E00]">{(record.display_name || "C").trim().slice(0, 1).toUpperCase()}</div>
                                    <div className="min-w-0">
                                        <h3 className="font-semibold">{record.display_name}</h3>
                                        <p className="mt-0.5 text-xs text-[#6B7280]">{[record.city, record.country].filter(Boolean).join(", ") || "Location not provided"} · {(record.categories || []).join(", ") || "No categories listed"}</p>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {(record.social_accounts || []).map((account) => <span key={account.id} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{account.platform} · @{account.handle}</span>)}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    {record.match_score !== null && record.match_score !== undefined && <span className="rounded-lg bg-[#FFF7ED] px-3 py-2 text-xs font-semibold text-[#8A4B08]">{Math.round(record.match_score)}% profile fit</span>}
                                    <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusStyle(record.status)}`}>{humanize(record.status)}</span>
                                </div>
                            </div>

                            <div className="mt-4 grid gap-2 rounded-lg bg-[#F8F9FA] p-3 text-xs text-[#6B7280] sm:grid-cols-2">
                                {record.invited_at && <p><FiSend className="mr-1 inline" /> Invited: {formatDate(record.invited_at)}</p>}
                                {record.accepted_at && <p><FiCheck className="mr-1 inline" /> Accepted: {formatDate(record.accepted_at)}</p>}
                                {record.content_submitted_at && <p><FiClock className="mr-1 inline" /> Content submitted: {formatDate(record.content_submitted_at)}</p>}
                                {record.completed_at && <p><FiCheck className="mr-1 inline" /> Completed: {formatDate(record.completed_at)}</p>}
                                {record.content_url && <p className="truncate"><FiExternalLink className="mr-1 inline" /> <a className="text-[#B85E00] underline" href={record.content_url} target="_blank" rel="noreferrer">Open submitted content</a></p>}
                                {record.review_note && <p className="sm:col-span-2"><span className="font-semibold text-[#495057]">Review note:</span> {record.review_note}</p>}
                            </div>

                            {["Accepted", "ChangesRequested"].includes(record.status) && (
                                <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                                    <label className="text-xs font-medium text-[#495057]">Content URL
                                        <input className={inputClass + " mt-1"} type="url" placeholder="https://..." value={draft.content_url || ""} onChange={(event) => setDraft("content_url", event.target.value)} />
                                    </label>
                                    <label className="text-xs font-medium text-[#495057]">Submission note (optional)
                                        <input className={inputClass + " mt-1"} placeholder="Post, draft, or asset details" value={draft.content_note || ""} onChange={(event) => setDraft("content_note", event.target.value)} />
                                    </label>
                                    <button className={buttonPrimary} disabled={busy} onClick={() => runAction(record, "submit_content")} type="button">Record submission</button>
                                </div>
                            )}

                            {record.status === "ContentSubmitted" && (
                                <div className="mt-4 flex flex-col gap-2">
                                    <label className="text-xs font-medium text-[#495057]">Review note (required for changes, optional for approval)
                                        <textarea className={inputClass + " mt-1 min-h-16"} placeholder="Feedback for the creator..." value={draft.review_note || ""} onChange={(event) => setDraft("review_note", event.target.value)} />
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        <button className={buttonSecondary} disabled={busy || !draft.review_note?.trim()} onClick={() => runAction(record, "request_changes")} type="button"><FiRefreshCw size={13} /> Request changes</button>
                                        <button className={buttonPrimary} disabled={busy} onClick={() => runAction(record, "approve_content")} type="button"><FiCheck size={13} /> Approve content</button>
                                    </div>
                                </div>
                            )}

                            <div className="mt-4 flex flex-wrap gap-2 border-t border-[#EEF0F3] pt-3">
                                {record.status === "Suggested" && <button className={buttonPrimary} disabled={busy} onClick={() => runAction(record, "invite")} type="button"><FiSend size={13} /> Record invitation</button>}
                                {record.status === "Applied" && <>
                                    <button className={buttonPrimary} disabled={busy} onClick={() => runAction(record, "accept_application")} type="button"><FiCheck size={13} /> Accept application</button>
                                    <button className={buttonSecondary} disabled={busy} onClick={() => runAction(record, "decline_application")} type="button"><FiXCircle size={13} /> Decline application</button>
                                </>}
                                {record.status === "Invited" && <>
                                    <button className={buttonPrimary} disabled={busy} onClick={() => runAction(record, "accept")} type="button"><FiCheck size={13} /> Record acceptance</button>
                                    <button className={buttonSecondary} disabled={busy} onClick={() => runAction(record, "decline")} type="button"><FiXCircle size={13} /> Record decline</button>
                                </>}
                                {record.status === "Approved" && <button className={buttonPrimary} disabled={busy} onClick={() => runAction(record, "complete")} type="button"><FiCheck size={13} /> Mark completed</button>}
                                {!["Completed", "Cancelled"].includes(record.status) && <button className={buttonSecondary} disabled={busy} onClick={() => runAction(record, "cancel")} type="button">Cancel collaboration</button>}
                                {busy && <span className="self-center text-xs text-[#6B7280]">Updating status...</span>}
                            </div>
                        </article>
                    );
                })}
            </section>
            <p className="text-xs leading-5 text-[#9CA3AF]">Workflow timestamps are stored for auditability. Creator acceptance, content review, and completion are manually recorded by an operator in this milestone; creator-facing accounts, messaging, notifications, and permission checks are future work.</p>
        </main>
    );
}
