import { Suspense } from "react";
import CampaignWorkflow from "@/components/ClientComponents/Pages/Dashboard/CampaignWorkflow";

export default function Page() {
    return <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading campaign workflow…</div>}><CampaignWorkflow /></Suspense>;
}
