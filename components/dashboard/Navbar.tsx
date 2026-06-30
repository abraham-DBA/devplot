"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type NavbarProps = {
  userName: string;
  userRole: string;
};

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/projects", label: "Projects" },
  { href: "/team", label: "Team" },
  { href: "/profile", label: "Profile" },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatRole(role: string): string {
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function Navbar({ userName, userRole }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    await authClient.signOut();
    router.push("/login");
  }

  return (
    <header className="w-full border-b border-border bg-card">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-6">
        {/* Left — Logo */}
        <div className="flex flex-1 justify-start">
          <Link href="/dashboard" className="flex items-center" aria-label="DevFlow home">
            <img src="/logo.png" alt="DevFlow" className="h-6 w-auto" />
          </Link>
        </div>

        {/* Center — Nav links (desktop only) */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  isActive
                    ? "bg-background font-semibold text-brand-primary"
                    : "font-medium text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right — Role + avatar dropdown + mobile toggle */}
        <div className="flex flex-1 items-center justify-end gap-3">
          <span className="hidden text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:block">
            {formatRole(userRole)}
          </span>

          {/* Avatar — click to open sign-out dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setAvatarOpen((o) => !o)}
              aria-label="Account menu"
              aria-expanded={avatarOpen}
              className="flex size-8 items-center justify-center rounded-full bg-foreground text-[11px] font-bold text-card focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2"
            >
              {getInitials(userName)}
            </button>

            {avatarOpen && (
              <div className="absolute right-0 top-10 z-50 w-44 rounded-xl border border-border bg-card shadow-lg">
                <div className="border-b border-border px-4 py-3">
                  <p className="truncate text-sm font-semibold text-foreground">{userName}</p>
                  <p className="truncate text-xs text-muted-foreground">{formatRole(userRole)}</p>
                </div>
                <div className="p-1.5">
                  <Link
                    href="/profile"
                    onClick={() => setAvatarOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-background"
                  >
                    Profile &amp; settings
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive-light disabled:opacity-50"
                  >
                    {signingOut ? "Signing out…" : "Sign out"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Hamburger — mobile only */}
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="ml-1 flex size-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground md:hidden"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <svg className="size-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="size-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu drawer */}
      {mobileOpen && (
        <nav
          className="border-t border-border bg-card px-6 py-3 md:hidden"
          aria-label="Mobile navigation"
        >
          <ul className="flex flex-col gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={[
                      "block rounded-md px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-background font-semibold text-brand-primary"
                        : "font-medium text-muted-foreground hover:text-foreground",
                    ].join(" ")}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
            <li className="mt-1 border-t border-border pt-1">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive-light disabled:opacity-50"
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
