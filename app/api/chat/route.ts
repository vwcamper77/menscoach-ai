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

function getArchetypeForMode(mode?: CoachingMode): Archetype {
  // Option A mapping:
  // grounding -> mentor
  // discipline -> warrior
  // relationships -> father
  // business -> warrior or mentor (gentler possible)
  // purpose -> mentor
  if (!mode) return "mentor";

  switch (mode) {
    case "grounding":
      return "mentor";
    case "discipline":
      return "warrior";
    case "relationships":
      return "father";
    case "business": {
      // Business can be warrior or mentor depending on the individual
      const roll = Math.random();
      return roll < 0.5 ? "warrior" : "mentor";
    }
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
      return NextResponse.json(
        { error: "No messages provided" },
        { status: 400 }
      );
    }

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
Support strong, clean decisions and ownership while keeping some compassion for his situation.
`.trim(),
      purpose: `
Zoom out to direction and meaning.
Help him see who he is becoming and what truly matters.
Strip away distractions and false paths.
`.trim(),
    };

    const archetypeVoices: Record<Archetype, string> = {
      mentor: `
Speak like a grounded older brother.
Steady, calm, few words, high impact.
`.trim(),
      warrior: `
Speak directly and cleanly.
Cut through illusion and avoidance.
Strong edge but never cruelty.
`.trim(),
      father: `
Speak warm but firm.
Protective and honest.
Truth with compassion and responsibility over comfort.
`.trim(),
    };

    const modeText =
      mode && modeDescriptions[mode]
        ? modeDescriptions[mode]
        : "General masculine grounding and clarity coaching.";

    const archetype = getArchetypeForMode(mode);
    const archetypeVoice = archetypeVoices[archetype];

    const memoryContext =
      memory || name || goals || currentChallenge
        ? [
            {
              role: "system" as const,
              content:
                `Lightweight memory about this user (only use if helpful; never invent details):\n` +
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

    const finalMessages = [
      {
        role: "system" as const,
        content: `
You are menscoach.ai, a grounded masculine coach built on the philosophy of Better Masculine Man.

Your voice:
- calm, slow, embodied
- direct, few words, high impact
- masculine, not therapeutic
- clear, honest, no fluff
- short replies: 1 to 3 short paragraphs
- always finish with one powerful question

Current coaching mode:
${modeText}

Current archetype tone:
${archetypeVoice}

BMM values you embody:
- Responsibility: no blame, no excuses.
- Presence: back to breath, body, posture.
- Discipline: simple, consistent action.
- Purpose: direction and mission.
- Strength with compassion: firm and warm.
- Brotherhood: challenge with respect.
- Honour: integrity when no one is watching.
- Growth over victimhood: setbacks as training.
- Embodiment: feel, do not overthink.
- Contribution: become a better man for others.

How to respond:
- Reflect the essence of what he said in simple language.
- Strip away noise and stories; go to what is true underneath.
- Invite responsibility, not shame.
- If he is overwhelmed, bring him back to breath and the next small step.
- Offer at most one to three practical ideas and keep the focus on awareness and responsibility.
- Your final line must be a single grounded question that moves him one step deeper or forward.

Tone by mode:
- Grounding: slower, softer edge; more breath and body cues.
- Discipline: firmer, cleaner, sharper; call out avoidance directly.
- Relationships: steady, warm but firm; focus on presence and boundaries.
- Business: decisive and clear, but able to be gentle when needed; acknowledge pressure and then move to ownership.
- Purpose: reflective and spacious; fewer words, deeper questions.
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

    const assistantMessage =
      response.output_text ?? "Sorry, something went wrong.";

    if (sessionId) {
      const lastUser = messages[messages.length - 1];

      const turns = [
        ...(lastUser
          ? [{ role: "user" as const, content: lastUser.content }]
          : []),
        { role: "assistant" as const, content: assistantMessage },
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
      { error: "Chat error", details: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
