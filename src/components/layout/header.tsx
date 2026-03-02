"use client";

import Link from 'next/link';
import { UserNav } from './user-nav';
import { Button } from '../ui/button';
import { useUser } from '@/firebase';
import { ADMIN_EMAILS } from '@/lib/auth';

export function Header() {
  const { user } = useUser();
  const isAdmin = ADMIN_EMAILS.includes(user?.email ?? "");

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex">
          <Link href="/dashboard" className="mr-6 flex items-center space-x-2">
            <span className="font-bold font-headline text-lg text-primary">TFM Awards 2026 Nominations</span>
          </Link>
        </div>
        <nav className="flex items-center space-x-6 text-sm font-medium">
          <Link
            href="/dashboard"
            className="transition-colors hover:text-foreground/80 text-foreground/60"
          >
            Dashboard
          </Link>
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-4">
          {isAdmin && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/upload">Admin Uploader</Link>
            </Button>
          )}
          <UserNav />
        </div>
      </div>
    </header>
  );
}
