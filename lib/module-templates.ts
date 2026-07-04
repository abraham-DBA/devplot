import type { NoteEntry } from "@/lib/note-types";

type SeedNote = Omit<NoteEntry, "id" | "createdAt">;

export type ModuleTemplate = {
  id: string;
  label: string;
  name: string;
  description: string;
  deadlineOffsetDays: number;
  seedNotes: SeedNote[];
  suggestedDepNames: string[];
};

export const BUILTIN_TEMPLATES: ModuleTemplate[] = [
  {
    id: "auth",
    label: "Authentication",
    name: "Authentication & SSO",
    description:
      "Implement user login, registration, session management, and OAuth provider integrations. Covers token handling, secure credential storage, and session persistence.",
    deadlineOffsetDays: 21,
    seedNotes: [
      {
        type: "technical",
        title: "Auth strategy",
        body: "Session type: JWT / cookie-based?\nOAuth providers: Google, GitHub\nToken expiry: 7 days\nRefresh strategy: ...",
      },
      {
        type: "api",
        title: "Endpoints",
        body: "POST /auth/login\nPOST /auth/signup\nPOST /auth/logout\nGET  /auth/me",
      },
      {
        type: "schema",
        title: "User table",
        body: "id        text PK\nemail     text UNIQUE\npassword  text (hashed)\nrole      text\ncreatedAt timestamp",
      },
    ],
    suggestedDepNames: [],
  },
  {
    id: "rest-api",
    label: "REST API",
    name: "REST API Layer",
    description:
      "Design and implement REST API endpoints for this feature area. Includes request validation, response serialization, error handling, and rate limiting where applicable.",
    deadlineOffsetDays: 14,
    seedNotes: [
      {
        type: "api",
        title: "Endpoints",
        body: "GET    /api/...\nPOST   /api/...\nPATCH  /api/...\nDELETE /api/...",
      },
      {
        type: "technical",
        title: "Auth & permissions",
        body: "Which roles can call which endpoints?\n- GET   → public / authenticated\n- POST  → ...\n- PATCH → ...",
      },
      {
        type: "implementation",
        title: "Error codes",
        body: "400 Bad Request\n401 Unauthorized\n403 Forbidden\n404 Not Found\n422 Unprocessable Entity\n500 Internal Server Error",
      },
    ],
    suggestedDepNames: ["Authentication"],
  },
  {
    id: "db-migration",
    label: "DB Migration",
    name: "Database Migration",
    description:
      "Schema changes required for this feature: new tables, columns, indexes, and data backfill steps. Migrations must be reversible and safe to run against a live database.",
    deadlineOffsetDays: 7,
    seedNotes: [
      {
        type: "schema",
        title: "New tables / columns",
        body: "Table: ...\nColumns:\n  id        text PK\n  ...       ...\n  createdAt timestamp",
      },
      {
        type: "technical",
        title: "Indexes",
        body: "Add unique index on: ...\nAdd composite index on: ...",
      },
      {
        type: "implementation",
        title: "Rollback plan",
        body: "To reverse this migration:\n1. DROP TABLE ...\n2. ALTER TABLE ... DROP COLUMN ...",
      },
    ],
    suggestedDepNames: [],
  },
  {
    id: "payments",
    label: "Payments",
    name: "Payment Integration",
    description:
      "Integrate payment processing (Stripe or equivalent). Covers checkout flow, webhook handling, subscription management, invoice generation, and payment failure recovery.",
    deadlineOffsetDays: 28,
    seedNotes: [
      {
        type: "technical",
        title: "Payment provider",
        body: "Provider: Stripe\nAPI version: 2024-06-20\nWebhook secret: see .env (STRIPE_WEBHOOK_SECRET)\nTest mode: use stripe.com/test",
      },
      {
        type: "api",
        title: "Webhook events to handle",
        body: "checkout.session.completed\npayment_intent.payment_failed\ncustomer.subscription.deleted\ninvoice.payment_succeeded",
      },
      {
        type: "schema",
        title: "Billing tables",
        body: "subscriptions(id, userId, stripeId, status, plan, periodEnd)\npayments(id, userId, amount, currency, status, createdAt)",
      },
    ],
    suggestedDepNames: ["Authentication"],
  },
  {
    id: "admin-crud",
    label: "Admin CRUD",
    name: "Admin Dashboard",
    description:
      "Internal admin interface for managing core entities. Covers listing, filtering, editing, and soft-deleting records with role-gated access. Not exposed publicly.",
    deadlineOffsetDays: 14,
    seedNotes: [
      {
        type: "technical",
        title: "Access control",
        body: "Restricted to roles: admin / owner\nRoute protection: middleware + server-side session check\nNo public exposure.",
      },
      {
        type: "api",
        title: "CRUD endpoints",
        body: "GET    /admin/...\nPOST   /admin/...\nPATCH  /admin/...\nDELETE /admin/...",
      },
    ],
    suggestedDepNames: ["Authentication"],
  },
];

export function applyTemplate(
  template: ModuleTemplate,
  todayStr: string,
): { name: string; description: string; deadline: string; technicalNotes: string } {
  const base = new Date(todayStr + "T00:00:00Z");
  base.setUTCDate(base.getUTCDate() + template.deadlineOffsetDays);
  const deadline = base.toISOString().split("T")[0];

  const notes: NoteEntry[] = template.seedNotes.map((n, i) => ({
    id: `${template.id}-note-${i}`,
    type: n.type,
    title: n.title,
    body: n.body,
    createdAt: new Date().toISOString(),
  }));

  return {
    name: template.name,
    description: template.description,
    deadline,
    technicalNotes: JSON.stringify(notes),
  };
}
