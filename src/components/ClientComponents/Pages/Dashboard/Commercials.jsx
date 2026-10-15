"use client";

import { useCallback, useEffect, useState } from "react";
import { FiCheck, FiClock, FiDollarSign, FiRefreshCw, FiSend, FiShield, FiX } from "react-icons/fi";

const primary = "inline-flex items-center justify-center gap-2 rounded-lg bg-[#FA8500] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e87900] disabled:cursor-not-allowed disabled:opacity-50";
const secondary = "inline-flex items-center justify-center gap-2 rounded-lg border border-[#D9DEE7] bg-white px-3 py-2 text-sm font-semibold text-[#495057] transition hover:bg-[#F8F9FA] disabled:cursor-not-allowed disabled:opacity-50";
const field = "w-full rounded-lg border border-[#D9DEE7] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#FA8500]";
const currencies = ["USD", "PKR", "GBP", "EUR", "AED", "SAR", "INR", "CAD", "AUD"];
const money = (amount, currency) => amount === null || amount === undefined ? "Not set" : new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD", maximumFractionDigits: 2 }).format(Number(amount));
const label = (status) => (status || "NONE").replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());

export default function CommercialsPage() {
    const [user, setUser] = useState(null);
    const [links, setLinks] = useState([]);
    const [payments, setPayments] = useState([]);
    const [drafts, setDrafts] = useState({});
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const loadData = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const meResponse = await fetch("/api/v1/auth/me", { cache: "no-store" });
            const me = await meResponse.json();
            if (!meResponse.ok || !me.user) throw new Error("Sign in to manage commercial terms.");
            setUser(me.user);
            let items = [];
            if (me.user.role === "BRAND") {
                const campaignResponse = await fetch("/api/v1/campaigns", { cache: "no-store" });
                const campaigns = await campaignResponse.json();
                if (!campaignResponse.ok) throw new Error(campaigns?.error || "Could not load campaigns.");
                const groups = await Promise.all((Array.isArray(campaigns) ? campaigns : []).map(async (campaign) => {
                    const response = await fetch("/api/v1/campaigns/" + encodeURIComponent(campaign.id) + "/creators", { cache: "no-store" });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data?.error || "Could not load campaign creators.");
                    return (data.creators || []).map((creator) => ({ ...creator, campaign_id: campaign.id, campaign_title: campaign.campaign_details?.campaign_title || "Untitled campaign" }));
                }));
                items = groups.flat();
            } else if (me.user.role === "CREATOR" && me.user.creator_profile_id) {
                const response = await fetch("/api/v1/creators/" + encodeURIComponent(me.user.creator_profile_id) + "/invitations", { cache: "no-store" });
                const data = await response.json();
                if (!response.ok) throw new Error(data?.error || "Could not load your collaborations.");
                items = (data.invitations || []).map((item) => ({ ...item, display_name: item.campaign_title, campaign_title: item.campaign_title }));
            } else {
                throw new Error("Commercial operations are available to brand and creator accounts.");
            }
            const enriched = await Promise.all(items.map(async (item) => {
                try {
                    const response = await fetch("/api/v1/campaigns/" + encodeURIComponent(item.campaign_id) + "/creators/" + encodeURIComponent(item.campaign_creator_id) + "/commercials", { cache: "no-store" });
                    const commercial = await response.json();
                    return response.ok ? { ...item, commercial } : { ...item, commercial: null };
                } catch { return { ...item, commercial: null }; }
            }));
            const paymentResponse = await fetch("/api/v1/payments", { cache: "no-store" });
            const paymentData = await paymentResponse.json();
            if (!paymentResponse.ok) throw new Error(paymentData?.error || "Could not load payment records.");
            setLinks(enriched);
            setPayments(paymentData.payments || []);
        } catch (err) {
            setError(err.message || "Unable to load commercial operations.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const updateDraft = (id, key, value) => setDrafts((current) => ({ ...current, [id]: { ...(current[id] || {}), [key]: value } }));

    async function commercialAction(link, action, extra = {}) {
        const key = link.campaign_creator_id;
        setBusy(key); setError(""); setNotice("");
        try {
            const response = await fetch("/api/v1/campaigns/" + encodeURIComponent(link.campaign_id) + "/creators/" + encodeURIComponent(key) + "/commercials", {
                method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...extra }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Commercial action failed.");
            setNotice("Commercial terms updated for " + (link.display_name || link.creator_name || "this collaboration") + ".");
            await loadData();
        } catch (err) { setError(err.message || "Commercial action failed."); }
        finally { setBusy(""); }
    }

    async function createPayment(link) {
        const key = link.campaign_creator_id;
        const draft = drafts[key] || {};
        setBusy("payment:" + key); setError(""); setNotice("");
        try {
            const response = await fetch("/api/v1/payments", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    campaign_creator_id: key,
                    amount: draft.payment_amount ?? link.commercial?.agreed_fee,
                    currency: link.commercial?.currency || "USD",
                    due_at: draft.payment_due_at || null,
                    reference: draft.payment_reference || "",
                    note: draft.payment_note || "",
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not create payment record.");
            setNotice("Payment record created. This records a planned payment; it does not transfer money.");
            await loadData();
        } catch (err) { setError(err.message || "Could not create payment record."); }
        finally { setBusy(""); }
    }

    async function updatePayment(payment, status) {
        setBusy(payment.id); setError(""); setNotice("");
        try {
            const response = await fetch("/api/v1/payments/" + encodeURIComponent(payment.id), {
                method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not update payment status.");
            setNotice(status === "PAID" ? "Payment record marked paid manually. No transfer was initiated." : "Payment status updated.");
            await loadData();
        } catch (err) { setError(err.message || "Could not update payment status."); }
        finally { setBusy(""); }
    }

    return (
        <main className="flex flex-col gap-6 pb-8 text-[#212529]">
            <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#FA8500]">Commercial operations</p>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">Proposals & payments</h1>
                    <p className="mt-1 max-w-2xl text-sm text-[#6B7280]">Agree on collaboration fees, record payment terms, and track payment status in one place.</p>
                </div>
                <button className={secondary} type="button" onClick={loadData} disabled={loading}><FiRefreshCw size={14} /> Refresh</button>
            </header>

            <div role="note" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900">
                Influna records commercial agreements and manually maintained payment statuses only. It does not charge customers, transfer funds, or verify that a transfer occurred. Mark a record paid only after confirming payment outside this app.
            </div>
            {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {notice && <div role="status" className="rounded-lg border border-[#FAD7AE] bg-[#FFF7ED] px-4 py-3 text-sm text-[#8A4B08]">{notice}</div>}

            <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Collaboration terms</h2><span className="text-xs text-[#6B7280]">{links.length} collaborations</span></div>
                {loading ? <div className="rounded-xl border border-[#E3E7ED] bg-white p-10 text-center text-sm text-[#6B7280]">Loading commercial records...</div> :
                links.length === 0 ? <div className="rounded-xl border border-dashed border-[#CBD2DC] bg-white p-10 text-center text-sm text-[#6B7280]">No collaborations are available yet. Create a campaign and invite or accept a creator first.</div> :
                links.map((link) => {
                    const item = link.commercial || {};
                    const key = link.campaign_creator_id;
                    const draft = drafts[key] || {};
                    const isBrand = user?.role === "BRAND";
                    const pendingOffer = item.proposal_status === "OFFERED";
                    const pendingCounter = item.proposal_status === "COUNTERED";
                    const agreed = item.proposal_status === "AGREED";
                    const recordedTotal = payments.filter((payment) => payment.campaign_creator_id === key && payment.status !== "CANCELLED").reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
                    const remainingFee = Math.max(0, Number(item.agreed_fee || 0) - recordedTotal);
                    return <article key={key} className="rounded-xl border border-[#E3E7ED] bg-white p-4 shadow-sm sm:p-5">
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                            <div><h3 className="font-semibold">{link.campaign_title || "Untitled campaign"}</h3><p className="mt-1 text-sm text-[#6B7280]">{isBrand ? (link.display_name || "Creator") : "Brand campaign"} · Collaboration status: {label(link.status)}</p></div>
                            <span className={"w-fit rounded-full px-3 py-1.5 text-xs font-semibold " + (agreed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800")}>{label(item.proposal_status)}</span>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                            <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-[#6B7280]">Brand offer</p><p className="mt-1 font-semibold">{money(item.proposed_fee, item.currency)}</p></div>
                            <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-[#6B7280]">Counteroffer</p><p className="mt-1 font-semibold">{money(item.counter_fee, item.currency)}</p></div>
                            <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-[#6B7280]">Agreed fee</p><p className="mt-1 font-semibold">{money(item.agreed_fee, item.currency)}</p></div>
                        </div>
                        {item.payment_terms && <p className="mt-3 text-sm"><span className="font-medium">Payment terms:</span> {item.payment_terms}</p>}
                        {item.proposal_note && <p className="mt-1 text-sm text-[#6B7280]"><span className="font-medium">Note:</span> {item.proposal_note}</p>}

                        {isBrand && !agreed && <div className="mt-4 rounded-lg border border-[#E3E7ED] p-3">
                            <h4 className="mb-3 text-sm font-semibold">{pendingCounter ? "Review counteroffer or send a revised offer" : "Send or revise offer"}</h4>
                            {pendingCounter && <button className={primary + " mb-3"} type="button" disabled={busy === key} onClick={() => commercialAction(link, "accept_counter")}><FiCheck size={14} /> Accept counteroffer ({money(item.counter_fee, item.currency)})</button>}
                            <div className="grid gap-3 sm:grid-cols-4">
                                <label className="text-xs font-medium text-[#495057]">Amount<input className={field + " mt-1"} type="number" min="0.01" step="0.01" value={draft.amount ?? (pendingCounter ? item.proposed_fee ?? "" : item.proposed_fee ?? "")} onChange={(e) => updateDraft(key, "amount", e.target.value)} placeholder="Offer amount" /></label>
                                <label className="text-xs font-medium text-[#495057]">Currency<select className={field + " mt-1"} value={draft.currency || item.currency || "USD"} onChange={(e) => updateDraft(key, "currency", e.target.value)}>{currencies.map((currency) => <option key={currency}>{currency}</option>)}</select></label>
                                <label className="text-xs font-medium text-[#495057] sm:col-span-2">Payment terms<input className={field + " mt-1"} value={draft.payment_terms ?? item.payment_terms ?? ""} onChange={(e) => updateDraft(key, "payment_terms", e.target.value)} placeholder="e.g. 50% upfront, 50% after approval" /></label>
                                <label className="text-xs font-medium text-[#495057] sm:col-span-4">Offer note (optional)<textarea className={field + " mt-1"} rows={2} value={draft.note ?? item.proposal_note ?? ""} onChange={(e) => updateDraft(key, "note", e.target.value)} placeholder="Scope, usage rights, number of posts..." /></label>
                            </div>
                            <button className={primary + " mt-3"} type="button" disabled={busy === key || !String(draft.amount ?? item.proposed_fee ?? "").trim() || Number(draft.amount ?? item.proposed_fee) <= 0 || !String(draft.payment_terms ?? item.payment_terms ?? "").trim()} onClick={() => commercialAction(link, "send_offer", { amount: Number(draft.amount ?? item.proposed_fee), currency: draft.currency || item.currency || "USD", payment_terms: draft.payment_terms ?? item.payment_terms, note: draft.note ?? item.proposal_note ?? "" })}><FiSend size={14} /> Send offer</button>
                        </div>}

                        {!isBrand && pendingOffer && <div className="mt-4 rounded-lg border border-[#E3E7ED] p-3">
                            <h4 className="text-sm font-semibold">Respond to the offer</h4>
                            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_2fr]">
                                <label className="text-xs font-medium text-[#495057]">Your counteroffer<input className={field + " mt-1"} type="number" min="0.01" step="0.01" value={draft.counter_amount || ""} onChange={(e) => updateDraft(key, "counter_amount", e.target.value)} placeholder={`Counteroffer amount in ${item.currency || "USD"}`} /></label>
                                <label className="text-xs font-medium text-[#495057]">Counteroffer note (optional)<input className={field + " mt-1"} value={draft.counter_note || ""} onChange={(e) => updateDraft(key, "counter_note", e.target.value)} placeholder="Explain your requested fee or terms" /></label>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <button className={primary} type="button" disabled={busy === key} onClick={() => commercialAction(link, "accept_offer")}><FiCheck size={14} /> Accept offer</button>
                                <button className={secondary} type="button" disabled={busy === key || !draft.counter_amount || Number(draft.counter_amount) <= 0} onClick={() => commercialAction(link, "counter_offer", { amount: Number(draft.counter_amount), note: draft.counter_note || "" })}><FiDollarSign size={14} /> Counteroffer</button>
                                <button className={secondary} type="button" disabled={busy === key} onClick={() => commercialAction(link, "reject_offer")}><FiX size={14} /> Reject</button>
                            </div>
                        </div>}

                        {isBrand && agreed && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                            <h4 className="text-sm font-semibold">Record a payment</h4>
                            <p className="mt-1 text-xs text-[#6B7280]">You can split the agreed fee into multiple records, such as an advance and a final payment.</p>
                            <div className="mt-3 grid gap-3 sm:grid-cols-4">
                                <label className="text-xs font-medium text-[#495057]">Amount<input className={field + " mt-1"} type="number" min="0.01" step="0.01" value={draft.payment_amount ?? remainingFee} onChange={(e) => updateDraft(key, "payment_amount", e.target.value)} /></label>
                                <label className="text-xs font-medium text-[#495057]">Currency<input className={field + " mt-1"} value={item.currency || "USD"} readOnly /></label>
                                <label className="text-xs font-medium text-[#495057]">Due date<input className={field + " mt-1"} type="date" value={draft.payment_due_at || ""} onChange={(e) => updateDraft(key, "payment_due_at", e.target.value ? new Date(e.target.value + "T12:00:00").toISOString() : "")} /></label>
                                <label className="text-xs font-medium text-[#495057]">Reference<input className={field + " mt-1"} value={draft.payment_reference || ""} onChange={(e) => updateDraft(key, "payment_reference", e.target.value)} placeholder="Invoice or transaction ref" /></label>
                                <label className="text-xs font-medium text-[#495057] sm:col-span-4">Note<input className={field + " mt-1"} value={draft.payment_note || ""} onChange={(e) => updateDraft(key, "payment_note", e.target.value)} placeholder="Advance, final installment, or other context" /></label>
                            </div>
                            <button className={primary + " mt-3"} type="button" disabled={busy === "payment:" + key || !Number(draft.payment_amount ?? item.agreed_fee)} onClick={() => createPayment(link)}><FiDollarSign size={14} /> Add payment record</button>
                        </div>}
                    </article>;
                })}
            </section>

            <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Payment ledger</h2><span className="text-xs text-[#6B7280]">{payments.length} records</span></div>
                {payments.length === 0 ? <div className="rounded-xl border border-dashed border-[#CBD2DC] bg-white p-8 text-center text-sm text-[#6B7280]">No payment records yet. Payment records become available after a fee is agreed.</div> :
                    <div className="overflow-hidden rounded-xl border border-[#E3E7ED] bg-white">
                        {payments.map((payment) => <div key={payment.id} className="flex flex-col gap-3 border-b border-[#E3E7ED] p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
                            <div><p className="font-semibold">{payment.campaign_title} · {payment.creator_name}</p><p className="mt-1 text-sm">{money(payment.amount, payment.currency)} <span className="text-[#6B7280]">· {payment.due_at ? "Due " + new Date(payment.due_at).toLocaleDateString() : "No due date"} · {payment.reference || "No reference"}</span></p>{payment.note && <p className="mt-1 text-xs text-[#6B7280]">{payment.note}</p>}{payment.paid_at && <p className="mt-1 text-xs text-emerald-700">Marked paid on {new Date(payment.paid_at).toLocaleDateString()} (manual record)</p>}</div>
                            <div className="flex flex-wrap items-center gap-2"><span className={"rounded-full px-3 py-1.5 text-xs font-semibold " + (payment.status === "PAID" ? "bg-emerald-50 text-emerald-700" : payment.status === "CANCELLED" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800")}>{label(payment.status)}</span>
                                {user?.role === "BRAND" && payment.status === "PLANNED" && <><button className={secondary} disabled={busy === payment.id} onClick={() => updatePayment(payment, "PROCESSING")}><FiClock size={13} /> Processing</button><button className={primary} disabled={busy === payment.id} onClick={() => updatePayment(payment, "PAID")}><FiCheck size={13} /> Mark paid</button><button className={secondary} disabled={busy === payment.id} onClick={() => updatePayment(payment, "CANCELLED")}><FiX size={13} /> Cancel</button></>}
                                {user?.role === "BRAND" && payment.status === "PROCESSING" && <><button className={primary} disabled={busy === payment.id} onClick={() => updatePayment(payment, "PAID")}><FiCheck size={13} /> Mark paid</button><button className={secondary} disabled={busy === payment.id} onClick={() => updatePayment(payment, "CANCELLED")}><FiX size={13} /> Cancel</button></>}
                            </div>
                        </div>)}
                    </div>}
            </section>
        </main>
    );
}
