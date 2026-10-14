'use client';
import React from 'react';
import { Button } from 'antd';

const ButtonSecondary = ({ onClick, text, width, height, loading }) => {
    return (
        <Button
        onClick={onClick}
        loading={loading}
        type="text" // Removes AntD's default bg styles
        style={{
            width,
            height,
        }}
        className="rounded-md px-10 py-1 !bg-[#F8F9FA] !text-[#1E293A] hover:!bg-[#495057] hover:!text-[white] border hover:!border-none !border-[#979797] shadow"
        >
        {text}
        </Button>
    );
};

export default ButtonSecondary;
