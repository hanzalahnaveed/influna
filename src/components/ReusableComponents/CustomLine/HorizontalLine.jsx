'use client';
import React from 'react';

const HorizontalLine = ({ color, size }) => {
    return (
        <hr
            style={{
                height: `${size}px`,
                backgroundColor: '#BFBFBF',
                border: 'none',
                margin: 0,
                width: '100%',
            }}
        />
    );
};

export default HorizontalLine;

