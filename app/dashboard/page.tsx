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
        description: "An AI modal that has specifically been trained with medical data. It can be  provide images of  medical reports and give useful information and diagnosis. one should take to a real doctor for further diagnosis.",
        image: "/images/doctor.JPG",
    },
    {
        id: "TeacherAI",
        name: "Teacher AI",
        description: "An AI model specifically trained on educational data is ready to assist with teaching and learning. This agent can help explain complex topics, generate practice questions, offer different perspectives on subjects, and provide personalized feedback.",
        image: "/images/teacher.JPG",
    },
    {
        id: "LawyerAI",
        name: "Lawyer AI",
        description: "An AI modal that has specifically been trained with Indian law data. It has been specially trained with the data of all IPC sections and constitutional laws. It can be used to make legal reports and letters and give better information about law and regulations  as per needed.",
        image: "/images/lawyer.JPG",
    },
    {
        id: "AccountantAI",
        name: "Accountant AI",
        description: "An AI modal that has specifically been trained with accounting data. It can be used to figure out payable income tax, help in managing accounts, find accounting errors, and give suggestions on how to reduce the payable income tax.",
        image: "/images/accountent.JPG",
    },
    {
        id: "ProgrammerAI",
        name: "Programmer AI",
        description: "An AI model that has specifically been trained with programming data is ready to support your coding endeavors. This agent can help with a variety of coding tasks, from troubleshooting errors to offering alternative solutions and explaining complex concepts.",
        image: "/images/programmer.JPG",
    }
]