# Mintlify — Design System Specification (`design.md`)

> **Design Concept:** *Cloud garden over a glass desk.* A hand-illustrated sky and a documentation product share the same frame — the only place color and concept collide before the page settles into monastic white.

**Theme:** Light  
**Discipline:** Near-total monochrome discipline with a single vivid green accent  

---

## 1. Executive Summary & Design Philosophy

Mintlify operates on a strict, near-total monochrome discipline: a pure white canvas, crisp near-black text, and a single vivid green (`#0c8c5e`) as the only chromatic spark across the entire interface.

The hero section is the deliberate, singular exception: a hand-illustrated cloud landscape on a dark teal gradient, with the documentation product floating in the foreground as living proof. Everything downstream immediately reverts to austere white surfaces, tight Inter typography, and crisp component geometry that stays square (4px button radii, 16–24px card radii) rather than pill-shaped or overly rounded.

Color functions strictly as **functional punctuation**:
- **Mint Green (`#0c8c5e`)** for active states, brand links, decorative dots in eyebrow labels, and subtle category tag underlines.
- **Ink Black (`#08090a`)** for the sole filled button variant and high-contrast headings.
- **True Black (`#000000`)** for primary body copy, link defaults before hover, and structural rules.
- **Elevation is whispered, never declared:** shadows sit at an imperceptible 0.03–0.05 opacity and are felt more than seen.

---

## 2. Color Palette & Tokens

### 2.1 Color Tokens

| Name | Hex Value | Token | Role & Usage Rules |
| :--- | :--- | :--- | :--- |
| **Mint Green** | `#0c8c5e` | `--color-mint-green` | Brand links, active nav state, feature icons, decorative dots in eyebrow labels, the thin underline on inline code references. **The only chromatic accent in the system**, applied sparingly to make functional moments feel switched on. *Never use as a large button fill or page background.* |
| **Ink Black** | `#08090a` | `--color-ink-black` | Dark supporting neutral for headings, filled buttons, and strong visual weight. Do not promote to a generic CTA background. |
| **True Black** | `#000000` | `--color-true-black` | Body text, link defaults before hover, icon strokes, and footer rules. The workhorse neutral carrying primary typography. |
| **Paper White** | `#ffffff` | `--color-paper-white` | Page canvas, card surfaces, button text on dark fills, input fields. The pristine base layer everything sits on. |
| **Mist Gray** | `#f2f2f2` | `--color-mist-gray` | Subtle dividers, hairline strokes on cards, low-emphasis backgrounds, and the faintest hover wash. |
| **Cloud Gray** | `#dddddd` | `--color-cloud-gray` | Input borders, card outlines on hover states, secondary divider lines needing a step more visibility than Mist Gray. |

### 2.2 Surface Elevation Hierarchy

| Level | Name | Value | Purpose |
| :---: | :--- | :--- | :--- |
| **0** | **Paper White** | `#ffffff` | Page canvas and dominant background for all content sections after the hero |
| **1** | **Mist Gray** | `#f2f2f2` | Faint card wash and subtle section separators when a step off-white is needed |
| **2** | **Hero Teal** | `#0c8c5e` | Full-bleed dark hero band with cloud illustration — the only colored surface in the system |
| **3** | **Ink Black** | `#08090a` | Filled button surface and darkest UI element; inverted text contexts on dark backgrounds |

---

## 3. Typography Specification

### 3.1 Family: Inter
**Universal typeface — the only family in the system.**  
Used consistently for headlines, body, nav, buttons, inputs, tables, and code. No decorative display face, serif, or mono override.

