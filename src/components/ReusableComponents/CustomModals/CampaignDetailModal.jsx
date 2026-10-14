'use client'
import React, { useState } from 'react';
import { Button, Modal } from 'antd';

const CampaignDetailModal = (props) => {

    const { 
        data,
        isCampaignDetailModalOpen,
        handleCampaignDetailModalSubmit,
        handleCampaignDetailModalCancel
    } = props;

    const titleClass   = 'font-bold text-[26px] font-stretch-normal  tracking-wide'
    const headingClass = 'font-semibold text-[18px] font-stretch-normal  tracking-wide'
    const labelClass   = 'font-normal text-[12px]'
    const dataClass    = 'font-light text-[12px]'
    const textClass    = 'font-light text-[10px] text-[#979797]'

    const renderKPI = (name, data) => (
        <div className={`flex flex-col`}>
            <div className={`${textClass}`}>{name}</div>
            <div className={`${dataClass}`}>{data}</div>
        </div>
    )

    return(
        <>
            <Modal
                title={<span className={`${titleClass}`}>{data?.title}</span>}
                closable={{ 'aria-label': 'Custom Close Button' }}
                open={isCampaignDetailModalOpen}
                onOk={handleCampaignDetailModalSubmit}
                onCancel={handleCampaignDetailModalCancel}
            >
                <div key={data?.id} className={`flex flex-col h-fit bg-white gap-4`}>
                    <div className={`flex flex-col gap-2`}>
                        <div className={`${headingClass}`}>
                            Campaign Overview
                        </div>
                        <div className={`${dataClass}`}>
                            {data?.description}
                        </div>
                        <div className={`grid grid-cols-3`}>
                            {renderKPI('Start date',data?.start_date)}
                            {renderKPI('End Date',data?.end_date)}
                            {renderKPI('Performance Targets',data?.performance_targets)}
                            {renderKPI('Age group',data?.age_group)}
                            {renderKPI('Region',data?.region)}
                            {renderKPI('Language',data?.language)}
                        </div>
                    </div>
                    <div className={`flex flex-col gap-0.5`}>
                        <div className={`${headingClass}`}>
                            Content Guidelines
                        </div>
                        <div className={`${dataClass}`}>
                            {data?.guidlines}
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    )
}

export default CampaignDetailModal;




// const [selectedCampaign, setSelectedCampaign] = useState(null);
// const [isCampaignDetailModalOpen, setIsCampaignDetailModalOpen] = useState(false);

// const showCampaignDetailModal = (campaign) => {
//     setSelectedCampaign(campaign);
//     setIsCampaignDetailModalOpen(true);
// };
// const handleCampaignDetailModalSubmit = () => {
//     setIsCampaignDetailModalOpen(false);
// };
// const handleCampaignDetailModalCancel = () => {
//     setIsCampaignDetailModalOpen(false);
// };

// <CampaignDetailModal
//     data={selectedCampaign}
//     isCampaignDetailModalOpen={isCampaignDetailModalOpen}
//     handleCampaignDetailModalSubmit={handleCampaignDetailModalSubmit}
//     handleCampaignDetailModalCancel={handleCampaignDetailModalCancel}
// />