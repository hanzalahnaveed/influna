'use client'
import React from "react"
import { FaRegDotCircle } from "react-icons/fa";
import { RiCheckboxBlankCircleFill } from "react-icons/ri";
import { LuCircleDotDashed } from "react-icons/lu";
import { FaCheck } from "react-icons/fa6";
import { IoMdClose } from "react-icons/io";

const CampaignStatus = (props) => {

    const {data} = props;

    return(
        <div className={`flex justify-center items-center text-[12px] text-[black] px-3 py-1 border-none rounded-4xl gap-[4px] bg-[#F6F7F8]`}>
            {data === 'Active' && <RiCheckboxBlankCircleFill size={10} color="#4CBB17"/>}
            {data === 'Draft' && <LuCircleDotDashed size={15} color="#0096FF"/>}
            {data === 'Completed' && <FaCheck size={15} color="#4CBB17"/>}
            {data === 'Cancelled' && <IoMdClose size={15} color="#FF0000"/>}
            {data}
        </div>
    )
}

export default CampaignStatus;