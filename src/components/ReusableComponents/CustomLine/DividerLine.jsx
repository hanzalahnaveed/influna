'use client';
import React from 'react';
import { Divider } from 'antd';

const DividerLine = ({ text, color = 'red', size = 2 }) => {
    return (
        <Divider
        style={{
            border: `${size}px solid ${color}`,
            margin: '12px 0',
            padding: 0,
            color:'#7cb305',
            height: 50,
            textAlign: 'left',
            justifyContent: 'left'
        }}
        >
            Hello
        </Divider>
    );
};

export default DividerLine;