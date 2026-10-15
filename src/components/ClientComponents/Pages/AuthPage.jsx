"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";

const fieldClass = "mt-1 w-full rounded-lg border border-[#D9DEE7] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#FA8500]";
const buttonClass = "inline-flex w-full items-center justify-center rounded-lg bg-[#FA8500] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#e87900] disabled:cursor-not-allowed disabled:opacity-60";

export default function AuthPage() {
    const router = useRouter();
    const [mode, setMode] = useState("login");
    const [role, setRole] = useState("BRAND");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    async function submit(event) {
        event.preventDefault();
        setBusy(true);
        setError("");
        try {
            const endpoint = mode === "register" ? "/api/v1/auth/register" : "/api/v1/auth/login";
            const payload = { email, password };
            if (mode === "register") {
                payload.role = role;
                if (role === "CREATOR") payload.display_name = displayName;
            }
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || "Authentication failed.");
            const signedInRole = data.user?.role;
            router.push(signedInRole === "CREATOR" ? "/dashboard/creator-invitations" : "/dashboard");
        } catch (err) {
            setError(err.message || "Authentication failed. Please try again.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#ff0f7b] to-[#f89b29] px-4 py-16 text-[#212529]">
            <section className="w-full max-w-md rounded-2xl border border-[#E3E7ED] bg-white/60 p-6 shadow-sm sm:p-8 mt-7">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FA8500]">Influna account</p>
                <h1 className="mt-2 text-2xl font-bold">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
                <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                    {mode === "login" ? "Sign in to continue to your workspace." : "Choose how you will use Influna. You can create a brand or creator account."}
                </p>

                <form className="mt-6 flex flex-col gap-4" onSubmit={submit}>
                    {mode === "register" && <>
                        <label className="text-sm font-medium">Account type
                            <select className={fieldClass} value={role} onChange={(event) => setRole(event.target.value)}>
                                <option value="BRAND">Brand / Agency</option>
                                <option value="CREATOR">Creator / Influencer</option>
                            </select>
                        </label>
                        {role === "CREATOR" && <label className="text-sm font-medium">Creator display name
                            <input className={fieldClass} value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={2} maxLength={100} required />
                        </label>}
                    </>}
                    <label className="text-sm font-medium">Email address
                        <input className={fieldClass} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required />
                    </label>
                    <label className="text-sm font-medium">Password
                        <input className={fieldClass} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={mode === "register" ? 12 : 1} maxLength={128} required />
                        {mode === "register" && <span className="mt-1 block text-xs font-normal text-[#6B7280]">Use at least 12 characters.</span>}
                    </label>
                    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                    <button className={buttonClass} type="submit" disabled={busy}>{busy ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}</button>
                </form>

                <p className="mt-5 text-center text-sm text-[#6B7280]">
                    {mode === "login" ? "New to Influna?" : "Already have an account?"}{" "}
                    <button type="button" className="font-semibold text-[#B85E00] hover:underline" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
                        {mode === "login" ? "Create account" : "Sign in"}
                    </button>
                </p>
                <p className="mt-4 text-xs leading-5 text-[#8A919B]">Creator profiles start private. Make your profile public only after reviewing the information you choose to share.</p>
            </section>
        </main>
    );
}
