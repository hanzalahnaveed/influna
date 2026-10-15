'use client';

import React, { useEffect, useState } from 'react';
import { Input, InputNumber, Select, Form, Button, Space } from 'antd';
import ButtonPrimary from '@/components/ReusableComponents/CustomButton/ButtonPrimary';
import ButtonSecondary from '@/components/ReusableComponents/CustomButton/ButtonSecondary';

const { Option } = Select;
const { TextArea } = Input;

const PaymentInformationStep = (props) => {
    
    const {handleCreateCampaign, handleDraft, setCurrentStep, onPaymentTermsChange} = props;
    const selectedPaymentModel = Form.useWatch('campaign_payment_model');

    const [performanceModel, setPerformanceModel] = useState(null);
    const [milestones, setMilestones] = useState([{ name: '', amount: '' }]);
    const [deliverables, setDeliverables] = useState([{ name: '', amount: '' }]);

    const labelClass = 'font-normal text-[12px]';
    const headingClass = 'font-semibold text-[18px]';

    const paymentMethodOptions = [
        { label: 'Fixed', description: 'Set a fixed rate for each deliverable.' },
        { label: 'Milestone Based', description: 'Pay per milestone completed.' },
        { label: 'Performance Based', description: 'Pay based on engagement, clicks, etc.' },
    ];

    const performanceOptions = ['CPM', 'CPE', 'CPC', 'CPA', 'Flat'];
    const milestoneOptions = ['Content Approval', 'Post Published', 'Report Submitted'];

    useEffect(() => {
        onPaymentTermsChange?.({
            performance_model: performanceModel,
            milestones,
            deliverables,
        });
    }, [performanceModel, milestones, deliverables, onPaymentTermsChange]);

    const handleMilestoneChange = (index, field, value) => {
        const updated = [...milestones];
        updated[index][field] = value;
        setMilestones(updated);
    };

    const handleDeliverableChange = (index, field, value) => {
        const updated = [...deliverables];
        updated[index][field] = value;
        setDeliverables(updated);
    };

    const addMilestone = () => setMilestones([...milestones, { name: '', amount: '' }]);
    const addDeliverable = () => setDeliverables([...deliverables, { name: '', amount: '' }]);

    const renderSelectWithDetail = (name, label, options, onChangeCallback) => (
        <Form.Item
            name={name}
            label={<span className={labelClass}>{label}</span>}
            rules={[{ required: true, message: 'Please select a payment model' }]}
            style={{ marginBottom: 16 }}
        >
            <Select
                placeholder={`Select ${label}`}
                allowClear
                // onChange={(value) => {
                //     setPerformanceModel(null);
                //     form.setFieldValue(name, value); // update form manually if needed
                // }}
                style={{ width: '100%' }}
                optionLabelProp="label"
                styles={{ popup: { root: { maxWidth: '100%', whiteSpace: 'normal' } } }}
            >
                {options.map(opt => (
                    <Option key={opt.label} value={opt.label} label={opt.label}>
                        <div style={{ whiteSpace: 'normal' }}>
                            <div className={`${labelClass}`}>{opt.label}</div>
                            <div className={`${labelClass} text-gray-500`}>{opt.description}</div>
                        </div>
                    </Option>
                ))}
            </Select>
        </Form.Item>
    );

    const renderPerformanceFields = () => (
        <>
            <Form.Item 
                name={'performance_model'}
                label={<span className={labelClass}>Performance Model</span>}
                rules={[{ required: true, message: 'Please select a performance model' }]}
            >
                <Select 
                    value={performanceModel} 
                    onChange={setPerformanceModel}
                >
                    {performanceOptions.map(opt => (
                        <Option key={opt} value={opt}>{opt}</Option>
                    ))}
                </Select>
            </Form.Item>

            {performanceModel === 'CPM' && (
                <div className={`grid grid-cols-2 gap-4`}>
                    <Form.Item 
                        name={'cpm_views'}
                        label={<span className={labelClass}>Views</span>}
                        rules={[{ required: true, message: 'Please select a payment model' }]}
                    >
                        <Input name={'cpm_views'} placeholder="Views"/>
                    </Form.Item>
                    <Form.Item 
                        name={'cpm_amount'}
                        label={<span className={labelClass}>Amount per views</span>}
                        rules={[{ required: true, message: 'Please select a payment model' }]}
                    >
                        <Input name={'cpm_views'} placeholder="Amount per views"/>
                    </Form.Item>
                </div>
            )}
            {performanceModel === 'CPE' && (
                <div className={`grid grid-cols-3 gap-4`}>
                    <Form.Item 
                        name={'cpe_like_rate'}
                        label={<span className={labelClass}>Rate per Like</span>}
                        rules={[{ required: true, message: 'Please select a payment model' }]}
                    >
                        <Input name={'cpe_like_rate'} placeholder="Rate per Like"/>
                    </Form.Item>
                    <Form.Item 
                        name={'cpe_comment_rate'}
                        label={<span className={labelClass}>Rate per Comment</span>}
                        rules={[{ required: true, message: 'Please select a payment model' }]}
                    >
                        <Input name={'cpe_comment_rate'} placeholder="Rate per Comment"/>
                    </Form.Item>
                    <Form.Item 
                        name={'cpe_share_rate'}
                        label={<span className={labelClass}>Rate per Share</span>}
                        rules={[{ required: true, message: 'Please select a payment model' }]}
                    >
                        <Input name={'cpe_share_rate'} placeholder="Rate per Share"/>
                    </Form.Item>
                </div>
            )}
            {performanceModel === 'CPC' && (
                <div className={`grid grid-cols-3 gap-4`}>
                    <Form.Item 
                        name={'cpc_click_rate'}
                        label={<span className={labelClass}>Rate per Click</span>}
                        rules={[{ required: true, message: 'Please select a payment model' }]}
                    >
                        <Input name={'cpc_click_rate'} placeholder="Rate per Click"/>
                    </Form.Item>
                </div>
            )}
            {performanceModel === 'CPA' && (
                <div className={`grid grid-cols-3 gap-4`}>
                    <Form.Item 
                        name={'cpa_conversion_rate'}
                        label={<span className={labelClass}>Rate per Conversion</span>}
                        rules={[{ required: true, message: 'Please select a payment model' }]}
                    >
                        <Input name={'cpa_conversion_rate'} placeholder="Rate per Conversion"/>
                    </Form.Item>
                </div>
            )}
        </>
    );

    const renderMilestoneFields = () => (
        <>
            {milestones.map((ms, idx) => (
                <Space key={idx} style={{ display: 'flex', marginBottom: 8 }}>
                    <Form.Item 
                        name={'miletone_name'}
                        // label={<span className={labelClass}>Performance Model</span>}
                        rules={[{ required: true, message: 'Please select a payment model' }]}
                    >
                        <Select
                            placeholder="Milestone"
                            value={ms.name}
                            onChange={(val) => handleMilestoneChange(idx, 'name', val)}
                        >
                            {milestoneOptions.map(opt => (
                                <Option key={opt} value={opt}>{opt}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item 
                        name={'milestone_amount'}
                        // label={<span className={labelClass}>Performance Model</span>}
                        rules={[{ required: true, message: 'Please select a payment model' }]}
                    >
                        <Input
                            placeholder="Amount"
                            value={ms.amount}
                            onChange={(e) => handleMilestoneChange(idx, 'amount', e.target.value)}
                        />
                    </Form.Item>   
                </Space>
            ))}
            <Button onClick={addMilestone}>Add Milestone</Button>
        </>
    );

    const renderFixedFields = () => (
        <>
            {deliverables.map((d, idx) => (
                <Space key={idx} style={{ display: 'flex', marginBottom: 8 }}>
                    <Form.Item 
                        name={'deliverable_name'}
                        // label={<span className={labelClass}>Performance Model</span>}
                        rules={[{ required: true, message: 'Please select a payment model' }]}
                    >
                        <Input
                            placeholder="Deliverable Name"
                            value={d.name}
                            onChange={(e) => handleDeliverableChange(idx, 'name', e.target.value)}
                        />
                    </Form.Item>
                    <Form.Item 
                        name={'deliverable_amount'}
                        // label={<span className={labelClass}>Performance Model</span>}
                        rules={[{ required: true, message: 'Please select a payment model' }]}
                    >
                        <Input
                            placeholder="Rate"
                            value={d.amount}
                            onChange={(e) => handleDeliverableChange(idx, 'amount', e.target.value)}
                        />
                    </Form.Item> 
                </Space>
            ))}
            <Button onClick={addDeliverable}>Add Deliverable</Button>
        </>
    );

    const renderConditionalFields = () => {
        if (selectedPaymentModel === 'Performance Based') return renderPerformanceFields();
        if (selectedPaymentModel === 'Milestone Based') return renderMilestoneFields();
        if (selectedPaymentModel === 'Fixed') return renderFixedFields();
        return null;
    };


    return (
        <div className="flex flex-col min-h-full gap-4">
            <div className="bg-white border p-6 rounded-lg shadow">
                <div className={headingClass}>Campaign Budget & Payment Model</div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Form.Item name="campaign_budget" label={<span className={labelClass}>Total campaign budget (optional)</span>} rules={[{ type: "number", min: 0, message: "Budget must be zero or greater." }]}>
                        <InputNumber min={0} precision={2} placeholder="e.g. 250000" style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item name="budget_currency" label={<span className={labelClass}>Budget currency</span>} initialValue="USD">
                        <Select options={["USD", "PKR", "GBP", "EUR", "AED", "SAR", "INR", "CAD", "AUD"].map(value => ({ label: value, value }))} />
                    </Form.Item>
                </div>
                <p className="mb-3 text-xs text-gray-500">Budget fit uses public creator rate cards in the same currency. It is an estimate, not a negotiated quote or currency conversion.</p>
                {renderSelectWithDetail('campaign_payment_model', 'Payment Model', paymentMethodOptions, () => setPerformanceModel(null))}
                {renderConditionalFields()}
            </div>
            {/* <div className="flex gap-4">
                <ButtonPrimary onClick={handleCreateCampaign} text="Create Campaign" loading={false} />
                <ButtonSecondary onClick={handleDraft} text="Save as Draft" loading={false} />
                <Button onClick={() => setCurrentStep(0)}>Go Previous Step</Button>
            </div> */}
        </div>
    );
};

export default PaymentInformationStep;