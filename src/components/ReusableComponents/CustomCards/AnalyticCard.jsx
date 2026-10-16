'use client'
import React from "react"

const AnalyticCard = (props) => {

    const { icon, title, value, text, gradient } = props;

    return(
        <article className="flex min-h-[148px] w-full flex-col rounded-xl border border-[#E3E7ED] bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[#596273]">{title}</p>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${gradient}`}>
                    {icon}
                </span>
            </div>
            <p className="mt-4 text-3xl font-bold leading-none tracking-tight text-[#212529]">
                {value}
            </p>
            <div className="mt-2 text-sm text-[#737B89]">
                {text}
            </div>
        </article>
    )
}

export default AnalyticCard;