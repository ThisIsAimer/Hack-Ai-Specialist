'use client'
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { LoginLink, LogoutLink, RegisterLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { Avatar, AvatarFallback, AvatarImage, } from "@/components/ui/avatar"
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";

export default  function Navbar() {

    const {getUser} = useKindeBrowserClient();
    const user = getUser();


    return (
        <nav className="mb-2 mt-4 flex items-center justify-between">
            <div className="flex items-center gap-10">
                <Link href="/" className="text-2xl font-bold">
                    <span>
                       <button className="border-5 border-indigo-600 px-1.25 pb-0.5 rounded-full hover:cursor-pointer">
                            AI
                        </button>
                    </span>
                    <span className="text-indigo-600">Specialist</span>
                </Link>
            </div>
            <div className="flex flex-row justify-between gap-6">

            <div className="hidden sm:flex items-center gap-6 text-sm">
                    <Link href="/" className=" transition-colors text-sm duration-200 text-gray-400 hover:text-indigo-500/80">
                        Home
                    </Link>

                    <Link href="/dashboard" className="transition-colors text-sm duration-200 text-gray-400 hover:text-indigo-500/80">
                        Dashboard
                    </Link>

            </div>
                {user ? 
                (<div className="flex items-center gap-6">
                    <Avatar>
                        <AvatarImage src={user.picture?.toString()} alt={user.given_name?.toString()} />
                        <AvatarFallback>{user.given_name}</AvatarFallback>
                    </Avatar>
                    <LogoutLink className={buttonVariants({variant:"secondary"})} >logout</LogoutLink>
                </div>):
                (<div className="transition-colors text-sm duration-200 text-gray-400 hover:text-indigo-500/80 flex items-center gap-4">
                    <LoginLink className={buttonVariants()}>Login</LoginLink>
                    <RegisterLink className={buttonVariants({variant:"secondary"})}>Sign up</RegisterLink>
                </div>)}
            </div>
        </nav>
    );
}
//<button className="px-4 py-1 bg-gray-400 rounded-2xl hover:bg-gray-500 cursor-pointer">Sign up</button>