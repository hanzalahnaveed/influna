'use client'
import React, { useEffect, useState } from "react"
import { useParams } from "next/navigation";
import { CAMPAIGN_ENDPOINTS } from "@/axios/Endpoints";
import DetailView from "./campaignView/detailView";
import dayjs from 'dayjs';
import { Get } from "@/axios/Get";

const CampaignDetails = () => {

    const titleClass   = 'font-bold text-[26px] tracking-wide'
    const headingClass = 'font-bold text-[20px] tracking-wide mb-4'
    const dataClass    = 'font-light text-[14px]'
    const textClass    = 'font-light text-[12px] text-[#979797]'

    const params = useParams();
    const [loading, setLoading] = useState(false);
    const [campaignDetails, setCampaignDetails] = useState(null);

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
            <DetailView data={campaignDetails} loading={loading}/>
        </div>
    );
}

export default CampaignDetails;
