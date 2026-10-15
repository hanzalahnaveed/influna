"use client";

import { useCallback, useEffect, useState } from "react";
import { FiPackage, FiRefreshCw, FiTruck, FiCheckCircle, FiExternalLink } from "react-icons/fi";

const primary = "inline-flex items-center justify-center gap-2 rounded-lg bg-[#FA8500] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e87900] disabled:cursor-not-allowed disabled:opacity-50";
const secondary = "inline-flex items-center justify-center gap-2 rounded-lg border border-[#D9DEE7] bg-white px-3 py-2.5 text-sm font-semibold text-[#495057] transition hover:bg-[#F8F9FA] disabled:cursor-not-allowed disabled:opacity-50";
const field = "w-full rounded-lg border border-[#D9DEE7] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#FA8500]";

function prettyStatus(value) {
    return (value || "Preparing").replace(/([a-z])([A-Z])/g, "$1 $2");
}
function dateLabel(value) {
    return value ? new Date(value).toLocaleString() : "Not recorded";
}
function statusStyle(status) {
    if (status === "Received") return "bg-emerald-50 text-emerald-700";
    if (status === "Delivered") return "bg-sky-50 text-sky-700";
    if (status === "Shipped") return "bg-amber-50 text-amber-800";
    return "bg-slate-100 text-slate-700";
}

