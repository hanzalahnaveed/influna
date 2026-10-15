"use client";

import { useCallback, useEffect, useState } from "react";
import { FiDollarSign, FiPlus, FiRefreshCw, FiTrash2 } from "react-icons/fi";

const field = "w-full rounded-lg border border-[#D9DEE7] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#FA8500]";
const primary = "inline-flex items-center justify-center gap-2 rounded-lg bg-[#FA8500] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e87900] disabled:opacity-50";
const secondary = "inline-flex items-center justify-center gap-2 rounded-lg border border-[#D9DEE7] bg-white px-3 py-2 text-sm font-semibold text-[#495057] hover:bg-slate-50 disabled:opacity-50";
const availablePlatforms = ["Instagram", "TikTok", "YouTube", "Facebook", "Other"];
const availableCurrencies = ["USD", "PKR", "GBP", "EUR", "AED", "SAR", "INR", "CAD", "AUD"];
const initial = { platform: "Instagram", deliverable_type: "1 Reel", price: "", currency: "USD", notes: "", is_public: true };

export default function CreatorRateCardPage() {
    const [cards, setCards] = useState([]);
    const [platforms, setPlatforms] = useState(availablePlatforms);
    const [currencies, setCurrencies] = useState(availableCurrencies);
    const [form, setForm] = useState(initial);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [busyId, setBusyId] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const load = useCallback(async () => {
        setLoading(true); setError("");
        try {
            const response = await fetch("/api/v1/creator/rate-cards", { cache: "no-store" });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not load rate cards.");
            setCards(data.rate_cards || []); setPlatforms(data.platforms || availablePlatforms); setCurrencies(data.currencies || availableCurrencies);
        } catch (err) { setError(err.message || "Could not load rate cards."); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    function update(key, value) { setForm(current => ({ ...current, [key]: value })); }
    async function save(event) {
        event.preventDefault(); setSaving(true); setError(""); setNotice("");
        try {
            const response = await fetch("/api/v1/creator/rate-cards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, price: Number(form.price) }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not save rate.");
            setNotice("Rate card saved. Existing entries for the same platform and deliverable are updated."); setForm(initial); await load();
        } catch (err) { setError(err.message || "Could not save rate card."); }
        finally { setSaving(false); }
    }
    async function remove(card) {
        if (!window.confirm("Delete this rate card?")) return;
        setBusyId(card.id); setError(""); setNotice("");
        try {
            const response = await fetch("/api/v1/creator/rate-cards", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: card.id }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not delete rate.");
            setCards(current => current.filter(item => item.id !== card.id)); setNotice("Rate card deleted.");
        } catch (err) { setError(err.message || "Could not delete rate."); }
        finally { setBusyId(""); }
    }

    return <main className="flex flex-col gap-6 pb-8 text-[#212529]">
        <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div><p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#FA8500]">Creator marketplace</p><h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">My rate card</h1><p className="mt-1 max-w-2xl text-sm text-[#6B7280]">Set indicative prices by platform and deliverable so brands can compare your rates with their campaign budgets.</p></div>
            <button type="button" className={secondary} onClick={load} disabled={loading}><FiRefreshCw size={14} /> Refresh</button>
        </header>
        <div role="note" className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-5 text-sky-900">Rates are creator-provided starting prices, not binding offers. Final fees are agreed in campaign negotiations. Brands only see entries marked public. Different currencies are never converted automatically.</div>
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {notice && <div role="status" className="rounded-lg border border-[#FAD7AE] bg-[#FFF7ED] px-4 py-3 text-sm text-[#8A4B08]">{notice}</div>}
        <section className="rounded-xl border border-[#E3E7ED] bg-white p-5 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><FiPlus className="text-[#FA8500]" /> Add or update a rate</h2>
            <form onSubmit={save} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="text-sm font-medium">Platform<select className={field + " mt-1"} value={form.platform} onChange={e => update("platform", e.target.value)}>{platforms.map(value => <option key={value}>{value}</option>)}</select></label>
                <label className="text-sm font-medium">Deliverable type<input className={field + " mt-1"} value={form.deliverable_type} onChange={e => update("deliverable_type", e.target.value)} placeholder="1 Reel, 3 Stories, YouTube integration" minLength={2} maxLength={120} required /></label>
                <label className="text-sm font-medium">Price<input className={field + " mt-1"} type="number" min="0.01" max="9999999999.99" step="0.01" value={form.price} onChange={e => update("price", e.target.value)} required /></label>
                <label className="text-sm font-medium">Currency<select className={field + " mt-1"} value={form.currency} onChange={e => update("currency", e.target.value)}>{currencies.map(value => <option key={value}>{value}</option>)}</select></label>
                <label className="text-sm font-medium sm:col-span-2">Notes (optional)<input className={field + " mt-1"} value={form.notes} onChange={e => update("notes", e.target.value)} maxLength={1000} placeholder="Usage rights, production scope, expected turnaround..." /></label>
                <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={form.is_public} onChange={e => update("is_public", e.target.checked)} /> Show this rate to brands during discovery and budget-fit checks</label>
                <div className="sm:col-span-2 lg:col-span-3"><button className={primary} type="submit" disabled={saving || !form.price}>{saving ? "Saving..." : "Save rate card"}</button></div>
            </form>
        </section>
        <section className="flex flex-col gap-3"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Your rates</h2><span className="text-xs text-[#6B7280]">{cards.length} entries</span></div>
            {loading ? <div className="rounded-xl border border-[#E3E7ED] bg-white p-8 text-center text-sm text-[#6B7280]">Loading rates...</div> : cards.length === 0 ? <div className="rounded-xl border border-dashed border-[#CBD2DC] bg-white px-6 py-10 text-center"><FiDollarSign size={26} className="mx-auto text-[#9CA3AF]" /><p className="mt-2 font-semibold">No rates added yet</p><p className="mt-1 text-sm text-[#6B7280]">Add one or more prices to make budget comparisons possible.</p></div> :
            <div className="grid gap-3 md:grid-cols-2">{cards.map(card => <article key={card.id} className="rounded-xl border border-[#E3E7ED] bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{card.deliverable_type}</p><p className="mt-1 text-xs text-[#6B7280]">{card.platform} · {card.is_public ? "Public to brands" : "Private"}</p></div><p className="text-lg font-bold text-[#9A4D00]">{money(card.price, card.currency)}</p></div>{card.notes && <p className="mt-3 text-sm text-[#6B7280]">{card.notes}</p>}<button type="button" className={secondary + " mt-4 text-red-700"} disabled={busyId === card.id} onClick={() => remove(card)}><FiTrash2 size={14} /> Delete</button></article>)}</div>}
        </section>
    </main>;
}