- **Primary Font:** `'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Recommended Open Alternatives:** IBM Plex Sans, General Sans
- **Weights:** 
  - Regular (`400`)
  - Medium (`500`)
  - Semi-Bold (`600`)
- **OpenType Features:** `"ss01" on, "cv11" on` (clean single-story 'a', alternate digit glyphs)
- **Tracking Discipline:** 
  - Tight at display scale: `-0.02em` at 57px
  - Subtle tightening at standard headings: `-0.01em` from 40px down through 16px
  - Neutral tracking at 13–14px
  - Deliberately loose at `+0.05em` only on uppercase 13px eyebrow labels

### 3.2 Type Scale

| Role | Font Size | Line Height | Letter Spacing | Font Weight | CSS Token |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display** | 57px | 1.10 (62.7px) | `-1.14px` (`-0.02em`) | 600 | `--text-display` |
| **Heading** | 40px | 1.15 (46.0px) | `-0.40px` (`-0.01em`) | 600 | `--text-heading` |
| **Heading SM** | 24px | 1.33 (32.0px) | `-0.24px` (`-0.01em`) | 600 | `--text-heading-sm` |
| **Subheading** | 20px | 1.30 (26.0px) | `-0.20px` (`-0.01em`) | 600 | `--text-subheading` |
| **Body** | 16px | 1.50 (24.0px) | `-0.16px` (`-0.01em`) | 400 | `--text-body` |
| **Caption / Eyebrow** | 13px | 1.50 (19.5px) | `+0.65px` (`+0.05em`) | 500 | `--text-caption` |

---

## 4. Spacing, Shapes & Elevation

**Visual Density:** Comfortable, spacious, rigorous alignment.

### 4.1 Spacing Scale

| Token | Value | Recommended Usage |
| :--- | :--- | :--- |
| `--spacing-4` | 4px | Micro-gaps, button border radius, inline badges |
| `--spacing-5` | 5px | Fine icon-to-text spacing |
| `--spacing-6` | 6px | Tight vertical padding in list items |
| `--spacing-7` | 7px | Intermediate offset |
| `--spacing-8` | 8px | Button vertical padding, icon gutters |
| `--spacing-10` | 10px | Compact badge padding |
| `--spacing-12` | 12px | Standard element gap, stack spacing |
| `--spacing-16` | 16px | Standard button horizontal padding, card internal gaps |
| `--spacing-24` | 24px | Card padding, grid column gaps |
| `--spacing-28` | 28px | Section headers spacing |
| `--spacing-32` | 32px | Component block separation |
| `--spacing-48` | 48px | Sub-section spacing |
| `--spacing-64` | 64px | Large component spacing |
| `--spacing-72` | 72px | Major section boundary |
| `--spacing-96` | 96px | Hero bottom spacing, major layout breaks |
| `--spacing-201`| 201px | Extreme desktop hero clearances |

### 4.2 Border Radius

The system strictly favors crisp, architectural geometry. **Pill buttons, circular avatars, and 9999px radii are forbidden.**

| Element | Radius | Token / Purpose |
| :--- | :--- | :--- |
| **Tags / Badges** | 4px | `--radius-tags` |
| **Inputs & Forms** | 4px | `--radius-inputs` |
| **Buttons** | 4px | `--radius-buttons` (crisp, modern, architectural) |
| **Cards & Modals** | 16px | `--radius-cards` |
| **Large Containers** | 24px | `--radius-largecontainers` |

### 4.3 Shadows & Elevation

Shadows are forensic and whispered, never cast with harsh blur or high opacity.

| Token | Definition | Purpose |
| :--- | :--- | :--- |
| `--shadow-sm` | `lab(2.42579 -0.165291 -0.470081 / 0.03) 0px 2px 4px 0px` | Primary filled buttons, subtle actionable surfaces |
| `--shadow-sm-2`| `lab(100 0 0 / 0.05) 0px 2px 4px 0px` | Floating cards, product preview showcase |

### 4.4 Global Layout Rules

- **Page Max-Width:** `1200px` (centered horizontal container)
- **Section Gap:** `80px`
- **Standard Card Padding:** `24px`
- **Element Stack Gap:** `12px`

---

## 5. Component Specifications

### 5.1 Top Navigation Bar
- **Role:** Floating site navigation spanning across the dark hero and white content.
- **Surface:** Pure White (`#ffffff`), transparent when over the hero, no bottom border (`border-none`).
- **Layout:** Centered `1200px` container. Logo on far left (Mint Green `#0c8c5e` icon mark + True Black wordmark).
- **Links:** Center-left aligned, Inter 14px, weight 500, True Black (`#000000`).
- **Actions (Right-Aligned):** 
  - *Contact sales:* Ghost navigation link.
  - *Start for free:* Primary filled button.

