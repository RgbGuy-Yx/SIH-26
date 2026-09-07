# RailRadar — Control Dashboard UI/UX Design System Specification (`design.md`)

> **System Name:** RailRadar — Indian Railways Network Intelligence & Tactical Operations Control Center (OCC)  
> **Version:** 4.2.0 (Production OCC Specification)  
> **Scope:** Railway Control Room Dashboard, Real-Time Map Telemetry, Digital Twin Simulation, Rolling Stock Management, Safety Conflicts & Interlocking Alerts.

---

## 1. Executive Summary & Design Philosophy

The **RailRadar Control Dashboard** is a mission-critical, high-density rail traffic management interface engineered for Railway Control Officers, Section Controllers, and Operations Command Centers (OCC).

### Core Architectural Pillars
1. **Zero Cognitive Friction & Sub-Second Readability:** Control officers must evaluate complex topological conflicts, speed restrictions, and train precedence in seconds. Interfaces prioritize spatial geometry and hierarchical data over decorative excess.
2. **Dual-Layer Design System:**
   - **Tactical OCC Daylight Mode (Primary Production):** Ultra-crisp, high-contrast slate-and-white canvas (`#F4F6F8`) with floating glassmorphic consoles (`bg-white/95`, `backdrop-blur-xl`), engineered for 24/7 control room displays without operator eye fatigue.
   - **Material 3 Deep Radar Mode (Tactical GIS / Stitch Tokens):** Deep navy and dark slate base (`#081326`, `#030e20`) utilized for vector radar scopes, night-mode overlays, and high-contrast dark callouts.
3. **Multi-Source Data Disambiguation:** The design explicitly differentiates between:
   - **Scheduled Timetable Data:** Muted slate typography (`#64748B`).
   - **Real-Time GPS Satellite Telemetry:** High-visibility Emerald Green (`#10B981`) and Cyan (`#00A3C4`).
   - **XGBoost ML / NetworkX Forecasts:** Deep Electric Azure (`#0284C7`) and Amber (`#F59E0B`).

---

## 2. Color Palette & Semantic Design Tokens

The color system is organized into **Surface/Structural**, **Brand & Accents**, **Status & Precedence**, **Map GIS Layers**, and **Material 3 Stitch Tokens**.

### 2.1 Core Canvas & Structural Tokens

| Token / Class | Hex Code | Purpose & Usage |
| :--- | :--- | :--- |
| `bg-[#F4F6F8]` / `bg-[#F4F5F7]` | `#F4F6F8` | Primary global app workspace background & map canvas base |
| `bg-white` / `bg-white/95` | `#FFFFFF` | Main floating cards, sidebars, headers, table rows |
| `bg-slate-50` / `surface-container-low` | `#F8FAFC` | Secondary panel backgrounds, input fields, metric strip tiles |
| `bg-slate-100` | `#F1F5F9` | Hover states, pill containers, segmented tab rails |
| `border-slate-200` | `#E2E8F0` | Universal subtle container divider & card border |
| `border-slate-300` | `#CBD5E1` | Focused borders, active state boundaries, timeline tracks |
| `bg-slate-900` / `bg-slate-950` | `#0F172A` | High-contrast OCC action buttons, dark tactical pods, train ID badges |
| `text-slate-900` | `#0F172A` | Primary prominent text, headings, key numeric values |
| `text-slate-700` | `#334155` | Secondary text, data labels, table content |
| `text-slate-500` | `#64748B` | Timestamps, scheduled arrivals, sub-headers, units |
| `text-slate-400` | `#94A3B8` | Placeholder text, inactive icons, divider borders |

---

### 2.2 Brand & Accents

| Token / Purpose | Hex Code | Visual Sample | Usage |
| :--- | :--- | :--- | :--- |
| **Electric Azure (Primary OCC)** | `#0284C7` | `■` Sky-600 | Top bar logo, active navigation underline, primary focus states |
| **Tactical Blue (Corridor Engine)** | `#2E5CE6` | `■` Indigo-600 | High-precedence routes, vector trunk corridor glow |
| **Telemetry Cyan (Live Sensor)** | `#00A3C4` | `■` Cyan-600 | Live GPS markers, active selected route line, ETA chips |
| **Deep Cyan / Teal** | `#008BA8` | `■` Dark Cyan | Secondary live telemetry accents, station badges |
| **Digital Twin Indigo** | `#4F46E5` | `■` Indigo-700 | Simulation engine badge, virtual corridor progress bar |

