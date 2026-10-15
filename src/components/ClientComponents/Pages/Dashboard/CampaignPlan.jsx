"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiClipboard, FiPlus, FiRefreshCw, FiSave, FiSend, FiTrash2, FiUsers } from "react-icons/fi";

const inputClass = "w-full rounded-lg border border-[#D9DEE7] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#FA8500]";
const primary = "inline-flex items-center justify-center gap-2 rounded-lg bg-[#FA8500] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e87900] disabled:opacity-50";
const secondary = "inline-flex items-center justify-center gap-2 rounded-lg border border-[#D9DEE7] bg-white px-3 py-2 text-sm font-semibold text-[#495057] hover:bg-slate-50 disabled:opacity-50";
const emptyDraft = { creator_id: "", rate_card_id: "", quantity: "1", notes: "" };
function money(amount, currency) { try { return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(amount)); } catch { return `${currency} ${amount}`; } }

export default function CampaignPlanPage() {
    const [campaigns, setCampaigns] = useState([]);
    const [campaignId, setCampaignId] = useState("");
    const [creators, setCreators] = useState([]);
    const [items, setItems] = useState([]);
    const [draft, setDraft] = useState(emptyDraft);
    const [budget, setBudget] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [busyCreatorId, setBusyCreatorId] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const loadCampaigns = useCallback(async () => {
        try {
            const response = await fetch("/api/v1/campaigns", { cache: "no-store" });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not load campaigns.");
            const list = Array.isArray(data) ? data : [];
            setCampaigns(list);
            if (!campaignId && list.length) setCampaignId(list[0].id);
        } catch (err) { setError(err.message || "Could not load campaigns."); }
    }, [campaignId]);

    const loadPlan = useCallback(async () => {
        if (!campaignId) { setCreators([]); setItems([]); setBudget(null); setLoading(false); return; }
        setLoading(true); setError("");
        try {
            const response = await fetch(`/api/v1/campaigns/${encodeURIComponent(campaignId)}/plan`, { cache: "no-store" });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not load plan.");
            setCreators(data.creators || []); setItems((data.items || []).map(item => ({ creator_id: item.creator_id, rate_card_id: item.rate_card_id || "", quantity: String(item.quantity), notes: item.notes || "", unit_price: item.unit_price, currency: item.currency, platform: item.platform, deliverable_type: item.deliverable_type, creator_name: item.creator_name, current_rate: item.current_rate, current_rate_currency: item.current_rate_currency }))); setBudget(data.budget || null);
        } catch (err) { setError(err.message || "Could not load plan."); }
        finally { setLoading(false); }
    }, [campaignId]);

    useEffect(() => { loadCampaigns(); }, [loadCampaigns]);
    useEffect(() => { loadPlan(); }, [loadPlan]);

    const totals = useMemo(() => items.reduce((result, item) => {
        const creator = creators.find(entry => entry.creator_id === item.creator_id);
        const rate = creator?.rate_cards.find(entry => entry.id === item.rate_card_id);
        const currency = item.currency || rate?.currency;
        const unitPrice = item.unit_price ?? rate?.price;
        if (!currency || unitPrice === undefined || unitPrice === null) return result;
        result[currency] = (result[currency] || 0) + Number(unitPrice) * Math.max(1, Number(item.quantity) || 1);
        return result;
    }, {}), [items, creators]);

    const budgetCurrency = budget?.currency || "USD";
    const budgetSpend = totals[budgetCurrency] || 0;
    const remaining = budget ? budget.amount - budgetSpend : null;
    const selectedCampaign = campaigns.find(item => item.id === campaignId);
    const plannedCreators = creators.filter(creator => items.some(item => item.creator_id === creator.creator_id));

    async function invitePlannedCreator(creator) {
        if (!(await savePlan())) return;
        setBusyCreatorId(creator.creator_id); setError(""); setNotice("");
        try {
            const response = await fetch(`/api/v1/campaigns/${encodeURIComponent(campaignId)}/creators/${encodeURIComponent(creator.campaign_creator_id)}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "invite" }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not record invitation.");
            setNotice(`Invitation recorded for ${creator.display_name}. The creator's planned deliverables and rate estimates remain in the campaign plan.`);
            await loadPlan();
        } catch (err) { setError(err.message || "Could not record invitation."); }
        finally { setBusyCreatorId(""); }
    }

    async function createPlannedDeliverables(creator) {
        if (!(await savePlan())) return;
        setBusyCreatorId(creator.creator_id); setError(""); setNotice("");
        try {
            const response = await fetch(`/api/v1/campaigns/${encodeURIComponent(campaignId)}/plan/deliverables`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ creator_id: creator.creator_id }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not create deliverables.");
            setNotice(data.created_count ? `Created ${data.created_count} deliverable requirement(s) for ${creator.display_name}. Existing requirements were not duplicated.` : `No new deliverables were needed for ${creator.display_name}; the plan was already transferred.`);
        } catch (err) { setError(err.message || "Could not create deliverables."); }
        finally { setBusyCreatorId(""); }
    }

    function updateItem(index, key, value) { setItems(current => current.map((item, i) => i === index ? { ...item, [key]: value, ...(key === "creator_id" ? { rate_card_id: "" } : {}) } : item)); }
    function addItem() {
        const creator = creators.find(entry => entry.creator_id === draft.creator_id);
        if (!creator) { setError("Choose a creator who is already linked to this campaign."); return; }
        const rate = creator.rate_cards.find(entry => entry.id === draft.rate_card_id);
        if (!rate) { setError("Choose a public rate card."); return; }
        if (items.some(item => item.creator_id === draft.creator_id && item.rate_card_id === draft.rate_card_id)) { setError("That deliverable is already in the plan. Update its quantity instead."); return; }
        setItems(current => [...current, { ...draft, quantity: String(Math.min(100, Math.max(1, Number(draft.quantity) || 1))), unit_price: rate.price, currency: rate.currency, platform: rate.platform, deliverable_type: rate.deliverable_type, creator_name: creator.display_name, current_rate: rate.price, current_rate_currency: rate.currency }]);
        setDraft(emptyDraft); setError(""); setNotice("");
    }
    function removeItem(index) { setItems(current => current.filter((_, i) => i !== index)); }
    async function savePlan() {
        if (!campaignId) return;
        setSaving(true); setError(""); setNotice("");
        try {
            const response = await fetch(`/api/v1/campaigns/${encodeURIComponent(campaignId)}/plan`, {
                method: "PUT", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items: items.map(item => ({ creator_id: item.creator_id, rate_card_id: item.rate_card_id, quantity: Number(item.quantity), notes: item.notes || "" })) }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not save plan.");
            setItems((data.items || []).map(item => ({ creator_id: item.creator_id, rate_card_id: item.rate_card_id || "", quantity: String(item.quantity), notes: item.notes || "", unit_price: item.unit_price, currency: item.currency, platform: item.platform, deliverable_type: item.deliverable_type, creator_name: item.creator_name, current_rate: item.current_rate, current_rate_currency: item.current_rate_currency })));
            setNotice("Campaign plan saved.");
            return true;
        } catch (err) { setError(err.message || "Could not save plan."); return false; }
        finally { setSaving(false); }
    }

    return <main className="flex flex-col gap-6 pb-8 text-[#212529]">
        <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div><p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#FA8500]">Campaign operations</p><h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">Campaign plan & budget</h1><p className="mt-1 max-w-2xl text-sm text-[#6B7280]">Build a proposed creator lineup from your campaign shortlist, estimate deliverable spend, and compare it with your budget before inviting creators.</p></div>
            <button type="button" className={secondary} onClick={() => { loadCampaigns(); loadPlan(); }} disabled={loading}><FiRefreshCw size={14} /> Refresh</button>
        </header>
        <div role="note" className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-5 text-sky-900">Plans are estimates based on current public creator rate cards. Saving a plan does not invite creators, lock rates, or create a payment. Final fees are agreed separately in campaign negotiations. Currency totals are kept separate; no conversion is applied.</div>
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {notice && <div role="status" className="rounded-lg border border-[#FAD7AE] bg-[#FFF7ED] px-4 py-3 text-sm text-[#8A4B08]">{notice}</div>}
        <section className="rounded-xl border border-[#E3E7ED] bg-white p-5">
            <label className="block text-sm font-medium">Campaign<select className={inputClass + " mt-1"} value={campaignId} onChange={event => setCampaignId(event.target.value)}><option value="">Select a campaign...</option>{campaigns.map(campaign => <option key={campaign.id} value={campaign.id}>{campaign.campaign_details?.campaign_title || "Untitled campaign"} · {campaign.status}</option>)}</select></label>
            {selectedCampaign && <p className="mt-2 text-xs text-[#6B7280]">Add creators to this campaign first via Creator Discovery or Creator Workflow. Only public rate cards for linked creators can be planned.</p>}
        </section>
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[#E3E7ED] bg-white p-4"><p className="text-xs text-[#6B7280]">Campaign budget</p><p className="mt-1 text-xl font-bold">{budget ? money(budget.amount, budget.currency) : "Not set"}</p></div>
            {Object.entries(totals).map(([currency, total]) => <div key={currency} className="rounded-xl border border-[#E3E7ED] bg-white p-4"><p className="text-xs text-[#6B7280]">Planned spend · {currency}</p><p className="mt-1 text-xl font-bold">{money(total, currency)}</p></div>)}
            <div className="rounded-xl border border-[#E3E7ED] bg-white p-4"><p className="text-xs text-[#6B7280]">{remaining === null ? "Budget status" : "Budget remaining"}</p><p className={`mt-1 text-xl font-bold ${remaining !== null && remaining < 0 ? "text-red-600" : remaining !== null && remaining < budget.amount * 0.1 ? "text-amber-700" : "text-emerald-700"}`}>{remaining === null ? "Set a budget" : money(remaining, budget.currency)}</p><p className="mt-1 text-xs text-[#6B7280]">{remaining !== null && remaining < 0 ? "Planned spend exceeds budget" : remaining !== null && remaining < budget.amount * 0.1 ? "Less than 10% remaining" : remaining !== null ? "Within budget" : "Only same-currency spend is compared"}</p></div>
        </section>
        <section className="rounded-xl border border-[#E3E7ED] bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><FiPlus className="text-[#FA8500]" /> Add a planned deliverable</h2>
            {loading ? <p className="text-sm text-[#6B7280]">Loading campaign plan...</p> : !creators.length ? <div className="rounded-lg border border-dashed border-[#CBD2DC] p-6 text-center"><FiUsers size={24} className="mx-auto text-[#9CA3AF]" /><p className="mt-2 font-semibold">No linked creators yet</p><p className="mt-1 text-sm text-[#6B7280]">Use creator discovery or generate suggestions in Creator Workflow first.</p></div> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <label className="text-sm font-medium lg:col-span-1">Creator<select className={inputClass + " mt-1"} value={draft.creator_id} onChange={event => { const creator = creators.find(entry => entry.creator_id === event.target.value); setDraft({ ...draft, creator_id: event.target.value, rate_card_id: creator?.rate_cards[0]?.id || "" }); }}><option value="">Select creator</option>{creators.map(creator => <option key={creator.creator_id} value={creator.creator_id}>{creator.display_name}</option>)}</select></label>
                <label className="text-sm font-medium lg:col-span-2">Public rate / deliverable<select className={inputClass + " mt-1"} value={draft.rate_card_id} onChange={event => setDraft({ ...draft, rate_card_id: event.target.value })}><option value="">Select rate</option>{(creators.find(entry => entry.creator_id === draft.creator_id)?.rate_cards || []).map(rate => <option key={rate.id} value={rate.id}>{rate.platform} · {rate.deliverable_type} — {money(rate.price, rate.currency)}</option>)}</select></label>
                <label className="text-sm font-medium">Quantity<input className={inputClass + " mt-1"} type="number" min="1" max="100" step="1" value={draft.quantity} onChange={event => setDraft({ ...draft, quantity: event.target.value })} /></label>
                <div className="flex items-end"><button type="button" className={primary + " w-full"} onClick={addItem} disabled={!draft.creator_id || !draft.rate_card_id}><FiPlus size={14} /> Add</button></div>
            </div>}
        </section>
        <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Proposed creator lineup</h2><span className="text-xs text-[#6B7280]">{items.length} deliverables</span></div>
            {items.length === 0 ? <div className="rounded-xl border border-dashed border-[#CBD2DC] bg-white p-8 text-center text-sm text-[#6B7280]">Your proposed lineup is empty. Add a deliverable above.</div> : items.map((item, index) => {
                const creator = creators.find(entry => entry.creator_id === item.creator_id);
                const rate = creator?.rate_cards.find(entry => entry.id === item.rate_card_id);
                const currency = item.currency || rate?.currency || "USD";
                const unitPrice = item.unit_price ?? rate?.price ?? 0;
                const subtotal = Number(unitPrice) * Math.max(1, Number(item.quantity) || 1);
                const rateChanged = rate && (Number(rate.price) !== Number(unitPrice) || rate.currency !== currency);
                return <article key={item.creator_id + ":" + item.rate_card_id} className="rounded-xl border border-[#E3E7ED] bg-white p-4"><div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px_auto] sm:items-center"><div><p className="font-semibold">{creator?.display_name || "Creator"}</p><p className="mt-1 text-sm text-[#6B7280]">{item.platform || rate?.platform || "Platform"} · {item.deliverable_type || rate?.deliverable_type || "Deliverable"} · {money(unitPrice, currency)} per item</p>{rateChanged && <p className="mt-1 text-xs text-amber-700">Current rate changed to {money(rate.price, rate.currency)}; this plan keeps its saved estimate.</p>}</div><label className="text-xs font-medium text-[#495057]">Quantity<input className={inputClass + " mt-1"} type="number" min="1" max="100" value={item.quantity} onChange={event => updateItem(index, "quantity", event.target.value)} /></label><div className="flex items-center justify-between gap-3"><p className="font-bold">{money(subtotal, currency)}</p><button type="button" className={secondary + " text-red-700"} onClick={() => removeItem(index)} aria-label="Remove planned deliverable"><FiTrash2 size={14} /> Remove</button></div></div><label className="mt-3 block text-xs font-medium text-[#495057]">Planning note (optional)<input className={inputClass + " mt-1"} maxLength="1000" value={item.notes} onChange={event => updateItem(index, "notes", event.target.value)} placeholder="e.g. prioritize product launch week" /></label></article>;
            })}
        </section>
        <section className="rounded-xl border border-[#E3E7ED] bg-white p-5">
            <div className="mb-3"><h2 className="text-lg font-semibold">Move planned creators into collaboration</h2><p className="mt-1 text-sm text-[#6B7280]">Save the plan before inviting. Once a creator accepts, convert planned lines into deliverable requirements without re-entering them.</p></div>
            {!plannedCreators.length ? <p className="rounded-lg bg-[#F8F9FA] p-4 text-sm text-[#6B7280]">Add at least one planned deliverable to see collaboration actions.</p> : <div className="flex flex-col gap-3">
                {plannedCreators.map(creator => {
                    const creatorItems = items.filter(item => item.creator_id === creator.creator_id);
                    const isBusy = busyCreatorId === creator.creator_id || saving;
                    return <div key={creator.creator_id} className="flex flex-col gap-3 rounded-lg border border-[#E3E7ED] p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div><p className="font-semibold">{creator.display_name}</p><p className="mt-1 text-xs text-[#6B7280]">{creatorItems.length} planned line(s) · Workflow status: <span className="font-semibold text-[#495057]">{creator.status}</span></p><p className="mt-1 text-xs text-[#6B7280]">Estimated rates remain separate from negotiated collaboration fees.</p></div>
                        <div className="flex flex-wrap gap-2">
                            {creator.status === "Suggested" && <button type="button" className={primary} disabled={isBusy} onClick={() => invitePlannedCreator(creator)}><FiSend size={14} /> {isBusy ? "Working..." : "Save & record invite"}</button>}
                            {creator.status === "Accepted" && <button type="button" className={secondary} disabled={isBusy} onClick={() => createPlannedDeliverables(creator)}><FiClipboard size={14} /> {isBusy ? "Working..." : "Create deliverables"}</button>}
                            {creator.status === "Invited" && <span className="self-center text-xs text-amber-700">Awaiting creator response</span>}
                            {creator.status === "Applied" && <span className="self-center text-xs text-amber-700">Review the application in Creator Workflow</span>}
                            {["Declined", "Cancelled", "Completed"].includes(creator.status) && <span className="self-center text-xs text-[#6B7280]">No further plan action for this status</span>}
                        </div>
                    </div>;
                })}
            </div>}
            <p className="mt-3 text-xs leading-5 text-[#6B7280]">Invitations are recorded in Influna; no email or social message is sent. Deliverable creation is available only after acceptance and is safe to retry without creating duplicates. It creates requirements, not posts or payments.</p>
        </section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-[#6B7280]">Estimates snapshot the selected public rate when saved. If a creator changes their rate later, refresh the plan to review differences.</p><button type="button" className={primary} onClick={savePlan} disabled={!campaignId || saving || loading}><FiSave size={15} /> {saving ? "Saving plan..." : "Save campaign plan"}</button></div>
    </main>;
}
