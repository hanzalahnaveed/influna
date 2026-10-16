'use client'

import React, { useEffect, useState } from "react";
import { Alert } from "antd";
import AnalyticCard from "@/components/ReusableComponents/CustomCards/AnalyticCard";
import { BsBroadcast, BsEye } from "react-icons/bs";
import { CiHeart } from "react-icons/ci";
import { PiUsersThreeThin } from "react-icons/pi";
import { DASHBOARD_ENDPOINTS } from "@/axios/Endpoints";
import { Get } from "@/axios/Get";
import CampaignReportsPage from "@/components/ClientComponents/Pages/Dashboard/Reports";

const DashboardIndex = () => {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let isMounted = true;
        Get(DASHBOARD_ENDPOINTS.SUMMARY)
            .then(({ data }) => {
                if (isMounted) setSummary(data);
            })
            .catch((requestError) => {
                console.error("Unable to load dashboard summary:", requestError?.response?.data || requestError);
                if (isMounted) {
                    setError(requestError?.response?.data?.error || "Unable to load dashboard data.");
                }
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    const displayValue = (key) => loading ? "..." : (summary?.[key] ?? 0);

    return (
        <div className="h-full">
            {error && <Alert className="mb-4" type="error" message={error} showIcon />}
            <section aria-label="Campaign overview">
                <div className="mb-4">
                    <h1 className="text-xl font-bold tracking-tight text-[#212529]">Campaign overview</h1>
                    <p className="mt-1 text-sm text-[#6B7280]">A quick look at your campaign portfolio and progress.</p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <AnalyticCard
                    icon={<BsBroadcast color="white" size={20} />}
                    title="Total Campaigns"
                    value={displayValue("totalCampaigns")}
                    text="All saved campaigns"
                    gradient="bg-linear-to-r from-[#3961CC] to-[#78ADEF]"
                />
                <AnalyticCard
                    icon={<BsEye color="white" size={20} />}
                    title="Active Campaigns"
                    value={displayValue("activeCampaigns")}
                    text="Currently running"
                    gradient="bg-linear-to-r from-[#9477DC] to-[#C6B6E8]"
                />
                <AnalyticCard
                    icon={<CiHeart color="white" size={20} />}
                    title="Draft Campaigns"
                    value={displayValue("draftCampaigns")}
                    text="Saved but not launched"
                    gradient="bg-linear-to-r from-[#F66061] to-[#F68B8D]"
                />
                <AnalyticCard
                    icon={<PiUsersThreeThin color="white" size={20} />}
                    title="Completed Campaigns"
                    value={displayValue("completedCampaigns")}
                    text="Finished campaigns"
                    gradient="bg-linear-to-r from-[#F69256] to-[#FAB16D]"
                />
                </div>
            </section>
            <div className="mt-8">
                <CampaignReportsPage showBreakdown={false} hideCampaignTotal />
            </div>
        </div>
    );
};

export default DashboardIndex;