### 5.2 Primary Filled Button
- **Role:** Highest-weight call to action. The sole dark filled button variant.
- **Geometry:** 4px border radius (`rounded-[4px]`), padding `8px 16px`.
- **Colors:** Background Ink Black (`#08090a`), text Paper White (`#ffffff`).
- **Typography:** Inter 14–15px, weight 500.
- **Shadow:** Carries the 0.03-opacity lab shadow (`--shadow-sm`).
- **Forbidden:** Never style primary buttons with Mint Green background fills.

### 5.3 Ghost Navigation Button
- **Role:** Secondary navigation action that defers visual hierarchy to the primary CTA.
- **Geometry:** 4px border radius, transparent background, no border.
- **Colors:** Text True Black (`#000000`), hover adds a subtle Mist Gray (`#f2f2f2`) background wash.
- **Typography:** Inter 14px, weight 500.

### 5.4 Hero Lead-Capture Email Input
- **Role:** Hero lead-capture form with integrated single-click submit.
- **Geometry:** Outer wrapper with 4px radius, 1px Cloud Gray (`#dddddd`) border, Paper White background.
- **Input Field:** Inter 14–15px, placeholder in muted gray, sits flush with submit button.
- **Submit Control:** Circular dark button on the right containing a crisp white right-arrow icon (`→`).

### 5.5 Documentation Product Card (Hero Showcase)
- **Role:** The living product UI rendered as a hero centerpiece floating between hero and content.
- **Geometry:** 16px radius, Paper White surface, 24px internal padding, elevated with `--shadow-sm-2`.
- **Internal Structure:**
  - *Left Sidebar:* Icon + label rows, active state highlighted with Mint Green (`#0c8c5e`).
  - *Main Content:* Clean documentation body with segmented tab bar.
  - *Right Table of Contents:* "On this page" outline in 13px Inter.

### 5.6 Customer Story Card
- **Role:** Social proof card in a 3-column grid.
- **Geometry:** 16px radius, Paper White surface, 1px `#f2f2f2` border, 24px internal padding.
- **Media:** Top half is a 16:9 photographic still with a subtle bottom gradient fade for maximum text contrast.
- **Content:** Bottom half holds a description paragraph (Inter 16px, weight 400, True Black) capped at 2 lines.
- **Link:** Text link `"Read story →"` in Inter 14px, weight 500, True Black.

### 5.7 Feature Capability Card
- **Role:** Explains core platform features in a 2-column or 3-column grid.
- **Geometry:** 16px radius, light Mint-tinted background wash (`rgba(12, 140, 94, 0.06)`), 24px padding.
- **Eyebrow Label:** Small-caps Mint Green (`#0c8c5e`), Inter 13px, letter-spacing `+0.05em`.
- **Heading:** Inter 20px, weight 600, Ink Black (`#08090a`).
- **Body:** Inter 16px, weight 400, line-height 1.5, True Black (`#000000`).

### 5.8 Partner Logo Tile
- **Role:** High-trust partner wall.
- **Structure:** 4 logos per row with 24px column gap, centered on a uniform horizontal baseline.
- **Appearance:** Grayscale only, rendered directly on the white canvas. No container, no border, no hover state.

