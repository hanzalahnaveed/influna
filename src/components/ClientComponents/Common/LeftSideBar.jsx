"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { MdOutlineSpaceDashboard, MdOutlineCampaign } from "react-icons/md";
import { IoSettingsOutline } from "react-icons/io5";
import { IoIosLogOut } from "react-icons/io";
import { FiUsers } from "react-icons/fi";

const defaultMenu = [
    { id: 1, sidebar_name: "Dashboard", route: "/dashboard", icon: MdOutlineSpaceDashboard },
    { id: 2, sidebar_name: "Campaign", route: "/dashboard/campaign", icon: MdOutlineCampaign },
    { id: 3, sidebar_name: "Creators", route: "/dashboard/creators", icon: FiUsers },
];

const LeftSidebar = () => {
    const pathname = usePathname();
    const router = useRouter();
    const [menuItems, setMenuItems] = useState(defaultMenu);

    useEffect(() => {
        setMenuItems(defaultMenu);
    }, []);

    const renderLinkSideBar = (link, Icon, name) => {
        const isActive = link === "/dashboard"
            ? pathname === link
            : pathname === link || pathname.startsWith(`${link}/`);

        return (
            <Link href={link} key={link}>
                <div className={`roboto-regular mx-5 flex h-[40px] items-center justify-start gap-3 rounded-xl border-none px-5 text-[14px] text-white transition-colors ${isActive ? "bg-[#FA8500]" : "hover:bg-[#FA8500]"}`}>
                    {Icon && <Icon size={20} />}
                    <span>{name}</span>
                </div>
            </Link>
        );
    };

    return (
        <div className="flex h-full w-[300px] shrink-0 flex-col justify-between border-none bg-[#233044] py-[10px]">
            <div className="flex flex-col gap-[10px]">
                <div
                    className="z-50 cursor-pointer text-center text-[40px] text-white"
                    onClick={() => router.push("/")}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => { if (event.key === "Enter") router.push("/"); }}
                >
                    influna
                </div>
                <nav className="flex flex-col gap-1">
                    {menuItems.map((menu) => renderLinkSideBar(menu.route, menu.icon, menu.sidebar_name))}
                </nav>
            </div>
            <div className="mx-5 flex flex-col gap-3">
                <Link
                    href="/dashboard/setting"
                    className="flex h-[40px] w-full items-center gap-3 rounded-xl px-5 text-[14px] text-white transition-colors hover:bg-[#FA8500]"
                >
                    <IoSettingsOutline size={20} />
                    <span>Settings</span>
                </Link>
                <Link
                    href="/dashboard/logout"
                    className="flex h-[40px] w-full items-center gap-3 rounded-xl px-5 text-[14px] text-white transition-colors hover:bg-[#FA8500]"
                >
                    <IoIosLogOut size={20} />
                    <span>Logout</span>
                </Link>
            </div>
        </div>
    );
};

export default LeftSidebar;