export default function ShippingPage() {
    const [user, setUser] = useState(null);
    const [campaigns, setCampaigns] = useState([]);
    const [links, setLinks] = useState([]);
    const [campaignId, setCampaignId] = useState("");
    const [linkId, setLinkId] = useState("");
    const [shipment, setShipment] = useState(null);
    const [draft, setDraft] = useState({ carrier: "", tracking_number: "", tracking_url: "", notes: "" });
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const loadShipment = useCallback(async () => {
        if (!campaignId || !linkId) { setShipment(null); return; }
        const response = await fetch("/api/v1/campaigns/" + encodeURIComponent(campaignId) + "/creators/" + encodeURIComponent(linkId) + "/shipments", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Could not load shipment.");
        const item = data.shipment || null;
        setShipment(item);
        if (item) setDraft({
            carrier: item.carrier || "",
            tracking_number: item.tracking_number || "",
            tracking_url: item.tracking_url || "",
            notes: item.notes || "",
        });
        else setDraft({ carrier: "", tracking_number: "", tracking_url: "", notes: "" });
    }, [campaignId, linkId]);

    const loadLinks = useCallback(async (currentUser, nextCampaignId) => {
        if (!currentUser) return;
        if (currentUser.role === "BRAND") {
            if (!nextCampaignId) { setLinks([]); setLinkId(""); return; }
            const response = await fetch("/api/v1/campaigns/" + encodeURIComponent(nextCampaignId) + "/creators", { cache: "no-store" });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not load campaign collaborations.");
            const list = (data.creators || []).filter((item) => ["Accepted", "ContentSubmitted", "ChangesRequested", "Approved", "Completed"].includes(item.status));
            setLinks(list);
            setLinkId((current) => list.some((item) => item.campaign_creator_id === current) ? current : (list[0]?.campaign_creator_id || ""));
        } else {
            const response = await fetch("/api/v1/creators/" + encodeURIComponent(currentUser.creator_profile_id) + "/invitations", { cache: "no-store" });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not load collaborations.");
            const list = (data.invitations || []).filter((item) => ["Accepted", "ContentSubmitted", "ChangesRequested", "Approved", "Completed"].includes(item.status));
            setLinks(list);
            setLinkId((current) => list.some((item) => item.campaign_creator_id === current) ? current : (list[0]?.campaign_creator_id || ""));
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        async function init() {
            try {
                const response = await fetch("/api/v1/auth/me", { cache: "no-store" });
                const data = await response.json();
                if (!response.ok || !data.user) throw new Error("Sign in to view shipment tracking.");
                if (cancelled) return;
                setUser(data.user);
                if (data.user.role === "BRAND") {
                    const campaignResponse = await fetch("/api/v1/campaigns", { cache: "no-store" });
                    const campaignData = await campaignResponse.json();
                    if (!campaignResponse.ok) throw new Error(campaignData?.error || "Could not load campaigns.");
                    if (cancelled) return;
                    const list = Array.isArray(campaignData) ? campaignData : [];
                    setCampaigns(list);
                    const firstId = list[0]?.id || "";
                    setCampaignId(firstId);
                    if (firstId) await loadLinks(data.user, firstId);
                } else if (data.user.role === "CREATOR" && data.user.creator_profile_id) {
                    await loadLinks(data.user, "");
                } else {
                    throw new Error("This workspace is only available to brand and creator accounts.");
                }
            } catch (err) {
                if (!cancelled) setError(err.message || "Could not initialize shipping.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        init();
        return () => { cancelled = true; };
    }, [loadLinks]);

    useEffect(() => {
        if (user?.role === "BRAND") loadLinks(user, campaignId).catch((err) => setError(err.message || "Could not load collaborations."));
    }, [user, campaignId, loadLinks]);

    useEffect(() => {
        const link = links.find((item) => item.campaign_creator_id === linkId);
        if (user?.role === "CREATOR" && link?.campaign_id) setCampaignId(link.campaign_id);
    }, [user, links, linkId]);

    useEffect(() => {
        if (!campaignId || !linkId) { setShipment(null); return; }
        loadShipment().catch((err) => setError(err.message || "Could not load shipment tracking."));
    }, [campaignId, linkId, loadShipment]);

    const isBrand = user?.role === "BRAND";
    const selectedLink = links.find((item) => item.campaign_creator_id === linkId);
    const selectedCampaign = campaigns.find((item) => item.id === campaignId);
    const linkLabel = (item) => item.display_name || item.creator_name || item.campaign_title || item.title || "Creator collaboration";

    async function submitTracking(event) {
        event.preventDefault();
        if (!campaignId || !linkId) return;
        setBusy(true); setError(""); setNotice("");
        try {
            const response = await fetch("/api/v1/campaigns/" + encodeURIComponent(campaignId) + "/creators/" + encodeURIComponent(linkId) + "/shipments", {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not save tracking details.");
            setShipment(data.shipment);
            setNotice("Shipment tracking details saved.");
        } catch (err) { setError(err.message || "Could not save tracking details."); }
        finally { setBusy(false); }
    }

    async function runAction(action) {
        if (!shipment || !campaignId || !linkId) return;
        setBusy(true); setError(""); setNotice("");
        try {
            const response = await fetch("/api/v1/campaigns/" + encodeURIComponent(campaignId) + "/creators/" + encodeURIComponent(linkId) + "/shipments/" + encodeURIComponent(shipment.id), {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(action === "update_tracking" ? { action, ...draft } : { action }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not update shipment.");
            setShipment(data.shipment);
            setDraft({ carrier: data.shipment.carrier || "", tracking_number: data.shipment.tracking_number || "", tracking_url: data.shipment.tracking_url || "", notes: data.shipment.notes || "" });
            setNotice(action === "confirm_received" ? "Receipt confirmed." : action === "mark_shipped" ? "Shipment marked as shipped." : action === "mark_delivered" ? "Shipment marked as delivered." : "Tracking details updated.");
        } catch (err) { setError(err.message || "Could not update shipment."); }
        finally { setBusy(false); }
    }

    return (
        <main className="flex flex-col gap-6 pb-8 text-[#212529]">
            <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#FA8500]">Campaign operations</p>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">Product shipping</h1>
                    <p className="mt-1 max-w-2xl text-sm text-[#6B7280]">Keep product shipment details and delivery confirmation attached to each accepted creator collaboration.</p>
                </div>
                <button className={secondary} type="button" disabled={!campaignId || !linkId || loading} onClick={() => loadShipment().catch((err) => setError(err.message))}><FiRefreshCw size={14} /> Refresh</button>
            </header>

            <div role="note" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900">
                Tracking is entered manually. Influna does not contact courier APIs or automatically verify shipment events.
            </div>
            {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {notice && <div role="status" className="rounded-lg border border-[#FAD7AE] bg-[#FFF7ED] px-4 py-3 text-sm text-[#8A4B08]">{notice}</div>}

            <section className="rounded-xl border border-[#E3E7ED] bg-white p-4 shadow-sm sm:p-5">
                {isBrand && <label className="mb-3 block text-xs font-semibold text-[#495057]">Campaign
                    <select className={field + " mt-1"} value={campaignId} onChange={(event) => { setCampaignId(event.target.value); setLinkId(""); }}><option value="">Select a campaign...</option>{campaigns.map((item) => <option key={item.id} value={item.id}>{item.campaign_details?.campaign_title || "Untitled campaign"}</option>)}</select>
                </label>}
                <label className="block text-xs font-semibold text-[#495057]">{isBrand ? "Accepted creator collaboration" : "Your collaboration"}
                    <select className={field + " mt-1"} value={linkId} onChange={(event) => setLinkId(event.target.value)}><option value="">Select a collaboration...</option>{links.map((item) => <option key={item.campaign_creator_id} value={item.campaign_creator_id}>{linkLabel(item)} · {prettyStatus(item.status)}</option>)}</select>
                </label>
                {!loading && links.length === 0 && <p className="mt-3 text-sm text-[#6B7280]">Accepted collaborations will appear here.</p>}
            </section>

            {shipment ? (
                <section className="rounded-xl border border-[#E3E7ED] bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3"><span className="rounded-xl bg-orange-50 p-3 text-[#FA8500]"><FiPackage size={22} /></span><div><h2 className="text-lg font-semibold">{selectedCampaign?.campaign_details?.campaign_title || selectedLink?.campaign_title || "Campaign shipment"}</h2><p className="mt-1 text-sm text-[#6B7280]">{selectedLink ? linkLabel(selectedLink) : "Collaboration shipment record"}</p></div></div>
                        <span className={"rounded-full px-3 py-1.5 text-xs font-semibold " + statusStyle(shipment.status)}>{prettyStatus(shipment.status)}</span>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {[["Carrier", shipment.carrier || "Not provided"], ["Tracking number", shipment.tracking_number || "Not provided"], ["Shipped", dateLabel(shipment.shipped_at)], ["Delivered", dateLabel(shipment.delivered_at)]].map(([label, value]) => <div key={label} className="rounded-lg border border-[#E3E7ED] p-3"><p className="text-xs text-[#6B7280]">{label}</p><p className="mt-1 break-words text-sm font-semibold">{value}</p></div>)}
                    </div>
                    {shipment.tracking_url && <a className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#B85F00] hover:underline" href={shipment.tracking_url} target="_blank" rel="noreferrer"><FiExternalLink size={14} /> Open courier tracking</a>}
                    {shipment.notes && <p className="mt-3 whitespace-pre-wrap text-sm text-[#495057]">{shipment.notes}</p>}
                    <div className="mt-5 flex flex-wrap gap-2">
                        {isBrand && shipment.status !== "Received" && <button className={secondary} type="button" disabled={busy} onClick={() => runAction("update_tracking")}>Save tracking edits</button>}
                        {isBrand && shipment.status === "Preparing" && <button className={primary} type="button" disabled={busy} onClick={() => runAction("mark_shipped")}><FiTruck size={15} /> Mark as shipped</button>}
                        {isBrand && shipment.status === "Shipped" && <button className={primary} type="button" disabled={busy} onClick={() => runAction("mark_delivered")}><FiCheckCircle size={15} /> Mark as delivered</button>}
                        {!isBrand && shipment.status === "Delivered" && <button className={primary} type="button" disabled={busy} onClick={() => runAction("confirm_received")}><FiCheckCircle size={15} /> Confirm receipt</button>}
                    </div>
                    <div className="mt-5 border-t border-[#E3E7ED] pt-4 text-xs text-[#6B7280]">Receipt confirmed: {dateLabel(shipment.received_at)}</div>
                </section>
            ) : isBrand && selectedLink ? (
                <section className="rounded-xl border border-[#E3E7ED] bg-white p-4 shadow-sm sm:p-5">
                    <div className="mb-4"><h2 className="text-lg font-semibold">Record a shipment</h2><p className="mt-1 text-sm text-[#6B7280]">Add the courier details when a product package is prepared for this creator.</p></div>
                    <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitTracking}>
                        <label className="text-xs font-semibold text-[#495057]">Carrier<input className={field + " mt-1"} value={draft.carrier} onChange={(e) => setDraft((d) => ({ ...d, carrier: e.target.value }))} placeholder="e.g. TCS, Leopards" maxLength={100} /></label>
                        <label className="text-xs font-semibold text-[#495057]">Tracking number<input className={field + " mt-1"} value={draft.tracking_number} onChange={(e) => setDraft((d) => ({ ...d, tracking_number: e.target.value }))} placeholder="Courier tracking ID" maxLength={160} /></label>
                        <label className="text-xs font-semibold text-[#495057] sm:col-span-2">Tracking URL<input type="url" className={field + " mt-1"} value={draft.tracking_url} onChange={(e) => setDraft((d) => ({ ...d, tracking_url: e.target.value }))} placeholder="https://courier.example/track/..." maxLength={2048} /></label>
                        <label className="text-xs font-semibold text-[#495057] sm:col-span-2">Notes<textarea className={field + " mt-1 min-h-20"} value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} placeholder="Package details or delivery instructions" maxLength={2000} /></label>
                        <div className="sm:col-span-2"><button className={primary} type="submit" disabled={busy}><FiPackage size={15} /> {busy ? "Saving..." : "Save shipment details"}</button></div>
                    </form>
                </section>
            ) : selectedLink ? (
                <section className="rounded-xl border border-[#E3E7ED] bg-white p-6 text-center shadow-sm"><FiTruck className="mx-auto text-[#FA8500]" size={28} /><h2 className="mt-3 font-semibold">No shipment recorded yet</h2><p className="mt-1 text-sm text-[#6B7280]">The brand has not added tracking details for this collaboration.</p></section>
            ) : null}
        </main>
    );
}
