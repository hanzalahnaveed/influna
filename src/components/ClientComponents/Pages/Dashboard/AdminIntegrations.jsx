"use client";

import { useCallback, useEffect, useState } from "react";
import { FiCheckCircle, FiClock, FiRefreshCw, FiShield, FiAlertCircle } from "react-icons/fi";

const buttonClass = "inline-flex items-center justify-center gap-2 rounded-lg border border-[#D9DEE7] bg-white px-4 py-2.5 text-sm font-semibold text-[#495057] transition hover:bg-[#F8F9FA] disabled:cursor-not-allowed disabled:opacity-60";

function statusLabel(status) {
    return ({
        approval_required: "Approval required",
        configuration_required: "Configuration required",
        configured_not_connected: "Configured · not connected",
        deferred: "Deferred",
        not_implemented: "Not implemented",
    })[status] || status.replaceAll("_", " ");
}

function statusStyle(status) {
    if (status === "configured_not_connected") return "bg-amber-50 text-amber-800";
    if (status === "approval_required" || status === "configuration_required") return "bg-orange-50 text-orange-800";
    return "bg-slate-100 text-slate-700";
}

export default function AdminIntegrations() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadStatus = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const response = await fetch("/api/v1/admin/integrations/status", { cache: "no-store" });
            const body = await response.json();
            if (!response.ok) throw new Error(body?.error || "Unable to load integration readiness.");
            setData(body);
        } catch (cause) {
            setError(cause.message || "Unable to load integration readiness.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadStatus(); }, [loadStatus]);

    return (
        <main className="flex flex-col gap-6 pb-8 text-[#212529]">
            <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#FA8500]">Platform operations</p>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">Integration readiness</h1>
                    <p className="mt-1 max-w-2xl text-sm text-[#6B7280]">Review server configuration and implementation readiness without exposing credentials.</p>
                </div>
                <button type="button" className={buttonClass} onClick={loadStatus} disabled={loading}><FiRefreshCw size={14} /> Refresh status</button>
            </header>

            <div role="note" className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900">
                <FiShield className="mt-0.5 shrink-0" size={18} />
                <p>Configuration is not the same as a live connection. Influna will not claim official metrics or attempt provider access until the required approval and integration implementation are complete.</p>
            </div>

            {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {loading && !data ? <div className="rounded-xl border border-[#E3E7ED] bg-white p-10 text-center text-sm text-[#6B7280]">Checking integration configuration...</div> : null}

            {data && (
                <>
                    <div className="grid gap-4 xl:grid-cols-3">
                        {data.integrations.map((integration) => (
                            <article key={integration.id} className="flex flex-col gap-4 rounded-xl border border-[#E3E7ED] bg-white p-5 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h2 className="font-semibold">{integration.name}</h2>
                                        <p className="mt-1 text-sm text-[#6B7280]">{integration.purpose}</p>
                                    </div>
                                    {integration.status === "configured_not_connected" ? <FiCheckCircle className="shrink-0 text-amber-600" size={20} /> : <FiClock className="shrink-0 text-[#6B7280]" size={20} />}
                                </div>
                                <span className={"w-fit rounded-full px-3 py-1 text-xs font-semibold " + statusStyle(integration.status)}>{statusLabel(integration.status)}</span>
                                <p className="text-sm leading-5 text-[#495057]">{integration.message}</p>
                                <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Server environment checklist</p>
                                    <ul className="flex flex-col gap-2">
                                        {integration.required_environment_variables.map((name) => {
                                            const isMissing = integration.missing_environment_variables.includes(name);
                                            return <li key={name} className="flex items-center gap-2 text-xs">
                                                {isMissing ? <FiAlertCircle className="shrink-0 text-[#B45309]" size={14} /> : <FiCheckCircle className="shrink-0 text-emerald-700" size={14} />}
                                                <code className="break-all text-[#495057]">{name}</code>
                                                <span className={"ml-auto shrink-0 " + (isMissing ? "text-[#B45309]" : "text-emerald-700")}>{isMissing ? "Missing" : "Set"}</span>
                                            </li>;
                                        })}
                                    </ul>
                                </div>
                                <p className="mt-auto border-t border-[#EEF0F3] pt-3 text-xs text-[#6B7280]">Implementation: {integration.implementation_status.replaceAll("_", " ")}</p>
                            </article>
                        ))}
                    </div>
                    <p className="text-xs text-[#6B7280]">Last checked: {new Date(data.generated_at).toLocaleString()}. Secret values are never returned by this endpoint.</p>
                </>
            )}
        </main>
    );
}
