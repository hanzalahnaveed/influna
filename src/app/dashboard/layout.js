import LeftSidebar from "@/components/ClientComponents/Common/LeftSideBar";
import TopBar from "@/components/ClientComponents/Common/TopBar";

export default function Layout({ children }) {
    return (
        <div className="flex w-screen h-screen overflow-hidden bg-[#E9ECEF]">
        {/* Sidebar */}
        <LeftSidebar />

        {/* Right content area */}
        <div className="flex flex-col flex-1 h-full">
            <TopBar />
            {/* Full-width scroll wrapper */}
            <div className="flex-1 min-w-0 overflow-y-auto py-[15px]">
            {/* Centered/narrowed content */}
                <div className="custom-container">
                    {children}
                </div>
            </div>
        </div>
        </div>
    );
}
