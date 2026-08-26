"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/domain";
import { cn, initials } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
}

const BASE_ITEMS: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/play", label: "Play" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/players", label: "Players" },
  { href: "/games", label: "Games" },
  { href: "/rules", label: "Rules" },
];

export function NavBar({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const items = [...BASE_ITEMS, ...(profile.permission_level === "admin" ? [{ href: "/admin", label: "Admin" }] : [])];

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-heading text-lg tracking-widest text-gold">
          Mafia League
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-surface-raised text-gold"
                  : "text-muted hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/profile"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface-raised text-xs font-semibold text-gold"
            title={profile.nickname}
          >
            {initials(profile.nickname || profile.full_name)}
          </Link>
          <button onClick={signOut} className="text-sm text-muted hover:text-foreground">
            Sign out
          </button>
        </div>

        <button
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <span className="text-lg">{open ? "✕" : "☰"}</span>
        </button>
      </div>

      {open && (
        <nav className="border-t border-border bg-background px-4 py-2 md:hidden">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "block rounded-md px-3 py-3 text-base font-medium",
                pathname === item.href ? "text-gold" : "text-muted",
              )}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="block rounded-md px-3 py-3 text-base font-medium text-muted"
          >
            Profile
          </Link>
          <button
            onClick={signOut}
            className="block w-full rounded-md px-3 py-3 text-left text-base font-medium text-muted"
          >
            Sign out
          </button>
        </nav>
      )}
    </header>
  );
}
