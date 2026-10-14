'use client'
import React from 'react';
import ButtonPrimary from '@/components/ReusableComponents/CustomButton/ButtonPrimary';
import ButtonSecondary from '@/components/ReusableComponents/CustomButton/ButtonSecondary';
import { IoWarningOutline } from "react-icons/io5";
import { Modal } from 'antd';

const DeleteModel = ({ text, isOpen, onClose, onDelete, loading }) => {
    
    const titleClass   = 'font-bold text-[26px] font-stretch-normal  tracking-wide'
    const headingClass = 'font-semibold text-[18px] font-stretch-normal  tracking-wide'
    const labelClass   = 'font-normal text-[14px]'
    const dataClass    = 'font-light text-[14px]'
    const textClass    = 'font-normal text-[16px] text-[#979797]'

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
                    <div className=''><IoWarningOutline size={120} color='#c1121f'/></div>
                    <div className={`${textClass}`}>{text}</div>
                    <div className={`flex gap-[10px] mt-3`}>
                        <ButtonPrimary onClick={onDelete} text="Delete"/>
                        <ButtonSecondary onClick={onClose} text="Cancel" />
                    </div>
                </div>
            </Modal>
    );
}

export default DeleteModel;