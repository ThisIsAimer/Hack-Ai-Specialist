import BgGradient from "@/components/common/bg-gradient";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, Brain, HandHelping, Rocket, ShieldPlus, WandSparkles } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div>

      <section className="pb-16 text-gray-800 text-center mt-10 mb-14">
      <BgGradient />
        <div className= "relative z-10 flex flex-col items-center justify-center text-center pt-32 px-4">

          <h1 className="text-6xl sm:text-7xl font-bold leading-tight mb-6">
            AI
            {' '}
              <span className="relative inline-block">
                  <span className="relative z-10 px-2">Specialist</span>
                  <span className="absolute inset-0 bg-indigo-300/40 -rotate-2 rounded-lg transform -skew-y-1"></span>
              </span>{" "}
            at your fingertips
          </h1>

          <h4 className="text-xl sm:text-3xl font-semibold mt-4 max-w-3xl text-gray-800">
            Use a wide range of AI agents with{' '}
              <span className="relative inline-block">
                  <span className="relative z-10 px-2">specialized</span>
                  <span className="absolute inset-0 bg-indigo-300/40 -rotate-2 rounded-lg transform -skew-y-1"></span>
              </span>{" "}
            training for your needs!
          </h4>
        </div>
        <div className="flex justify-center">
          <Button variant={'link'} className="text-white mt-6 text-base sm:text-lg lg:text-xl rounded-full px-8 sm:px-10 lg:px-12 py-6 sm:py-7 lg:py-8 lg:mt-16 bg-linear-to-r from-slate-800 to-indigo-600 hover:from-indigo-600 hover:to-slate-800 transition-all duration-200 hover:no-underline shadow-lg">
            <Link href="/dashboard" className="flex items-center gap-2">
                <span>
                    Try Our Agents
                </span>
                <ArrowRight/>
            </Link>
            </Button>

        </div>
      </section> 

      <section className="py-16 text-gray-800 text-center mt-10 mb-14">
      <div className="flex flex-col ml-[300px]"><BgGradient /></div>
        <div className="flex flex-col items-center relative z-10">
          <div className=" rounded-full p-2 border border-gray-200 hover:bg-gray-200/50 mb-4">
            <WandSparkles className="w-6 h-6 text-indigo-500 animate-pulse" />
          </div>
          <h2 className="text-4xl font-bold mb-6">Why We&apos;re Different</h2>
          <p className="max-w-3xl mx-auto text-lg mb-10 text-gray-600">
            We don&apos;t use just one generic AI. Our platform connects you with <span className="font-semibold text-indigo-600">specialized AI agents</span>, each trained on <span className="font-semibold text-indigo-600">domain-specific data</span> — from healthcare to education to wellness.
            Whether you&apos;re looking for medical advice, exam help, or just someone to talk to, our experts are ready to assist — all from the comfort of your home, instantly.
          </p>
      </div>
      
      <div className=" relative z-10 grid md:grid-cols-3 gap-2 max-w-4xl mx-auto text-left ">
          <div className="p-4">
            <div className="flex items-center justify-center h-24 w-24 mb-4 
             rounded-2xl bg-linear-to-br from-indigo-500/10 to-transparent group-hover:from-indigo-500/20 transition-colors">
              <div className="text-indigo-500">
                <Brain width={62} height={62} strokeWidth={1.5} />
              </div>
            </div>
            <h4 className="font-bold mb-1 text-xl">Domain Expertise</h4>
            <p className="text-sm text-gray-600">Each AI is tailored to excel in a specific field.</p>
          </div>

          <div className="p-4">
            <div className="flex items-center justify-center h-24 w-24 mb-4 
             rounded-2xl bg-linear-to-br from-indigo-500/10 to-transparent group-hover:from-indigo-500/20 transition-colors">
              <div className="text-indigo-500">
                <HandHelping width={62} height={62} strokeWidth={1.5} />
              </div>
            </div>
            <h4 className="font-bold mb-1 text-xl"> Instant Support</h4>
            <p className="text-sm text-gray-600">Get real-time support tailored to your needs.</p>
          </div>

          <div className="p-4">
            <div className="flex items-center justify-center h-24 w-24 mb-4 
             rounded-2xl bg-linear-to-br from-indigo-500/10 to-transparent group-hover:from-indigo-500/20 transition-colors">
              <div className="text-indigo-500">
                <ShieldPlus width={62} height={62} strokeWidth={1.5} />
              </div>
            </div>
            <h4 className="font-bold mb-1 text-xl"> Expert Knowledge</h4>
            <p className="text-sm text-gray-600">Our agents are trained on curated datasets by professionals.</p>
          </div>

        </div>
      </section>


      <section className="py-16 text-gray-800 text-center mt-10 mb-14">
      <BgGradient />
        <div className=" relative z-10 flex flex-col items-center mb-16">

          <div className=" rounded-full p-2 border border-gray-200 hover:bg-gray-200/50 mb-4">
            <Rocket className="w-6 h-6 text-indigo-500 animate-pulse" />
          </div>

          <h2 className="font-bold text-indigo-700 text-3xl mb-4">HOW IT WORKS</h2>
          <h3 className="font-bold mx-auto text-4xl max-w-2xl ">Simplify Life with Smart AI in Just three Steps!</h3>
        </div>

        <div className=" relative z-10 flex flex-row justify-between gap-8 mt-5">
          {info.map(items =>
            <div className="relative w-full max-w-lg hover:scale-105 hover:transition-all duration-300 px-4 sm:px-0 bg-gray-50/50 rounded-xl" key={items.title}>
              <div className={cn("relative flex flex-col h-full gap-4 lg:gap-8 z-10 p-8 border border-gray-500/20 rounded-2xl")}>
                <div className="text-2xl font-bold">
                  {items.title}
                </div>
                <div className="text-sm mt-4 font-semibold">
                  {items.discription}
                </div>
              </div>
            </div>
            )}
        </div>
      </section>
      <div className=" mt-10 text-black max-w-screen">
        <div>
          <div className="pt-10 mx-10 text-sm font-semibold  text-center">
            are you ready?!
          </div>
          <div className="text-3xl font-bold  text-center">Let&apos;s get Started!</div>
        </div>
        <div className="flex flex-row items-center gap-3 pb-10 py-10">
            <div className="text-2xl font-bold flex flex-col items-center w-1/3">
              Team RisingDevelopers
            </div>
            <div className="flex flex-col items-center w-1/3">
              <Link href="/dashboard">
                <button className="border-2 font-bold border-black rounded-4xl p-4 hover:cursor-pointer hover:text-gray-500  hover:border-gray-500">
                  Our agents
                </button>
              </Link>
            </div>
            <div className="flex flex-col items-center w-1/3">
              <Link href="/contact" className=" text-2xl font-bold ml-4">
                Contact us
              </Link>
            </div>
        </div>
      </div>
    </div>
  );
}


const info =[{
    title : "Login",
    discription: "Sign up or log in securely with Google or GitHub — it only takes a few seconds to get started."
  },
  {
    title : "Choose an AI Specialist",
    discription: "Pick from a variety of specialized AI agents trained for specific tasks — like Doctor AI, Teacher AI, or Accountant AI — each crafted to help you in their area of expertise.",
  },
  {
    title : " Share Your Problem & Get Solutions",
    discription: "Tell the agent about your situation. You can chat, upload images, or describe the issue — and get instant, tailored help in just moments.",
  }
]