---

### 2.3 Status, Conflict & Precedence Semantics

Every operational status has a standardized 4-part color treatment: **Background**, **Border**, **Text**, and **Pulsing Indicator**.

| State | Background | Border | Text | Icon / Dot | Operational Meaning |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Nominal / On-Time** | `bg-emerald-50` (`#ECFDF5`) | `border-emerald-200` (`#A7F3D0`) | `text-emerald-700` (`#047857`) | `bg-emerald-500` (`#10B981`) | On schedule, WebSocket live feed synced, block signals clear |
| **Minor Delay / Precedence** | `bg-amber-50` (`#FFFBEB`) | `border-amber-200` (`#FDE68A`) | `text-amber-700` (`#B45309`) | `bg-amber-500` (`#F59E0B`) | Delay 1–15 mins, headway warning, loop line standby |
| **Critical / Conflict Hold** | `bg-red-50` (`#FEF2F2`) | `border-red-200` (`#FECACA`) | `text-red-700` (`#B91C1C`) | `bg-red-500` (`#EF4444`) | Active interlocking contention, delay >15 mins, emergency hold |
| **Selected / Next Stop** | `bg-cyan-50` (`#ECFEFF`) | `border-cyan-200` (`#A5F3FC`) | `text-cyan-800` (`#155E75`) | `bg-[#00A3C4]` (`#00A3C4`) | Selected train or next immediate halt station |
| **Departed / Archival** | `bg-slate-100` (`#F1F5F9`) | `border-slate-200` (`#E2E8F0`) | `text-slate-600` (`#475569`) | `border-slate-400` (`#94A3B8`) | Past stops, cleared blocks, resolved alerts |

---

### 2.4 Multi-Segment Interlocking Switch Health Tokens (`MultiSegmentHealthBar`)

Used for real-time sub-component status indicators (Lock Operation, Block Line, Point Machine, Track Circuit, Frequency Response):

| Segment Code | Component Monitored | Normal Class | Degraded / Critical Class |
| :--- | :--- | :--- | :--- |
| **LO** | Lock Operation | `bg-[#4ade80] text-emerald-950` | `bg-[#f87171] text-red-950` |
| **BL** | Block Line Status | `bg-[#4ade80] text-emerald-950` | `bg-[#f87171] text-red-950` |
| **PM** | Point Machine Actuator | `bg-[#4ade80] text-emerald-950` | `bg-[#fbbf24] text-amber-950` |
| **TR** | Track Circuit Sensor | `bg-[#4ade80] text-emerald-950` | `bg-[#f87171] text-red-950` |
| **FR** | Frequency / Relay Response | `bg-[#4ade80] text-emerald-950` | `bg-[#f87171] text-red-950` |

---

### 2.5 MapLibre WebGL GIS Layer Palette

| Map Element | Paint Property | Value | Notes |
| :--- | :--- | :--- | :--- |
| **Basemap Vector Style** | Carto Positron | `#F4F5F7` background | Clean muted light grey topology |
| **National Track Mesh Line** | `line-color`, `line-width` | `#94A3B8`, `1.4px`, dash `[2, 3]` | Background network pathways |
| **Station Nodes (Mesh)** | `circle-color`, `circle-stroke`| `#94A3B8`, `3.5px`, stroke `#FFFFFF` | Muted background station dots |
| **Junction Hub Badges** | `bg-[#64748B]` | `w-6 h-6`, border-2 white | Hub identifiers (e.g. 21 NDLS, 32 CNB) |
| **Active Virtual Route** | `line-color`, `line-width` | `#00A3C4`, `3.5px` solid | Selected corridor path |
| **Active Route Station Dots** | `circle-color`, `circle-stroke`| `#FFFFFF`, stroke `#00A3C4` (2.2px) | Interactive route stop rings |
| **Live GPS Route Line** | `line-color`, `line-width` | `#10B981`, `3.5px` (emerald) | Real-time carrier trajectory |
| **Live Route Casing** | `line-color`, `line-width` | `#064E3B`, `6.0px`, opacity 0.35 | High-contrast casing for live route |
| **Live Train Marker** | `bg-slate-950`, border `#34D399` | `w-7 h-7`, bearing arrow | Rotating heading SVG + dual pulse rings |

