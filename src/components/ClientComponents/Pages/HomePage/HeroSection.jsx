"use client";
import React from "react";

const HeroSection = () => {
    return (
        <div className="flex flex-col h-screen items-center justify-center bg-gradient-to-br from-[#ff0f7b] to-[#f89b29]">
            <div className={`flex flex-col text-center font-semibold text-[#e5e5e5] text-[60px] leading-16 py-[40px]`}>
                <span>Influencer Marketing</span>
                <span>Without the Chaos</span>
            </div>
            <div className={`max-w-[45%] text-[24px] text-center text-[#ffffff]`}>
                From idea to results in minutes: Influna's AI helps you plan strategies, match with the right creators and operate campaigns effortlessly.
            </div>
        </div>
    );
};

export default HeroSection;

