import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import * as schema from "./schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    camelCase: true,
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "github"],
      // requireLocalEmailVerified stays at its default (true) — this app has
      // no email-verification flow, so disabling it would let anyone sign up
      // with an unverified email/password account using someone else's email
      // and have it silently auto-link the next time that person uses Google/
      // GitHub sign-in, granting the original password access to their
      // account. Linking now only happens via the explicit, already-
      // authenticated linkSocial() flow in ProfileForm — never automatically
      // on a bare email match.
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "developer",
      },
      onboardingCompleted: {
        type: "boolean",
        defaultValue: false,
      },
      organizationId: {
        type: "string",
        required: false,
      },
    },
  },
});
