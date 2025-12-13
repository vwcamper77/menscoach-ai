export type Plan = "free" | "starter" | "pro" | "elite";

export type Entitlements = {
  dailyMessageLimit: number | null;
  maxSubjects: number | null;
  canUseModes: boolean;
  canUsePersistentMemory: boolean;
};

export type EntitlementCode = "UPGRADE_REQUIRED" | "LIMIT_REACHED";

export class EntitlementError extends Error {
  code: EntitlementCode;

  constructor(code: EntitlementCode, message: string) {
    super(message);
    this.code = code;
    this.name = "EntitlementError";
  }
}

export function getEntitlements(plan: Plan): Entitlements {
  switch (plan) {
    case "free":
      return {
        dailyMessageLimit: 10,
        maxSubjects: 0,
        canUseModes: false,
        canUsePersistentMemory: true,
      };
    case "starter":
      return {
        dailyMessageLimit: null, // unlimited
        maxSubjects: 0,
        canUseModes: false,
        canUsePersistentMemory: true,
      };
    case "pro":
      return {
        dailyMessageLimit: null, // unlimited for paid tiers
        maxSubjects: 20,
        canUseModes: true,
        canUsePersistentMemory: true,
      };
    case "elite":
      return {
        dailyMessageLimit: null,
        maxSubjects: 100,
        canUseModes: true,
        canUsePersistentMemory: true,
      };
    default:
      return {
        dailyMessageLimit: 10,
        maxSubjects: 0,
        canUseModes: false,
        canUsePersistentMemory: true,
      };
  }
}

export function assertEntitlement(
  condition: boolean,
  code: EntitlementCode,
  message: string
): void {
  if (!condition) {
    throw new EntitlementError(code, message);
  }
}
