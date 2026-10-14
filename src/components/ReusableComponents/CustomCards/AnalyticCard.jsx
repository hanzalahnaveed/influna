'use client'
import React from "react"

const AnalyticCard = (props) => {

    const { icon, title, value, text, gradient } = props;

    return(
        <>
            <div className={`flex flex-col p-4 min-h-[120px] w-full ${gradient} border-none rounded-xl`}>
                <div className="flex items-center gap-[10px]">
                    {icon}
                    <p className="roboto-black text-[18px] text-[white]">
                        {title}
                    </p>
                </div>
                <div className="roboto-black flex items-center gap-[10px] text-[30px] text-[white]">
                    {value}
                </div>
                <div className="flex items-center gap-[10px] text-[12px] text-[white]">
                    {text}
                </div>
            </div>
        </>
    )
}

export default AnalyticCard;