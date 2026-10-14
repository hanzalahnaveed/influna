import NewHome from "@/app/home/page";
import TopBar from "@/components/ClientComponents/Common/TopBar";

export default function Home() {
    return (
        <div className="flex flex-col items-center">
            {/* <TopBar/> */}
            <NewHome />
        </div>
    );
}