---

### 2.6 Material 3 / Stitch Design System Tokens (Tailwind Config Reference)

The complete dark palette defined in `tailwind.config.js`:

```javascript
colors: {
  'background':                '#081326',
  'surface':                   '#081326',
  'surface-dim':               '#081326',
  'surface-bright':            '#2f394d',
  'surface-container-lowest':  '#030e20',
  'surface-container-low':     '#101c2e',
  'surface-container':         '#152032',
  'surface-container-high':    '#1f2a3d',
  'surface-container-highest': '#2a3549',
  'surface-variant':           '#2a3549',
  'surface-tint':              '#b7c4ff',
  'on-surface':                '#d8e3fc',
  'on-surface-variant':        '#c4c5d7',
  'on-background':             '#d8e3fc',
  'primary':                   '#2e5ce6',
  'primary-container':         '#2e5ce6',
  'on-primary':                '#002780',
  'on-primary-container':      '#e5e7ff',
  'primary-fixed':             '#dce1ff',
  'primary-fixed-dim':         '#b7c4ff',
  'secondary':                 '#abc7ff',
  'secondary-container':       '#22467e',
  'on-secondary':              '#002f65',
  'on-secondary-container':    '#95b6f4',
  'tertiary':                  '#b5c4ff',
  'tertiary-container':        '#2a5ee3',
  'on-tertiary':               '#00287c',
  'on-tertiary-container':     '#e5e8ff',
  'error':                     '#ffb4ab',
  'error-container':           '#93000a',
  'on-error':                  '#690005',
  'on-error-container':        '#ffdad6',
  'outline':                   '#8e90a0',
  'outline-variant':           '#434655'
}
```

---

## 3. Typography Hierarchy & Font Scales

Typography uses a strict two-family system: **Inter** for natural human readability and UI hierarchy, and **JetBrains Mono** for all telemetry, coordinates, and clock data.

### 3.1 Font Families

```css
/* Body & UI Sans Stack */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* High-Precision Telemetry Monospace Stack */
font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;

/* Iconography Stack */
font-family: 'Material Symbols Outlined';
```

### 3.2 Typographic Hierarchy Scale

| Role | Font Family | Size (px) | Line Height | Weight | Letter Spacing | Example Use Cases |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Headline XL** | Inter | `24px` (`text-2xl`) | `32px` | 700 / 800 | `-0.02em` | Main page titles, Auth brand header |
| **Headline LG** | Inter | `20px` (`text-xl`) | `28px` | 700 | `-0.015em` | Page top section headings, KPI values |
| **Headline MD** | Inter | `16px` (`text-base`) | `24px` | 600 / 700 | `-0.01em` | Card section titles, major modals |
| **Title MD / Card**| Inter | `14px` (`text-sm`) | `20px` | 600 / 700 | `0` | Train name in header, alert card title |
| **Body Regular** | Inter | `12px` (`text-xs`) | `18px` | 400 / 500 | `0` | Standard table content, descriptions |
| **Body Small** | Inter | `11px` (`text-[11px]`) | `16px` | 400 / 500 | `0` | Sub-labels, driver names, route stops |
| **Metric Large** | JetBrains Mono | `24px` (`text-2xl`) | `28px` | 700 / 800 | `-0.02em` | KPI counters, speed readout |
| **Metric Medium** | JetBrains Mono | `13px` / `14px` | `18px` | 600 / 700 | `0` | Train numbers (`#12401`), ETA forecast |
| **Metric Small** | JetBrains Mono | `10px` / `11px` | `14px` | 500 / 600 | `0.02em` | Sched arrival times, delay diffs, distance |
| **Micro Badge** | Inter / Mono | `9px` / `10px` | `12px` | 700 / 800 | `0.05em` | Caps pill badges (`SYNCED`, `TIER 1`, `+15m`) |

---

## 4. Spacing System, Elevation & Layout Grid

