'use client';
import React from 'react';
import { Button } from 'antd';

const ButtonPrimary = ({ onClick, text, width, height, loading }) => {
    return (
        <Button
            onClick={onClick}
            loading={loading}
            type="text" // Removes AntD's default bg styles
            style={{
                width,
                height,
            }}
            className="rounded-md px-10 py-1 !bg-[#003566] !text-white hover:!bg-[#001d3d] border-none"
        >
            {text}
        </Button>
    );
};

export default ButtonPrimary;