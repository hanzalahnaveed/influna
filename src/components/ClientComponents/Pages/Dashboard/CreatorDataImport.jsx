"use client";

import { useState } from "react";
import { FiUploadCloud, FiFileText } from "react-icons/fi";

const inputClass = "w-full rounded-lg border border-[#D9DEE7] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#FA8500]";

const template = `display_name,platform,handle,profile_url,bio,categories,country,city,languages,follower_count,following_count,post_count,average_views,average_likes,average_comments,engagement_rate,observed_at
Sample Creator,Instagram,sample_creator,https://www.instagram.com/sample_creator/,Lifestyle creator,lifestyle|beauty,PK,Lahore,Urdu|English,25000,800,120,9000,1100,85,4.74,2026-10-01
`;

export default function CreatorDataImport() {
    const [file, setFile] = useState(null);
    const [sourceReference, setSourceReference] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState(null);

    async function submit(event) {
        event.preventDefault();
        setError("");
        setResult(null);
        if (!file) { setError("Choose a CSV file first."); return; }
        const form = new FormData();
        form.append("file", file);
        form.append("source_reference", sourceReference);
        setBusy(true);
        try {
            const response = await fetch("/api/v1/creator-datasets/import", { method: "POST", body: form });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Import failed.");
            setResult(data);
        } catch (err) {
            setError(err.message || "Import failed.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <main className="mx-auto w-full max-w-5xl space-y-6 p-6">
            <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-[#FA8500]">Creator data</p>
                <h1 className="mt-1 text-2xl font-bold text-[#233044]">Import a creator dataset</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Bring in a public CSV dataset to seed discovery and exercise creator matching. Imported records are reference data and are not presented as live or verified platform data.</p>
            </div>

            <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="text-base font-semibold text-[#233044]">CSV requirements</h2>
                <p className="mt-2 text-sm text-slate-600">Maximum 2 MB and 1,000 rows per import. Required columns: <code>display_name</code>, <code>platform</code>, and <code>handle</code>. Platform must be Instagram, TikTok, YouTube, Facebook, or Other.</p>
                <p className="mt-2 text-sm text-slate-600">Optional columns include <code>bio</code>, <code>categories</code>, <code>country</code>, <code>city</code>, <code>languages</code>, follower/following/post counts, average views/likes/comments, engagement rate, profile URL, and observed date. Separate multiple categories or languages with <code>|</code> or <code>;</code>.</p>
                <button type="button" onClick={() => { const blob = new Blob([template], { type: "text/csv;charset=utf-8;" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "influna-creator-import-template.csv"; anchor.click(); URL.revokeObjectURL(url); }} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-[#233044] hover:bg-slate-50">
                    <FiFileText /> Download CSV template
                </button>
            </section>

            <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Dataset source / citation</label>
                    <input className={inputClass} value={sourceReference} onChange={(event) => setSourceReference(event.target.value)} maxLength={500} placeholder="Dataset name and source URL (recommended)" />
                    <p className="mt-1 text-xs text-slate-500">Only import data you are permitted to use. Add the source URL or citation so the dataset can be traced.</p>
                </div>
                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">CSV file</label>
                    <input className={inputClass} type="file" accept=".csv,text/csv" onChange={(event) => { setFile(event.target.files?.[0] || null); setResult(null); }} />
                </div>
                {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
                <button disabled={busy || !file} className="inline-flex items-center gap-2 rounded-lg bg-[#FA8500] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e87900] disabled:cursor-not-allowed disabled:opacity-60">
                    <FiUploadCloud /> {busy ? "Importing…" : "Import dataset"}
                </button>
            </form>

            {result && <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="text-base font-semibold text-[#233044]">Import summary</h2>
                <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg bg-emerald-50 p-3"><p className="text-xs text-emerald-700">Imported</p><p className="text-2xl font-bold text-emerald-900">{result.imported}</p></div>
                    <div className="rounded-lg bg-amber-50 p-3"><p className="text-xs text-amber-700">Skipped duplicates</p><p className="text-2xl font-bold text-amber-900">{result.skipped}</p></div>
                    <div className="rounded-lg bg-slate-100 p-3"><p className="text-xs text-slate-600">Rows with errors</p><p className="text-2xl font-bold text-slate-900">{result.errors?.length || 0}</p></div>
                </div>
                <p className="text-sm text-slate-600">{result.note}</p>
                {!!result.errors?.length && <div className="max-h-64 space-y-2 overflow-auto rounded-lg bg-red-50 p-3">{result.errors.map((item) => <p key={item.row} className="text-sm text-red-800">Row {item.row}: {item.message}</p>)}</div>}
                <a href="/dashboard/creators" className="inline-block text-sm font-semibold text-[#d96f00] underline">Open creator discovery</a>
            </section>}
        </main>
    );
}
