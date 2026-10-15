"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiSearch, FiUsers, FiMapPin, FiGlobe, FiPlus, FiX, FiRefreshCw } from "react-icons/fi";

const inputClass = "w-full rounded-lg border border-[#D9DEE7] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#FA8500]";
const primaryButton = "inline-flex items-center justify-center gap-2 rounded-lg bg-[#FA8500] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e87900] disabled:cursor-not-allowed disabled:opacity-60";

function formatCount(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? new Intl.NumberFormat("en", { notation: number >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(number) : null;
}

export default function CreatorDiscoveryPage() {
    const [creators, setCreators] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [matches, setMatches] = useState([]);
    const [search, setSearch] = useState("");
    const [country, setCountry] = useState("");
    const [selectedCampaign, setSelectedCampaign] = useState("");
    const [loading, setLoading] = useState(true);
    const [matching, setMatching] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [draft, setDraft] = useState({ display_name: "", bio: "", country: "", city: "", categories: "", languages: "", platform: "Instagram", handle: "" });

    const loadCreators = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const params = new URLSearchParams();
            if (search.trim()) params.set("search", search.trim());
            if (country.trim()) params.set("country", country.trim());
            const response = await fetch(`/api/v1/creators${params.size ? `?${params.toString()}` : ""}`, { cache: "no-store" });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not load creators.");
            setCreators(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message || "Could not load creators.");
        } finally {
            setLoading(false);
        }
    }, [search, country]);

    useEffect(() => {
        loadCreators();
    }, [loadCreators]);

    useEffect(() => {
        let cancelled = false;
        async function loadCampaigns() {
            try {
                const response = await fetch("/api/v1/campaigns", { cache: "no-store" });
                const data = await response.json();
                if (!response.ok) throw new Error(data?.error || "Could not load campaigns.");
                if (!cancelled) setCampaigns(Array.isArray(data) ? data : []);
            } catch (err) {
                if (!cancelled) setNotice(err.message || "Campaign list is unavailable.");
            }
        }
        loadCampaigns();
        return () => { cancelled = true; };
    }, []);

    const visibleCreators = useMemo(() => creators, [creators]);
    const selectedCampaignTitle = campaigns.find((item) => item.id === selectedCampaign)?.campaign_details?.campaign_title;

    async function findMatches() {
        if (!selectedCampaign) {
            setNotice("Select a campaign before finding matches.");
            return;
        }
        setMatching(true);
        setNotice("");
        setError("");
        try {
            const response = await fetch(`/api/v1/campaigns/${encodeURIComponent(selectedCampaign)}/matches?limit=25`, { method: "POST" });
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

    async function createCreator(event) {
        event.preventDefault();
        setSaving(true);
        setError("");
        setNotice("");
        try {
            const body = {
                display_name: draft.display_name.trim(),
                bio: draft.bio.trim() || null,
                country: draft.country.trim() || null,
                city: draft.city.trim() || null,
                categories: draft.categories.split(",").map((value) => value.trim()).filter(Boolean),
                languages: draft.languages.split(",").map((value) => value.trim()).filter(Boolean),
                social_accounts: draft.handle.trim() ? [{ platform: draft.platform, handle: draft.handle.trim() }] : [],
            };
            const response = await fetch("/api/v1/creators", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not save creator.");
            setDraft({ display_name: "", bio: "", country: "", city: "", categories: "", languages: "", platform: "Instagram", handle: "" });
            setShowForm(false);
            setNotice("Creator profile added.");
            await loadCreators();
        } catch (err) {
            setError(err.message || "Could not save creator.");
        } finally {
            setSaving(false);
        }
    }

    const matchIds = new Set(matches.map((match) => match.creator_id));

    return (
        <main className="flex flex-col gap-6 pb-8 text-[#212529]">
            <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#FA8500]">Creator marketplace</p>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">Creator discovery</h1>
                    <p className="mt-1 max-w-2xl text-sm text-[#6B7280]">Find relevant creators, review their listed social profiles, and shortlist candidates for a campaign.</p>
                </div>
                <button className={primaryButton} onClick={() => setShowForm((value) => !value)} type="button">
                    {showForm ? <FiX size={16} /> : <FiPlus size={16} />}
                    {showForm ? "Close form" : "Add creator"}
                </button>
            </header>

            {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {notice && <div role="status" className="rounded-lg border border-[#FAD7AE] bg-[#FFF7ED] px-4 py-3 text-sm text-[#8A4B08]">{notice}</div>}

            {showForm && (
                <form onSubmit={createCreator} className="rounded-xl border border-[#E3E7ED] bg-white p-5 shadow-sm">
                    <div className="mb-4">
                        <h2 className="font-semibold">Add a creator profile</h2>
                        <p className="mt-1 text-xs text-[#6B7280]">Enter information you have permission to store. A listed handle is not an API-verified account.</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <label className="text-xs font-medium text-[#495057]">Display name *
                            <input required className={inputClass + " mt-1"} value={draft.display_name} onChange={(e) => setDraft({ ...draft, display_name: e.target.value })} placeholder="Creator or channel name" />
                        </label>
                        <label className="text-xs font-medium text-[#495057]">Country
                            <input className={inputClass + " mt-1"} value={draft.country} onChange={(e) => setDraft({ ...draft, country: e.target.value })} placeholder="Pakistan" />
                        </label>
                        <label className="text-xs font-medium text-[#495057]">City
                            <input className={inputClass + " mt-1"} value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} placeholder="Lahore" />
                        </label>
                        <label className="text-xs font-medium text-[#495057]">Categories (comma-separated)
                            <input className={inputClass + " mt-1"} value={draft.categories} onChange={(e) => setDraft({ ...draft, categories: e.target.value })} placeholder="beauty, lifestyle, tech" />
                        </label>
                        <label className="text-xs font-medium text-[#495057]">Languages (comma-separated)
                            <input className={inputClass + " mt-1"} value={draft.languages} onChange={(e) => setDraft({ ...draft, languages: e.target.value })} placeholder="Urdu, English" />
                        </label>
                        <label className="text-xs font-medium text-[#495057]">Short bio
                            <input className={inputClass + " mt-1"} value={draft.bio} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} placeholder="What does this creator make?" />
                        </label>
                        <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
                            <label className="w-36 shrink-0 text-xs font-medium text-[#495057]">Platform
                                <select className={inputClass + " mt-1"} value={draft.platform} onChange={(e) => setDraft({ ...draft, platform: e.target.value })}>
                                    {["Instagram", "TikTok", "YouTube", "Facebook", "Other"].map((platform) => <option key={platform}>{platform}</option>)}
                                </select>
                            </label>
                            <label className="flex-1 text-xs font-medium text-[#495057]">Social handle (optional)
                                <input className={inputClass + " mt-1"} value={draft.handle} onChange={(e) => setDraft({ ...draft, handle: e.target.value })} placeholder="@creatorhandle" />
                            </label>
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button className={primaryButton} disabled={saving} type="submit">{saving ? "Saving..." : "Save creator"}</button>
                    </div>
                </form>
            )}

            <section className="rounded-xl border border-[#E3E7ED] bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><FiSearch className="text-[#FA8500]" /> Search creators</div>
                <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto_auto]" onSubmit={(event) => { event.preventDefault(); loadCreators(); }}>
                    <input className={inputClass} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, bio, or category" />
                    <input className={inputClass} value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country, e.g. Pakistan" />
                    <button className={primaryButton} type="submit"><FiSearch size={15} /> Search</button>
                    <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#D9DEE7] px-3 py-2.5 text-sm font-medium text-[#495057] hover:bg-[#F8F9FA]" type="button" onClick={() => { setSearch(""); setCountry(""); }}><FiRefreshCw size={14} /> Reset</button>
                </form>
            </section>

            <section className="rounded-xl border border-[#E3E7ED] bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold">Campaign matching</h2>
                        <p className="mt-1 text-sm text-[#6B7280]">Rank listed creators by supported campaign targeting fields.</p>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-xl">
                        <select className={inputClass} value={selectedCampaign} onChange={(e) => { setSelectedCampaign(e.target.value); setMatches([]); }} aria-label="Select campaign">
                            <option value="">Select a campaign...</option>
                            {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.campaign_details?.campaign_title || "Untitled campaign"} · {campaign.status}</option>)}
                        </select>
                        <button className={primaryButton + " whitespace-nowrap"} onClick={findMatches} disabled={matching || !selectedCampaign} type="button">{matching ? "Matching..." : "Find matches"}</button>
                    </div>
                </div>
                {matches.length > 0 && (
                    <div className="mt-4 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Top matches{selectedCampaignTitle ? ` for ${selectedCampaignTitle}` : ""}</p>
                        {matches.map((match) => (
                            <article key={match.creator_id} className="rounded-lg border border-[#E3E7ED] p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <h3 className="font-semibold">{match.display_name}</h3>
                                        <p className="mt-1 text-xs text-[#6B7280]">{[match.city, match.country].filter(Boolean).join(", ") || "Location not provided"} · {(match.categories || []).join(", ") || "No categories listed"}</p>
                                        <div className="mt-2 flex flex-wrap gap-2">{(match.social_accounts || []).map((account) => <span key={account.id} className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-xs text-[#495057]">{account.platform} · @{account.handle}</span>)}</div>
                                    </div>
                                    <div className="min-w-24 rounded-lg bg-[#FFF7ED] px-3 py-2 text-center">
                                        <div className="text-xl font-bold text-[#C66A00]">{match.match_score}%</div>
                                        <div className="text-[10px] font-semibold uppercase tracking-wide text-[#8A4B08]">Profile fit</div>
                                    </div>
                                </div>
                                {match.match_reasons?.length > 0 && <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-[#495057]">{match.match_reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul>}
                            </article>
                        ))}
                    </div>
                )}
            </section>

            <section>
                <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold">Creator profiles</h2>
                    <span className="rounded-full bg-white px-3 py-1 text-xs text-[#6B7280] shadow-sm">{loading ? "Loading..." : `${visibleCreators.length} profiles`}</span>
                </div>
                {loading ? (
                    <div className="rounded-xl border border-[#E3E7ED] bg-white p-10 text-center text-sm text-[#6B7280]">Loading creator profiles...</div>
                ) : visibleCreators.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#CBD2DC] bg-white px-6 py-12 text-center">
                        <FiUsers size={28} className="mx-auto text-[#9CA3AF]" />
                        <h3 className="mt-3 font-semibold">No creator profiles yet</h3>
                        <p className="mx-auto mt-1 max-w-md text-sm text-[#6B7280]">Add a creator profile to start testing discovery and campaign matching. Metrics and account verification are not inferred from a handle.</p>
                        <button className={primaryButton + " mt-4"} onClick={() => setShowForm(true)} type="button"><FiPlus size={15} /> Add first creator</button>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {visibleCreators.map((creator) => {
                            const matched = matchIds.has(creator.id);
                            return (
                                <article key={creator.id} className="flex h-full flex-col rounded-xl border border-[#E3E7ED] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FFF0DF] text-sm font-bold text-[#B85E00]">{(creator.display_name || "C").trim().slice(0, 1).toUpperCase()}</div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="truncate font-semibold">{creator.display_name}</h3>
                                            <p className="mt-0.5 flex items-center gap-1 text-xs text-[#6B7280]"><FiMapPin size={12} /> {[creator.city, creator.country].filter(Boolean).join(", ") || "Location not provided"}</p>
                                        </div>
                                        {matched && <span className="rounded-full bg-[#ECFDF3] px-2 py-1 text-[10px] font-semibold text-[#067647]">Matched</span>}
                                    </div>
                                    <p className="mt-3 line-clamp-3 min-h-[54px] text-sm leading-5 text-[#6B7280]">{creator.bio || "No bio has been added for this creator yet."}</p>
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                        {(creator.categories || []).length ? creator.categories.map((category) => <span key={category} className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-xs text-[#495057]">{category}</span>) : <span className="text-xs text-[#9CA3AF]">No categories listed</span>}
                                    </div>
                                    <div className="mt-4 border-t border-[#EEF0F3] pt-3">
                                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Social accounts</p>
                                        {(creator.social_accounts || []).length ? creator.social_accounts.map((account) => {
                                            const followers = formatCount(account.latest_metrics?.follower_count);
                                            return <div key={account.id} className="mb-2 flex items-center justify-between gap-3 text-xs">
                                                <span className="flex min-w-0 items-center gap-2 text-[#495057]"><FiGlobe size={13} className="shrink-0 text-[#9CA3AF]" /><span className="truncate">{account.platform} · @{account.handle}</span></span>
                                                <span className="shrink-0 text-right text-[#6B7280]">{followers ? `${followers} followers` : "No metrics"}{account.latest_metrics && <span className="block text-[10px] text-[#9CA3AF]">{account.latest_metrics.data_source.replaceAll("_", " ")}</span>}</span>
                                            </div>;
                                        }) : <p className="text-xs text-[#9CA3AF]">No social accounts listed</p>}
                                    </div>
                                    <div className="mt-auto flex items-center justify-between border-t border-[#EEF0F3] pt-3 text-[11px] text-[#9CA3AF]">
                                        <span>{(creator.languages || []).join(", ") || "Languages not listed"}</span>
                                        <span>{creator.is_public ? "Public profile" : "Private"}</span>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
            <p className="text-xs leading-5 text-[#9CA3AF]">Data quality note: social metrics display their recorded source and observation time where available. A source label is metadata, not proof of platform verification. Profile-fit scores do not predict reach, conversions, authenticity, or campaign success.</p>
        </main>
    );
}
