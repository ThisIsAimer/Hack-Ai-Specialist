'use client'
 
 import BgGradient from "@/components/common/bg-gradient";
 import { FormEvent, useEffect, useRef, useState } from "react";
 
 type Message = {
     id: number, 
     sender: "user" | "bot",
     text: string,
 }
 const DoctorAi = () => {
 
     const [messages, setMessages] = useState<Message[]>([]);
     const [input, setInput] = useState("");
     const [loading, setLoading] = useState(false);
     const messagesEndRef = useRef<HTMLDivElement>(null) // ref to bottom of chat msg(will automatically scroll to latest msg)
 
     const scrollToBottom = () => {
         messagesEndRef?.current?.scrollIntoView({ behavior: "smooth" });
     };
 
     useEffect(() => {
         scrollToBottom();
     },[messages])
 
     const handleSubmit = async (e: FormEvent) => {
         e.preventDefault();
         if (!input.trim()) return;
 
         const userMessage: Message = {
             id: Date.now(),
             sender: "user",
             text: input.trim(),
         };
 
         setMessages((prev) => [...prev, userMessage]);
         setInput("");
         setLoading(false);
 
         try {
             const response = await fetch("/api/chat", {
                 method: "POST",
                 headers: {
                     "Content-Type": "application/json",
                 },
                 body: JSON.stringify({ message: userMessage.text }),
             });
             const data = await response.json();
 
             if (response.ok) {
                 const botMessage: Message = {
                     id: Date.now() + 1,
                     sender: "bot",
                     text: data.response,
                 };
                 setMessages((prev) => [...prev, botMessage]);
             } else {
                 const errorMessage: Message = {
                     id:Date.now() + 1,
                     sender: "bot",
                     text: data.error || "Something went wrong!",
                 }
 
                 setMessages((prev) => [...prev, errorMessage])
             }
         } catch (err) {
             console.error("Error fetching chat:", err);
             const errorMessage: Message = {
                 id:Date.now() + 1,
                 sender: "bot",
                 text:  "An unexpected error occurred!",
             }
             setMessages((prev) => [...prev, errorMessage]);
         } finally {
             setLoading(false);
         }
     }
     return (
 
         <section>
 
             <div className="flex flex-col relative">
 
                 <BgGradient className=" inset-0 opacity-60 blur-2xl z-0" />
 
                 <header className="relative z-10 ">
                     <h1 className=" text-center font-semibold md:text-5xl sm:text-4xl text-3xl mb-2">Chat with Doctor AI</h1>
                 </header>
 
                 {/* chat box */}
                 <div className="overflow-y-auto h-[500px] custom-scrollbar z-10">
                     {messages.map((msg) => (
                         <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} px-4 py-2`}>
                             <div  className={`max-w-xs md:max-w-md px-4 py-2 rounded-2xl shadow-sm text-sm whitespace-pre-wrap transition-all duration-300 ease-in-out 
                             ${msg.sender === "user"
                                 ? "bg-indigo-500 text-white rounded-md"
                                 : "bg-gray-100/40 rounded-md text-gray-800"}
                             `}>
                                 {msg.text}
                             </div>
                         </div>
                     ))}
 
                     {loading && (
                     <div className="flex justify-center items-center py-4">
                         <div className="flex space-x-2">
                         <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                         <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                         <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></span>
                         </div>
                     </div>
                     )}
 
                     <div ref={messagesEndRef} />
 
                 </div>
 
                 {/* input form */}
 
                 <form onSubmit={handleSubmit} className="flex mx-4 gap-4 items-center my-4 relative z-10">
                     <input type="text"
                         value={input}
                         onChange={(e) => setInput(e.target.value)}
                         placeholder="Type your message..."
                         className="w-full flex-1 px-4 py-3 border border-indigo-300 bg-indigo-300/10 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all duration-200"
                         disabled={loading}
                     />
 
                     <button
                         type="submit"
                         disabled={loading}
                         className="p-3 w-12 h-12 flex justify-center pl-3 items-center rounded-full bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                     >
                         <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4l16 8-16 8v-6l10-2-10-2V4z" />
                         </svg>
                     </button>
                 </form>
 
             </div>
 
         </section>
     );
 };
 export default DoctorAi;