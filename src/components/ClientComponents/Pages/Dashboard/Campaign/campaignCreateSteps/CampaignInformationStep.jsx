'use client';
import React from 'react';
import { Input, Select, Form, DatePicker } from 'antd';
import ButtonPrimary from '@/components/ReusableComponents/CustomButton/ButtonPrimary';
import ButtonSecondary from '@/components/ReusableComponents/CustomButton/ButtonSecondary';

const { Option } = Select;
const { TextArea } = Input;

const CampaignInformationStep = (props) => {

    const { handleNextStep, handleDraft } = props;

    const titleClass = 'font-bold text-[26px] tracking-wide';
    const headingClass = 'font-semibold text-[18px] tracking-wide';
    const labelClass = 'font-normal text-[12px]';
    const textClass = 'font-light text-[14px] text-[#979797]';

    const objectivesOptions = ['Brand Awareness', 'Engagement', 'Sales', 'Lead Generation', 'Web Traffic', 'Content Creation', 'Event Promotion'];
    const genereOptions = ['Post', 'Reel', 'Story', 'Video', 'Thread', 'Live Session'];
    const ageOptions = ['13–17', '18–24', '25–34', '35–44', '45+'];
    const genderOptions = ['Male', 'Female', 'All'];
    const locationOptions = ['Pakistan', 'USA', 'UK', 'India', 'UAE'];
    const platformOptions = ['Instagram', 'Youtube', 'Facebook', 'Twitter', 'Tiktok', 'Whatsapp'];
    const interestOptions = ['Beauty', 'Fashion', 'Fitness', 'Tech', 'Food', 'Travel', 'Gaming', 'Parenting', 'Finance'];
    const languageOptions = ['English','Urdu', 'Punjabi', 'Pashto', 'Saraiki', 'Sindhi'];

    const renderSelect = (name, label, options) => (
        <Form.Item
            label={<span className={labelClass}>{label}</span>}
            name={name}
            key={name}
            labelCol={{ style: { marginBottom: 0, fontSize: 12, padding: 0 } }}
            rules={[{ required: true, message: 'Please select a campaign objective' }]}
            style={{ marginBottom: 0, width: '100%' }}
        >
            <Select
                placeholder={`Select ${label}`}
                allowClear
                size="medium"
                style={{ width: '100%' }}
            >
                {options.map(opt => (
                    <Option key={opt} value={opt}>{opt}</Option>
                ))}
            </Select>
        </Form.Item>
    );

    const renderFormItem = (name, label, isTextArea) => (
        <Form.Item
            label={<span className={labelClass}>{label}</span>}
            name={name}
            key={name}
            labelCol={{ style: { marginBottom: 0, fontSize: 12, padding: 0 } }}
            rules={[{ required: true, message: 'Campaign title is required' }]}
            style={{ marginBottom: 0, width: '100%' }}
            className={isTextArea ? 'col-span-3' : ''}
        >
            {!isTextArea ? (
                <Input
                    name={name}
                    placeholder={`Enter ${label}`}
                    size="medium"
                    style={{ width: '100%' }}
                />
            ) : (
                <TextArea
                    name={name}
                    placeholder={`Enter ${label}`}
                    size="medium"
                    style={{ width: '100%' }}
                    rows={3}
                />
            )}
        </Form.Item>
    );

    const renderFormDateItem = (name, label) => (
        <Form.Item
            label={<span className={labelClass}>{label}</span>}
            name={name}
            key={name}
            labelCol={{ style: { marginBottom: 0, fontSize: 12, padding: 0 } }}
            rules={[{ required: true, message: 'Required field!' }]}
            style={{ marginBottom: 0, width: '100%' }}
            className=""
        >
            <DatePicker
                name={name}
                placeholder={`Select ${label}`}
                size="medium"
                style={{ width: '100%' }}
            />
        </Form.Item>
    );

    return (
        <div className="flex flex-col h-full gap-4">
            {/* Campaign Details */}
            <div className="flex flex-col bg-white border border-[#EEEFF2] rounded-lg p-6 gap-2 shadow">
                <div className={headingClass}>Campaign Details</div>
                <div className="grid grid-cols-2 gap-3">
                    {renderFormItem('campaign_title', 'Title')}
                    {renderSelect('campaign_objectives', 'Objectives', objectivesOptions)}
                    {renderFormDateItem('campaign_start_date', 'Start Date')}
                    {renderFormDateItem('campaign_end_date', 'End Date')}
                </div>
                {renderFormItem('campaign_description', 'Description', true)}
            </div>

            {/* Targeting */}
            <div className="flex flex-col bg-white border border-[#EEEFF2] rounded-lg p-6 gap-2 shadow">
                <div className={headingClass}>Targeting Criteria</div>
                <div className="grid grid-cols-2 gap-3">
                    {renderSelect('campaign_location', 'Location', locationOptions)}
                    {renderSelect('campaign_age_range', 'Age Range', ageOptions)}
                    {renderSelect('campaign_gender', 'Gender', genderOptions)}
                    {renderSelect('campaign_interest', 'Interest', interestOptions)}
                    <Form.Item
                        label={<span className={labelClass}>Minimum followers (optional)</span>}
                        name="min_followers"
                        style={{ marginBottom: 0, width: '100%' }}
                        extra="Use this to focus on creators with a minimum audience size."
                    >
                        <Input type="number" min={0} placeholder="e.g. 10000" />
                    </Form.Item>
                    <Form.Item
                        label={<span className={labelClass}>Maximum followers (optional)</span>}
                        name="max_followers"
                        style={{ marginBottom: 0, width: '100%' }}
                        extra="Leave blank if there is no upper limit."
                    >
                        <Input type="number" min={0} placeholder="e.g. 100000" />
                    </Form.Item>
                    <Form.Item
                        label={<span className={labelClass}>Minimum engagement rate % (optional)</span>}
                        name="min_engagement_rate"
                        style={{ marginBottom: 0, width: '100%' }}
                        extra="Compared with the latest recorded rate, when available."
                        rules={[{ validator: (_, value) => value === undefined || value === null || value === '' || (Number(value) >= 0 && Number(value) <= 100) ? Promise.resolve() : Promise.reject(new Error('Enter a rate from 0 to 100.')) }]}
                    >
                        <Input type="number" min={0} max={100} step={0.1} placeholder="e.g. 2.5" />
                    </Form.Item>
                </div>
            </div>

            {/* Platform */}
            <div className="flex flex-col bg-white border border-[#EEEFF2] rounded-lg p-6 gap-2 shadow">
                <div className={headingClass}>Platform Specify</div>
                <div className="grid grid-cols-3 gap-3">
                    {renderSelect('campaign_platform', 'Platform', platformOptions)}
                    {renderSelect('campaign_genere', 'Genere', genereOptions)}
                    {renderSelect('campaign_language', 'Language', languageOptions)}
                </div>
            </div>

            {/* Buttons */}
            {/* <div className="flex gap-[10px]">
                <ButtonPrimary
                    onClick={handleNextStep}
                    text="Next Step"
                    loading={false}
                />
                <ButtonSecondary
                    onClick={handleDraft}
                    text="Save as Draft"
                    loading={false}
                />
            </div> */}
        </div>
    );
};

export default CampaignInformationStep;
