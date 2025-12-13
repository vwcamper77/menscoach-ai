import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getMemory, appendToHistory, saveMemory } from "@/lib/memory";
import {
  EntitlementError,
  getEntitlements,
  Plan,
  Entitlements,
} from "@/lib/entitlements";
import { getUserPlan } from "@/lib/users";
import { addMessage, getSubject, listMessages } from "@/lib/subjects";
import { incrementDailyUsage } from "@/lib/usage";
import { Mode, MODE_PROMPTS } from "@/lib/modes";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const SESSION_COOKIE_NAME = "mc_session_id";

type Archetype = "mentor" | "warrior" | "father";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

type ChatBody = {
  messages: ChatMessage[];
  subjectId?: string;
  name?: string;
  goals?: string;
  currentChallenge?: string;
  mode?: Mode;
};

function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.get("cookie");
  if (!raw) return null;

  const cookies = raw.split(";").map((c) => c.trim());
  const target = cookies.find((c) => c.startsWith(`${name}=`));
  if (!target) return null;

  const value = target.slice(name.length + 1);
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function resolveSessionId(req: Request): string | null {
  // Cookie is source of truth
  const cookieId = readCookie(req, SESSION_COOKIE_NAME);
  if (cookieId) return cookieId;

  // Temporary fallback while you still pass x-session-id from client
  const headerId = req.headers.get("x-session-id");
  if (headerId) return headerId;

  return null;
}

function errorResponse(
  code: string,
  message: string,
  status = 400,
  plan?: Plan,
  entitlements?: Entitlements
) {
  return NextResponse.json({ error: { code, message }, plan, entitlements }, { status });
}

function dateKeyForUsage(date = new Date()) {
  return date.toISOString().slice(0, 10); // UTC YYYY-MM-DD
}

type CoachingMode = Mode | undefined;

function chooseArchetype(mode: CoachingMode, lastUserText: string): Archetype {
  if (!mode) return "mentor";

  if (mode === "business") {
    const softSignals =
      /(overwhelm|overwhelmed|anxious|anxiety|burnout|panic|stressed|stress|can't cope|too much)/i;
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

function buildSystemPrompt(modePrompt: string, archetypeVoice: string) {
  return `
You are menscoach.ai, a grounded masculine coach built on the philosophy of Better Masculine Man.

Rules:
- calm, slow, embodied
- direct, few words, high impact
- masculine, not therapeutic
- no fluff, no cheerleading, no corporate talk
- 1 to 3 short paragraphs
- end with one strong question

Mode focus:
${modePrompt}

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
  `.trim();
}

function archetypeVoices(archetype: Archetype) {
  const voices: Record<Archetype, string> = {
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

  return voices[archetype];
}

export async function POST(req: Request) {
  let plan: Plan | undefined;
  let ent: Entitlements | undefined;

  try {
    const body: ChatBody = await req.json();
    const { messages, subjectId, name, goals, currentChallenge, mode: requestedMode } = body;

    if (!messages || !Array.isArray(messages)) {
      return errorResponse("NO_MESSAGES", "No messages provided", 400);
    }

    const sessionId = resolveSessionId(req);
    if (!sessionId) {
      return errorResponse("SESSION_REQUIRED", "Session is required.", 401);
    }

    plan = await getUserPlan(sessionId);
    ent = getEntitlements(plan);

    const lastUserMsg =
      [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

    // Pro/Elite: subjects + per-subject mode + per-subject history
    if ((ent.maxSubjects ?? 0) > 0) {
      if (!subjectId) {
        return errorResponse("SUBJECT_REQUIRED", "Pick a subject to continue.", 400, plan, ent);
      }

      const subject = await getSubject(sessionId, subjectId);
      const history = await listMessages(sessionId, subjectId, 20);

      const archetype = chooseArchetype(subject.mode, lastUserMsg);
      const systemPrompt = buildSystemPrompt(
        MODE_PROMPTS[subject.mode] ?? "General masculine grounding and clarity coaching.",
        archetypeVoices(archetype)
      );

      if (ent.dailyMessageLimit !== null) {
        await incrementDailyUsage(sessionId, dateKeyForUsage(), ent.dailyMessageLimit);
      }

      const finalMessages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        ...messages,
      ];

      const response = await client.responses.create({
        model: "gpt-4.1",
        input: finalMessages,
        max_output_tokens: 450,
      });

      const assistantMessage = response.output_text ?? "Sorry, something went wrong.";

      // Store only the final user message + assistant reply (avoids duplicating full arrays)
      if (lastUserMsg) {
        await addMessage(subjectId, { role: "user", content: lastUserMsg });
      }
      await addMessage(subjectId, { role: "assistant", content: assistantMessage });

      return NextResponse.json({ reply: assistantMessage, plan, entitlements: ent });
    }

    // Free/Starter: single-thread memory
    if (ent.dailyMessageLimit !== null) {
      await incrementDailyUsage(sessionId, dateKeyForUsage(), ent.dailyMessageLimit);
    }

    const memory = ent.canUsePersistentMemory ? await getMemory(sessionId) : null;

    const archetype = chooseArchetype(requestedMode, lastUserMsg);
    const systemPrompt = buildSystemPrompt(
      requestedMode
        ? MODE_PROMPTS[requestedMode]
        : "General masculine grounding and clarity coaching.",
      archetypeVoices(archetype)
    );

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

    const finalMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
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

    if (ent.canUsePersistentMemory) {
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

    return NextResponse.json({ reply: assistantMessage, plan, entitlements: ent });
  } catch (err: any) {
    console.error("Chat error:", err);

    if (err instanceof EntitlementError) {
      const status = err.code === "LIMIT_REACHED" ? 429 : 403;
      return errorResponse(err.code, err.message, status, plan, ent);
    }

    const code = err?.code ?? "UNKNOWN";
    const message = err?.message ?? "Chat error";
    const status =
      code === "NOT_FOUND"
        ? 404
        : code === "FORBIDDEN"
        ? 403
        : code === "SESSION_REQUIRED"
        ? 401
        : 500;

    return errorResponse(code, message, status, plan, ent);
  }
}
