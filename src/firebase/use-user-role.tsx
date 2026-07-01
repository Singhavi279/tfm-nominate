"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useFirestore, useUser } from "@/firebase";

export type AppUserRole = "super_admin" | "evaluator" | "jury" | null;

/**
 * Reads the signed-in user's role from Firestore's user_roles/{email}
 * collection — including "super_admin". This is the ONLY place admin
 * status is derived on the client; there is no hardcoded email list.
 * The actual source of truth lives in firestore.rules / user_roles docs.
 */
export function useUserRole() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [role, setRole] = useState<AppUserRole>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) {
      setRole(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    getDoc(doc(firestore, "user_roles", user.email))
      .then((snap) => {
        setRole(snap.exists() ? (snap.data().role as AppUserRole) : null);
      })
      .catch(() => setRole(null))
      .finally(() => setIsLoading(false));
  }, [user?.email, firestore]);

  return { role, isSuperAdmin: role === "super_admin", isLoading };
}
