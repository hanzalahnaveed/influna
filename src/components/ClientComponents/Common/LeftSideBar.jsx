"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { MdOutlineSpaceDashboard } from "react-icons/md";
import { MdOutlineCampaign } from "react-icons/md";
import { IoSettingsOutline } from "react-icons/io5";
import { IoIosLogOut } from "react-icons/io";

const defaultMenu = [
    {
        id: 1,
        sidebar_name: "Dashboard",
        route: "/dashboard",
        icon: MdOutlineSpaceDashboard,
    },
    {
        id: 2,
        sidebar_name: "Campaign",
        route: "/dashboard/campaign",
        icon: MdOutlineCampaign,
    },
    // {
    //     id: 3,
    //     sidebar_name: "Settings",
    //     route: "/dashboard/settings",
    //     icon: IoSettingsOutline,
    // },
    // {
    //     id: 4,
    //     sidebar_name: "Logout",
    //     route: "/logout",
    //     icon: IoIosLogOut,
    // },
];

const LeftSidebar = () => {
    const pathname = usePathname();
    const router = useRouter();
    const [menuItems, setMenuItems] = useState([]);

    const getSidebarMenu = () => {
        setMenuItems(defaultMenu);
    };

    useEffect(() => {
        getSidebarMenu();
    }, []);

    const renderLinkSideBar = (link, Icon, name) => {
        const isActive = pathname.startsWith(link);
        return (
            <Link href={link}>
                <div className={`roboto-regular flex h-[40px] px-10 gap-3 justify-start items-center text-[white] hover:bg-[#1E293A] text-[14px]`}>
                    {
                        Icon && 
                        <>
                            {
                                <Icon size={20} />
                            }
                        </>
                    }
                    <div className={``}>
                        {name}
                    </div>
                </div>
            </Link>
        );
    };

    return (
        <div className="w-[300px] flex flex-col no-scrollbar bg-[#233044] border-none justify-between py-[10px]">
            <div className={`flex flex-col gap-[10px]`}>
                <div
                    className="text-[40px] text-white cursor-pointer z-50 text-center"
                    onClick={() => router.push("/")}
                    >
                    influna
                </div>
                <div className={``}>
                    {menuItems?.map((menu) => (
                        <React.Fragment key={menu?.id}>
                            {renderLinkSideBar(menu?.route, menu?.icon, menu?.sidebar_name)}
                        </React.Fragment>
                    ))}
                </div>
            </div>
            <div className={``}>
                <Link href={'/dashboard/setting'}>
                    <div className={`flex h-[40px] px-10 gap-3 justify-start items-center text-[white] hover:bg-[#1E293A] text-[14px]`}>
                        <IoSettingsOutline size={20}/>
                        <div className={``}>
                            Settings
                        </div>
                    </div>
                </Link>
                <Link href={'dashboard/logout'}>
                    <div className={`flex h-[40px] px-10 gap-3 justify-start items-center text-[white] hover:bg-[#1E293A] text-[14px]`}>
                        <IoIosLogOut size={20}/>
                        <div className={``}>
                            Logout
                        </div>
                    </div>
                </Link>
            </div>
        </div>
    );
};

export default LeftSidebar;
