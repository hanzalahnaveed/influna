"use client";

import { useCallback, useEffect, useState } from "react";
import { FiPlus, FiRefreshCw, FiSave, FiTrash2, FiUser, FiExternalLink } from "react-icons/fi";

const inputClass = "mt-1 w-full rounded-lg border border-[#D9DEE7] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#FA8500]";
const primaryButton = "inline-flex items-center justify-center gap-2 rounded-lg bg-[#FA8500] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e87900] disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButton = "inline-flex items-center justify-center gap-2 rounded-lg border border-[#D9DEE7] bg-white px-4 py-2.5 text-sm font-semibold text-[#495057] transition hover:bg-[#F8F9FA] disabled:cursor-not-allowed disabled:opacity-60";

const emptyDraft = { display_name: "", bio: "", country: "", city: "", categories: "", languages: "", is_public: false };

export default function CreatorProfilePage() {
    const [creatorId, setCreatorId] = useState("");
    const [draft, setDraft] = useState(emptyDraft);
    const [accounts, setAccounts] = useState([]);
    const [platform, setPlatform] = useState("Instagram");
    const [handle, setHandle] = useState("");
    const [profileUrl, setProfileUrl] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [addingAccount, setAddingAccount] = useState(false);
    const [removingId, setRemovingId] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const loadProfile = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const authResponse = await fetch("/api/v1/auth/me", { cache: "no-store" });
            const authData = await authResponse.json();
            if (!authResponse.ok || !authData?.user) throw new Error("Sign in to manage your creator profile.");
            if (authData.user.role !== "CREATOR") throw new Error("This page is available to creator accounts only.");
            if (!authData.user.creator_profile_id) throw new Error("Your creator profile has not been created yet. Sign out and sign in again, or contact support.");
            const id = authData.user.creator_profile_id;
            const response = await fetch(`/api/v1/creators/${encodeURIComponent(id)}`, { cache: "no-store" });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not load your creator profile.");
            setCreatorId(id);
            setDraft({
                display_name: data.display_name || "",
                bio: data.bio || "",
                country: data.country || "",
                city: data.city || "",
                categories: (data.categories || []).join(", "),
                languages: (data.languages || []).join(", "),
                is_public: Boolean(data.is_public),
            });
            setAccounts(data.social_accounts || []);
        } catch (err) {
            setError(err.message || "Could not load your profile.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadProfile(); }, [loadProfile]);

    function updateDraft(key, value) {
        setDraft((current) => ({ ...current, [key]: value }));
    }

    async function saveProfile(event) {
        event.preventDefault();
        if (!creatorId) return;
        setSaving(true);
        setError("");
        setNotice("");
        try {
            const response = await fetch(`/api/v1/creators/${encodeURIComponent(creatorId)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    display_name: draft.display_name.trim(),
                    bio: draft.bio.trim() || null,
                    country: draft.country.trim() || null,
                    city: draft.city.trim() || null,
                    categories: draft.categories.split(",").map((v) => v.trim()).filter(Boolean),
                    languages: draft.languages.split(",").map((v) => v.trim()).filter(Boolean),
                    is_public: draft.is_public,
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not save your profile.");
            setNotice("Profile saved.");
            await loadProfile();
        } catch (err) {
            setError(err.message || "Could not save your profile.");
        } finally {
            setSaving(false);
        }
    }

    async function addSocialAccount(event) {
        event.preventDefault();
        if (!creatorId) return;
        setAddingAccount(true);
        setError("");
        setNotice("");
        try {
            const response = await fetch(`/api/v1/creators/${encodeURIComponent(creatorId)}/social-accounts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ platform, handle: handle.trim(), profile_url: profileUrl.trim() || null }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not add social account.");
            setHandle("");
            setProfileUrl("");
            setNotice("Social account added. Its metrics are not API-verified.");
            await loadProfile();
        } catch (err) {
            setError(err.message || "Could not add social account.");
        } finally {
            setAddingAccount(false);
        }
    }

    async function removeSocialAccount(account) {
        setRemovingId(account.id);
        setError("");
        setNotice("");
        try {
            const response = await fetch(`/api/v1/creators/${encodeURIComponent(creatorId)}/social-accounts/${encodeURIComponent(account.id)}`, { method: "DELETE" });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Could not remove social account.");
            setNotice("Social account removed.");
            await loadProfile();
        } catch (err) {
            setError(err.message || "Could not remove social account.");
        } finally {
            setRemovingId("");
        }
    }

    return (
        <main className="flex flex-col gap-6 pb-8 text-[#212529]">
            <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#FA8500]">Creator workspace</p>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">My creator profile</h1>
                    <p className="mt-1 max-w-2xl text-sm text-[#6B7280]">Manage the information brands use to discover and assess your profile. Only publish details you are comfortable sharing.</p>
                </div>
                <button type="button" className={secondaryButton} onClick={loadProfile} disabled={loading}><FiRefreshCw size={14} /> Refresh</button>
            </header>

            {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {notice && <div role="status" className="rounded-lg border border-[#FAD7AE] bg-[#FFF7ED] px-4 py-3 text-sm text-[#8A4B08]">{notice}</div>}

            {loading ? <div className="rounded-xl border border-[#E3E7ED] bg-white p-10 text-center text-sm text-[#6B7280]">Loading your profile...</div> : <>
                <form onSubmit={saveProfile} className="flex flex-col gap-5 rounded-xl border border-[#E3E7ED] bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF0DF] text-[#B85E00]"><FiUser size={20} /></div>
                        <div><h2 className="font-semibold">Profile details</h2><p className="mt-1 text-xs text-[#6B7280]">Categories and location help the matching system assess profile fit.</p></div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="text-sm font-medium">Display name<input className={inputClass} value={draft.display_name} onChange={(e) => updateDraft("display_name", e.target.value)} minLength={2} maxLength={200} required /></label>
                        <label className="text-sm font-medium">Country<input className={inputClass} value={draft.country} onChange={(e) => updateDraft("country", e.target.value)} maxLength={100} placeholder="e.g. Pakistan" /></label>
                        <label className="text-sm font-medium">City<input className={inputClass} value={draft.city} onChange={(e) => updateDraft("city", e.target.value)} maxLength={100} placeholder="e.g. Lahore" /></label>
                        <label className="text-sm font-medium">Languages<input className={inputClass} value={draft.languages} onChange={(e) => updateDraft("languages", e.target.value)} placeholder="Urdu, English" /></label>
                        <label className="text-sm font-medium sm:col-span-2">Categories / niches<input className={inputClass} value={draft.categories} onChange={(e) => updateDraft("categories", e.target.value)} placeholder="Food, Fashion, Technology" /></label>
                        <label className="text-sm font-medium sm:col-span-2">Bio<textarea className={inputClass} value={draft.bio} onChange={(e) => updateDraft("bio", e.target.value)} rows={4} maxLength={2000} placeholder="Describe your content and audience..." /></label>
                    </div>
                    <label className="flex items-start gap-3 rounded-lg border border-[#E3E7ED] p-4">
                        <input type="checkbox" className="mt-1 h-4 w-4 accent-[#FA8500]" checked={draft.is_public} onChange={(e) => updateDraft("is_public", e.target.checked)} />
                        <span><span className="block text-sm font-semibold">Make my profile discoverable</span><span className="mt-1 block text-xs leading-5 text-[#6B7280]">When enabled, brands can see your public profile in Creator Discovery. Turning this off removes it from public discovery.</span></span>
                    </label>
                    <div><button type="submit" className={primaryButton} disabled={saving || !creatorId}><FiSave size={15} /> {saving ? "Saving..." : "Save profile"}</button></div>
                </form>

                <section className="flex flex-col gap-4 rounded-xl border border-[#E3E7ED] bg-white p-5 shadow-sm sm:p-6">
                    <div><h2 className="font-semibold">Social accounts</h2><p className="mt-1 text-xs leading-5 text-[#6B7280]">Handles are self-reported. Adding an account does not connect to Meta or verify ownership.</p></div>
                    <div className="flex flex-col gap-3">
                        {accounts.length === 0 ? <p className="rounded-lg border border-dashed border-[#CBD2DC] p-5 text-center text-sm text-[#6B7280]">No social accounts added yet.</p> : accounts.map((account) => (
                            <article key={account.id} className="flex flex-col gap-3 rounded-lg border border-[#E3E7ED] p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <p className="font-semibold">{account.platform} · @{account.handle}</p>
                                    <p className="mt-1 text-xs text-[#6B7280]">Data source: {account.account_data_source || "creator provided"} · Not API-verified</p>
                                    {account.profile_url && <a className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#B85E00] underline" href={account.profile_url} target="_blank" rel="noreferrer"><FiExternalLink size={12} /> Open profile</a>}
                                </div>
                                <button type="button" className={secondaryButton} onClick={() => removeSocialAccount(account)} disabled={removingId === account.id}><FiTrash2 size={14} /> {removingId === account.id ? "Removing..." : "Remove"}</button>
                            </article>
                        ))}
                    </div>
                    <form onSubmit={addSocialAccount} className="grid gap-3 rounded-lg bg-[#F8F9FA] p-4 sm:grid-cols-2">
                        <label className="text-sm font-medium">Platform<select className={inputClass} value={platform} onChange={(e) => setPlatform(e.target.value)}><option>Instagram</option><option>TikTok</option><option>YouTube</option><option>Facebook</option><option>Other</option></select></label>
                        <label className="text-sm font-medium">Handle<input className={inputClass} value={handle} onChange={(e) => setHandle(e.target.value)} maxLength={200} placeholder="@yourhandle" required /></label>
                        <label className="text-sm font-medium sm:col-span-2">Profile URL (optional)<input className={inputClass} type="url" value={profileUrl} onChange={(e) => setProfileUrl(e.target.value)} placeholder="https://..." /></label>
                        <div className="sm:col-span-2"><button type="submit" className={primaryButton} disabled={addingAccount || !creatorId}><FiPlus size={15} /> {addingAccount ? "Adding..." : "Add social account"}</button></div>
                    </form>
                </section>
            </>}
        </main>
    );
}
