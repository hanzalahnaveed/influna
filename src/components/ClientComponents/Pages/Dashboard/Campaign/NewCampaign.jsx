'use client'
import React, { useState } from "react"
import CampaignInformationStep from "./campaignCreateSteps/CampaignInformationStep";
import PaymentInformationStep from "./campaignCreateSteps/PaymentInformationStep";
import ButtonPrimary from "@/components/ReusableComponents/CustomButton/ButtonPrimary";
import ButtonSecondary from "@/components/ReusableComponents/CustomButton/ButtonSecondary";
import SuccessModal from "@/components/ReusableComponents/CustomModals/SucessModal";
import { Steps, Form, message } from 'antd';
import { useRouter } from "nextjs-toploader/app";
import { CAMPAIGN_ENDPOINTS } from "@/axios/Endpoints";
import {Post} from "@/axios/Post";

const NewCampaign = () => {

    const titleClass = 'font-bold text-[26px] tracking-wide';
    const headingClass = 'font-semibold text-[18px] tracking-wide';
    const labelClass = 'font-normal text-[12px]';
    const textClass = 'font-light text-[14px] text-[#979797]';

    const [form] = Form.useForm();
    const router = useRouter();
    const [formData, setFormData] = useState({});
    const [paymentTerms, setPaymentTerms] = useState({});
    const [currentStep, setCurrentStep] = useState(0);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [successText, setSuccessText] = useState('Campaign created successfully!');

    const handleNextStep = async() => {
        try {
            const values = await form.validateFields();
            setFormData(prev => ({ ...prev, ...values }));
            setCurrentStep(1);
        } catch (error) {
            console.error('Validation Failed:', error);
        } 
    }

    const handleSuccessModalClose = () => {
        setIsSuccessModalOpen(false);
        router.push('/dashboard/campaign');
    }

    const handleSaveCampaign = async (status = 'Active') => {
        if (isSaving) return;
        setIsSaving(true);

        try {
            const currentValues = form.getFieldsValue(true);
            let finalValues = { ...formData, ...currentValues };
            if (status !== 'Draft') {
                const validatedValues = await form.validateFields();
                finalValues = { ...formData, ...form.getFieldsValue(true), ...validatedValues };
            }

            const payment_information = {
                ...paymentTerms,
                campaign_payment_model: finalValues.campaign_payment_model,
                ...(finalValues.campaign_budget !== undefined && finalValues.campaign_budget !== null && finalValues.campaign_budget !== "" ? { campaign_budget: Number(finalValues.campaign_budget) } : {}),
                budget_currency: String(finalValues.budget_currency || "USD").toUpperCase(),
            };
            if (finalValues.campaign_payment_model === 'Performance Based') {
                payment_information.performance_model = paymentTerms.performance_model;
                if(paymentTerms.performance_model === 'CPM'){
                    payment_information.cpm_views = Number(finalValues.cpm_views);
                    payment_information.cpm_amount = Number(finalValues.cpm_amount);
                }
                if(paymentTerms.performance_model === 'CPE'){
                    payment_information.cpe_like_rate = finalValues.cpe_like_rate;
                    payment_information.cpe_comment_rate = finalValues.cpe_comment_rate;
                    payment_information.cpe_share_rate = finalValues.cpe_share_rate;
                }
                if(paymentTerms.performance_model === 'CPC'){
                    payment_information.cpc_click_rate = finalValues.cpc_click_rate;
                }
                if(paymentTerms.performance_model === 'CPA'){
                    payment_information.cpa_conversion_rate = finalValues.cpa_conversion_rate;
                }
            }


            const finalFormData = {
                campaign_details : {
                    campaign_title: finalValues.campaign_title,
                    campaign_objective: finalValues.campaign_objectives,
                    campaign_start_date: finalValues.campaign_start_date,
                    campaign_end_date: finalValues.campaign_end_date,
                    campaign_description: finalValues.campaign_description,
                },
                targeting_criteria: {
                    campaign_location: finalValues.campaign_location,
                    campaign_age_range: finalValues.campaign_age_range,
                    campaign_gender: finalValues.campaign_gender,
                    campaign_interest: finalValues.campaign_interest,
                    ...(finalValues.min_followers !== undefined && finalValues.min_followers !== '' ? { min_followers: Number(finalValues.min_followers) } : {}),
                    ...(finalValues.max_followers !== undefined && finalValues.max_followers !== '' ? { max_followers: Number(finalValues.max_followers) } : {}),
                    ...(finalValues.min_engagement_rate !== undefined && finalValues.min_engagement_rate !== '' ? { min_engagement_rate: Number(finalValues.min_engagement_rate) } : {}),
                },
                platform_details: {
                    campaign_platform: finalValues.campaign_platform,
                    campaign_genere: finalValues.campaign_genere,
                    campaign_language: finalValues.campaign_language,
                },
                payment_information,
                status,
            }

            await Post(CAMPAIGN_ENDPOINTS.CREATE_CAMPAIGN, finalFormData);
            setSuccessText(status === 'Draft' ? 'Campaign draft saved successfully!' : 'Campaign created successfully!');
            setIsSuccessModalOpen(true);
            form.resetFields();
            setFormData({});
            setPaymentTerms({});
        } catch (error) {
            const errorMessage = error?.response?.data?.error
                || 'Please complete all required fields before creating the campaign.';
            message.error(errorMessage);
            console.error('Unable to save campaign:', error?.response?.data || error);
        } finally {
            setIsSaving(false);
        }
    }
    
    const onChange = value => {
        setCurrentStep(value);
    };

    return (
        <div className="flex flex-col min-h-full gap-6">
            <div className="flex flex-col">
                <p className={titleClass}>Create New Campaign</p>
                <p className={textClass}>
                    Design and launch your influencer marketing campaign with our advanced targeting and AI-powered <br />
                    content suggestions.
                </p>
            </div>
            <div className={`flex px-16`}>
                <Steps
                    current={currentStep}
                    onChange={onChange}
                    items={[
                        {title: 'Step 1: Campaign Information',description: ''},
                        {title: 'Step 2: Payment Information',description:''},
                        {title: 'Step 3: Finish',description:''},
                    ]}
                />
            </div>
            <Form
                form={form}
                name="campaignForm"
                initialValues={{ remember: true }}
                autoComplete="off"
                className="flex flex-col gap-4"
                style={{ marginBottom: 0, width: '100%' }}
                layout="vertical"
            >
                {
                    currentStep === 0 ? (
                        <CampaignInformationStep 
                            handleNextStep={handleNextStep}
                            handleDraft={() => handleSaveCampaign('Draft')}
                        />
                    ) : (
                        <PaymentInformationStep
                            setCurrentStep={setCurrentStep} 
                            handleCreateCampaign={() => handleSaveCampaign('Active')}
                            handleDraft={() => handleSaveCampaign('Draft')}
                            onPaymentTermsChange={setPaymentTerms}
                        />
                    )
                }
            </Form>
            {
                currentStep === 0 && 
                <div className="flex gap-[10px]">
                    <ButtonPrimary
                        onClick={handleNextStep}
                        text="Next Step"
                        loading={false}
                    />
                    <ButtonSecondary onClick={() => handleSaveCampaign('Draft')} text="Save as Draft" loading={isSaving} />
                </div>
            }
            {
                currentStep === 1 && 
                <div className="flex gap-4">
                    <ButtonPrimary onClick={() => handleSaveCampaign('Active')} text="Create Campaign" loading={isSaving} />
                    <ButtonSecondary onClick={() => handleSaveCampaign('Draft')} text="Save as Draft" loading={isSaving} />
                    <ButtonSecondary onClick={() => setCurrentStep(0)} text="Go Previous Step" loading={false}/>
                </div>
            }
            <SuccessModal
                text={successText}
                isOpen={isSuccessModalOpen}
                onClose={handleSuccessModalClose}
                loading={false}
            />
        </div>
    );
}

export default NewCampaign;
