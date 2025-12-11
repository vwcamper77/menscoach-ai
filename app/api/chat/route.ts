// app/api/chat/route.ts
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { MENSCOACH_SYSTEM_PROMPT } from "@/lib/menscoachPrompt";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not set" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);

    if (!body || typeof body.message !== "string") {
      return NextResponse.json(
        { error: "Request body must include a 'message' string" },
        { status: 400 }
      );
    }

    const userMessage = body.message.trim();
    const history = Array.isArray(body.history) ? body.history : [];

    // Responses API expects a single "input" – we can pass a message array
    const messages = [
      { role: "system", content: MENSCOACH_SYSTEM_PROMPT },
      ...history,
      { role: "user", content: userMessage },
    ];

    const completion = await client.responses.create({
      model: "gpt-4.1-mini",
      input: messages,
      temperature: 0.7,
      max_output_tokens: 600,
    });

    // Unified output helper: this gives you the concatenated text
    const reply = completion.output_text || "I couldn't generate a reply.";

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("Chat API error:", err);
    return NextResponse.json(
      {
        error:
          err?.message ||
          "Something went wrong talking to the menscoach.ai model.",
      },
      { status: 500 }
    );
  }
}