### 5.9 In-Product Sidebar Navigation Item
- **Typography:** Inter 14–16px, weight 400, vertical padding 6px, left indent 8px.
- **Inactive:** True Black text, stroke 1.5 monochrome icon.
- **Active:** Row filled with faint Mint-tinted background wash (`rgba(12, 140, 94, 0.08)`), text switches to Mint Green (`#0c8c5e`), icon rendered in Mint Green.

### 5.10 Eyebrow Category Label
- **Role:** Small uppercase section classification tag positioned directly above headings.
- **Typography:** Inter 13px, weight 500, uppercase, letter-spacing `+0.05em`.
- **Color:** Mint Green (`#0c8c5e`).

---

## 6. Strict Do's and Don'ts

### Do
1. **Universal Inter:** Use Inter for everything — headlines, body, buttons, tags, and inputs.
2. **Selective Mint Green:** Apply Mint Green (`#0c8c5e`) only for active states, brand links, decorative dots, and eyebrow labels.
3. **Architectural Radii:** Commit to 4px for buttons/inputs/tags, 16px for cards, and 24px for large containers.
4. **Calculated Tracking:** Tighten display letter-spacing to `-0.02em` (57px) and `-0.01em` (40px down to 16px); loosen to `+0.05em` solely on uppercase 13px eyebrow labels.
5. **Two-Neutral Separation:** Keep Ink Black (`#08090a`) for filled buttons/headings and True Black (`#000000`) for body text.
6. **Hero Exclusivity:** Keep color restricted to the hero illustration. Revert to pure white surfaces and crisp dark text downstream.
7. **Whispered Shadows:** Keep shadows capped at 2px offset with 3–5% opacity. If stronger separation is needed, use a 1px `#dddddd` or `#f2f2f2` border.

### Don't
1. **No Pill Buttons or 9999px Radii:** Avoid rounded pills or bubbly shapes.
2. **No Mint Green Buttons:** Never use Mint Green as a button background fill or large surface background.
3. **No Secondary Accent Colors:** Do not introduce blue, purple, yellow, or orange accents. The monochrome-plus-one-green rule is absolute.
4. **No Sub-14px Body Text:** Never drop body text below 14px or use line-height tighter than 1.5 for prose.
5. **No Heavy Shadows or Glassmorphism:** Never use blurred glowing glass or multi-layered dark drop shadows.
6. **No Downstream Illustrations:** Never place illustrative graphics below the fold; content sections must remain pure UI.
7. **No Off-White Canvas:** The page background must be pure Paper White (`#ffffff`), not beige, gray, or dark mode in content sections.

---

## 7. Comparative Brand Context

| Brand | Architectural Commonalities |
| :--- | :--- |
| **Linear** | Strict single-accent discipline, monochrome UI with one vivid accent, Inter typography, 4px square button radii, forensic 0.03 opacity shadows. |
| **Vercel** | Near-black ink typography on pure white canvas, single chromatic focal point per page, tight tracking on Inter, 4px button geometry. |
| **Resend** | Monochrome-plus-one-accent structure, Inter typography, product UI showcased as hero artwork, generous white space between sections. |
| **Notion** | Product-as-marketing philosophy, clean monastic white sections, restrained color reserved purely for functional interactive state. |

---

## 8. Implementation Code Tokens

### 8.1 CSS Custom Properties (`:root`)

