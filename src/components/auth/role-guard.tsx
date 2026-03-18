"use client";

import { useUser, useFirestore } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";

export function ClientRoleGuard({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      setChecking(false);
      return;
    }

    async function checkRole() {
      try {
        const roleDoc = await getDoc(doc(firestore, "user_roles", user!.email!));
        if (roleDoc.exists()) {
          const role = roleDoc.data().role;
          if (role === "evaluator") {
            router.replace("/evaluator");
            return;
          }
          if (role === "jury") {
            router.replace("/jury");
            return;
          }
        }
      } catch (e) {
        console.error("Failed to check role", e);
      } finally {
        setChecking(false);
      }
    }
    checkRole();
  }, [user, isUserLoading, firestore, router]);

  if (checking) {
    return (
      <div className="flex w-full items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
