"use client";

import { useCallback, useEffect, useState } from "react";
import { FiCalendar, FiCheck, FiClock, FiExternalLink, FiFileText, FiRefreshCw, FiUploadCloud } from "react-icons/fi";

const primary = "inline-flex items-center justify-center gap-2 rounded-lg bg-[#FA8500] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e87900] disabled:cursor-not-allowed disabled:opacity-50";
const secondary = "inline-flex items-center justify-center gap-2 rounded-lg border border-[#D9DEE7] bg-white px-3 py-2 text-sm font-semibold text-[#495057] transition hover:bg-[#F8F9FA] disabled:cursor-not-allowed disabled:opacity-50";
const field = "w-full rounded-lg border border-[#D9DEE7] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#FA8500]";

function prettyStatus(value) {
    return (value || "Pending").replace(/([a-z])([A-Z])/g, "$1 $2");
}
function dateLabel(value) {
    if (!value) return "No deadline";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Invalid date" : date.toLocaleString();
}
function statusClass(value) {
    if (["Approved", "Completed"].includes(value)) return "bg-emerald-50 text-emerald-700";
    if (value === "ChangesRequested") return "bg-amber-50 text-amber-800";
    if (value === "Submitted") return "bg-sky-50 text-sky-700";
    return "bg-slate-100 text-slate-700";
}

