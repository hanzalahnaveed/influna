'use client'
import React, { useEffect, useState } from "react"
import { useParams } from "next/navigation";
import { CAMPAIGN_ENDPOINTS } from "@/axios/Endpoints";
import dayjs from 'dayjs';

const DetailView = (props) => {

    const {data, loading} = props; 
    const titleClass   = 'font-bold text-[26px] tracking-wide'
    const headingClass = 'font-bold text-[20px] tracking-wide mb-4'
    const dataClass    = 'font-light text-[14px]'
    const textClass    = 'font-light text-[12px] text-[#979797]'

    const renderKPI = (name, data, isDate) => (
        <div className="flex flex-col mb-4">
            <div className={`${textClass}`}>{name}</div>
            {isDate ? (
                <div className={`${dataClass}`}>
                    {data ? dayjs(data).format('DD/MM/YYYY') : '-'}
                </div>
            ) : (
                <div className={`${dataClass}`}>{data ?? '-'}</div>
            )}
        </div>
    );

    return (
        <>
            {
                loading ? 
                <>
                    Loading...
                </>
                :
                <>
                    {/* Two-column Layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        
                        {/* LEFT COLUMN */}
                        <div>
                            <div className={headingClass}>Campaign Info</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-0">
                                {renderKPI('Objective', data?.campaign_details?.campaign_objective)}
                                {renderKPI('Start Date', data?.campaign_details?.campaign_start_date, true)}
                                {renderKPI('End Date', data?.campaign_details?.campaign_end_date, true)}
                                {renderKPI('Created At', data?.created_at, true)}
                                {renderKPI('Updated At', data?.updated_at, true)}
                            </div>

                            <div className={headingClass}>Platform Details</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-0">
                                {renderKPI('Platform', data?.platform_details?.campaign_platform)}
                                {renderKPI('Genre', data?.platform_details?.campaign_genere)}
                                {renderKPI('Language', data?.platform_details?.campaign_language)}
                            </div>

                            <div className={headingClass}>Hashtags</div>
                            <div className={`${dataClass} flex flex-wrap gap-2`}>
                                {data?.hashtags?.map((tag, index) => (
                                    <span key={index} className="bg-gray-200 px-2 py-1 rounded text-sm">{tag}</span>
                                ))}
                            </div>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div>
                            <div className={headingClass}>Targeting Criteria</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-0">
                                {renderKPI('Location', data?.targeting_criteria?.campaign_location)}
                                {renderKPI('Age Range', data?.targeting_criteria?.campaign_age_range)}
                                {renderKPI('Gender', data?.targeting_criteria?.campaign_gender)}
                                {renderKPI('Interest', data?.targeting_criteria?.campaign_interest)}
                            </div>

                            <div className={headingClass}>Payment Information</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-0">
                                {renderKPI('Payment Model', data?.payment_information?.campaign_payment_model)}
                                {renderKPI('CPM Views', data?.payment_information?.cpm_views)}
                                {renderKPI('CPM Amount', `$${data?.payment_information?.cpm_amount}`)}
                            </div>

                            <div className={headingClass}>Keywords</div>
                            <div className={`${dataClass} flex flex-wrap gap-2`}>
                                {data?.keywords?.map((kw, index) => (
                                    <span key={index} className="bg-gray-100 px-2 py-1 rounded text-sm">{kw}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            }
        </>
    );
}

export default DetailView;
