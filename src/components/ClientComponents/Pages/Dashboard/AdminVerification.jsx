"use client";

import { useCallback, useEffect, useState } from "react";
import { FiCheck, FiRefreshCw, FiShield, FiX } from "react-icons/fi";

const buttonPrimary = "inline-flex items-center justify-center gap-2 rounded-lg bg-[#FA8500] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e87900] disabled:cursor-not-allowed disabled:opacity-60";
const buttonSecondary = "inline-flex items-center justify-center gap-2 rounded-lg border border-[#D9DEE7] bg-white px-4 py-2.5 text-sm font-semibold text-[#495057] transition hover:bg-[#F8F9FA] disabled:cursor-not-allowed disabled:opacity-60";
const inputClass = "w-full rounded-lg border border-[#D9DEE7] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#FA8500]";

export default function AdminVerificationPage() {
    const [requests, setRequests] = useState([]);
    const [notes, setNotes] = useState({});
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const loadRequests = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const response = await fetch("/api/v1/admin/verification-requests", { cache: "no-store" });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not load verification requests.");
            setRequests(data.requests || []);
        } catch (cause) {
            setError(cause.message || "Could not load verification requests.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadRequests(); }, [loadRequests]);

    async function review(request, decision) {
        setBusyId(request.social_account_id);
        setError("");
        setNotice("");
        try {
            const response = await fetch(`/api/v1/admin/social-accounts/${encodeURIComponent(request.social_account_id)}/verification`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ decision, review_note: notes[request.social_account_id] || "" }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not review this request.");
            setNotice(`${request.creator.display_name}: request ${decision}.`);
            await loadRequests();
        } catch (cause) {
            setError(cause.message || "Could not review this request.");
        } finally {
            setBusyId("");
        }
    }

    return (
        <main className="flex flex-col gap-6 pb-8 text-[#212529]">
            <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#FA8500]">Platform operations</p>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">Creator verification</h1>
                    <p className="mt-1 max-w-2xl text-sm text-[#6B7280]">Review submitted account evidence. Approval is recorded by the server and cannot be performed by the creator.</p>
                </div>
                <button type="button" className={buttonSecondary} onClick={loadRequests} disabled={loading}><FiRefreshCw size={14} /> Refresh queue</button>
            </header>

            <div role="note" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900">
                Verify ownership using an approved process before approving. A profile URL, handle, or creator-provided metrics alone is not proof of ownership.
            </div>
            {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {notice && <div role="status" className="rounded-lg border border-[#FAD7AE] bg-[#FFF7ED] px-4 py-3 text-sm text-[#8A4B08]">{notice}</div>}

            <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Pending requests</h2>
                    <span className="rounded-full bg-white px-3 py-1 text-xs text-[#6B7280] shadow-sm">{loading ? "Loading..." : `${requests.length} pending`}</span>
                </div>
                {loading ? <div className="rounded-xl border border-[#E3E7ED] bg-white p-10 text-center text-sm text-[#6B7280]">Loading verification queue...</div>
                    : requests.length === 0 ? <div className="rounded-xl border border-dashed border-[#CBD2DC] bg-white px-6 py-12 text-center">
                        <FiShield size={28} className="mx-auto text-[#9CA3AF]" />
                        <h3 className="mt-3 font-semibold">No pending verification requests</h3>
                        <p className="mt-1 text-sm text-[#6B7280]">New creator requests will appear here.</p>
                    </div>
                    : requests.map((request) => (
                        <article key={request.social_account_id} className="rounded-xl border border-[#E3E7ED] bg-white p-4 shadow-sm sm:p-5">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <h3 className="font-semibold">{request.creator.display_name}</h3>
                                    <p className="mt-1 text-sm text-[#495057]">{request.platform} · @{request.handle}</p>
                                    <p className="mt-1 text-xs text-[#6B7280]">{[request.creator.city, request.creator.country].filter(Boolean).join(", ") || "Location not provided"} · Requested {request.requested_at ? new Date(request.requested_at).toLocaleString() : "date unavailable"}</p>
                                    {request.request_note && <p className="mt-3 rounded-lg bg-[#F8F9FA] p-3 text-sm text-[#495057]">{request.request_note}</p>}
                                    <div className="mt-3 flex flex-wrap gap-3 text-sm">
                                        {request.profile_url && <a className="text-[#B85E00] underline" href={request.profile_url} target="_blank" rel="noreferrer">Open social profile</a>}
                                        {request.evidence_url && <a className="text-[#B85E00] underline" href={request.evidence_url} target="_blank" rel="noreferrer">Open submitted evidence</a>}
                                    </div>
                                </div>
                                <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">Pending review</span>
                            </div>
                            <label className="mt-4 block text-xs font-semibold text-[#495057]">Review note (visible to the creator)
                                <textarea className={inputClass + " mt-1"} rows={2} maxLength={1000} value={notes[request.social_account_id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [request.social_account_id]: event.target.value }))} placeholder="Explain the decision or required follow-up..." />
                            </label>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <button type="button" className={buttonPrimary} disabled={busyId === request.social_account_id} onClick={() => review(request, "verified")}><FiCheck size={14} /> {busyId === request.social_account_id ? "Saving..." : "Approve verification"}</button>
                                <button type="button" className={buttonSecondary} disabled={busyId === request.social_account_id} onClick={() => review(request, "rejected")}><FiX size={14} /> Reject request</button>
                            </div>
                        </article>
                    ))}
            </section>
        </main>
    );
}
