import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = {
    role: 'system',
    content: process.env.TEACHER_PROMPT || "You are a helpful teacher assistant that can analyze images and answer questions about them."
}

export async function POST(request: Request) {
    try {
        const { message, conversation = [] } = await request.json(); 
        if (!message || !message.content) {
            return NextResponse.json(
                { error: "Message content is required!" },
                { status: 400 }
            );
        }
        // Ensure user content is always an array for multimodal support
        const userContent = Array.isArray(message.content) ? message.content : [{ type: "text", text: message.content }];
        // Construct messages array with system prompt and conversation history
        const messages = [
            SYSTEM_PROMPT,
            ...conversation,
            {
                role: 'user',
                content: userContent,
            }
        ];

        const chatCompletion = await groq.chat.completions.create({
            messages: messages,
            model: "meta-llama/llama-4-scout-17b-16e-instruct" // Updated to supported multimodal model
        });

        const responseMessage = chatCompletion.choices[0]?.message?.content || "No response from the model.";
        return NextResponse.json({
            response: responseMessage
        });
    } catch (err: unknown) {
        // Handle the error as an Error type or fallback to a generic message
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        console.error("Error in chat API:", errorMessage, err instanceof Error ? err.stack : err);
        return NextResponse.json(
            { error: `An error occurred: ${errorMessage}` },
            { status: 500 }
        );
    }
}