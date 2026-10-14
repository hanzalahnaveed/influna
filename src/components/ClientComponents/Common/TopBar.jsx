"use client";
import { RxAvatar } from "react-icons/rx";
import React, { useEffect, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { MdOutlineSpaceDashboard } from "react-icons/md";
import { MdOutlineCampaign } from "react-icons/md";
import { IoMdNotificationsOutline } from "react-icons/io";

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
    {
        id: 3,
        sidebar_name: "Payments",
        route: "/dashboard/campaign",
        icon: MdOutlineCampaign,
    },
    {
        id: 4,
        sidebar_name: "Analytics",
        route: "/dashboard/campaign",
        icon: MdOutlineCampaign,
    },
];

const TopBar = () => {

    const pathname = usePathname();
    const isDashboardRoute = pathname.startsWith("/dashboard");
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
                    <div className={``}>
                        {name}
                    </div>
            </Link>
        );
    };

    return (
        <>
            {
                isDashboardRoute &&
                <div className="flex h-[8vh] px-10 w-full justify-end bg-[#233044] border-none shadow items-center">
                    {/* <div className={`montserrat-light flex text-[white] text-[15px] gap-[30px]`}>
                        {menuItems?.map((menu) => (
                            <React.Fragment key={menu?.id}>
                                {renderLinkSideBar(menu?.route, menu?.icon, menu?.sidebar_name)}
                            </React.Fragment>
                        ))}
                    </div> */}
                    <div className="flex gap-[15px]">
                        <IoMdNotificationsOutline 
                            size={30}
                            color="white"
                        />
                        <RxAvatar 
                            size={30}
                            color="white"
                        />
                    </div>
                </div>
            }
        </>
    );
};

export default TopBar;