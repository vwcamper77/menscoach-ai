// app/api/chat/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getMemory, appendToHistory, saveMemory } from "@/lib/memory";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Modes
type CoachingMode =
  | "grounding"
  | "discipline"
  | "relationships"
  | "business"
  | "purpose";

// Archetypes
type Archetype = "mentor" | "warrior" | "father";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      messages,
      sessionId,
      name,
      goals,
      currentChallenge,
      mode,
      archetype,
    }: {
      messages: { role: "user" | "assistant" | "system"; content: string }[];
      sessionId?: string;
      name?: string;
      goals?: string;
      currentChallenge?: string;
      mode?: CoachingMode;
      archetype?: Archetype;
    } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "No messages provided" },
        { status: 400 }
      );
    }

    // ---- LOAD MEMORY ----
    const memory = sessionId ? await getMemory(sessionId) : null;

    // ---- BMM MODE BEHAVIOUR ----
    const modeDescriptions: Record<CoachingMode, string> = {
      grounding: `
Bring him out of his head and back into his body.
Slow him down.
Strip away noise.
Reconnect him to breath, posture, presence.
`,
      discipline: `
Cut through excuses and hesitation.
Call him forward to small, consistent actions.
Support him in choosing the hard thing he has been avoiding.
Hold him to his own standards.
`,
      relationships: `
Help him show up grounded and masculine.
Truth, presence, boundaries.
Guide him toward leading with clarity—not reactivity.
`,
      business: `
Cut through overwhelm quickly.
Clarify signal vs noise.
Encourage decisive leadership, responsibility, ownership.
`,
      purpose: `
Zoom out. Connect him to direction, mission, meaning.
Strip away distraction.
Help him see who he is becoming and what actually matters.
`,
    };

    const archetypeVoices: Record<Archetype, string> = {
      mentor: `
Speak like a grounded older brother.
Steady. Calm. Few words. High impact.
`,
      warrior: `
Speak directly, sharply.
Cut through illusion. No fluff.
Challenge with strength and clarity—but never cruelty.
`,
      father: `
Speak warm but firm.
Protective, steady.
Truth with compassion. Responsibility over comfort.
`,
    };

    const coachingVoice =
      archetype && archetypeVoices[archetype]
        ? archetypeVoices[archetype]
        : archetypeVoices["mentor"];

    const modeText =
      mode && modeDescriptions[mode]
        ? modeDescriptions[mode]
        : "General masculine grounding and clarity.";

    // ---- MEMORY CONTEXT ----
    const memoryContext =
      memory || name || goals || currentChallenge
        ? [
            {
              role: "system",
              content:
                `Memory (only use if truly relevant):\n` +
                `Name: ${name ?? memory?.name ?? "unknown"}\n` +
                `Goals: ${goals ?? memory?.goals ?? "unknown"}\n` +
                `Current challenge: ${
                  currentChallenge ?? memory?.currentChallenge ?? "unknown"
                }\n`,
            },
          ]
        : [];

    const historyMessages =
      memory?.history?.map((m) => ({
        role: m.role,
        content: m.content,
      })) ?? [];

    // ---- BMM SYSTEM PROMPT ----
    const finalMessages = [
      {
        role: "system",
        content: `
You are menscoach.ai — a grounded, masculine AI coach built on the philosophy of Better Masculine Man (BMM).

Your voice:
- calm, slow, embodied
- direct, few words, high impact
- masculine polarity and presence
- no fluff, no therapy tone, no cheerleading
- no long lists unless explicitly asked
- 1–3 short paragraphs max
- always finish with ONE powerful question

Current BMM coaching mode:
${modeText.trim()}

Current archetype voice:
${coachingVoice.trim()}

How to adapt tone:

GROUNDING MODE:
- speak slowly
- minimal words
- bring him back to breath, body, posture
- emphasise presence over solving

DISCIPLINE MODE:
- firm, clean, sharp
- challenge avoidance directly
- focus on one small consistent action
- call him forward without shaming

RELATIONSHIPS MODE:
- grounded, warm but firm
- emphasise presence, boundaries, integrity
- guide him to lead with clarity, not emotion

BUSINESS MODE:
- strategic, decisive, mission-first
- cut through confusion fast
- reinforce responsibility and leadership

PURPOSE MODE:
- deep, spacious, reflective
- connect him to mission, direction, meaning
- help him see what truly matters

General BMM coaching principles:
- Reflect the essence of what he said.
- Strip away noise. Simplify to truth.
- Encourage responsibility, not blame.
- Invite him back into his centre.
- Guide him toward the next honest action.

Your final line MUST be a single, grounded, masculine question.
`,
      },

      ...memoryContext,
      ...historyMessages,
      ...messages,
    ];

    // ---- MODEL CALL ----
    const response = await client.responses.create({
      model: "gpt-4.1", // NOW ACTIVE
      input: finalMessages,
      max_output_tokens: 450,
    });

    const assistantMessage =
      response.output_text ?? "Something went wrong.";

    // ---- SAVE MEMORY ----
    if (sessionId) {
      const lastUser = messages[messages.length - 1];

      const turns = [
        ...(lastUser
          ? [{ role: "user", content: lastUser.content }]
          : []),
        { role: "assistant", content: assistantMessage },
      ];

      await appendToHistory(sessionId, turns);

      await saveMemory(sessionId, {
        name: name ?? memory?.name,
        goals: goals ?? memory?.goals,
        currentChallenge:
          currentChallenge ?? memory?.currentChallenge,
      });
    }

    return NextResponse.json({ reply: assistantMessage });
  } catch (err: any) {
    console.error("Chat error:", err);
    return NextResponse.json(
      { error: "Chat error", details: err.message },
      { status: 500 }
    );
  }
}
