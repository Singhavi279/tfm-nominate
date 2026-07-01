// Super admin status is NOT hardcoded here. The single source of truth is
// Firestore: firestore.rules' isSuperAdmin() (bootstrap emails) and the
// user_roles/{email} collection's "role: super_admin" field. Client code
// determines admin status by reading that same collection — see
// src/firebase/use-user-role.tsx.

export type UserRole = "super_admin" | "evaluator" | "jury" | "user";