export default function DeliverablesPage() {
    const [user, setUser] = useState(null);
    const [campaigns, setCampaigns] = useState([]);
    const [links, setLinks] = useState([]);
    const [campaignId, setCampaignId] = useState("");
    const [linkId, setLinkId] = useState("");
    const [deliverables, setDeliverables] = useState([]);
    const [drafts, setDrafts] = useState({});
    const [newItem, setNewItem] = useState({ title: "", description: "", due_at: "" });
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const loadDeliverables = useCallback(async () => {
        if (!campaignId || !linkId) {
            setDeliverables([]);
            return;
        }
        const response = await fetch("/api/v1/campaigns/" + encodeURIComponent(campaignId) + "/creators/" + encodeURIComponent(linkId) + "/deliverables", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Could not load deliverables.");
        setDeliverables(data.deliverables || []);
    }, [campaignId, linkId]);

    const loadLinks = useCallback(async (currentUser, nextCampaignId) => {
        if (!currentUser) return;
        if (currentUser.role === "BRAND") {
            if (!nextCampaignId) { setLinks([]); setLinkId(""); return; }
            const response = await fetch("/api/v1/campaigns/" + encodeURIComponent(nextCampaignId) + "/creators", { cache: "no-store" });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not load campaign creators.");
            const list = data.creators || [];
            setLinks(list);
            setLinkId((current) => list.some((item) => item.campaign_creator_id === current) ? current : (list[0]?.campaign_creator_id || ""));
        } else if (currentUser.role === "CREATOR" && currentUser.creator_profile_id) {
            const response = await fetch("/api/v1/creators/" + encodeURIComponent(currentUser.creator_profile_id) + "/invitations", { cache: "no-store" });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not load collaborations.");
            const list = data.invitations || [];
            setLinks(list);
            setCampaignId("");
            setLinkId((current) => list.some((item) => item.campaign_creator_id === current) ? current : (list[0]?.campaign_creator_id || ""));
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        async function init() {
            setLoading(true);
            try {
                const response = await fetch("/api/v1/auth/me", { cache: "no-store" });
                const data = await response.json();
                if (!response.ok || !data.user) throw new Error("Sign in to manage campaign deliverables.");
                if (cancelled) return;
                setUser(data.user);
                if (data.user.role === "BRAND") {
                    const campaignsResponse = await fetch("/api/v1/campaigns", { cache: "no-store" });
                    const campaignsData = await campaignsResponse.json();
                    if (!campaignsResponse.ok) throw new Error(campaignsData?.error || "Could not load campaigns.");
                    if (cancelled) return;
                    const list = Array.isArray(campaignsData) ? campaignsData : [];
                    setCampaigns(list);
                    const firstId = list[0]?.id || "";
                    setCampaignId(firstId);
                    if (firstId) await loadLinks(data.user, firstId);
                } else {
                    await loadLinks(data.user, "");
                }
            } catch (err) {
                if (!cancelled) setError(err.message || "Could not initialize deliverables.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        init();
        return () => { cancelled = true; };
    }, [loadLinks]);

    useEffect(() => {
        if (!user || user.role !== "BRAND") return;
        loadLinks(user, campaignId).catch((err) => setError(err.message || "Could not load campaign creators."));
    }, [user, campaignId, loadLinks]);

    useEffect(() => {
        if (!campaignId || !linkId) {
            if (user?.role === "BRAND") setDeliverables([]);
            return;
        }
        loadDeliverables().catch((err) => setError(err.message || "Could not load deliverables."));
    }, [campaignId, linkId, user, loadDeliverables]);

    useEffect(() => {
        if (user?.role === "CREATOR" && linkId) {
            const link = links.find((item) => item.campaign_creator_id === linkId);
            if (link) setCampaignId(link.campaign_id);
        }
    }, [user, links, linkId]);

    function updateDraft(id, key, value) {
        setDrafts((current) => ({ ...current, [id]: { ...current[id], [key]: value } }));
    }

    async function createDeliverable(event) {
        event.preventDefault();
        if (!campaignId || !linkId) return;
        setBusy("create");
        setError("");
        setNotice("");
        try {
            const response = await fetch("/api/v1/campaigns/" + encodeURIComponent(campaignId) + "/creators/" + encodeURIComponent(linkId) + "/deliverables", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newItem),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not create deliverable.");
            setNewItem({ title: "", description: "", due_at: "" });
            setNotice("Deliverable requirements added.");
            await loadDeliverables();
        } catch (err) {
            setError(err.message || "Could not create deliverable.");
        } finally {
            setBusy("");
        }
    }

    async function runAction(item, action) {
        const draft = drafts[item.id] || {};
        if (action === "submit" && !draft.content_url?.trim()) {
            setError("Add a URL for the submitted content.");
            return;
        }
        if (action === "request_changes" && !draft.review_note?.trim()) {
            setError("Describe the changes required.");
            return;
        }
        setBusy(item.id + ":" + action);
        setError("");
        setNotice("");
        try {
            const response = await fetch("/api/v1/campaigns/" + encodeURIComponent(campaignId) + "/creators/" + encodeURIComponent(linkId) + "/deliverables/" + encodeURIComponent(item.id), {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action,
                    ...(action === "submit" ? { content_url: draft.content_url, creator_note: draft.creator_note || "" } : {}),
                    ...(["request_changes", "approve"].includes(action) ? { review_note: draft.review_note || "" } : {}),
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not update deliverable.");
            setNotice(data.collaboration_status === "Approved" ? "All deliverables approved. Collaboration marked Approved." : "Deliverable updated: " + prettyStatus(data.status) + ".");
            setDrafts((current) => ({ ...current, [item.id]: { ...current[item.id], content_url: "", creator_note: "", review_note: "" } }));
            await loadDeliverables();
            if (isBrand) await loadLinks(user, campaignId);
        } catch (err) {
            setError(err.message || "Could not update deliverable.");
        } finally {
            setBusy("");
        }
    }

    const selectedLink = links.find((item) => item.campaign_creator_id === linkId);
    const selectedCampaign = campaigns.find((item) => item.id === campaignId);
    const isBrand = user?.role === "BRAND";
    const canChoose = isBrand ? links.length > 0 : links.length > 0;

    return (
        <main className="flex flex-col gap-6 pb-8 text-[#212529]">
            <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#FA8500]">Campaign operations</p>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">Deliverables & revisions</h1>
                    <p className="mt-1 max-w-2xl text-sm text-[#6B7280]">Define exactly what creators must deliver, set deadlines, review each submission, and keep a versioned revision history.</p>
                </div>
                <button className={secondary} type="button" disabled={!campaignId || !linkId || loading} onClick={() => loadDeliverables().catch((err) => setError(err.message))}><FiRefreshCw size={14} /> Refresh</button>
            </header>

            <div role="note" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900">
                Content is recorded as a URL and note; Influna does not upload media, publish posts, or send notifications. Approval here is a workflow record, not a payment or legal sign-off.
            </div>
            {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {notice && <div role="status" className="rounded-lg border border-[#FAD7AE] bg-[#FFF7ED] px-4 py-3 text-sm text-[#8A4B08]">{notice}</div>}

            <section className="rounded-xl border border-[#E3E7ED] bg-white p-4 shadow-sm sm:p-5">
                {isBrand && <label className="mb-3 block text-xs font-semibold text-[#495057]">Campaign
                    <select className={field + " mt-1"} value={campaignId} onChange={(event) => { setCampaignId(event.target.value); setLinkId(""); }}><option value="">Select a campaign...</option>{campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.campaign_details?.campaign_title || "Untitled campaign"}</option>)}</select>
                </label>}
                <label className="block text-xs font-semibold text-[#495057]">{isBrand ? "Creator collaboration" : "Campaign invitation"}
                    <select className={field + " mt-1"} value={linkId} onChange={(event) => setLinkId(event.target.value)}><option value="">Select a collaboration...</option>{links.map((item) => <option key={item.campaign_creator_id} value={item.campaign_creator_id}>{isBrand ? item.display_name : item.campaign_title} · {prettyStatus(item.status)}</option>)}</select>
                </label>
                {selectedLink && <p className="mt-3 text-xs text-[#6B7280]">{isBrand ? "Creator: " + selectedLink.display_name : "Campaign: " + selectedLink.campaign_title} · Collaboration status: {prettyStatus(selectedLink.status)}</p>}
                {!loading && !canChoose && <p className="mt-3 text-sm text-[#6B7280]">{isBrand ? "Create a campaign and generate creator suggestions, then record an invitation to start defining deliverables." : "No creator invitations found for this account yet."}</p>}
            </section>

            {isBrand && campaignId && linkId && selectedLink?.status === "Accepted" && (
                <form onSubmit={createDeliverable} className="rounded-xl border border-[#E3E7ED] bg-white p-4 shadow-sm sm:p-5">
                    <h2 className="mb-3 flex items-center gap-2 font-semibold"><FiFileText /> Add deliverable requirement</h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-xs font-medium text-[#495057]">Title *
                            <input className={field + " mt-1"} maxLength={160} required value={newItem.title} onChange={(e) => setNewItem((v) => ({ ...v, title: e.target.value }))} placeholder="e.g. One Instagram Reel" />
                        </label>
                        <label className="text-xs font-medium text-[#495057]">Due date
                            <input className={field + " mt-1"} type="datetime-local" value={newItem.due_at} onChange={(e) => setNewItem((v) => ({ ...v, due_at: e.target.value }))} />
                        </label>
                        <label className="text-xs font-medium text-[#495057] sm:col-span-2">Brief and acceptance criteria
                            <textarea className={field + " mt-1 min-h-24"} maxLength={4000} value={newItem.description} onChange={(e) => setNewItem((v) => ({ ...v, description: e.target.value }))} placeholder="Include format, length, key message, tags, disclosure requirements, and what counts as approval." />
                        </label>
                    </div>
                    <button className={primary + " mt-3"} type="submit" disabled={busy === "create"}>{busy === "create" ? "Saving..." : "Add requirement"}</button>
                </form>
            )}

            {isBrand && campaignId && linkId && selectedLink && selectedLink.status !== "Accepted" && (
                <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    Deliverables can be defined after the creator accepts this collaboration. Current status: {prettyStatus(selectedLink.status)}.
                </div>
            )}

            <section className="flex flex-col gap-4">
                <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Deliverable checklist</h2><span className="text-xs text-[#6B7280]">{deliverables.length} items</span></div>
                {loading ? <div className="rounded-xl border border-[#E3E7ED] bg-white p-10 text-center text-sm text-[#6B7280]">Loading deliverables...</div>
                : !linkId ? <div className="rounded-xl border border-dashed border-[#CBD2DC] bg-white p-10 text-center text-sm text-[#6B7280]">Select a collaboration to view its deliverables.</div>
                : deliverables.length === 0 ? <div className="rounded-xl border border-dashed border-[#CBD2DC] bg-white p-10 text-center"><FiFileText size={26} className="mx-auto text-[#9CA3AF]" /><h3 className="mt-3 font-semibold">No deliverables yet</h3><p className="mt-1 text-sm text-[#6B7280]">{isBrand ? (selectedLink?.status === "Accepted" ? "Add the first requirement above so the creator knows exactly what to submit." : "The creator must accept this collaboration before deliverables can be defined.") : "The brand has not defined any deliverable requirements for this collaboration yet."}</p></div>
                : deliverables.map((item) => {
                    const draft = drafts[item.id] || {};
                    const latest = item.submissions?.[0];
                    const busyThis = busy.startsWith(item.id + ":");
                    return <article key={item.id} className="rounded-xl border border-[#E3E7ED] bg-white p-4 shadow-sm sm:p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 flex-1">
                                <h3 className="font-semibold">{item.title}</h3>
                                {item.description && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#6B7280]">{item.description}</p>}
                                <p className="mt-3 flex items-center gap-1.5 text-xs text-[#6B7280]"><FiCalendar size={13} /> Due: {dateLabel(item.due_at)}</p>
                            </div>
                            <span className={"w-fit rounded-full px-3 py-1.5 text-xs font-semibold " + statusClass(item.status)}>{prettyStatus(item.status)}</span>
                        </div>

                        {!isBrand && ["Pending", "ChangesRequested"].includes(item.status) && (
                            <div className="mt-4 rounded-lg border border-[#E3E7ED] bg-[#FAFBFC] p-3">
                                <h4 className="mb-2 text-sm font-semibold"><FiUploadCloud className="mr-1 inline" /> {item.status === "ChangesRequested" ? "Submit revised version" : "Submit deliverable"}</h4>
                                {latest?.review_note && <p className="mb-3 rounded-md bg-amber-50 p-2 text-sm text-amber-900">Requested changes: {latest.review_note}</p>}
                                <label className="block text-xs font-medium text-[#495057]">Content URL *
                                    <input className={field + " mt-1"} type="url" value={draft.content_url || ""} onChange={(e) => updateDraft(item.id, "content_url", e.target.value)} placeholder="https://..." />
                                </label>
                                <label className="mt-2 block text-xs font-medium text-[#495057]">Note (optional)
                                    <textarea className={field + " mt-1"} rows={2} maxLength={2000} value={draft.creator_note || ""} onChange={(e) => updateDraft(item.id, "creator_note", e.target.value)} placeholder="Context for the brand reviewer" />
                                </label>
                                <button className={primary + " mt-3"} type="button" disabled={busyThis} onClick={() => runAction(item, "submit")}>{busyThis ? "Submitting..." : "Submit version"}</button>
                            </div>
                        )}

                        {isBrand && item.status === "Submitted" && (
                            <div className="mt-4 rounded-lg border border-sky-100 bg-sky-50/40 p-3">
                                <h4 className="text-sm font-semibold">Review latest submission</h4>
                                <label className="mt-2 block text-xs font-medium text-[#495057]">Review note
                                    <textarea className={field + " mt-1"} rows={2} maxLength={2000} value={draft.review_note || ""} onChange={(e) => updateDraft(item.id, "review_note", e.target.value)} placeholder="Explain required changes, or leave blank to approve." />
                                </label>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <button className={secondary} type="button" disabled={busyThis} onClick={() => runAction(item, "request_changes")}>Request changes</button>
                                    <button className={primary} type="button" disabled={busyThis} onClick={() => runAction(item, "approve")}><FiCheck size={14} /> Approve</button>
                                </div>
                            </div>
                        )}

                        <div className="mt-4 border-t border-[#EEF0F3] pt-4">
                            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold"><FiClock size={14} /> Submission & revision history</h4>
                            {!item.submissions?.length ? <p className="text-xs text-[#9CA3AF]">No versions submitted yet.</p> : <div className="flex flex-col gap-3">
                                {item.submissions.map((submission) => <div key={submission.id} className="rounded-lg border border-[#E3E7ED] p-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span className="text-sm font-semibold">Version {submission.version}</span>
                                        <span className={"rounded-full px-2.5 py-1 text-[11px] font-semibold " + statusClass(submission.status)}>{prettyStatus(submission.status)}</span>
                                    </div>
                                    <a className="mt-2 inline-flex items-center gap-1 break-all text-sm text-[#B85E00] underline" href={submission.content_url} target="_blank" rel="noreferrer">{submission.content_url} <FiExternalLink size={12} /></a>
                                    {submission.creator_note && <p className="mt-2 text-sm text-[#6B7280]">Creator note: {submission.creator_note}</p>}
                                    <p className="mt-2 text-xs text-[#9CA3AF]">Submitted {dateLabel(submission.submitted_at)}{submission.reviewed_at ? " · Reviewed " + dateLabel(submission.reviewed_at) : ""}</p>
                                    {submission.review_note && <p className="mt-2 rounded-md bg-amber-50 p-2 text-sm text-amber-900">Review: {submission.review_note}</p>}
                                </div>)}
                            </div>}
                        </div>
                    </article>;
                })}
            </section>
        </main>
    );
}
