# UI Rules

Concise rules for building DevFlow UI. Design assets are available — use them as the source of truth for visual decisions. These rules cover the most important patterns and constraints to keep the UI consistent without over-specifying every detail.

---

## Font

Always import Inter via `next/font/google` in the root layout.

```typescript
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
```

The `--font-sans` variable is declared in globals.css. Apply the font variable class to the `<body>` tag in root layout. Never use system fonts as the primary font.

---

## Layout

- **Page max-width:** 1440px, centered.
- **Main content area padding:** 32px on all sides (desktop), 16px (mobile/tablet).
- **Gap between page sections:** 24px (gap-6) or 32px (gap-8).
- **Header height:** 64px, full width, white background, default border bottom, padding 0 24px.
- **Navigation layout:** Top navbar only — no sidebar.

---

## Navbar

Three main navigation links: Dashboard, Projects, Profile.

- **Active item:** `color: #283841` (brand primary), font-weight 600.
- **Inactive item:** `color: #7b9194` (brand secondary), font-weight 500.
- Navbar should be clean and responsive, displaying a logo branding at the left side ("DevFlow").

---

## Cards

Every content section lives in a card.

```
background: bg-card (#FFFFFF)
border: 1px solid var(--border) (#E7EAF3)
border-radius: 12px
padding: 24px (p-6)
box-shadow: 0px 1px 3px rgba(0,0,0,0.05)
```

Never use colored card backgrounds — always white. Color goes inside cards via badges, bars, and text, never on the card surface itself.

---

## Typography Hierarchy

Three levels used consistently throughout:

**Section headings** — card titles, page section titles
```
font-size: 16px (text-base) or 18px (text-lg)
font-weight: 600 (font-semibold)
color: #101828
line-height: 24px
```

**Body / primary content text**
```
font-size: 14px (text-sm)
font-weight: 500 (font-medium) or 400 (font-normal)
color: #101828
line-height: 20px
```

**Secondary / muted text** — labels, timestamps, subtitles
```
font-size: 12px (text-xs)
font-weight: 400
color: #7b9194
line-height: 16px
```

Stat numbers on dashboard use 32px / weight 600 / color #283841.

---

## Badges

All badges use standard rounded pill format (`rounded-full`) or custom card tags (`rounded-md`).

```
padding: px-2 py-0.5
font-size: text-xs
font-weight: font-medium
```

---

## Buttons

**Primary button:**
```
background: #283841 (brand-primary)
color: #FFFFFF
border-radius: 8px (rounded-lg)
padding: 8px 16px (px-4 py-2)
font-size: 14px
font-weight: 500
```

**Secondary button:**
```
background: #FFFFFF
border: 1px solid #E7EAF3
color: #283841
border-radius: 8px
padding: 8px 16px
```

---

## Form Inputs

```
background: #FFFFFF
border: 1px solid #E7EAF3
border-radius: 8px
padding: 8px 12px
font-size: 14px
color: #101828
placeholder color: #7b9194
focus: border-brand-primary ring-1 ring-brand-primary
```

---

## Responsiveness & Breakpoints

Every page layout must adapt fluidly to all viewports (Mobile, Tablet, Desktop, and Wide Monitors):

- **Mobile Spacing:** Use responsive padding classes (`p-4 sm:p-6 lg:p-8` and `gap-4 md:gap-6`).
- **Flexible Grid Columns:** Avoid hardcoded column grid constraints. Always use responsive utilities (e.g., `grid-cols-1 md:grid-cols-2 lg:grid-cols-12`).
- **Navigation adaptability:** The top navbar must collapse cleanly on mobile (under 768px), rendering a toggleable menu drawer or structured icon navigation rather than overflowing the page container.
- **Mobile-Friendly Tables:** Data listings (such as the modules table) should either wrap inside `overflow-x-auto` to enable horizontal scrolling on narrow screens, or switch layout structures to stacked card units.
- **Fluid Charts:** Charts must reside inside Recharts `ResponsiveContainer` blocks using percentage widths (e.g., `width="100%"`), maintaining a fixed height aspect ratio to scale cleanly.

---

## Invariants & Do Nots

- Never use Tailwind's built-in color classes (`bg-purple-500`, `text-gray-600`) — use project tokens defined in globals.css.
- Never use hex values directly in React components.
- Never add gradients to card backgrounds — keep card backgrounds white.
- Always scope risk assessment formulas to the Project Health algorithm rules.
- Never allow layouts to overflow viewport widths — all pages must be responsive across mobile, tablet, and desktop viewports.
