"use client";

import { useCallback, useEffect, useState } from "react";
import { FiBookmark, FiMapPin, FiGlobe, FiRefreshCw, FiSearch } from "react-icons/fi";

const inputClass = "w-full rounded-lg border border-[#D9DEE7] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#FA8500]";
const primaryButton = "inline-flex items-center justify-center gap-2 rounded-lg bg-[#FA8500] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e87900] disabled:cursor-not-allowed disabled:opacity-60";

export default function SavedCreators() {
    const [creators, setCreators] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [campaignId, setCampaignId] = useState("");
    const [addingId, setAddingId] = useState("");
    const [loading, setLoading] = useState(true);
    const [removingId, setRemovingId] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [search, setSearch] = useState("");
    const [country, setCountry] = useState("");
    const [platform, setPlatform] = useState("");
    const [category, setCategory] = useState("");
    const [matches, setMatches] = useState([]);
    const [matching, setMatching] = useState(false);

    const visibleCreators = creators.filter((creator) => {
        const query = search.trim().toLowerCase();
        const textMatches = !query || [creator.display_name, creator.bio, ...(creator.categories || [])]
            .some((value) => String(value || "").toLowerCase().includes(query));
        const countryMatches = !country.trim() || (creator.country || "").toLowerCase().includes(country.trim().toLowerCase());
        const platformMatches = !platform || (creator.social_accounts || []).some((account) => account.platform === platform);
        const categoryMatches = !category || (creator.categories || []).some((value) => value.toLowerCase() === category.toLowerCase());
        return textMatches && countryMatches && platformMatches && categoryMatches;
    });
    const platforms = [...new Set(creators.flatMap((creator) => (creator.social_accounts || []).map((account) => account.platform)).filter(Boolean))].sort();
    const categories = [...new Set(creators.flatMap((creator) => creator.categories || []).filter(Boolean))].sort((a, b) => a.localeCompare(b));

    const loadCreators = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const response = await fetch("/api/v1/saved-creators", { cache: "no-store" });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not load your saved creators.");
            setCreators(Array.isArray(data.creators) ? data.creators : []);
        } catch (err) {
            setError(err.message || "Could not load your saved creators.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadCreators(); }, [loadCreators]);

    useEffect(() => {
        let cancelled = false;
        async function loadCampaigns() {
            try {
                const response = await fetch("/api/v1/campaigns", { cache: "no-store" });
                const data = await response.json();
                if (!response.ok) throw new Error(data?.error || "Could not load campaigns.");
                if (!cancelled) {
                    const available = (Array.isArray(data) ? data : []).filter((campaign) => ["Active", "Draft"].includes(campaign.status));
                    setCampaigns(available);
                    if (available.length) setCampaignId((current) => current || available[0].id);
                }
            } catch (err) {
                if (!cancelled) setError(err.message || "Could not load campaigns.");
            }
        }
        loadCampaigns();
        return () => { cancelled = true; };
    }, []);

    async function findMatches() {
        if (!campaignId) {
            setError("Select a campaign before finding matches.");
            return;
        }
        setMatching(true);
        setError("");
        setNotice("");
        try {
            const response = await fetch(`/api/v1/campaigns/${encodeURIComponent(campaignId)}/matches?limit=25`, { method: "POST" });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not calculate matches.");
            setMatches(data.matches || []);
            setNotice(data.disclaimer || "Preliminary profile-fit results loaded.");
        } catch (err) {
            setError(err.message || "Could not calculate matches.");
        } finally {
            setMatching(false);
        }
    }

    async function addToCampaign(creator) {
        if (!campaignId) {
            setError("Create or select an active campaign first.");
            return;
        }
        setAddingId(creator.id);
        setError("");
        setNotice("");
        try {
            const response = await fetch("/api/v1/campaigns/" + encodeURIComponent(campaignId) + "/creators/shortlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ creator_ids: [creator.id] }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not add creator to campaign.");
            setNotice(data.message || (creator.display_name + " added to campaign workflow."));
        } catch (err) {
            setError(err.message || "Could not add creator to campaign.");
        } finally {
            setAddingId("");
        }
    }

    async function removeCreator(creator) {
        setRemovingId(creator.id);
        setError("");
        setNotice("");
        try {
            const response = await fetch("/api/v1/saved-creators/" + encodeURIComponent(creator.id), { method: "DELETE" });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not remove this creator.");
            setCreators((current) => current.filter((item) => item.id !== creator.id));
            setNotice(creator.display_name + " was removed from your shortlist.");
        } catch (err) {
            setError(err.message || "Could not remove this creator.");
        } finally {
            setRemovingId("");
        }
    }

    return (
        <main className="flex flex-col gap-6 pb-8 text-[#212529]">
            <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#FA8500]">Creator marketplace</p>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">Saved creators</h1>
                    <p className="mt-1 max-w-2xl text-sm text-[#6B7280]">Keep a reusable shortlist of public creator profiles while planning future campaigns.</p>
                </div>
                <button type="button" onClick={loadCreators} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#D9DEE7] px-3 py-2.5 text-sm font-medium text-[#495057] hover:bg-[#F8F9FA] disabled:opacity-60"><FiRefreshCw size={14} /> Refresh</button>
            </header>
            <nav aria-label="Creator workspace" className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3">
                <a href="/dashboard/creators" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Discoverable</a>
                <a href="/dashboard/saved-creators" aria-current="page" className="rounded-lg bg-[#FA8500] px-4 py-2 text-sm font-semibold text-white">Saved</a>
            </nav>
            {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {notice && <div role="status" className="rounded-lg border border-[#FAD7AE] bg-[#FFF7ED] px-4 py-3 text-sm text-[#8A4B08]">{notice}</div>}
            <section className="rounded-xl border border-[#E3E7ED] bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><FiSearch className="text-[#FA8500]" /> Search criteria</div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="text-xs font-medium text-[#495057]">Name, bio, or category
                        <input className={inputClass + " mt-1"} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search saved creators" />
                    </label>
                    <label className="text-xs font-medium text-[#495057]">Country
                        <input className={inputClass + " mt-1"} value={country} onChange={(event) => setCountry(event.target.value)} placeholder="e.g. Pakistan" />
                    </label>
                    <label className="text-xs font-medium text-[#495057]">Platform
                        <select className={inputClass + " mt-1"} value={platform} onChange={(event) => setPlatform(event.target.value)}>
                            <option value="">All platforms</option>
                            {platforms.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                    </label>
                    <label className="text-xs font-medium text-[#495057]">Category
                        <select className={inputClass + " mt-1"} value={category} onChange={(event) => setCategory(event.target.value)}>
                            <option value="">All categories</option>
                            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                    </label>
                </div>
            </section>
            <section className="rounded-xl border border-[#E3E7ED] bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold">Campaign matching</h2>
                        <p className="mt-1 text-sm text-[#6B7280]">Compare this campaign against creator profiles using the same profile-fit matching as discovery.</p>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-xl">
                        <select className={inputClass} value={campaignId} onChange={(event) => { setCampaignId(event.target.value); setMatches([]); }} aria-label="Select campaign">
                            <option value="">Select a campaign...</option>
                            {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.campaign_details?.campaign_title || "Untitled campaign"} · {campaign.status}</option>)}
                        </select>
                        <button className={primaryButton + " whitespace-nowrap"} onClick={findMatches} disabled={matching || !campaignId} type="button">{matching ? "Matching..." : "Find matches"}</button>
                    </div>
                </div>
                {matches.length > 0 && <div className="mt-4 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Top matches</p>
                    {matches.map((match) => <div key={match.creator_id} className="flex items-center justify-between gap-3 rounded-lg border border-[#E3E7ED] p-3">
                        <div><p className="text-sm font-semibold">{match.display_name}</p><p className="text-xs text-[#6B7280]">{match.recommendation_label || "Preliminary fit"}</p></div>
                        <span className="rounded-lg bg-[#FFF7ED] px-3 py-2 text-sm font-bold text-[#C66A00]">{match.match_score}%</span>
                    </div>)}
                </div>}
            </section>
            <section className="rounded-xl border border-[#E3E7ED] bg-white p-4 shadow-sm">
                <label className="block text-xs font-semibold text-[#495057]">Add shortlisted creators to campaign
                    <select className="mt-1 w-full rounded-lg border border-[#D9DEE7] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#FA8500] sm:max-w-xl" value={campaignId} onChange={(event) => setCampaignId(event.target.value)}>
                        <option value="">Select an active or draft campaign...</option>
                        {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.campaign_details?.campaign_title || "Untitled campaign"} · {campaign.status}</option>)}
                    </select>
                </label>
                {!campaigns.length && <p className="mt-2 text-xs text-[#6B7280]">You need an active or draft campaign before adding creators. <a className="font-semibold text-[#B85E00] underline" href="/dashboard/campaign/create">Create a campaign</a>.</p>}
                <p className="mt-2 text-xs text-[#6B7280]">Adding a creator places them in the campaign workflow as a suggestion; it does not send an invitation.</p>
            </section>
            {loading ? (
                <div className="rounded-xl border border-[#E3E7ED] bg-white p-10 text-center text-sm text-[#6B7280]">Loading saved creators...</div>
            ) : visibleCreators.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#CBD2DC] bg-white px-6 py-12 text-center">
                    <FiBookmark size={28} className="mx-auto text-[#9CA3AF]" />
                    <h2 className="mt-3 font-semibold">{creators.length ? "No saved creators match these criteria" : "Your shortlist is empty"}</h2>
                    <p className="mx-auto mt-1 max-w-md text-sm text-[#6B7280]">{creators.length ? "Adjust your search criteria to see more saved creators." : "Go to Creator Discovery and save public profiles you may want to consider for a campaign."}</p>
                    {!creators.length && <a href="/dashboard/creators" className="mt-4 inline-flex rounded-lg bg-[#FA8500] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e87900]">Browse creators</a>}
                </div>
            ) : (
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {visibleCreators.map((creator) => (
                        <article key={creator.id} className="flex flex-col rounded-xl border border-[#E3E7ED] bg-white p-4 shadow-sm">
                            <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FFF0DF] text-sm font-bold text-[#B85E00]">{(creator.display_name || "C").trim().slice(0, 1).toUpperCase()}</div>
                                <div className="min-w-0 flex-1">
                                    <h2 className="truncate font-semibold">{creator.display_name}</h2>
                                    <p className="mt-1 flex items-center gap-1 text-xs text-[#6B7280]"><FiMapPin size={12} /> {[creator.city, creator.country].filter(Boolean).join(", ") || "Location not provided"}</p>
                                </div>
                            </div>
                            <p className="mt-3 line-clamp-3 min-h-[54px] text-sm leading-5 text-[#6B7280]">{creator.bio || "No bio has been added for this creator yet."}</p>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {(creator.categories || []).map((category) => <span key={category} className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-xs text-[#495057]">{category}</span>)}
                            </div>
                            <div className="mt-4 border-t border-[#EEF0F3] pt-3">
                                {(creator.social_accounts || []).length ? creator.social_accounts.map((account) => (
                                    <div key={account.id} className="mb-2 flex items-center gap-2 text-xs text-[#495057]"><FiGlobe size={13} className="text-[#9CA3AF]" /><span>{account.platform} · @{account.handle}</span>{account.is_verified && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Verified</span>}</div>
                                )) : <p className="text-xs text-[#9CA3AF]">No social accounts listed</p>}
                            </div>
                            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-[#EEF0F3] pt-3">
                                <span className="text-xs text-[#9CA3AF]">Saved {creator.saved_at ? new Date(creator.saved_at).toLocaleDateString() : ""}</span>
                                <div className="flex flex-wrap gap-2">
                                    <button type="button" disabled={!campaignId || addingId === creator.id} onClick={() => addToCampaign(creator)} className="rounded-lg bg-[#FA8500] px-3 py-2 text-xs font-semibold text-white hover:bg-[#e87900] disabled:opacity-50">{addingId === creator.id ? "Adding..." : "Add to campaign"}</button>
                                    <button type="button" disabled={removingId === creator.id} onClick={() => removeCreator(creator)} className="rounded-lg border border-[#D9DEE7] px-3 py-2 text-xs font-semibold text-[#495057] hover:bg-[#F8F9FA] disabled:opacity-60">{removingId === creator.id ? "Removing..." : "Remove"}</button>
                                </div>
                            </div>
                        </article>
                    ))}
                </section>
            )}
        </main>
    );
}
