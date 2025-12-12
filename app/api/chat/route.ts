// app/api/chat/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getMemory, appendToHistory, saveMemory } from "@/lib/memory";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type CoachingMode =
  | "grounding"
  | "discipline"
  | "relationships"
  | "business"
  | "purpose";

type Archetype = "mentor" | "warrior" | "father";

function chooseArchetype(mode: CoachingMode | undefined, lastUserText: string): Archetype {
  // Option A:
  // grounding -> mentor
  // discipline -> warrior
  // relationships -> father
  // business -> warrior OR mentor (gentler depending on individual)
  // purpose -> mentor
  if (!mode) return "mentor";

  if (mode === "business") {
    // Gentle if user signals overwhelm, anxiety, burnout, fear, panic
    const softSignals = /(overwhelm|overwhelmed|anxious|anxiety|burnout|panic|stressed|stress|can't cope|too much)/i;
    return softSignals.test(lastUserText) ? "mentor" : "warrior";
  }

  switch (mode) {
    case "grounding":
      return "mentor";
    case "discipline":
      return "warrior";
    case "relationships":
      return "father";
    case "purpose":
      return "mentor";
    default:
      return "mentor";
  }
}

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
    }: {
      messages: { role: "user" | "assistant" | "system"; content: string }[];
      sessionId?: string;
      name?: string;
      goals?: string;
      currentChallenge?: string;
      mode?: CoachingMode;
    } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const lastUserMsg =
      [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

    const memory = sessionId ? await getMemory(sessionId) : null;

    const modeDescriptions: Record<CoachingMode, string> = {
      grounding: `
Bring him out of his head and back into his body.
Slow him down and strip away noise.
Reconnect him to breath, posture, and presence.
`.trim(),
      discipline: `
Cut through excuses and hesitation.
Call him forward into small, consistent action.
Hold him to the standards he says he wants to live by.
`.trim(),
      relationships: `
Help him show up as a grounded masculine presence.
Truth, boundaries, listening, and clarity.
Guide him away from reactivity and people pleasing.
`.trim(),
      business: `
Cut through overwhelm.
Clarify signal versus noise.
Support strong, clean decisions and ownership while keeping compassion for pressure.
`.trim(),
      purpose: `
Zoom out to direction and meaning.
Help him see who he is becoming and what truly matters.
Strip away distractions and false paths.
`.trim(),
    };

    const archetypeVoices: Record<Archetype, string> = {
      mentor: `
Steady. Calm. Few words. High impact.
Bring him back to centre before action.
`.trim(),
      warrior: `
Direct and clean.
Call out avoidance.
Strong edge, never cruel.
`.trim(),
      father: `
Warm but firm.
Truth with compassion.
Boundaries and responsibility.
`.trim(),
    };

    const modeText =
      mode && modeDescriptions[mode]
        ? modeDescriptions[mode]
        : "General masculine grounding and clarity coaching.";

    const archetype = chooseArchetype(mode, lastUserMsg);
    const archetypeVoice = archetypeVoices[archetype];

    const memoryContext =
      memory || name || goals || currentChallenge
        ? [
            {
              role: "system" as const,
              content:
                `Memory (use only if clearly relevant; never invent details):\n` +
                `Name: ${name ?? memory?.name ?? "unknown"}\n` +
                `Goals: ${goals ?? memory?.goals ?? "unknown"}\n` +
                `Current challenge: ${currentChallenge ?? memory?.currentChallenge ?? "unknown"}\n`,
            },
          ]
        : [];

    const historyMessages =
      memory?.history?.map((m) => ({ role: m.role, content: m.content })) ?? [];

    const finalMessages = [
      {
        role: "system" as const,
        content: `
You are menscoach.ai, a grounded masculine coach built on the philosophy of Better Masculine Man.

Rules:
- calm, slow, embodied
- direct, few words, high impact
- masculine, not therapeutic
- no fluff, no cheerleading, no corporate talk
- 1 to 3 short paragraphs
- end with one strong question

Mode focus:
${modeText}

Archetype tone:
${archetypeVoice}

BMM values:
Responsibility, Presence, Discipline, Purpose, Strength with compassion, Brotherhood, Honour, Growth over victimhood, Embodiment, Contribution.

How to respond:
- reflect the essence in simple language
- strip away noise and stories, go to what is true underneath
- invite responsibility, not shame
- if overwhelmed, return him to breath and the next small step
- offer at most 1 to 3 practical ideas
- final line is one grounded question
        `.trim(),
      },
      ...memoryContext,
      ...historyMessages,
      ...messages,
    ];

    const response = await client.responses.create({
      model: "gpt-4.1",
      input: finalMessages,
      max_output_tokens: 450,
    });

    const assistantMessage = response.output_text ?? "Sorry, something went wrong.";

    if (sessionId) {
      const turns = [
        ...(lastUserMsg ? [{ role: "user" as const, content: lastUserMsg }] : []),
        { role: "assistant" as const, content: assistantMessage },
      ];
      await appendToHistory(sessionId, turns);

      await saveMemory(sessionId, {
        name: name ?? memory?.name,
        goals: goals ?? memory?.goals,
        currentChallenge: currentChallenge ?? memory?.currentChallenge,
      });
    }

    return NextResponse.json({ reply: assistantMessage });
  } catch (err: any) {
    console.error("Chat error:", err);
    return NextResponse.json(
      { error: "Chat error", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