### 4.1 Modular 4px / 8px Spacing Scale

The layout adheres to a strict Tailwind 4px-base increment:

| Token | Pixels | Application |
| :--- | :--- | :--- |
| `0.5` | `2px` | Micro segmented controller padding, badge offset |
| `1` | `4px` | Gap between icon & label, tag padding, button gaps |
| `1.5` | `6px` | Gap between grid metric tiles, badge vertical padding |
| `2` | `8px` | Card internal gap, pill padding, horizontal button padding |
| `2.5` | `10px`| Header horizontal item gap, alert card padding |
| `3` | `12px` | Standard compact panel padding, metric box padding |
| `3.5` | `14px` | Sidebar scroll content padding, search bar padding |
| `4` | `16px` | Section padding, KPI card padding, top navbar horizontal padding |
| `5` | `20px` | Header block padding in table pages, settings group spacing |
| `6` | `24px` | Global page container padding, table column padding |

### 4.2 Structural Viewport Dimensions

- **Top Navigation Bar:** `h-14` (`56px`) fixed height, full width (`w-full`), z-index: `z-40`.
- **Left Station Timeline Drawer (`StationTimelineSidebar`):**
  - Expanded: `w-[360px]` (`sm:w-[390px]`), positioned at `top-4 left-4 bottom-4`, `z-20`.
  - Collapsed Pill: Floating action button `px-3.5 py-2.5 rounded-xl`.
- **Right Train Overview Console (`TrainOverviewCard`):**
  - Standard OCC Floating View: `w-[450px]` (`sm:w-[490px]`, `lg:w-[530px]`), positioned at `top-14 right-4 bottom-4`, `z-20`.
  - Wide OCC Dual-Column Workstation View: `w-[720px]` (`lg:w-[800px]`, `xl:w-[860px]`).
- **Top-Right Map Controls Toolbar (`MapControlsToolbar`):** Floating pill toolbar at `top-4 right-4`, `z-30`.
- **Content Max Width:** `max-w-7xl` (`1280px`) centered on full-page views (`TrainsPage`, `AlertsConflictsPage`, `SettingsPage`).

### 4.3 Corner Radii (Border Radius)

| Utility Class | Value | Elements Styled |
| :--- | :--- | :--- |
| `rounded-[2px]` | `2px` | Multi-segment switch health indicators (LO, BL, PM) |
| `rounded` | `4px` | Small tags, speed chips, clock multiplier badges |
| `rounded-md` | `6px` | Segmented tab pills, table status badges |
| `rounded-lg` | `8px` | Buttons, input fields, metric cards |
| `rounded-xl` | `12px` | Station timeline cards, metric strip container, alert items |
| `rounded-2xl` | `16px` | Major floating sidebars, modal containers, login cards |
| `rounded-full` | `9999px`| Status dots, user avatar, pill toggles, pulse rings |

### 4.4 Shadows & Glassmorphic Elevation

- **Subtle Surface (`shadow-2xs` / `shadow-xs`):**  
  `box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);`  
  Used on table rows, card items, and inner tiles.
- **Medium Floating Elevation (`shadow-md` / `shadow-lg`):**  
  `box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);`  
  Used on top-right map toolbar, dropdown selectors, tooltips.
- **Deep OCC Console Elevation (`shadow-xl`):**  
  `box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);`  
  Used on left and right floating sidebars.
- **Glassmorphic Blur Filter:**  
  `backdrop-blur-xl` (`backdrop-filter: blur(24px)`) combined with `bg-white/95` and `border border-slate-200/90`.

---

