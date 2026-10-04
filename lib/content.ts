/**
 * All page copy in one place.
 *
 * The numbers are internally consistent on purpose: the hero deltas, the
 * roadside cards and the metrics table are all derived from the same
 * before/after pairs, so nothing contradicts anything else.
 */

export const BRAND = {
  name: "ITFIZZ",
  /* one line, used once — as the eyebrow above the headline */
  eyebrow: "Dispatch operations for cloud kitchens",
  nav: [
    { label: "How it works", href: "#how" },
    { label: "Metrics", href: "#metrics" },
    { label: "Field notes", href: "#notes" },
  ],
  cta: { label: "Start a pilot", href: "#pilot" },
  contact: "hello@itfizz.dev",
  location: "Lucknow, Uttar Pradesh",
  legal: "ITFIZZ Labs Pvt. Ltd.",
} as const;

/** Headline is rendered one <span> per glyph so the car lights it letter by letter. */
export const HEADLINE_WORDS = ["WELCOME", "TO", "ITFIZZ"] as const;
export const HEADLINE_TEXT = "Welcome to ITFIZZ";

export const HERO_LEDE =
  "Every counter, courier and support call on one timeline. ITFIZZ turns a kitchen's shift into a board your team can run — and proves the delta every Monday.";

export type HeroStat = {
  label: string;
  value: string;
  window: string;
  direction: "up" | "down";
};

/** First-screen scoreboard. */
export const HERO_STATS: HeroStat[] = [
  { label: "Pickup-point usage", value: "58%", window: "vs. last quarter", direction: "up" },
  { label: "Support calls / 1k orders", value: "23%", window: "within 60 days", direction: "down" },
  { label: "Repeat order rate", value: "27%", window: "month over month", direction: "up" },
  { label: "Cost per delivery", value: "40%", window: "at constant volume", direction: "down" },
];

export type Milestone = {
  /** mono index shown on the card, matching the tick on the journey rail */
  step: string;
  tag: string;
  value: string;
  text: string;
  /** small mono line that gives the number a source */
  context: string;
  direction: "up" | "down";
  /** which side of the road the sign stands on */
  side: "above" | "below";
  /**
   * Where the stop sits on the car's journey, as a fraction of the *report*
   * (0 = the car has not left, 1 = the run is over). The sign slides into the
   * frame with the car, so the first one can still "arrive" after it.
   */
  progress: number;
  /**
   * Falls back to roughly 30% into the descent when the viewport cannot fit a
   * sign at the ideal spot (narrow screens pin every sign to one slot).
   */
  align: number;
};

/** The four KPIs the car drives past. */
export const MILESTONES: Milestone[] = [
  {
    step: "01",
    tag: "Pickup points",
    value: "58%",
    text: "More pickups logged per point once the board started sequencing them.",
    context: "9 kitchens",
    direction: "up",
    side: "above",
    progress: 0.08,
    align: 0.28,
  },
  {
    step: "02",
    tag: "Support desk",
    value: "23%",
    text: "Fewer calls per thousand orders. Exceptions route themselves.",
    context: "4,100 calls audited",
    direction: "down",
    side: "above",
    progress: 0.38,
    align: 0.42,
  },
  {
    step: "03",
    tag: "Repeat orders",
    value: "27%",
    text: "Customers ordering again inside thirty days.",
    context: "month over month",
    direction: "up",
    side: "above",
    progress: 0.62,
    align: 0.34,
  },
  {
    step: "04",
    tag: "Unit economics",
    value: "40%",
    text: "Lower cost per delivery at the same order volume.",
    context: "same fleet, same SKUs",
    direction: "down",
    side: "above",
    progress: 0.88,
    align: 0.36,
  },
];

/** What the rail reads out before the first stop. */
export const RAIL_LABEL_START = "Run overview";

export const HOW_IT_WORKS = {
  eyebrow: "How it works",
  title: "Three weeks, no new hardware.",
  body: "ITFIZZ sits on top of the tools your kitchens already run. Nothing gets replaced, and nothing gets ripped out on a Friday night.",
  steps: [
    {
      step: "01",
      title: "Ingest",
      body: "Connect the POS, courier webhooks and call logs. First board is live the same afternoon — no data team required.",
    },
    {
      step: "02",
      title: "Sequence",
      body: "Every order takes a slot on the live board. Whatever is at risk floats to the top before a customer notices.",
    },
    {
      step: "03",
      title: "Prove",
      body: "Four numbers, one weekly delta, exportable before the finance review. If a kitchen slips, you see it that week.",
    },
  ],
};

/** Before → after pairs behind the headline percentages. */
export const METRICS = {
  eyebrow: "Metrics",
  title: "The four numbers, before and after.",
  body: "Measured across fourteen kitchens over one quarter. Same menus, same fleet, same headcount — the only change was the board.",
  footnote: "Source: pilot cohort, Jan–Mar 2026. Figures rounded.",
  rows: [
    {
      metric: "Pickup-point usage per shift",
      before: "41",
      after: "65",
      delta: "+58%",
      direction: "up" as const,
      axis: "% of capacity",
    },
    {
      metric: "Support calls / 1,000 orders",
      before: "18.4",
      after: "14.2",
      delta: "−23%",
      direction: "down" as const,
      axis: "calls",
    },
    {
      metric: "Repeat order rate (30 days)",
      before: "22%",
      after: "28%",
      delta: "+27%",
      direction: "up" as const,
      axis: "share of customers",
    },
    {
      metric: "Cost per delivery",
      before: "₹38.40",
      after: "₹23.00",
      delta: "−40%",
      direction: "down" as const,
      axis: "per order",
    },
  ],
};

export const FIELD_NOTES = {
  eyebrow: "Field notes",
  quote:
    "We stopped guessing which counter was slow. The board tells us before the rush does — and I can show the owner the same four numbers every week.",
  author: "Priya Menon",
  role: "Operations lead · 14 kitchens",
};

export const PILOT = {
  title: "Run one week on your own numbers.",
  body: "We import your last ninety days, replay them on the board, and show you where the minutes actually go. No commitment, no hardware.",
  cta: { label: "Start a pilot", href: `mailto:${BRAND.contact}?subject=ITFIZZ%20pilot` },
  note: "Typical pilot: one kitchen, two weeks, your data stays yours.",
};

export const FOOTER = {
  columns: [
    {
      title: "Product",
      links: [
        { label: "Overview", href: "#hero" },
        { label: "How it works", href: "#how" },
        { label: "Metrics", href: "#metrics" },
        { label: "Start a pilot", href: "#pilot" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "Field notes", href: "#notes" },
        { label: "Contact", href: `mailto:${BRAND.contact}` },
      ],
    },
  ],
  status: "All systems operational",
  finePrint:
    "A design assignment: the product, the quote and the figures above are illustrative. Built with Next.js, Tailwind CSS and GSAP ScrollTrigger.",
};
