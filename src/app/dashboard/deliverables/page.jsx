import { Suspense } from "react";
import Deliverables from "@/components/ClientComponents/Pages/Dashboard/Deliverables";

export default function Page() {
    return <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading deliverables…</div>}><Deliverables /></Suspense>;
}
