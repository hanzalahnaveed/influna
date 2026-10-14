'use client'
import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, DatePicker } from 'antd';
import LoginForm from './LoginForm';

const LoginModal = (props) => {

    const {loginModalOpen, loading, handleLoginModalCancel, handleLogin, form} = props;

    const titleClass = 'font-bold text-[26px] font-stretch-normal tracking-wide';
    const labelClass = 'font-normal text-[12px]';
    const textClass = 'font-light text-[10px] text-[#979797]';

    return (
        <Modal
            // title={<span className={titleClass}>Login Form</span>}
            open={loginModalOpen}
            loading={loading}
            closable={false}
            onCancel={handleLoginModalCancel}
            footer={null}
            keyboard={true}
        >
            <div className={`flex flex-col items-center justify-center px-10 gap-[20px]`}>
                <div className={`flex flex-col items-center leading-8`}>
                    <div className='font-bold text-[32px] font-stretch-normal'>Login to your account</div>
                    <div className='font-normal text-[16px]'>you must be logged in to perform this action</div>
                </div>
                <LoginForm/>
            </div>
        </Modal>
    );
}

export default LoginModal;
