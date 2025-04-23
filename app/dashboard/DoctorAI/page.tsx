'use client'

import BgGradient from "@/components/common/bg-gradient";
import { FormEvent, useEffect, useRef, useState } from "react";
import Script from 'next/script';
import Image from 'next/image';
import { toast } from "sonner";
import Link from 'next/link';

// Define Cloudinary types
interface CloudinaryUploadResult {
  event: string;
  info: {
    secure_url?: string;
    format?: string;
    [key: string]: unknown;
  };
}

interface CloudinaryWindow extends Window {
  cloudinary?: {
    createUploadWidget: (
      config: {
        cloudName: string;
        uploadPreset: string;
        sources: string[];
        multiple: boolean;
        maxFileSize: number;
        allowedFormats: string[];
      },
      callback: (error: Error | null, result?: CloudinaryUploadResult) => void
    ) => { open: () => void };
  };
}

type ContentItem =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type Message = {
  id: number;
  sender: "user" | "bot";
  content: string | ContentItem[];
}

const DoctorAi = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [attachedFile, setAttachedFile] = useState<{ url: string; type: 'image' | 'pdf' } | null>(null);
  const [loading, setLoading] = useState(false);
  const [cloudinaryLoaded, setCloudinaryLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef?.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const initializeWidget = () => {
      const cloudinary = (window as CloudinaryWindow).cloudinary;
      if (cloudinary) {
        console.log("Cloudinary script loaded successfully");
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
        console.log("Cloudinary Config:", { cloudName, uploadPreset });

        if (!cloudName || !uploadPreset) {
          console.error("Invalid Cloudinary configuration: cloudName or uploadPreset not set");
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now(),
              sender: "bot",
              content: "File upload is disabled due to invalid configuration. Please contact support.",
            },
          ]);
          return;
        }

        setCloudinaryLoaded(true);
        const myWidget = cloudinary.createUploadWidget(
          {
            cloudName,
            uploadPreset,
            sources: ['local', 'url', 'camera'],
            multiple: false,
            maxFileSize: 5000000, // 5MB limit
            allowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'pdf'],
          },
          (error: Error | null, result?: CloudinaryUploadResult) => {
            console.log("Cloudinary callback:", { error, result });
            if (error) {
              console.error("Cloudinary upload error details:", error);
              const errorMessage =
                error?.message ||
                "Upload failed. Please verify your Cloudinary account settings and try again.";
              setMessages((prev) => [
                ...prev,
                {
                  id: Date.now(),
                  sender: "bot",
                  content: `Failed to upload file: ${errorMessage}`,
                },
              ]);
              return;
            }
            if (result && result.event === "success" && result.info.secure_url) {
              const fileType = result.info.format?.toLowerCase();
              if (['jpg', 'jpeg', 'png', 'gif'].includes(fileType || '')) {
                setAttachedFile({ url: result.info.secure_url, type: 'image' });
                toast("Added 1 image attachment", {
                  description: "Now type your message and press Enter!",
                  action: { label: "Close", onClick: () => console.log("Close") },
                });
              } else if (fileType === 'pdf') {
                setAttachedFile({ url: result.info.secure_url, type: 'pdf' });
                toast("Added 1 PDF attachment", {
                  description: "Now type your message and press Enter!",
                  action: { label: "Close", onClick: () => console.log("Close") },
                });
              } else {
                console.error("Unsupported file type:", fileType);
                setMessages((prev) => [
                  ...prev,
                  {
                    id: Date.now(),
                    sender: "bot",
                    content: "Unsupported file type uploaded. Please upload images (JPG, PNG, GIF) or PDFs.",
                  },
                ]);
              }
            }
          }
        );
        const uploadButton = document.getElementById("upload_widget");
        if (uploadButton) {
          console.log("Upload button found");
          uploadButton.addEventListener(
            "click",
            () => {
              console.log("Opening upload widget");
              myWidget.open();
            },
            false
          );
        } else {
          console.error("Upload button not found");
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now(),
              sender: "bot",
              content: "Upload button not found. Please refresh the page.",
            },
          ]);
          setCloudinaryLoaded(false);
        }
      } else {
        console.error("Cloudinary script not loaded");
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            sender: "bot",
            content: "Failed to load file upload service. Please check your network or try again later.",
          },
        ]);
      }
    };

    const maxRetries = 5;
    let retries = 0;
    const retryInterval = setInterval(() => {
      if ((window as CloudinaryWindow).cloudinary || retries >= maxRetries) {
        clearInterval(retryInterval);
        initializeWidget();
      } else {
        retries++;
        console.log(`Retrying Cloudinary script load (attempt ${retries}/${maxRetries})`);
      }
    }, 1000);

    return () => clearInterval(retryInterval);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !attachedFile) return;

    const content: ContentItem[] = [];
    if (input.trim()) {
      content.push({ type: "text", text: input.trim() });
    }
    if (attachedFile) {
      if (attachedFile.type === 'image') {
        content.push({ type: "image_url", image_url: { url: attachedFile.url } });
      } else if (attachedFile.type === 'pdf') {
        content.push({ type: "text", text: `Attached PDF: ${attachedFile.url}` });
      }
    }

    const userMessage: Message = {
      id: Date.now(),
      sender: "user",
      content: content,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setAttachedFile(null);
    setLoading(true);

    try {
      const previousConversation = messages.map(msg => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.content,
      }));

      console.log("Sending to API:", { message: { content }, conversation: previousConversation });

      const response = await fetch("/api/doctor-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: { content },
          conversation: previousConversation,
        }),
      });
      const data = await response.json();

      if (response.ok) {
        const botMessage: Message = {
          id: Date.now() + 1,
          sender: "bot",
          content: data.response,
        };
        setMessages((prev) => [...prev, botMessage]);
      } else {
        console.log("API error response:", data);
        const errorMessage: Message = {
          id: Date.now() + 1,
          sender: "bot",
          content: data.error || "Something went wrong!",
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (err) {
      console.error("Error fetching chat:", err);
      const errorMessage: Message = {
        id: Date.now() + 1,
        sender: "bot",
        content: "An unexpected error occurred while contacting the server!",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <Script
        src="https://upload-widget.cloudinary.com/global/all.js"
        strategy="lazyOnload"
        onLoad={() => {
          setCloudinaryLoaded(true);
        }}
        onError={(e) => {
          console.error("Cloudinary script failed to load:", e);
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now(),
              sender: "bot",
              content: "Failed to load file upload service. Please check your network or try again later.",
            },
          ]);
        }}
      />
      <div className="flex flex-col relative">
        <BgGradient className="inset-0 opacity-60 blur-2xl z-0" />
        <header className="relative z-10">
          <h1 className="text-center font-semibold md:text-5xl sm:text-4xl text-3xl mb-2">Chat with Doctor AI</h1>
        </header>
        {/* chat box */}
        <div className="overflow-y-auto h-[500px] custom-scrollbar z-10">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} px-4 py-2`}>
              <div className={`max-w-xs md:max-w-md px-4 py-2 rounded-2xl shadow-sm text-sm whitespace-pre-wrap transition-all duration-300 ease-in-out 
                  ${msg.sender === "user" ? "bg-indigo-500 text-white rounded-md" : "bg-gray-100/40 rounded-md text-gray-800"}`}>
                {Array.isArray(msg.content) ? (
                  msg.content.map((item, index) => {
                    if (item.type === "text") {
                      if (item.text.startsWith("Attached PDF:")) {
                        const pdfUrl = item.text.split(": ")[1];
                        return (
                          <div key={index}>
                            <p>Attached PDF:</p>
                            <a
                              href={pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 underline"
                            >
                              View PDF
                            </a>
                          </div>
                        );
                      } else {
                        return <p key={index}>{item.text}</p>;
                      }
                    } else if (item.type === "image_url") {
                      return <Image key={index} src={item.image_url.url} alt="Attached image" width={200} height={200} />;
                    }
                    return null;
                  })
                ) : (
                  <p>{msg.content}</p>
                )}
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
           {/* Avatar Mode Button */}
        <div className=" bottom-4 left-4 z-10">
          <Link href="/dashboard/DoctorAI/avatar">
            <div className="flex items-center justify-center bg-indigo-500 text-white h-12 w-12 rounded-full hover:bg-indigo-600 transition-all duration-200">
                <p className="font-semibold">AV</p>
            </div>
          </Link>
        </div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="w-full flex-1 px-4 py-3 border border-indigo-300 bg-indigo-300/10 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all duration-200"
            disabled={loading}
          />
          <button
            type="button"
            id="upload_widget"
            disabled={!cloudinaryLoaded}
            className={`p-3 w-12 h-12 flex justify-center items-center rounded-full bg-indigo-500 hover:bg-indigo-600 text-white transition-all duration-200 ${
              !cloudinaryLoaded ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            type="submit"
            disabled={loading}
            className="p-3 w-12 h-12 flex justify-center items-center rounded-full bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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