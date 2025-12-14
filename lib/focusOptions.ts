export const focusOptions = [
  "Clarity",
  "Discipline",
  "Relationships",
  "Purpose/work",
  "Confidence",
  "Stress",
  "Health/body",
] as const;

export function isPresetFocus(value: string | null | undefined) {
  if (!value) return false;
  return focusOptions.includes(value as (typeof focusOptions)[number]);
}
