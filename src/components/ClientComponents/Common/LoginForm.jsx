'use client'

import React from 'react';
import {Checkbox, Form, Input, Button} from 'antd';
import {FaRegUser} from "react-icons/fa";
import {GoLock} from "react-icons/go";

const LoginForm = (props) => {
    const {
        form,
        setLoginModalOpen,
        onFinishLogin,
        onFinishForget,
        setLoginErrorMessage,
        loading
    } = props;
    return (
        <Form
            form={form}
            name="login"
            className={"w-full flex flex-col"}
            initialValues={{
                remember: true,
            }}
            onFinish={onFinishLogin}
            autoComplete={"off"}
            onChange={()=>{
                setLoginErrorMessage("")
            }}
        >
            <Form.Item
                name="email"
                rules={[
                    {
                        type: 'email',
                        message: 'Email is not valid email!',
                    },
                    {
                        required: true,
                        message: 'Please input your email!',
                    },
                ]}
            >
                <Input
                    prefix={<FaRegUser size={16} color={"#BBBABF"} className={"me-2"}/>}
                    placeholder="Email Address"
                    shape="round"
                    size="large"
                />
            </Form.Item>
            <Form.Item
                name="password"
                rules={[
                    {
                        required: true,
                        message: 'Please input your Password!',
                    },
                ]}
                className={`text-[12px] lg:text-[16px]`}
            >
                <Input.Password
                    prefix={<GoLock size={18} color={"#BBBABF"} className={"me-2"}/>}
                    type="password"
                    placeholder="Password"
                    shape="round"
                    size="large"
                />
            </Form.Item>
            <Button
                type="text" // Removes AntD's default bg styles
                htmlType="submit"
                loading={loading}
                shape="round"
                size="large"
                className=" !bg-[#f6a542] !text-white hover:!text-[#f6a542] hover:!bg-white border-none !hover:border hover:!border-[#f6a542]"
            >
                Continue
            </Button>
        </Form>
    );
};

export default LoginForm;