# Kya badla — "car aage, text peeche" + saaf first screen + solid car PNG

Teen cheezein fix hui hain. Neeche file-by-file likha hai: **kahan → kya replace karo**.
Sabse aasan tareeka (VS Code me): agar tumhare local folder me git hai to

```bash
git apply patch-car-leads.diff      # ya: patch -p1 < patch-car-leads.diff
```

warna har file ka updated version workspace me maujood hai — copy-paste kar lo.
Files jo badli hain: `components/HeroScene.tsx`, `lib/content.ts`, `lib/motion.ts`,
`app/scene.css`, `tools/process-car.py`, `README.md` (+ nayi car image, ek command se).

---

## 1. Car ka PNG — text ab car ke aar-paar nahi dikhega

**Kya galat tha:** `raw/car-top-raw.png` me car ka **dark tinted glass** bhi green-dominant hai
(backdrop ka reflection). Purana chroma-key (sirf "green zyada hai" test) us glass ko background
maan leta tha, to car ke body me **19,342 transparent pixels** ban gaye the — 25.6% car ka area,
aur 11,113 pixels theek wahan jahan headline baithta hai. Isi liye text car ke through dikhta tha.

**File:** `tools/process-car.py`

**(a) constants — `GREEN_MIN_LUMA` add karo:**

```python
KEY_TOLERANCE = 110.0                              # per-pixel RGB distance
# A green-dominant pixel only counts as backdrop if it is this bright. The dark
# tinted glass (lum ~60) is excluded, which is what keeps the car solid.
GREEN_MIN_LUMA = 95.0
EDGE_FEATHER = 1.1                                 # mask blur radius (px)
```

**(b) import:**

```python
from scipy.ndimage import binary_closing, binary_erosion, binary_fill_holes, label
```

**(c) steps 2–4 (chroma key se lekar alpha tak) is poore block se replace karo:**

```python
    # --- 2. chroma key -------------------------------------------------------
    dist = np.sqrt(((rgb - CHROMA) ** 2).sum(axis=2))
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    lum = r * 0.2126 + g * 0.7152 + b * 0.0722
    green_dominant = (g > r * 1.15) & (g > b * 1.15) & (g > 70) & (lum > GREEN_MIN_LUMA)
    bg = (dist < KEY_TOLERANCE) | green_dominant

    # --- 3. a solid silhouette -----------------------------------------------
    # Close hairline cracks in the key first (they are what let the road show
    # through the roof), fill what is enclosed, then keep the largest blob so
    # stray specks never make it into the sprite.
    sil = binary_closing(~bg, iterations=2)
    sil = binary_fill_holes(sil)
    blobs, _ = label(sil)
    sizes = np.bincount(blobs.ravel())
    sizes[0] = 0
    sil = blobs == sizes.argmax()

    # Background inside the silhouette is glass: recolour it, keep it opaque.
    interior_bg = bg & sil
    if interior_bg.any():
        smoked = np.clip(lum[..., None] * np.array([0.62, 0.72, 0.68]), 6, 52)
        rgb[interior_bg] = np.where(
            (lum[interior_bg, None] < 40), smoked[interior_bg], rgb[interior_bg] * 0.35
        )

    # --- 4. de-fringe on the outside edge only ------------------------------
    core = binary_erosion(sil, iterations=2)
    alpha = np.asarray(
        Image.fromarray((core * 255).astype(np.uint8)).filter(
            ImageFilter.GaussianBlur(EDGE_FEATHER)
        ),
        dtype=np.float32,
    )
    alpha = np.clip((alpha - 60.0) * (255.0 / 130.0), 0, 255)
    alpha[core] = 255.0  # guarantee: the interior is never see-through
    alpha[~sil] = 0.0    # hard zero outside the car
```

**Phir chalao:**

```bash
npm run assets        # public/car-top.webp + public/car-top.png dobara banengi
```

Verify (optional but nice) — **0 deep-interior see-through pixels**, aur sprite ka size same
(~720×340 webp, aspect 2.118, isliye `--car-w = car-h * 2.13` waisa hi chalta hai).

> Net effect: 19,342 → **0** see-through pixels car ke andar. Car ab ek solid "card" hai.

---

## 2. First screen — sirf car aur track

**File:** `components/HeroScene.tsx`

**(a) nav ka intro fade hata do.** Ye line delete karo:

```ts
    intro.to(els.hudTop, { opacity: 1, y: 0, duration: 0.7 }, 0.3);
```

**(b) `render()` ke shuru me nav/hint ka block is se replace karo** (nav pura run chhupa rehta hai,
report ke saath wapas aata hai; hint sirf tab jab visitor ~2.8s tak kuch na kare):

