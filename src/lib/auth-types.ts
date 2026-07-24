export const USER_ROLES = ["admin", "member"] as const;
export const USER_STATUSES = [
  "pending",
  "active",
  "rejected",
  "suspended",
] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type UserStatus = (typeof USER_STATUSES)[number];
