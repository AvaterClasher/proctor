"use client";
import Link from "next/link";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-2.5">
      <div className="flex items-center gap-6">
        <Link
          href="/"
          className="font-display text-sm font-semibold tracking-tight"
        >
          proctor
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/interview"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Interview
          </Link>
          <Link
            href="/admin"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Admin
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <ModeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