```css
:root {
  /* Colors */
  --color-mint-green: #0c8c5e;
  --color-ink-black: #08090a;
  --color-true-black: #000000;
  --color-paper-white: #ffffff;
  --color-mist-gray: #f2f2f2;
  --color-cloud-gray: #dddddd;

  /* Typography — Font Families */
  --font-inter: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography — Scale */
  --text-caption: 13px;
  --leading-caption: 1.5;
  --tracking-caption: 0.65px;

  --text-body: 16px;
  --leading-body: 1.5;
  --tracking-body: -0.16px;

  --text-subheading: 20px;
  --leading-subheading: 1.3;
  --tracking-subheading: -0.2px;

  --text-heading-sm: 24px;
  --leading-heading-sm: 1.33;
  --tracking-heading-sm: -0.24px;

  --text-heading: 40px;
  --leading-heading: 1.15;
  --tracking-heading: -0.4px;

  --text-display: 57px;
  --leading-display: 1.1;
  --tracking-display: -1.14px;

  /* Typography — Weights */
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;

  /* Spacing */
  --spacing-4: 4px;
  --spacing-5: 5px;
  --spacing-6: 6px;
  --spacing-7: 7px;
  --spacing-8: 8px;
  --spacing-10: 10px;
  --spacing-12: 12px;
  --spacing-16: 16px;
  --spacing-24: 24px;
  --spacing-28: 28px;
  --spacing-32: 32px;
  --spacing-48: 48px;
  --spacing-64: 64px;
  --spacing-72: 72px;
  --spacing-96: 96px;
  --spacing-201: 201px;

  /* Layout */
  --page-max-width: 1200px;
  --section-gap: 80px;
  --card-padding: 24px;
  --element-gap: 12px;

  /* Border Radius */
  --radius-md: 4px;
  --radius-lg: 8px;
  --radius-2xl: 16px;
  --radius-3xl: 24px;

  /* Named Radii */
  --radius-tags: 4px;
  --radius-cards: 16px;
  --radius-inputs: 4px;
  --radius-buttons: 4px;
  --radius-largecontainers: 24px;

  /* Shadows */
  --shadow-sm: lab(2.42579 -0.165291 -0.470081 / 0.03) 0px 2px 4px 0px;
  --shadow-sm-2: lab(100 0 0 / 0.05) 0px 2px 4px 0px;

  /* Surfaces */
  --surface-paper-white: #ffffff;
  --surface-mist-gray: #f2f2f2;
  --surface-hero-teal: #0c8c5e;
  --surface-ink-black: #08090a;
}
```

### 8.2 Tailwind CSS v4 Configuration (`@theme`)

```css
@theme {
  /* Colors */
  --color-mint-green: #0c8c5e;
  --color-ink-black: #08090a;
  --color-true-black: #000000;
  --color-paper-white: #ffffff;
  --color-mist-gray: #f2f2f2;
  --color-cloud-gray: #dddddd;

  /* Typography */
  --font-inter: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography — Scale */
  --text-caption: 13px;
  --leading-caption: 1.5;
  --tracking-caption: 0.65px;

  --text-body: 16px;
  --leading-body: 1.5;
  --tracking-body: -0.16px;

  --text-subheading: 20px;
  --leading-subheading: 1.3;
  --tracking-subheading: -0.2px;

  --text-heading-sm: 24px;
  --leading-heading-sm: 1.33;
  --tracking-heading-sm: -0.24px;

  --text-heading: 40px;
  --leading-heading: 1.15;
  --tracking-heading: -0.4px;

  --text-display: 57px;
  --leading-display: 1.1;
  --tracking-display: -1.14px;

  /* Spacing */
  --spacing-4: 4px;
  --spacing-5: 5px;
  --spacing-6: 6px;
  --spacing-7: 7px;
  --spacing-8: 8px;
  --spacing-10: 10px;
  --spacing-12: 12px;
  --spacing-16: 16px;
  --spacing-24: 24px;
  --spacing-28: 28px;
  --spacing-32: 32px;
  --spacing-48: 48px;
  --spacing-64: 64px;
  --spacing-72: 72px;
  --spacing-96: 96px;
  --spacing-201: 201px;

  /* Border Radius */
  --radius-md: 4px;
  --radius-lg: 8px;
  --radius-2xl: 16px;
  --radius-3xl: 24px;

  /* Shadows */
  --shadow-sm: lab(2.42579 -0.165291 -0.470081 / 0.03) 0px 2px 4px 0px;
  --shadow-sm-2: lab(100 0 0 / 0.05) 0px 2px 4px 0px;
}
```
