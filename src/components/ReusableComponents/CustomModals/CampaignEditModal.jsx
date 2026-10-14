'use client';
import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, DatePicker } from 'antd';
import ButtonPrimary from '../CustomButton/ButtonPrimary';
import ButtonSecondary from '../CustomButton/ButtonSecondary';
import dayjs from 'dayjs';

const { TextArea } = Input;

const CampaignEditModal = (props) => {
    const {
        data,
        form,
        loading,
        isCampaignEditModalOpen,
        handleCampaignEditModalSubmit,
        handleCampaignEditModalCancel
    } = props;

    const titleClass = 'font-bold text-[26px] font-stretch-normal tracking-wide';
    const labelClass = 'font-normal text-[12px]';
    const textClass = 'font-light text-[10px] text-[#979797]';

    useEffect(() => {
        if (data) {
            form.setFieldsValue({
                campaign_title: data?.campaign_details?.campaign_title || '',
                campaign_budget: data?.campaign_details?.campaign_budget || '',
                start_date: data?.campaign_details?.campaign_start_date
                    ? dayjs(data?.campaign_details?.campaign_start_date)
                    : null,
                end_date: data?.campaign_details?.campaign_end_date
                    ? dayjs(data?.campaign_details?.campaign_end_date)
                    : null,
            });
        }
    }, [data, form]);

    const onSubmit = (values) => {
        handleCampaignEditModalSubmit(values);
    };

    const renderFormItem = (name, label, isTextArea) => (
        <Form.Item
            label={<span className={labelClass}>{label}</span>}
            name={name}
            key={name}
            labelCol={{ style: { marginBottom: 0, fontSize: 12, padding: 0 } }}
            style={{ marginBottom: 0, width: '100%' }}
            className={isTextArea ? 'col-span-3' : ''}
        >
            {
                !isTextArea ? (
                    <Input
                        placeholder={`Enter ${label}`}
                        size="medium"
                        style={{ width: '100%' }}
                    />
                ) : (
                    <TextArea
                        placeholder={`Enter ${label}`}
                        size="medium"
                        style={{ width: '100%' }}
                        rows={3}
                    />
                )
            }
        </Form.Item>
    );

    const renderFormDateItem = (name, label) => (
        <Form.Item
            label={<span className={labelClass}>{label}</span>}
            name={name}
            key={name}
            labelCol={{ style: { marginBottom: 0, fontSize: 12, padding: 0 } }}
            style={{ marginBottom: 0, width: '100%' }}
            className="col-span-3"
        >
            <DatePicker
                placeholder={`Select ${label}`}
                size="medium"
                style={{ width: '100%' }}
            />
        </Form.Item>
    );

    return (
        <Modal
            title={<span className={titleClass}>Edit Campaign Details</span>}
            open={isCampaignEditModalOpen}
            loading={loading}
            closable={true}
            onCancel={handleCampaignEditModalCancel}
            footer={null}
            keyboard={true}
        >
            <div key={data?.id} className="flex flex-col h-fit gap-4">
                <Form
                    layout="vertical"
                    form={form}
                    onFinish={onSubmit}
                    className="col-span-7 h-full flex flex-col justify-between gap-[20px]"
                    initialValues={{
                        campaign_title: data?.title || '',
                        campaign_budget: data?.budget || '',
                        start_date: data?.start_date ? dayjs(data.start_date) : null,
                        end_date: data?.end_date ? dayjs(data.end_date) : null,
                    }}
                >
                    <div className="flex flex-col bg-white border border-[#EEEFF2] rounded-lg p-6 gap-2 shadow">
                        {renderFormItem('campaign_title', 'Campaign Title')}
                        {renderFormItem('campaign_budget', 'Campaign Budget')}
                        {renderFormDateItem('start_date', 'Start Date')}
                        {renderFormDateItem('end_date', 'End Date')}
                    </div>
                    <div className="flex gap-[10px] items-center justify-center mt-4">
                        <ButtonPrimary
                            onClick={() => form.submit()}
                            text="Update Campaign"
                            loading={false}
                        />
                        <ButtonSecondary
                            onClick={handleCampaignEditModalCancel}
                            text="Cancel"
                            loading={false}
                        />
                    </div>
                </Form>
            </div>
        </Modal>
    );
};

export default CampaignEditModal;
