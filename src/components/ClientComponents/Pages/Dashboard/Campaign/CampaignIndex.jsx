'use client'
import React, { useCallback, useEffect, useState } from "react"
import { useRouter } from "nextjs-toploader/app";
import { Input, Button, Select, Form } from 'antd'; 
import ButtonPrimary from "@/components/ReusableComponents/CustomButton/ButtonPrimary";
import ButtonSecondary from "@/components/ReusableComponents/CustomButton/ButtonSecondary";
import CampaignEditModal from "@/components/ReusableComponents/CustomModals/CampaignEditModal";
import DeleteModel from "@/components/ReusableComponents/CustomModals/DeleteModel";
import SuccessModal from "@/components/ReusableComponents/CustomModals/SucessModal";
import CampaignStatus from "@/components/ReusableComponents/CustomModals/CampaignStatus";
import { CAMPAIGN_ENDPOINTS } from "@/axios/Endpoints";
import { IoTrashOutline } from "react-icons/io5";
import { Get } from "@/axios/Get";
import { Put } from "@/axios/Put";
import { Delete } from "@/axios/Delete";
import dayjs from 'dayjs';

const { Option } = Select;
const filterOptions = ['All campaigns', 'Active', 'Draft', 'Completed', 'Cancelled'];

const CampaignIndex = () => {

    const titleClass   = 'font-bold text-[26px] font-stretch-normal  tracking-wide'
    const headingClass = 'font-bold text-[22px] font-stretch-normal  tracking-wide'
    const labelClass   = 'font-normal text-[12px]'
    const dataClass    = 'font-normal text-[14px] text-[#343A40]'
    const textClass    = 'font-light text-[12px] text-[#979797]'

    const router = useRouter();
    const [form] = Form.useForm();
    const [formData, setFormData] = useState({filter: ''});
    const [loading, setLoading] = useState(false);
    const [allCompaigns, setAllCompaigns] = useState([]);
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [isCampaignEditModalOpen, setIsCampaignEditModalOpen] = useState(false);
    const [isDeleteModelOpen, setIsDeleteModelOpen] = useState(false);
    const [campaignLoadError, setCampaignLoadError] = useState("");

    const getAllCampaigns = useCallback(async (status = formData.filter) => {
        setLoading(true);
        setCampaignLoadError("");
        try {
            const statusQuery = status && status !== filterOptions[0]
                ? `?status=${encodeURIComponent(status)}`
                : "";
            const response = await Get(`${CAMPAIGN_ENDPOINTS.GET_ALL_CAMPAIGNS}${statusQuery}`);
            setAllCompaigns(response?.data);
        } catch (error) {
            console.error("Unable to load campaigns:", error?.response?.data || error);
            setCampaignLoadError(error?.response?.data?.error || "Unable to load campaigns.");
        } finally {
            setLoading(false);
        }
    }, [filterOptions, formData.filter]);

    useEffect(() => {
        getAllCampaigns();
    }, [getAllCampaigns]);

    const showCampaignEditModal = (campaign) => {
        setSelectedCampaign(campaign);
        setIsCampaignEditModalOpen(true);
    };

    // const handleCampaignEditModalSubmit = async (values) => {
    //     try {
    //         const formData = {
    //             title: values?.campaign_title,
    //             budget: values?.campaign_budget,
    //             start_date: values.start_date?.format("YYYY-MM-DD"),
    //             end_date: values.end_date?.format("YYYY-MM-DD"),
    //         };
    //         let endpoint = CAMPAIGN_ENDPOINTS?.UPDATE_CAMPAIGN;
    //         endpoint = endpoint.replace("__CAMPAIGN_ID__", selectedCampaign);
    //         Put(endpoint, formData)
    //             .then((response) => {
    //                 getAllCampaigns();
    //                 setIsCampaignEditModalOpen(false);
    //             })
    //             .catch((error) => {
    //                 console.log("Error while editing company details:", error?.response?.data);
    //             });
    //     } catch (error) {
    //         console.log("Please complete all required fields.");
    //     }
    // };

    const handleCampaignEditModalSubmit = async (values) => {
        try {
            const formData = {
                campaign_details: {
                    campaign_title: values?.campaign_title,
                    campaign_budget: values?.campaign_budget,
                    campaign_start_date: values?.start_date?.format("YYYY-MM-DD"),
                    campaign_end_date: values?.end_date?.format("YYYY-MM-DD"),
                }
            };
            let endpoint = CAMPAIGN_ENDPOINTS.UPDATE_CAMPAIGN.replace("__CAMPAIGN_ID__", selectedCampaign?.id);
            await Put(endpoint, formData);
            getAllCampaigns();
            setIsCampaignEditModalOpen(false);
        } catch (error) {
            console.log("Error updating campaign:", error);
        }
    };

    const handleCampaignDelete = async () => {
        setLoading(true);
        const endpoint = CAMPAIGN_ENDPOINTS.DELETE_CAMPAIGN_BY_ID.replace("__CAMPAIGN_ID__", selectedCampaign);
        try {
            await Delete(endpoint);
            setSelectedCampaign(null);
            setIsDeleteModelOpen(false);
            await getAllCampaigns();
        } catch (error) {
            console.error("Error while deleting campaign:", error?.response?.data || error);
            setCampaignLoadError(error?.response?.data?.error || "Unable to delete campaign.");
        } finally {
            setLoading(false);
        }
    };

    const handleCampaignEditModalCancel = () => {
        setIsCampaignEditModalOpen(false);
    };

    const handleChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleView = (data) => {
    router.push(`/dashboard/campaign/${data?.id}`);
    };

    const onClick = (id) => {
        setSelectedCampaign(id);
        setIsDeleteModelOpen(true);
    };

    const renderSelect = (name, label, options) => (
        <Form.Item
            // label={label}
            name={name}
            key={name}
            labelCol={{ style: { marginBottom: 0, fontSize: 12, padding: 0 } }}
            style={{ marginBottom: 0, width: '100%'}}
        >
            <Select
                placeholder={`Select ${label}`}
                value={formData[name]}
                onChange={(value) => handleChange(name, value)}
                allowClear
                size="medium"
                style={{ width: '100%' }}
            >
                {options.map(opt => (
                    <Option key={opt} value={opt}>
                        {opt}
                    </Option>
                ))}
            </Select>
        </Form.Item>
    );

    const renderKPI = (name, data, isDate) => (
        <div className={`flex flex-col`}>
            <div className={`${textClass}`}>{name}</div>
            {isDate ? (
                <div className={`${dataClass}`}>
                    {dayjs(data).format('DD/MM/YYYY')}
                </div>
            ) : (
                <div className={`${dataClass}`}>{data}</div>
            )}
        </div>
    )

    return(
        <div className={`flex flex-col gap-[20px]`}>
            <div className={`flex justify-between items-center`}>
                <div className="flex flex-col">
                    <div className={`${titleClass}`}>
                        Campaign Management
                    </div>
                    <div className={`${labelClass} text-[#979797]`}>
                        Manage your campaigns and track performance
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <ButtonPrimary
                        onClick = {() => router.push("/dashboard/campaign/create")}
                        text = {`Create New Campaign`}
                        // width = {``}
                        // height = {``}
                        loading = {false}
                    />
                </div>
            </div>
            <div className={`flex items-center bg-white border border-[#979797] rounded-lg p-3 gap-[10px]`}>
                <div className={`w-fit text-nowrap text-[12px]`}>
                    Filter by status:
                </div>
                <div className={`w-full`}>
                    <Form
                        layout="vertical"
                        style={{ width: '100%' }}
                    >
                        {renderSelect('filter', 'filter', filterOptions)}                    
                    </Form>
                </div>
            </div>
            <div className={`flex flex-col gap-[10px]`}>
                <div className={`${headingClass}`}>
                    Your Campaigns
                </div>
                {campaignLoadError && (
                    <div role="alert" className="text-red-600 text-sm">{campaignLoadError}</div>
                )}
                <div className={`grid md:grid-cols-1 lg:grid-cols-2 min-h-[20vh] h-fit gap-[15px]`}>
                    {
                        allCompaigns?.length > 0 &&
                        allCompaigns?.map((data,index)=>(
                            <div key={index} className={`flex flex-col h-fit p-4 border border-[#979797] rounded-md bg-white gap-[10px]`}>
                                <div className={`flex flex-col`}>
                                    <div className={`flex justify-between items-center`}>
                                        <div className={`text-[16px] text-[#212529]`}>
                                            {data?.campaign_details?.campaign_title}
                                        </div>
                                        <CampaignStatus
                                            data={data?.status}
                                        />
                                    </div>
                                    <div className={`text-[12px] text-[#979797] truncate`}>
                                        {data?.campaign_details?.campaign_description}
                                    </div>
                                    <div className={`text-[12px] text-[#979797]`}>
                                        Created at: {dayjs(data?.createdAt).format('DD/MM/YYYY')}
                                    </div>
                                </div>
                                <div className={`grid grid-cols-3`}>
                                    {renderKPI('Start date',data?.campaign_details?.campaign_start_date, true)}
                                    {renderKPI('End Date',data?.campaign_details?.campaign_end_date, true)}
                                    {renderKPI('Payment Model',data?.payment_information?.campaign_payment_model)}
                                    {renderKPI('Age group',data?.targeting_criteria?.campaign_age_range)}
                                    {renderKPI('Region',data?.targeting_criteria?.campaign_location)}
                                    {renderKPI('Language',data?.platform_details?.campaign_language)}
                                </div>
                                <div className={`flex justify-between items-center`}>
                                    <div className="flex gap-[10px]">
                                        <ButtonPrimary
                                            onClick = {()=>{handleView(data)}}
                                            text = {`View Details`}
                                            // width = {``}
                                            // height = {``}
                                            loading = {false}
                                        />
                                        <ButtonSecondary
                                            onClick = {() => showCampaignEditModal(data)}
                                            text = {`Edit Campaign`}
                                            // width = {``}
                                            // height = {``}
                                            loading = {false}
                                        />
                                    </div>
                                    <div 
                                        onClick={() => onClick(data?.id)}
                                        className="cursor-pointer hover:scale-105 transition-transform duration-150"
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') onClick();
                                        }}
                                    >
                                        <IoTrashOutline size={20} color="#c1121f" />
                                    </div>
                                </div>
                            </div>
                        ))
                    }
                    {allCompaigns?.length === 0 && (
                        <div className={`col-span-2 flex items-center justify-center  text-[16px] text-[#979797]`}>
                            {loading ? "Loading campaigns..." : "No any campaign data available"}
                        </div>
                    )}
                </div>
            </div>
            <CampaignEditModal
                data={selectedCampaign}
                form={form}
                isCampaignEditModalOpen={isCampaignEditModalOpen}
                handleCampaignEditModalSubmit={handleCampaignEditModalSubmit}
                handleCampaignEditModalCancel={handleCampaignEditModalCancel}
            />
            <DeleteModel
                loading={loading}
                text="Are you sure you want to delete this campaign?"
                isOpen={isDeleteModelOpen}
                onClose={() => setIsDeleteModelOpen(false)}
                onDelete={handleCampaignDelete}
            />
        </div>
    )
}

export default CampaignIndex;