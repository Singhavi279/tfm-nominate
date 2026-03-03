"use client";

import { useUser, useFirestore } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";

export default function JuryLayout({ children }: { children: React.ReactNode }) {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        if (isUserLoading) return;
        if (!user) { router.push("/login"); return; }

        async function checkRole() {
            try {
                const roleDoc = await getDoc(doc(firestore, "user_roles", user!.email!));
                if (!roleDoc.exists() || roleDoc.data()?.role !== "jury") {
                    router.push("/dashboard");
                }
            } catch {
                router.push("/dashboard");
            } finally {
                setChecking(false);
            }
        }
        checkRole();
    }, [user, isUserLoading, firestore, router]);

    if (isUserLoading || checking) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return <>{children}</>;
}
