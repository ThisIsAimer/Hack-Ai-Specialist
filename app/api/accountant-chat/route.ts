import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import prisma from '@/lib/prisma';
import { Document } from '@prisma/client'; // Import Document type

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Define interface for multimodal message content
interface MessageContent {
  type: 'text' | 'image';
  text?: string;
  // Add other properties if needed
}

const SYSTEM_PROMPT = {
  role: 'system' as const,
  content: process.env.ACCOUNTANT_PROMPT || "You are a helpful assistant that can analyze images and answer questions about them."
};

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
    const userContent: MessageContent[] = Array.isArray(message.content)
      ? message.content
      : [{ type: "text", text: message.content }];

    // Extract text content for retrieval
    const textContent = userContent
      .filter((item: MessageContent) => item.type === "text")
      .map((item: MessageContent) => item.text || "");

    // Retrieve relevant documents based on keywords
    const keywords = textContent.join(" ").split(" ").filter((word: string) => word.length > 2);
    const retrievedDocs = await prisma.document.findMany({
      where: {
        OR: keywords.map((keyword: string) => ({
          content: {
            contains: keyword,
            mode: "insensitive",
          },
        })),
      },
      take: 5,
    });

    // Format retrieved documents
    const docsContent = retrievedDocs.map((doc: Document, index: number) => `Document ${index + 1}: ${doc.content}`).join("\n\n");
    const relevantInfo = docsContent
      ? `\n\nHere are some relevant documents:\n\n${docsContent}\n\nUse this information to answer the user's question.`
      : "";

    // Augment the system prompt
    const augmentedSystemPrompt = {
      ...SYSTEM_PROMPT,
      content: `${SYSTEM_PROMPT.content}${relevantInfo}`,
    };

    // Construct messages array with augmented system prompt and conversation history
    const messages = [
      augmentedSystemPrompt,
      ...conversation,
      {
        role: 'user' as const,
        content: userContent,
      },
    ];

    const chatCompletion = await groq.chat.completions.create({
      messages: messages,
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
    });

    const responseMessage = chatCompletion.choices[0]?.message?.content || "No response from the model.";
    return NextResponse.json({
      response: responseMessage,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
    console.error("Error in chat API:", errorMessage, err instanceof Error ? err.stack : err);
    return NextResponse.json(
      { error: `An error occurred: ${errorMessage}` },
      { status: 500 }
    );
  }
}