export const SUPER_ADMIN_EMAILS = ["t20avnish@gmail.com", "sagun.kumari@timesinternet.in"];

// Kept for backward compat (used in a few UI checks)
export const ADMIN_EMAIL = SUPER_ADMIN_EMAILS[0];
export const ADMIN_EMAILS = SUPER_ADMIN_EMAILS;

export type UserRole = "super_admin" | "evaluator" | "jury" | "user";
