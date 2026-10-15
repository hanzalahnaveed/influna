"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiSearch, FiUsers, FiMapPin, FiGlobe, FiRefreshCw } from "react-icons/fi";

const inputClass = "w-full rounded-lg border border-[#D9DEE7] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#FA8500]";
const primaryButton = "inline-flex items-center justify-center gap-2 rounded-lg bg-[#FA8500] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e87900] disabled:cursor-not-allowed disabled:opacity-60";

function formatCount(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? new Intl.NumberFormat("en", { notation: number >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(number) : null;
}

export default function CreatorDiscoveryPage() {
    const [creators, setCreators] = useState([]);
    const [savedIds, setSavedIds] = useState(new Set());
    const [currentRole, setCurrentRole] = useState("");
    const [savingId, setSavingId] = useState("");
    const [campaigns, setCampaigns] = useState([]);
    const [matches, setMatches] = useState([]);
    const [search, setSearch] = useState("");
    const [country, setCountry] = useState("");
    const [platformFilter, setPlatformFilter] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [selectedCampaign, setSelectedCampaign] = useState("");
    const [loading, setLoading] = useState(true);
    const [matching, setMatching] = useState(false);
    const [invitingId, setInvitingId] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

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

    useEffect(() => {
        let cancelled = false;
        async function loadSavedCreators() {
            try {
                const meResponse = await fetch("/api/v1/auth/me", { cache: "no-store" });
                const me = await meResponse.json();
                if (cancelled || !meResponse.ok) return;
                setCurrentRole(me?.user?.role || "");
                if (me?.user?.role !== "BRAND") return;
                const response = await fetch("/api/v1/saved-creators", { cache: "no-store" });
                const data = await response.json();
                if (response.ok && !cancelled) setSavedIds(new Set((data.creators || []).map((creator) => creator.id)));
            } catch {
                // Creator discovery remains available if saved shortlist data is temporarily unavailable.
            }
        }
        loadSavedCreators();
        return () => { cancelled = true; };
    }, []);

    const filterOptions = useMemo(() => ({
        platforms: [...new Set(creators.flatMap((creator) => (creator.social_accounts || []).map((account) => account.platform)).filter(Boolean))].sort(),
        categories: [...new Set(creators.flatMap((creator) => creator.categories || []).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    }), [creators]);

    const visibleCreators = useMemo(() => creators.filter((creator) => {
        const matchesPlatform = !platformFilter || (creator.social_accounts || []).some((account) => account.platform === platformFilter);
        const matchesCategory = !categoryFilter || (creator.categories || []).some((category) => category.toLowerCase() === categoryFilter.toLowerCase());
        return matchesPlatform && matchesCategory;
    }), [creators, platformFilter, categoryFilter]);
    const selectedCampaignTitle = campaigns.find((item) => item.id === selectedCampaign)?.campaign_details?.campaign_title;

    async function toggleSavedCreator(creator) {
        setSavingId(creator.id);
        setError("");
        setNotice("");
        const wasSaved = savedIds.has(creator.id);
        try {
            const response = await fetch(wasSaved ? `/api/v1/saved-creators/${encodeURIComponent(creator.id)}` : "/api/v1/saved-creators", {
                method: wasSaved ? "DELETE" : "POST",
                headers: wasSaved ? undefined : { "Content-Type": "application/json" },
                body: wasSaved ? undefined : JSON.stringify({ creator_id: creator.id }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not update saved creators.");
            setSavedIds((current) => {
                const next = new Set(current);
                if (wasSaved) next.delete(creator.id); else next.add(creator.id);
                return next;
            });
            setNotice(wasSaved ? `${creator.display_name} removed from your shortlist.` : `${creator.display_name} saved to your shortlist.`);
        } catch (err) {
            setError(err.message || "Could not update saved creators.");
        } finally {
            setSavingId("");
        }
    }

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


    const matchIds = new Set(matches.map((match) => match.creator_id));

    async function recordInvitation(match) {
        if (!selectedCampaign || !match.campaign_creator_id || match.status !== "Suggested") return;
        setInvitingId(match.campaign_creator_id);
        setError("");
        setNotice("");
        try {
            const response = await fetch("/api/v1/campaigns/" + encodeURIComponent(selectedCampaign) + "/creators/" + encodeURIComponent(match.campaign_creator_id), {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "invite" }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not record invitation.");
            setMatches((current) => current.map((item) => item.campaign_creator_id === match.campaign_creator_id ? { ...item, status: data.status, invited_at: data.invited_at } : item));
            setNotice("Invitation recorded for " + match.display_name + ". This records the invitation in Influna; it does not send an email or social-platform message.");
        } catch (err) {
            setError(err.message || "Could not record invitation.");
        } finally {
            setInvitingId("");
        }
    }

    return (
        <main className="flex flex-col gap-6 pb-8 text-[#212529]">
            <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#FA8500]">Creator marketplace</p>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">Creator discovery</h1>
                    <p className="mt-1 max-w-2xl text-sm text-[#6B7280]">Find relevant creators, review their listed social profiles, and shortlist candidates for a campaign.</p>
                </div>
                <span className="text-xs text-[#6B7280]">Browse public creator profiles</span>
            </header>

            {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {notice && <div role="status" className="rounded-lg border border-[#FAD7AE] bg-[#FFF7ED] px-4 py-3 text-sm text-[#8A4B08]">{notice}</div>}

            <section className="rounded-xl border border-[#E3E7ED] bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><FiSearch className="text-[#FA8500]" /> Search creators</div>
                <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto_auto]" onSubmit={(event) => { event.preventDefault(); loadCreators(); }}>
                    <input className={inputClass} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, bio, or category" />
                    <input className={inputClass} value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country, e.g. Pakistan" />
                    <button className={primaryButton} type="submit"><FiSearch size={15} /> Search</button>
                    <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#D9DEE7] px-3 py-2.5 text-sm font-medium text-[#495057] hover:bg-[#F8F9FA]" type="button" onClick={() => { setSearch(""); setCountry(""); setPlatformFilter(""); setCategoryFilter(""); }}><FiRefreshCw size={14} /> Reset</button>
                </form>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-medium text-[#495057]">Platform
                        <select className={inputClass + " mt-1"} value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}>
                            <option value="">All platforms</option>
                            {filterOptions.platforms.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
                        </select>
                    </label>
                    <label className="text-xs font-medium text-[#495057]">Category
                        <select className={inputClass + " mt-1"} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                            <option value="">All categories</option>
                            {filterOptions.categories.map((category) => <option key={category} value={category}>{category}</option>)}
                        </select>
                    </label>
                </div>
            </section>

            <section className="rounded-xl border border-[#E3E7ED] bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold">Campaign matching</h2>
                        <p className="mt-1 text-sm text-[#6B7280]">Compare creator profiles against campaign objectives, category, location, language, platforms, and available audience metrics. Each result explains fit and data coverage.</p>
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
                                        {(match.social_accounts || []).some((account) => account.latest_metrics) && <div className="mt-2 space-y-1 text-xs text-[#6B7280]">
                                            {(match.social_accounts || []).filter((account) => account.latest_metrics).map((account) => <p key={account.id}>{account.platform}: {formatCount(account.latest_metrics.follower_count) || "Follower count unavailable"} followers{account.latest_metrics.engagement_rate !== null && account.latest_metrics.engagement_rate !== undefined ? ` · ${Number(account.latest_metrics.engagement_rate).toFixed(2)}% engagement` : ""} · {account.latest_metrics.data_source === "creator_provided" ? "creator-provided metrics" : "recorded metrics"}</p>)}
                                        </div>}
                                    </div>
                                    <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                                        <div className="min-w-24 rounded-lg bg-[#FFF7ED] px-3 py-2 text-center">
                                            <div className="text-xl font-bold text-[#C66A00]">{match.match_score}%</div>
                                            <div className="text-[10px] font-semibold uppercase tracking-wide text-[#8A4B08]">Profile fit · not a forecast</div>
                                        </div>
                                        <span className={"rounded-full px-3 py-1.5 text-center text-xs font-semibold " + (match.recommendation_tier === "strong_fit" ? "bg-emerald-50 text-emerald-800" : match.recommendation_tier === "promising_fit" ? "bg-blue-50 text-blue-800" : match.recommendation_tier === "insufficient_data" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-700")}>{match.recommendation_label || "Preliminary fit"}</span>
                                        <span className="text-[11px] text-[#6B7280]">Data coverage: {match.match_confidence ?? "—"}%</span>
                                        {match.status === "Suggested" ? (
                                            <button className={primaryButton} type="button" disabled={invitingId === match.campaign_creator_id} onClick={() => recordInvitation(match)}>
                                                {invitingId === match.campaign_creator_id ? "Recording..." : "Record invite"}
                                            </button>
                                        ) : (
                                            <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">{match.status || "Already shortlisted"}</span>
                                        )}
                                    </div>
                                </div>
                                {match.note && <p className="mt-3 text-xs leading-5 text-[#6B7280]">{match.note}</p>}
                                {match.match_factors?.length > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{match.match_factors.map((factor) => <div key={factor.key} className="rounded-lg bg-slate-50 p-2.5"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-[#495057]">{factor.label}</span><span className="text-xs font-semibold text-[#495057]">{factor.score}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-[#FA8500]" style={{ width: factor.score + "%" }} /></div></div>)}</div>}
                                {match.match_reasons?.length > 0 && <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-[#495057]">{match.match_reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul>}
                                {match.missing_data?.length > 0 && <details className="mt-3 rounded-lg border border-[#E3E7ED] px-3 py-2"><summary className="cursor-pointer text-xs font-semibold text-[#495057]">Data gaps to review ({match.missing_data.length})</summary><ul className="mt-2 list-inside list-disc space-y-1 text-xs text-[#6B7280]">{match.missing_data.map((gap, index) => <li key={index}>{gap}</li>)}</ul></details>}
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
                        <h3 className="mt-3 font-semibold">{creators.length ? "No creators match these filters" : "No public creator profiles yet"}</h3>
                        <p className="mx-auto mt-1 max-w-md text-sm text-[#6B7280]">Public creator profiles will appear here after creators register, complete their profiles, and choose to make them public. Metrics and account verification are never inferred from a handle.</p>
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
                                    {currentRole === "BRAND" && <button type="button" disabled={savingId === creator.id} onClick={() => toggleSavedCreator(creator)} className="mt-3 self-start rounded-lg border border-[#FAD7AE] px-3 py-1.5 text-xs font-semibold text-[#9A4D00] transition hover:bg-[#FFF7ED] disabled:opacity-60">{savingId === creator.id ? "Saving..." : savedIds.has(creator.id) ? "Remove from shortlist" : "Save creator"}</button>}
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
                                                <span className="shrink-0 text-right text-[#6B7280]">
                                                    {followers ? `${followers} followers` : "No metrics"}
                                                    <span className={`mt-1 block rounded-full px-2 py-0.5 text-[10px] font-semibold ${account.is_verified ? "bg-emerald-50 text-emerald-700" : account.verification_status === "pending" ? "bg-sky-50 text-sky-700" : account.verification_status === "rejected" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}>
                                                        {account.is_verified ? "Verified account" : account.verification_status === "pending" ? "Verification pending" : account.verification_status === "rejected" ? "Verification rejected" : "Unverified account"}
                                                    </span>
                                                    {account.latest_metrics && <span className="block text-[10px] text-[#9CA3AF]">{(account.latest_metrics.data_source || "unknown").replaceAll("_", " ")} metrics · {account.latest_metrics.observed_at ? new Date(account.latest_metrics.observed_at).toLocaleDateString() : "date unknown"}</span>}
                                                </span>
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
