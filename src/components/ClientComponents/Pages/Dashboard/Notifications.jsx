"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FiBell, FiCheck, FiExternalLink, FiRefreshCw } from "react-icons/fi";

const secondaryButton = "inline-flex items-center justify-center gap-2 rounded-lg border border-[#D9DEE7] bg-white px-4 py-2.5 text-sm font-semibold text-[#495057] transition hover:bg-[#F8F9FA] disabled:cursor-not-allowed disabled:opacity-60";
const primaryButton = "inline-flex items-center justify-center gap-2 rounded-lg bg-[#FA8500] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e87900] disabled:cursor-not-allowed disabled:opacity-60";

function timeLabel(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

export default function NotificationsPage() {
    const router = useRouter();
    const [items, setItems] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const response = await fetch("/api/v1/notifications?limit=100", { cache: "no-store" });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Unable to load notifications.");
            setItems(data.notifications || []);
            setUnreadCount(data.unread_count || 0);
        } catch (cause) {
            setError(cause.message || "Unable to load notifications.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    async function markRead(item) {
        if (item.is_read) return;
        setBusyId(item.id);
        setError("");
        try {
            const response = await fetch("/api/v1/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "mark_read", id: item.id }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Unable to mark notification as read.");
            setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, is_read: true } : entry));
            setUnreadCount((count) => Math.max(0, count - 1));
        } catch (cause) {
            setError(cause.message || "Unable to update notification.");
        } finally {
            setBusyId("");
        }
    }

    async function markAllRead() {
        setBusyId("all");
        setError("");
        setNotice("");
        try {
            const response = await fetch("/api/v1/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "mark_all_read" }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Unable to mark notifications as read.");
            setItems((current) => current.map((entry) => ({ ...entry, is_read: true })));
            setUnreadCount(0);
            setNotice(data.updated_count ? "All notifications marked as read." : "There are no unread notifications.");
        } catch (cause) {
            setError(cause.message || "Unable to update notifications.");
        } finally {
            setBusyId("");
        }
    }

    async function openNotification(item) {
        await markRead(item);
        if (item.href) router.push(item.href);
    }

    return (
        <main className="flex flex-col gap-5 pb-8 text-[#212529]">
            <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#FA8500]">Your activity</p>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">Notifications</h1>
                    <p className="mt-1 text-sm text-[#6B7280]">{unreadCount} unread notification{unreadCount === 1 ? "" : "s"}.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" className={secondaryButton} onClick={load} disabled={loading}><FiRefreshCw size={14} /> Refresh</button>
                    <button type="button" className={primaryButton} onClick={markAllRead} disabled={loading || unreadCount === 0 || busyId !== ""}><FiCheck size={14} /> Mark all read</button>
                </div>
            </header>

            {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}

            {loading ? <div className="rounded-xl border border-[#E3E7ED] bg-white p-10 text-center text-sm text-[#6B7280]">Loading notifications...</div>
                : items.length === 0 ? <div className="rounded-xl border border-dashed border-[#D9DEE7] bg-white px-6 py-14 text-center"><FiBell className="mx-auto mb-3 text-[#9CA3AF]" size={28} /><h2 className="font-semibold">You’re all caught up</h2><p className="mt-1 text-sm text-[#6B7280]">Updates about campaign activity will appear here.</p></div>
                : <div className="overflow-hidden rounded-xl border border-[#E3E7ED] bg-white">
                    {items.map((item) => (
                        <article key={item.id} className={"flex flex-col gap-3 border-b border-[#EEF0F3] p-4 last:border-b-0 sm:flex-row sm:items-start " + (!item.is_read ? "bg-orange-50/40" : "")}>
                            <span className={"mt-1 h-2.5 w-2.5 shrink-0 rounded-full " + (!item.is_read ? "bg-[#FA8500]" : "bg-transparent border border-[#D1D5DB]")} aria-label={item.is_read ? "Read" : "Unread"} />
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{item.title}</h2><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">{item.type.replaceAll("_", " ")}</span></div>
                                <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-[#495057]">{item.message}</p>
                                <p className="mt-2 text-xs text-[#6B7280]">{timeLabel(item.created_at)}</p>
                            </div>
                            <div className="flex shrink-0 flex-wrap gap-2">
                                {!item.is_read && <button type="button" className={secondaryButton} onClick={() => markRead(item)} disabled={busyId !== ""}><FiCheck size={14} /> Mark read</button>}
                                {item.href && <button type="button" className={primaryButton} onClick={() => openNotification(item)} disabled={busyId !== ""}><FiExternalLink size={14} /> Open</button>}
                            </div>
                        </article>
                    ))}
                </div>}
        </main>
    );
}