```ts
      /* ---- nav: the run owns the screen, the nav returns for the report ---- */
      if (els.hudTop) {
        const back = range(p, REPORT.stats.to - 0.02, 1);
        gsap.set(els.hudTop, { opacity: back, y: (1 - back) * -44 });
      }
      /* the scroll hint only shows up if the visitor just sits there */
      if (els.hudHint) {
        gsap.set(els.hudHint, {
          opacity: (hintArmed ? 1 - range(p, 0.01, 0.06) : 0) * 0.9,
          y: range(p, 0.01, 0.08) * 8,
        });
      }
```

**(c) naya tunable:**

```ts
/**
 * The opening frame is deliberately bare — just the car and its road. The
 * "scroll" cue only appears if the visitor has not moved for this long.
 * Set to 0 to show it immediately, or Infinity to never show it.
 */
const HINT_DELAY_MS = 2800;
```

**(d) pre-intro sets me hint bhi 0 karo** (`gsap.set(els.hudTrace, …)` ke just pehle):

```ts
    if (els.hudHint) gsap.set(els.hudHint, { opacity: 0 });
```

**(e) boot ke baad pehla frame paint karo + timer:**

```ts
    // Paint the opening frame: the car and its road, nothing else.
    render(0);

    // Nothing but the car and the road at first — the hint waits for a pause.
    const hintTimer = window.setTimeout(() => {
      hintArmed = true;
      render(latest);
    }, HINT_DELAY_MS);
```

aur cleanup me `window.clearTimeout(hintTimer);` (aur `let latest = 0; let hintArmed = false;`
renderer ke scope me).

> **Zaroori:** `range()` ko hamesha `from < to` ke saath call karo. `range(p, 1.01, 1)` ulta
> chalta hai aur nav ko har scroll position pe visible kar deta hai (ye bug ek baar aa chuka hai).

---

## 3. Car aage, text peeche

**File:** `components/HeroScene.tsx` — ye sabse bada badlav hai.

**(a) tunables (ENTER/LEAVE hata do):**

```ts
const DRIVE = { start: 0.05, end: 0.92 } as const;

/**
 * The run is derived from the headline itself: the car starts just inside the
 * left edge, drives until it has cleared the last word, and stops.
 */
const RUN_INSET = 0.03;
const RUN_OUT = 0.3;
const driveEase = (t: number): number => 1 - Math.pow(1 - t, 1.45);

/**
 * Where the words light up, measured from the car's nose. The pool of light sits
 * just behind the car (0.14 car lengths), so a glyph comes on only once the car
 * has already driven over it — never ahead of the car.
 */
const GLOW_LAG = 0.14;
const GLYPH_FADE = 0.04;
```

**(b) `measure()` — glyph keys + run ka start/end (headline se derive):**

```ts
      const headline = els.letters[0]?.closest(".headline") as HTMLElement | null;
      const keyOf = (el: HTMLElement) =>
        (headline?.offsetLeft ?? 0) + el.offsetLeft + el.offsetWidth / 2;
      let keys = els.letters.map(keyOf);
      if (!keys.length) keys = [geo.vw * 0.3, geo.vw * 0.7];

      const edge = geo.vw - geo.carW - geo.vw * 0.02;
      const runEnd = (last: number) => last + geo.carW * RUN_OUT;
      let endX = Math.min(runEnd(Math.max(...keys)), geo.vw * 1.06);

      // agar words car ko right edge se bahar dhakel rahe hain to headline ko
      // thoda left nudge karo (clamped), taaki car poora frame me ruke
      let nudge = 0;
      if (endX > edge) {
        const leftRoom = Math.max(Math.min(...keys) - Math.max(20, geo.vw * 0.065), 0);
        nudge = -Math.min(endX - edge, leftRoom);
        if (nudge < -0.5) {
          gsap.set(headline, { x: nudge });
          keys = keys.map((key) => key + nudge);
          endX = Math.min(runEnd(Math.max(...keys)), geo.vw * 1.06);
        }
      }

      geo.letters = els.letters.map((el, i) => ({ el, key: keys[i] }));
      geo.startX = geo.vw * RUN_INSET;
      geo.endX = endX;
      geo.travel = Math.max(geo.endX - geo.startX, geo.carW);
```

**(c) `render()` — drive + letter reveal:**

```ts
      const t = driveEase(range(p, DRIVE.start, DRIVE.end));
      const x = geo.startX + t * geo.travel;
      gsap.set(rig, { x });

      /* ---- the words light up *behind* the car ------------------------- */
      const glow = x - geo.carW * GLOW_LAG;
      for (let i = 0; i < geo.letters.length; i += 1) {
        const letter = geo.letters[i];
        const on = easeOutCubic(clamp01((glow - letter.key) / (geo.travel * GLYPH_FADE)));
        letter.el.style.opacity = on.toFixed(2);
        const lit = on > 0.45;
        if (lit !== letter.el.classList.contains("is-lit")) {
          letter.el.classList.toggle("is-lit", lit);
        }
      }
```

