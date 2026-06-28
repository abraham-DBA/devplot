# UI Registry

Living document. Updated after every component is built. Read this before building any new component — match existing patterns exactly before inventing new ones.

---

## How to Use

Before building any component:

1. Check if a similar component already exists here
2. If yes — match its exact classes
3. If no — build it following ui-rules.md and ui-tokens.md, then add it here

After building any component — update this file with the component name, file path, and exact classes used.

---

## Components

### Landing Page

File: `app/page.tsx`
Last updated: 2026-06-28

| Property         | Class           |
| ---------------- | --------------- |
| Background       | `bg-background`, `bg-card`, `bg-foreground` |
| Border           | `border border-border`, `border-b border-border` |
| Border radius    | `rounded-lg`, `rounded-xl`, `rounded-md`, `rounded-full` |
| Text - primary   | `text-foreground`, `text-card` |
| Text - secondary | `text-muted-foreground`, `text-brand-secondary` |
| Spacing          | `px-4 sm:px-6 lg:px-24`, `py-20 lg:py-24`, `p-8`, `gap-3`, `gap-6`, `gap-8`, `gap-10` |
| Hover state      | `hover:text-foreground`, `hover:bg-brand-primary`, `hover:bg-background` |
| Shadow           | `shadow-sm` |
| Accent usage     | `bg-warning`, `text-destructive`, `bg-brand-secondary`, `border-brand-secondary` |

**Pattern notes:**
Landing surfaces use full-width bands with centered `max-w-[1440px]` inner containers. Primary CTAs use `bg-foreground text-card rounded-lg shadow-sm`; secondary CTAs use `border border-border bg-card text-foreground`. Preview and feature panels use white card surfaces with token borders and `rounded-xl` clipping. Mobile landing navigation uses a second `border-t border-border` row instead of hiding section links. Eyebrow labels use uppercase styling with no letter-spacing utility.

### Auth Split Screen

File: `components/auth/AuthShell.tsx`
Last updated: 2026-06-28

| Property         | Class           |
| ---------------- | --------------- |
| Background       | `bg-card`, `bg-foreground` |
| Border           | `border border-border` |
| Border radius    | `rounded-lg` |
| Text - primary   | `text-foreground`, `text-card` |
| Text - secondary | `text-muted-foreground`, `text-brand-secondary` |
| Spacing          | `px-6 py-8`, `lg:px-[72px] lg:py-[72px]`, `py-12`, `lg:pt-20`, `gap-3`, `gap-7`, `mt-10` |
| Hover state      | `hover:bg-brand-primary` |
| Shadow           | none |
| Accent usage     | `bg-foreground`, `bg-card`, `text-brand-secondary`, `focus:border-brand-primary`, `focus:ring-brand-primary` |

**Pattern notes:**
Auth screens use a full-height two-column split on desktop: dark testimonial/brand panel on the left and white form panel on the right. The right form column is top-aligned with `py-12 lg:pt-20` rather than vertically centered, matching the reference screenshots. The shared shell keeps `/login` and `/signup` aligned. Form controls are large (`h-14` inputs, `h-[60px]` submit, `h-[62px]` OAuth buttons), use token borders, and keep labels in uppercase monospace styling without letter-spacing utilities. Mobile stacks the dark panel above the form with reduced horizontal padding.
