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
        id: "webdev",
        name: "web dev",
        description: "Web development is the process of creating websites and web applications that run on the internet. It involves both front-end development, which focuses on the design and user experience using technologies like HTML, CSS, and JavaScript, and back-end development, which handles the server-side logic and databases using languages such as Python, PHP, Ruby, or Node.js. Web developers work to ensure websites are functional, responsive, and user-friendly across different devices and browsers. With the growing demand for online services, web development has become a crucial skill in the tech industry, combining creativity and technical expertise to build everything from simple landing pages to complex web-based platforms",
        image: "/images/image.png",
    }
]