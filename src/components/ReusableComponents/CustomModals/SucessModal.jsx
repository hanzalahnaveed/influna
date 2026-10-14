'use client'
import React from 'react';
import { IoCloudDoneOutline } from "react-icons/io5";
import ButtonPrimary from '../CustomButton/ButtonPrimary';
import { Modal } from 'antd';

const SuccessModal = ({ text, isOpen, onClose, loading }) => {

    const titleClass   = 'font-bold text-[26px] font-stretch-normal  tracking-wide'
    const headingClass = 'font-semibold text-[18px] font-stretch-normal  tracking-wide'
    const labelClass   = 'font-normal text-[12px]'
    const dataClass    = 'font-light text-[14px]'
    const textClass    = 'font-normal text-[16px] text-[#6C757D]'

// 979797
    return (
        <Modal
                // title={<span className={titleClass}>Edit Campaign Details</span>}
                open={isOpen}
                loading={loading}
                closable={false}
                centered={true}
                onCancel={onClose}
                footer={null}
                keyboard={true}
            >
                <div className="flex flex-col justify-center items-center">
                    <div className=''><IoCloudDoneOutline size={120} color='#a7c957'/></div>
                    <div className={`${textClass}`}>{text}</div>
                    <div className={`flex gap-[10px] mt-3`}>
                        <ButtonPrimary
                            onClick = {onClose}
                            text = {`Show Campaign`}
                            // width = {``}
                            // height = {``}
                            loading = {loading}
                        />
                    </div>
                </div>
            </Modal>
    );
}   

export default SuccessModal;