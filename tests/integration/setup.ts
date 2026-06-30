import "dotenv/config";
import { vi } from "vitest";

// Integration tests exercise the real Server Actions against the real
// database (see tests/integration/fixtures.ts) — only the Next.js-runtime-only
// pieces are mocked, since auth.api.getSession(), headers(), and
// revalidatePath() all require a live request context that doesn't exist
// when these actions are called directly from a Node test process.

export type MockUser = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  organizationId: string | null;
  onboardingCompleted: boolean;
};

let currentUser: MockUser | null = null;

export function setMockUser(user: MockUser | null) {
  currentUser = user;
}

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: async () => (currentUser ? { user: currentUser, session: {} } : null),
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: () => {},
}));

// redirect() throws Next's NEXT_REDIRECT digest by design (that's how Server
// Actions implement redirects) — outside a real request context there's no
// machinery to catch it, so it would otherwise surface as an unhandled
// rejection. Mocked to throw a recognizable error instead, so a test can
// assert "the action reached its success path" via `.rejects.toThrow(...)`.
export class MockRedirectError extends Error {
  constructor(public url: string) {
    super(`MOCK_REDIRECT:${url}`);
  }
}

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new MockRedirectError(url);
  },
}));
