"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

type Props = {
  redirectTo?: string;
};

export function SignupForm({ redirectTo = "/onboarding" }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const name = form.get("name");
    const email = form.get("email");
    const password = form.get("password");

    if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string") return;

    const { error: authError } = await authClient.signUp.email({ name, email, password });

    if (authError) {
      toast.error(authError.message ?? "Sign up failed. Please try again.");
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push(redirectTo);
  }

  async function handleGoogleSignIn() {
    try {
      await authClient.signIn.social({ provider: "google", callbackURL: redirectTo });
    } catch {
      toast.error("Could not connect to Google. Please try again.");
    }
  }

  async function handleGitHubSignIn() {
    try {
      await authClient.signIn.social({ provider: "github", callbackURL: redirectTo });
    } catch {
      toast.error("Could not connect to GitHub. Please try again.");
    }
  }

  return (
    <>
      <div className="mt-6 grid gap-2">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-border bg-card text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          <span className="font-mono text-sm font-bold">G</span>
          Continue with Google
        </button>
        <button
          type="button"
          onClick={handleGitHubSignIn}
          className="flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-border bg-card text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          <svg className="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
          Continue with GitHub
        </button>
      </div>

      <div className="my-5 flex items-center gap-4">
        <div className="h-px flex-1 bg-border" />
        <span className="font-mono text-xs font-semibold uppercase text-muted-foreground">Or email</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4">
        <label className="grid gap-1.5">
          <span className="font-mono text-[11px] font-semibold uppercase text-foreground">Name</span>
          <input
            name="name"
            type="text"
            placeholder="Abraham Okonkwo"
            required
            className="h-10 rounded-lg border border-border bg-card px-3.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
          />
        </label>

        <label className="grid gap-1.5">
          <span className="font-mono text-[11px] font-semibold uppercase text-foreground">Email</span>
          <input
            name="email"
            type="email"
            placeholder="you@team.io"
            required
            className="h-10 rounded-lg border border-border bg-card px-3.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
          />
        </label>

        <label className="grid gap-1.5">
          <span className="font-mono text-[11px] font-semibold uppercase text-foreground">Password</span>
          <input
            name="password"
            type="password"
            placeholder="••••••••"
            required
            minLength={8}
            className="h-10 rounded-lg border border-border bg-card px-3.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="mt-1 h-11 rounded-lg bg-foreground text-sm font-bold text-card transition-colors hover:bg-brand-primary disabled:opacity-60"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
    </>
  );
}