> Yehi asli fix hai: pehle beam car ke **aage** tha aur glyph keys `axisMax * 0.02` se shuru hote
> the — is liye text car se pehle light ho jata tha. Ab light pool car ke **peeche** hai.

**(d) KPI sign: slot = jahan car us waqt hoga** (measure me):

```ts
      els.cardSlots.forEach((slot, i) => {
        const milestone = MILESTONES[i];
        if (!milestone) return;
        const carAt = geo.startX + driveEase(milestone.progress) * geo.travel;
        const margin = SIGN_SLIDE + 16;
        const half = slot.offsetWidth / 2;
        const centre = Math.min(
          Math.max(carAt + geo.carW * 0.62, margin + half),
          Math.max(geo.vw - margin - half, margin + half),
        );
        slot.style.left = `${Math.round(centre)}px`;
      });
```

+(render me) `x: (1 - on) * SIGN_SLIDE` aur `SIGN_SLIDE = 22`, `SIGN_REACH = 0.16`,
`SIGN_RAMP = 0.18`, `hold 0.6`; readout/cursor-label us sign ko follow kare jo
screen pe sabse zyada visible hai (`active`).

**(e) markup:** `.road__trail` ki jagah `.road__cursor` (+ `.road__cursor-label`),
`.hero-eyebrow` hatao, second-car block (`car-rig--loop`) hatao.

---

## 4. `lib/content.ts` — milestones

```ts
  direction: "up" | "down";
  /** which side of the road the sign stands on */
  side: "above" | "below";
  /**
   * Where the stop sits on the car's journey, as a fraction of the *report*
   * (0 = the car has not left, 1 = the run is over).
   */
  progress: number;
  /** Fallback x for narrow screens (share of the viewport width). */
  align: number;
```

aur values: `progress: 0.08 / 0.38 / 0.62 / 0.88`, `side: "above"` (chaaron),
`align: 0.28 / 0.42 / 0.34 / 0.36`, `RAIL_LABEL_START = "Run overview"`.

---

## 5. `lib/motion.ts` — ek naya helper

```ts
export const emerge = (
  value: number,
  from: number,
  to: number,
  ramp = 0.3,
  hold = 0.6,
): number => {
  const t = range(value, from, to);
  const up = ramp > 0 ? t / ramp : 1;
  const down = hold < 1 ? (t - hold) / (1 - hold) : t;
  return Math.min(easeOutCubic(up), 1 - easeOutCubic(down));
};
```

---

## 6. `app/scene.css`

**(a) `.road__trail` block hatao, uski jagah:**

```css
.road__cursor {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 1px;
  background: linear-gradient(to bottom, transparent, rgb(240 169 82 / 55%), transparent);
  will-change: transform;
}

.road__cursor-label {
  position: absolute;
  top: calc(100% + 10px);
  left: 50%;
  translate: -50% 0;
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.14em;
  color: var(--color-accent);
  opacity: 0;
  transition: opacity 0.25s var(--ease-out-expo);
  white-space: nowrap;
}
```

**(b) milestone card:**

```css
.milestone {
  position: absolute;
  left: 0;                 /* JS `left` set karta hai (px me) */
  translate: -50% 0;
  width: clamp(190px, 17vw, 236px);
}
```

**(c) mobile media query se `.milestone { left: 50% !important; }` hata do** — sirf
`width: min(300px, 74vw);` rakho.

---

## Check karne ka tareeka

```bash
npm install
npm run assets          # car image dobara
npx tsc --noEmit
npm run dev             # localhost:3000
```

Kya dekhna hai:

1. **Load pe** sirf car + road (nav, hint, lede, stats kuch nahi). ~2.8s ruk kar dekho to
   "SCROLL ↓" aa jayega — wo jaan-boojh kar hai (`HINT_DELAY_MS`, `Infinity` karo to band).
2. **Scroll karte hi** car chalti hai; jo letter car **peeche chhod** aayi hai wahi light hota
   hai — car ke aage kabhi kuch nahi. Letter lit rehte hain, to "WELCOME TO ITFIZZ" car ke
   wake me banta jaata hai.
3. **Car solid** hai — road ka text car ke through nahi dikhta.
4. Aakhir me car right side pe rukti hai (poori frame me), headline pura lit, lede + 4 stats
   land karte hain, nav wapas aa jaata hai.