## 5. UI Components & Layout Anatomy

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. GLOBAL TOP NAVIGATION (DashboardLayout - h-14 bg-white border-b border-slate-200)             │
│ [Logo + RailRadar OPS]  [MAP VIEW] [TRAINS] [ALERTS & CONFLICTS (7)] [SETTINGS]   [Clock] [User] │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 2. MAP CANVAS (Full-Bleed WebGL Vector Basemap - MapLibreRailwayMap)                              │
│                                                                                                   │
│  ┌──────────────────────┐                                               ┌───────────────────────┐ │
│  │ 3. STATION TIMELINE  │                                               │ 4. MAP CONTROLS       │ │
│  │    SIDEBAR           │                                               │ [Live] [Sim] [Overview│ │
│  │ (w-390px, glass)     │                                               └───────────────────────┘ │
│  │                      │                                                                         │
│  │ • Route Search       │                                               ┌───────────────────────┐ │
│  │ • Train Selector     │                                               │ 5. TRAIN OVERVIEW     │ │
│  │ • Timeline Spine     │                                               │    CARD               │ │
│  │   [●] NDLS (Departed)│                    [Train Icon] ➔             │ (w-490px - w-860px)   │ │
│  │   [◎] CNB (Next)     │               (Live Emerald Marker)           │ • Live vs Sim Tabs    │ │
│  │   [○] PRYJ (Upcoming)│                                               │ • 4-Col Metric Strip  │ │
│  │                      │                                               │ • Stepper / Progress  │ │
│  │                      │                                               │ • AI Precedence Pod   │ │
│  └──────────────────────┘                                               └───────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.1 Top Navigation Header (`DashboardLayout.jsx`)
- **Brand Identity:** Deep Electric Azure (`#0284C7`) rounded polygon icon + `RailRadar` bold uppercase title + `OPS` monospace slate tag.
- **Navigation Links:** Horizontal tab items with bottom border active indicator (`border-b-2 border-[#0284C7] text-slate-950 font-bold`). Inactive tabs are muted slate (`text-slate-500 hover:text-slate-900`).
- **Live Feed Status Pill:** Contains simulation clock, pulsing emerald connection beacon (`animate-pulse`), and current virtual speed multiplier (`4x`).
- **Control Strip:** Quick simulation Pause/Play and Reset buttons.

### 5.2 Floating Route Station Timeline (`StationTimelineSidebar.jsx`)
- **Header:** Live status beacon, total halts counter, train switcher dropdown, and instant live search filter input.
- **Continuous Timeline Spine:** `1.5px` vertical track in `slate-200` with left-aligned circular markers:
  - *Current Station:* `14px` ring filled with `#00A3C4`, `ring-3 ring-[#00A3C4]/25`, pulse animation.
  - *Next Stop:* White fill with `#00A3C4` border, `ring-2 ring-cyan-100`.
  - *Departed:* Muted slate dot (`bg-slate-200`, `border-slate-400`).
  - *Upcoming:* Clean white circle with `border-slate-300`.
- **Card Content:** Scheduled arrival, estimated ML arrival (color-coded amber on delay), platform number, and kilometer distance.

### 5.3 Train Overview Telemetry Console (`TrainOverviewCard.jsx`)
- **Header Bar:** Train identification badge (`#12401`), speed readout, sync state, train number input, and "Fetch Live" satellite trigger.
- **Wide Workstation Toggle:** Button switching card width from standard (`490px`) to full dual-column OCC workstation (`860px`).
- **Segmented 2-Way Tab Controller:** Clean iOS/Linear style pill toggle between:
  1. `Live Telemetry` (Satellite GPS, actual speeds, platform allocation, carrier diversions).
  2. `Corridor Digital Twin` (NetworkX simulation, ML delay forecasts, precedence holds).

### 5.4 Primary 4-Column Metric Strip (Common High-Density Pattern)
Both telemetry views utilize a standardized 4-column balanced tile grid:
```jsx
<div className="grid grid-cols-4 gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
  <div>Status / Current Lag</div>
  <div className="border-l border-slate-200">Delay / Final Delay</div>
  <div className="border-l border-slate-200">Speed / Dest ETA</div>
  <div className="border-l border-slate-200">Heading / Scheduled</div>
</div>
```

### 5.5 AI Operational Reasoning & Dispatch Advisory Card
- Dark tactical pod styled in `bg-slate-900 text-white rounded-xl border border-slate-800`.
- Top header: Cyan badge `tune OCC Dispatch Advisory` + Headway buffer savings indicator (`+8m headway saved`).
- Content: Emerald mono prompt + human-readable operational reasoning explaining signal stops, precedence overrides, and loop line routing.

### 5.6 Rolling Stock Fleet Table (`TrainsPage.jsx`)
- Top metric cards: Total Active Trains (`52`), On-Time Trains (`44`), Delayed Trains (`5`), Priority Freight Rakes (`12`).
- Filter bar: Search input + filter chips (`ALL`, `SUPERFAST_EXPRESS`, `RAJDHANI`, `SHATABDI`, `EXPRESS`, `FREIGHT`).
- Clean table with subtle divider lines (`divide-y divide-slate-100`), monospaced train numbers, priority tier pill badges, and dual Scheduled vs ML predicted ETA comparison.

### 5.7 Network Alerts & Conflict Manager (`AlertsConflictsPage.jsx`)
- Severity filter chips (`ALL`, `CRITICAL`, `MAJOR`, `MINOR`).
- Summary KPI pills with icon accents.
- Alert Cards: Severity tag, section location with pin icon, incident details, and integrated "AI Conflict Recommendation" box with one-click "Apply Precedence Override" action.

---

## 6. Iconography & Visual Assets

All iconography is standardized on **Google Material Symbols Outlined** (fill: 0, weight: 400–600, optical size: 16–24px).

### Key Icon Catalog

| Symbol Name | Context / Location | Purpose |
| :--- | :--- | :--- |
| `directions_railway` / `train` | Brand mark, train list | Train identity, rolling stock |
| `map` / `radar` | Navigation, view switcher | GIS live map view |
| `warning` / `error` | Alerts, conflict cards | Precedence conflict, headway encroachment |
| `sensors` / `satellite_alt` | Telemetry bar, live feed | Satellite live feed active / fetch |
| `memory` | Tab toggle | Digital twin simulation engine |
| `tune` | AI advisory box, settings | Dispatch parameters, algorithmic reasoning |
| `speed` | Settings, metric strip | Velocity and clock multiplier |
| `location_on` | Alert card, station card | Geographical section, station point |
| `door_front` | Live telemetry view | Platform allocation & clearance berth |
| `alt_route` | Telemetry view | Carrier route diversion alert |
| `open_in_full` / `close_fullscreen`| Overview card | Toggle standard vs expanded OCC view |

---

## 7. Motion, Micro-Interactions & States

The dashboard operates on fluid, purposeful micro-animations that communicate telemetry state changes without causing distraction.

### Animation Token Classes
- `animate-pulse`: Used on connection status dots (WebSocket live, GPS lock, critical alert beacon).
- `animate-ping`: Used on the live GPS train marker to indicate continuous satellite pinging.
- `animate-spin`: Used on circular loading spinners during live telemetry fetches.
- `animate-fadeIn`: Applied to newly rendered overview panels and route inspectors.
- `transition-all duration-300 ease-in-out`: Standard transition curve for sidebar expand/collapse, card resizing, and modal appearances.

### Interactive Micro-States
- **Buttons (Primary):** `bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98] transition-all`
- **Buttons (Secondary / Outlined):** `bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-[0.98]`
- **Table Rows:** `hover:bg-slate-50/80 transition-colors cursor-pointer`
- **Station Timeline Cards:** `hover:bg-slate-50 hover:border-slate-300 active:ring-1 active:ring-[#00A3C4]`
- **Scrollbars:** Dual utility classes:
  - `.no-scrollbar`: Completely hidden scrollbar for compact containers.
  - `.thin-scrollbar`: Ultra-thin `5px` rounded thumb in `rgba(148, 163, 184, 0.4)` on transparent track.

---

## 8. Accessibility & Ergonomics Standards

1. **High Contrast Compliance:**
   - Dark typography (`#0F172A`) on light slate canvas (`#F4F6F8`) achieves a **13.8:1 contrast ratio**, well exceeding WCAG AAA standard (7:1).
   - Status indicators pair color with text or symbols (e.g. `+15m` + amber dot + `DELAYED` tag) so no state is conveyed solely by color.
2. **Typography Legibility:**
   - Numerical data is strictly displayed in monospaced tabular figures (`JetBrains Mono`) to prevent jittering when real-time numbers refresh.
3. **Screen Real Estate Optimization:**
   - Sidebars can be collapsed to maximize map visibility during multi-train tactical monitoring.
   - Expandable OCC console accommodates dual-screen or ultrawide (21:9 / 32:9) master workstation setups.

---

*Authored for the RailRadar Engineering & OCC Operations Team.*
