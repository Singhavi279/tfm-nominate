"use client";

import { useUser, useUserRole } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { notFound } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading: loading } = useUser();
  const { isSuperAdmin, isLoading: roleLoading } = useUserRole();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user || roleLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    notFound();
  }

  return <>{children}</>;
}
