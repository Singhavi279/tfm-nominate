"use client";

import Link from 'next/link';
import Image from 'next/image';
import { UserNav } from './user-nav';
import { Button } from '../ui/button';
import { useUser, useFirestore } from '@/firebase';
import { SUPER_ADMIN_EMAILS } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';

export function Header() {
  const { user } = useUser();
  const firestore = useFirestore();
  const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(user?.email ?? "");
  const [role, setRole] = useState<"evaluator" | "jury" | null>(null);

  useEffect(() => {
    if (!user?.email || isSuperAdmin) { setRole(null); return; }
    getDoc(doc(firestore, "user_roles", user.email))
      .then((snap) => {
        if (snap.exists()) setRole(snap.data().role as "evaluator" | "jury");
        else setRole(null);
      })
      .catch(() => setRole(null));
  }, [user?.email, isSuperAdmin, firestore]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex">
          <Link href="/dashboard" className="mr-6 flex items-center gap-3">
            <Image
              src="/logo-tfm.png"
              alt="Times Future of Maternity"
              width={120}
              height={17}
              className="h-5 w-auto object-contain"
              priority
            />
            <span className="font-semibold font-headline text-sm text-primary hidden sm:inline-block">
              Nominations 2026
            </span>
          </Link>
        </div>
        <nav className="flex items-center space-x-6 text-sm font-medium">
          {(!role || isSuperAdmin) && (
            <Link href="/dashboard" className="transition-colors hover:text-foreground/80 text-foreground/60">
              Dashboard
            </Link>
          )}
          {(role === "evaluator" || role === "jury") && (
            <Link
              href={role === "evaluator" ? "/evaluator" : "/jury"}
              className="transition-colors hover:text-foreground/80 text-foreground/90 font-semibold"
            >
              Form Status
            </Link>
          )}
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-4">
          {isSuperAdmin && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/upload">Super Admin</Link>
            </Button>
          )}
          <UserNav />
        </div>
      </div>
    </header>
  );
}
