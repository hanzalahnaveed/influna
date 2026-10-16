'use client'
import React, { useEffect, useState } from "react"
import { useParams } from "next/navigation";
import { CAMPAIGN_ENDPOINTS } from "@/axios/Endpoints";
import DetailView from "./campaignView/detailView";
import dayjs from 'dayjs';
import { Get } from "@/axios/Get";
import { Put } from "@/axios/Put";
import { Form } from "antd";
import CampaignEditModal from "@/components/ReusableComponents/CustomModals/CampaignEditModal";
import ButtonPrimary from "@/components/ReusableComponents/CustomButton/ButtonPrimary";

const CampaignDetails = () => {

    const titleClass   = 'font-bold text-[26px] tracking-wide'
    const headingClass = 'font-bold text-[20px] tracking-wide mb-4'
    const dataClass    = 'font-light text-[14px]'
    const textClass    = 'font-light text-[12px] text-[#979797]'

    const params = useParams();
    const [loading, setLoading] = useState(false);
    const [campaignDetails, setCampaignDetails] = useState(null);
    const [editForm] = Form.useForm();
    const [editOpen, setEditOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const getCampaignById = () => {
        let endpoint = CAMPAIGN_ENDPOINTS?.GET_CAMPAIGN_BY_ID;
        endpoint = endpoint.replace('__CAMPAIGN_ID__', params?.id);
        setLoading(true);
        Get(endpoint)
        .then((response) => {
            if (response?.status !== 200) {
                setLoading(false);
                return;
            }
            setCampaignDetails(response?.data);
            setLoading(false);
        })
        .catch((error) => {
            console.log("error while getting campaign details: ", error);
            setLoading(false);
        });
    };

    useEffect(() => {
        getCampaignById();
    }, []);

    const saveCampaign = async (values) => {
        if (!params?.id) return;
        setSaving(true);
        try {
            const endpoint = CAMPAIGN_ENDPOINTS.UPDATE_CAMPAIGN.replace("__CAMPAIGN_ID__", params.id);
            await Put(endpoint, { campaign_details: { campaign_title: values.campaign_title, campaign_budget: values.campaign_budget, campaign_start_date: values.start_date?.format("YYYY-MM-DD"), campaign_end_date: values.end_date?.format("YYYY-MM-DD") } });
            setEditOpen(false);
            await getCampaignById();
        } catch (error) {
            console.error("Unable to update campaign:", error?.response?.data || error);
        } finally { setSaving(false); }
    };

    return (
        <div className="py-[15px]">
            <div className="">
                <div className={titleClass}>
                    {campaignDetails?.campaign_details?.campaign_title}
                </div>
                <div className={`${dataClass} text-justify`}>
                    {campaignDetails?.campaign_details?.campaign_description}
                </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
                <ButtonPrimary onClick={() => setEditOpen(true)} text="Edit Campaign" loading={saving} />
                <a href={"/dashboard/campaign-workflow?campaignId=" + encodeURIComponent(params?.id || "")} className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Creator Workflow</a>
                <a href={"/dashboard/deliverables?campaignId=" + encodeURIComponent(params?.id || "")} className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Deliverables</a>
            </div>
            <DetailView data={campaignDetails} loading={loading}/>
            <CampaignEditModal data={campaignDetails} form={editForm} loading={saving} isCampaignEditModalOpen={editOpen} handleCampaignEditModalSubmit={saveCampaign} handleCampaignEditModalCancel={() => setEditOpen(false)}/>
        </div>
    );
}

export default CampaignDetails;
