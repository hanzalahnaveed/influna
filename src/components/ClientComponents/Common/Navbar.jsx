"use client";
import { RxAvatar } from "react-icons/rx";
import React, { useEffect, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { MdOutlineSpaceDashboard } from "react-icons/md";
import { MdOutlineCampaign } from "react-icons/md";
import { FiLogIn } from "react-icons/fi";
import { IoMdNotificationsOutline } from "react-icons/io";
import ButtonPrimary from "@/components/ReusableComponents/CustomButton/ButtonPrimary";
import LoginModal from "./LoginModal";
import { Button } from "antd";

const defaultMenu = [
    {
        id: 1,
        sidebar_name: "About Us",
        route: "",
        icon: MdOutlineSpaceDashboard,
    },
    {
        id: 2,
        sidebar_name: "Pricing",
        route: "",
        icon: MdOutlineCampaign,
    },
    {
        id: 3,
        sidebar_name: "Plans",
        route: "",
        icon: MdOutlineCampaign,
    },
    {
        id: 4,
        sidebar_name: "FAQ's",
        route: "",
        icon: MdOutlineCampaign,
    },
];

const Navbar = () => {

    const pathname = usePathname();
    const isDashboardRoute = pathname.startsWith("/dashboard");
    const router = useRouter();
    const [menuItems, setMenuItems] = useState([]);
    const [loginModalOpen, setLoginModalOpen] = useState();

    const getSidebarMenu = () => {
        setMenuItems(defaultMenu);
    };

    useEffect(() => {
        getSidebarMenu();
    }, []);

    const handleLogin = () => {
        console.log('handle login button pressed-----')
    }

    const renderLinkSideBar = (link, Icon, name) => {
        const isActive = pathname.startsWith(link);
        return (
            <div className="hover:text-[#353839]">
                <Link href={link}>
                        <div className={``}>
                            {name}
                        </div>
                </Link>
            </div>
        );
    };

    return (
        <>
            {
                !isDashboardRoute &&
                <div className="absolute h-[10vh] px-10 w-[85%] flex justify-between items-center border-none rounded-3xl shadow my-[15px] bg-white/50">
                    <div
                        className="text-[30px] text-white cursor-pointer z-50"
                        onClick={() => router.push("/")}
                        >
                        influna
                    </div>
                    <div className="flex justify-center items-center gap-[50px]">
                        <div className="font-light flex justify-center items-center  text-[white] text-[18px] gap-[30px]">
                            {menuItems?.map((menu) => (
                                <React.Fragment key={menu?.id}>
                                    {renderLinkSideBar(menu?.route, menu?.icon, menu?.sidebar_name)}
                                </React.Fragment>
                            ))}
                        </div>
                        <button
                            onClick={() => router.push("/dashboard")}
                            className="montserrat-light cursor-pointer flex h-[40px] items-center justify-center gap-1 rounded-2xl border-2 border-[#353839] px-3 text-center text-[#353839] transition-colors hover:bg-[#353839] hover:text-white"
                        >
                            <FiLogIn size={18} />
                            <span>Login</span>
                        </button>
                    </div>
                </div>
            }
            <LoginModal
                loginModalOpen={loginModalOpen}
                handleLoginModalCancel={()=>{setLoginModalOpen(false)}}
                handleLogin={handleLogin}
            />
        </>
    );
};

export default Navbar;