import BgGradient from "@/components/common/bg-gradient";
import DashboardSelect from "@/components/general/dashboardSelect";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";


export default async function Dashboardroute() {
    const {getUser} = getKindeServerSession();
    const user = await getUser();
    return (
        <>
            <BgGradient/>
            <div className="text-4xl text-center font-bold mx-10 mt-10">
                Hi {user?.given_name}! <span className="text-indigo-600">Choose Your AI Specialist.</span>
            </div>
            <div className="mt-10">
                <DashboardSelect data={data} />
            </div>
        </>
    );
}

// some dummy deta
const data = [{
        id: "DoctorAI",
        name: "Doctor AI",
        description: "AI-powered medical assistant for instant report insights.",
        image: "/images/doctor.JPG",
    },
    {
        id: "LawyerAI",
        name: "Lawyer AI",
        description: "Get instant legal help backed by Indian law data.",
        image: "/images/lawyer.JPG",
    },
    {
        id: "AccountantAI",
        name: "Accountant AI",
        description: "Smart tax advice and accounting insights on demand.",
        image: "/images/accountent.JPG",
    },
    {
        id: "WebDev",
        name: "Web Dev",
        description: "Build sleek, responsive websites with modern tech.",
        image: "/images/image.png",
    },
    {
        id: "TeacherAI",
        name: "Teacher AI",
        description: "Build sleek, responsive websites with modern tech.",
        image: "/images/image.png",
    }
]