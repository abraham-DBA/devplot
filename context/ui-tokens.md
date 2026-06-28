# UI Tokens

Design tokens for DevFlow. All colors, typography, spacing, and component values are aligned with the design images. Use these exact values throughout the codebase — never hardcode colors or use raw Tailwind color classes in components.

---

## How to Use

This project uses **Tailwind CSS v4**. All design tokens are defined using the `@theme` directive in `app/globals.css`.

Tailwind v4 automatically generates utility classes from `@theme` variables:

- `--color-brand-primary` → `bg-brand-primary`, `text-brand-primary`, `border-brand-primary`
- `--color-background` → `bg-background`
- `--color-success` → `bg-success`, `text-success`

```tsx
// Correct — uses generated utility classes
className="bg-card text-foreground border-border"

// Never — hardcoded hex values
className="bg-[#283841] text-[#101828]"

// Never — raw Tailwind color classes
className="bg-purple-500 text-gray-600"
```

---

## globals.css — Complete Token Definition

```css
@import "tailwindcss";

@theme {
  /* Font */
  --font-sans: "Inter", sans-serif;

  /* Page and surface backgrounds */
  --color-background: #f6f7fb;
  --color-card: #ffffff;
  --color-card-foreground: #101828;

  /* Borders */
  --color-border: #e7eaf3;

  /* Text colors */
  --color-foreground: #101828;
  --color-muted-foreground: #7b9194;

  /* Brand colors */
  --color-brand-primary: #283841;      /* Deep Slate / Charcoal-Blue */
  --color-brand-secondary: #7b9194;    /* Grayish Slate */

  /* Success — Green (On Track) */
  --color-success: #06a571;
  --color-success-light: #e6f6f1;

  /* Warning — Orange (At Risk) */
  --color-warning: #f0ac3b;
  --color-warning-light: #fef7ec;

  /* Destructive — Red (High Risk / Blocked) */
  --color-destructive: #ef3e45;
  --color-destructive-light: #fdedee;

  /* Border radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;
}
```

---

## Color Usage Guide

### Page Layout

| Element           | Token                  | Hex Value |
| ----------------- | ---------------------- | --------- |
| Page background   | `bg-background`        | `#f6f7fb` |
| Card / surface    | `bg-card`              | `#ffffff` |
| Default border    | `border-border`        | `#e7eaf3` |

### Typography

| Element                | Token                           | Hex Value |
| ---------------------- | ------------------------------- | --------- |
| Headings, primary text | `text-foreground`               | `#101828` |
| Secondary text, labels | `text-muted-foreground`         | `#7b9194` |
| Main Brand color text  | `text-brand-primary`            | `#283841` |

### Project/Module Health & Status

| Status | Risk Level | Text Token | Background Token |
| --- | --- | --- | --- |
| Completed / On Track | Low | `text-success` | `bg-success-light` |
| At Risk / Due Soon | Medium | `text-warning` | `bg-warning-light` |
| Blocked / Overdue / High Risk | High | `text-destructive` | `bg-destructive-light` |

---

## Typography

| Element              | Size | Weight | Line height | Color token           |
| -------------------- | ---- | ------ | ----------- | --------------------- |
| Logo text            | 20px | 700    | 28px        | `text-brand-primary`  |
| Stat number          | 32px | 600    | 40px        | `text-brand-primary`  |
| Section heading      | 18px | 600    | 26px        | `text-foreground`     |
| Nav item (active)    | 14px | 600    | 20px        | `text-brand-primary`  |
| Nav item (inactive)  | 14px | 500    | 20px        | `text-muted-foreground`|
| Card label           | 12px | 500    | 16px        | `text-muted-foreground`|
| Body text            | 14px | 400    | 20px        | `text-foreground`     |

Font family: **Inter** — imported in Next.js layout.

---

## Component Tokens

### Cards

```
background: bg-card
border: 1px solid var(--border)
border-radius: 12px (rounded-xl)
padding: 24px (p-6)
box-shadow: 0px 1px 3px rgba(0,0,0,0.05)
```

### Buttons

**Primary (Brand):**
```
background: bg-brand-primary (#283841)
text: text-white
border-radius: rounded-lg (radius-md)
padding: px-4 py-2
hover: bg-opacity-90
```

**Secondary:**
```
background: bg-card
border: 1px solid var(--border)
text: text-brand-primary
border-radius: rounded-lg (radius-md)
padding: px-4 py-2
```

**Ghost:**
```
background: transparent
text: text-muted-foreground
hover: bg-background
```

### Input Fields

```
background: bg-card
border: 1px solid var(--border)
border-radius: rounded-lg
padding: px-3 py-2
focus: border-brand-primary ring-1 ring-brand-primary
```
