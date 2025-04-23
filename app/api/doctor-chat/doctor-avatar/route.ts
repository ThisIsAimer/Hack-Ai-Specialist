import { NextResponse } from "next/server";
import Groq from "groq-sdk";
 
 const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
 
 const SYSTEM_PROMPT = {
     role: 'system',
     content: process.env.DOCTOR_AVATAR
 }
 
 export async function POST(request: Request) {// when user sends mesg to chat this func gets called!
     try {
        const { message, conversation = [] } = await request.json(); 
         if (!message) {
             return NextResponse.json(
             { error: "Message content is required!" },
                 { status: 400 }
             );
         }
          // Construct msgs array with system prompt and convo history
          const messages = [
             SYSTEM_PROMPT,
             ...conversation, // include prov messages if provided
             {
                 role: 'user',
                 content: message,
             }
         ];
 
         const chatCompletion = await groq.chat.completions.create({
            messages: messages,
            model: "llama3-8b-8192"
        });
        // using groq obj to send msg to llama model!

        const responseMessage = chatCompletion.choices[0]?.message?.content || "No response from llama.";
        return NextResponse.json({
            response: responseMessage
        });
    } catch (err) {
        console.error("Error in chat Api: ", err);
        return NextResponse.json(
            { error: "An error occurred while processing your request." },
            {status:500} //server error=500
        )
    }
 }