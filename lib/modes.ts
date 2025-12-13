export type Mode =
  | "grounding"
  | "discipline"
  | "relationships"
  | "business"
  | "purpose";

export const MODE_PROMPTS: Record<Mode, string> = {
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
