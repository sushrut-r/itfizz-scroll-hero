"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Mark from "@/components/Mark";
import {
  BRAND,
  HEADLINE_TEXT,
  HEADLINE_WORDS,
  HERO_LEDE,
  HERO_STATS,
  MILESTONES,
  RAIL_LABEL_START,
} from "@/lib/content";
import { clamp01, easeOutCubic, emerge, range } from "@/lib/motion";

/* ================================================================== *
 * Tunables
 * ------------------------------------------------------------------
 * Every scroll value is a fraction of the scene's total scroll length
 * (the "runway"), so the story keeps its rhythm on any screen size
 * instead of being tied to hard-coded pixel offsets.
 * ================================================================== */

/**
 * The story has three acts, expressed as fractions of the scene's total scroll
 * length so the rhythm survives any screen size.
 *
 *   1. the run     — the car drives, its headlights sweep the surface, and the
 *                    words it has already passed light up behind it
 *   2. the stops   — a road sign slides into frame with the car at each KPI
 *   3. the report  — the run is over and the dashboard lands
 */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const DRIVE = { start: 0.05, end: 0.92 } as const;

/**
 * The run is derived from the headline itself: the car starts just inside the
 * left edge, drives until it has cleared the last word, and stops.
 *   · RUN_INSET — where the car rests at load, as a share of the viewport
 *   · RUN_OUT   — how far past the last word the run ends, in car lengths
 */
const RUN_INSET = 0.03;
const RUN_OUT = 0.3;
/**
 * The drive is front-loaded and settles at the end: the car gets moving as soon
 * as you scroll, then eases off as it finishes writing the last word.
 */
const driveEase = (t: number): number => 1 - Math.pow(1 - t, 1.45);

/**
 * Where the words light up, measured from the car's nose. The pool of light sits
 * just behind the car (0.14 car lengths), so a glyph comes on only once the car
 * has already driven over it — never ahead of the car. Words stay lit, so the
 * phrase accumulates in the car's wake.
 */
const GLOW_LAG = 0.14;
/** One glyph comes up over this fraction of the run (≈1.5 glyphs at a time). */
const GLYPH_FADE = 0.04;

/** A sign slides in over the first / last share of its window. */
const SIGN_RAMP = 0.18;
/** Slightly before its slot resolves, so the sign is always in place in time. */
const SIGN_REACH = 0.16;
/** How far a sign slides in from as it arrives, in px. */
const SIGN_SLIDE = 22;

/** The report lands once the run is over. */
const REPORT = {
  lede: { from: 0.93, to: 0.985, y: 20 },
  stats: { from: 0.945, to: 1, y: 24 },
} as const;

/** Scrub smoothing in seconds — the inertia that decouples motion from events. */
const SCRUB = 0.6;

/**
 * The opening frame is deliberately bare — just the car and its road. The
 * "scroll" cue only appears if the visitor has not moved for this long.
 * Set to 0 to show it immediately, or Infinity to never show it.
 */
const HINT_DELAY_MS = 2800;

type Letter = { el: HTMLElement; key: number };

type Geometry = {
  vw: number;
  vh: number;
  carW: number;
  startX: number;
  endX: number;
  travel: number;
  compact: boolean;
  letters: Letter[];
};

export default function HeroScene() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const rigRef = useRef<HTMLDivElement>(null);
  const spriteRef = useRef<HTMLImageElement>(null);
  const bootRef = useRef<HTMLDivElement>(null);
  /** handle on the paused intro timeline, so the boot gate can start it */
  const introRef = useRef<gsap.core.Timeline | null>(null);

  const [booted, setBooted] = useState(false);

  /* ---------------------------------------------------------------- *
   * Boot gate — hold the intro until the sprite is decoded so the car
   * never pops in after everything else has landed. A watchdog keeps a
   * slow network from stalling the hero.
   * ---------------------------------------------------------------- */
  useEffect(() => {
    const sprite = spriteRef.current;
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      setBooted(true);
    };

    if (!sprite || (sprite.complete && sprite.naturalWidth > 0)) {
      const raf = requestAnimationFrame(done);
      return () => cancelAnimationFrame(raf);
    }

    sprite.addEventListener("load", done, { once: true });
    sprite.addEventListener("error", done, { once: true });
    const watchdog = window.setTimeout(done, 2500);
    return () => {
      sprite.removeEventListener("load", done);
      sprite.removeEventListener("error", done);
      window.clearTimeout(watchdog);
    };
  }, []);

  /* ---------------------------------------------------------------- *
   * The scene: measure once, then render transforms from a single
   * scrubbed progress value (never from the raw scroll event).
   * ---------------------------------------------------------------- */
  useEffect(() => {
    const scene = sceneRef.current;
    const stage = stageRef.current;
    const rig = rigRef.current;
    if (!scene || !stage || !rig) return;

    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    /* ---- element handles: GSAP owns every transform in this subtree ---- */
    const all = <T extends Element>(sel: string): T[] =>
      gsap.utils.toArray<T>(stage.querySelectorAll(sel));

    const els = {
      boot: bootRef.current,
      sprite: spriteRef.current,
      letters: all<HTMLElement>(".headline__letter"),
      lede: stage.querySelector<HTMLElement>(".hero-lede"),
      statsStrip: stage.querySelector<HTMLElement>(".metrics-strip"),
      statItems: all<HTMLElement>(".stat"),
      hudTop: stage.querySelector<HTMLElement>(".hud--top"),
      hudTrace: stage.querySelector<HTMLElement>(".hud__trace"),
      hudHint: stage.querySelector<HTMLElement>(".hud__hint"),
      readout: stage.querySelector<HTMLElement>("[data-readout]"),
      readoutShort: stage.querySelector<HTMLElement>(".hud__readout-short"),
      readoutFull: stage.querySelector<HTMLElement>(".hud__readout-full"),
      railFill: stage.querySelector<HTMLElement>(".hud__rail-fill"),
      ticks: all<HTMLElement>(".hud__tick"),
      tickLabels: all<HTMLElement>(".hud__tick-label"),
      lane: stage.querySelector<HTMLElement>(".road__lane"),
      cursor: stage.querySelector<HTMLElement>(".road__cursor"),
      cursorLabel: stage.querySelector<HTMLElement>(".road__cursor-label"),
      streaks: all<HTMLElement>(".car-rig__streaks span"),
      cardSlots: all<HTMLElement>(".milestone"),
      cardBoxes: all<HTMLElement>(".milestone__inner"),
    };

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ---- measured geometry — refreshed on resize, never per frame ---- */
    const geo: Geometry = {
      vw: 0,
      vh: 0,
      carW: 0,
      startX: 0,
      endX: 0,
      travel: 0,
      compact: false,
      letters: [],
    };

    /**
     * Reads layout exactly once per refresh:
     *  • sizes the runway so the journey always gets ~0.6 viewport of scroll
     *  • parks each milestone card where the car will be when it arrives
     *  • caches each glyph's beam value, using offset* (transform-independent)
     *    so a mid-scene resize can never poison the measurements
     */
    const measure = () => {
      geo.vw = stage.clientWidth;
      geo.vh = stage.clientHeight;
      geo.carW = rig.offsetWidth;
      geo.compact = window.matchMedia("(max-width: 820px)").matches;

      // --- glyph positions, in the glow's own coordinate space -------------
      // offset* is used (not getBoundingClientRect) because it ignores the
      // transforms GSAP is applying, so a mid-scene resize stays correct.
      const headline = els.letters[0]?.closest(".headline") as HTMLElement | null;
      const keyOf = (el: HTMLElement) =>
        (headline?.offsetLeft ?? 0) + el.offsetLeft + el.offsetWidth / 2;
      let keys = els.letters.map(keyOf);
      if (!keys.length) keys = [geo.vw * 0.3, geo.vw * 0.7];

      // --- the run: left edge → clear of the last word --------------------
      // Reading order is not x order once the headline wraps, so the extremes
      // are taken over the glyphs themselves.
      const edge = geo.vw - geo.carW - geo.vw * 0.02; // a whole car, on screen
      const runEnd = (last: number) => last + geo.carW * RUN_OUT;
      let endX = Math.min(runEnd(Math.max(...keys)), geo.vw * 1.06);

      // If the words would push the car off the right edge, slide the headline
      // left by the difference — as far as the left edge allows — so the run can
      // finish with the whole car in frame.
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

      // The run gets ~one extra viewport of scroll for the report to land in.
      const runway = geo.compact
        ? Math.max(geo.travel + geo.vh * 0.9, geo.vh * 2.4)
        : Math.min(Math.max(geo.travel + geo.vh * 0.85, geo.vh * 2.2), 5600);
      const nextHeight = `${Math.round(runway)}px`;
      if (scene.style.height !== nextHeight) scene.style.height = nextHeight;

      // --- park each stop's sign ------------------------------------------
      // A sign stands where the car will be when it arrives (measured with the
      // same eased drive), nudged ahead of the car and clamped on screen. It is
      // measured against the finished layout, so nothing has to be re-read per
      // frame — GSAP only animates the sign's offset from this spot.
      els.cardSlots.forEach((slot, i) => {
        const milestone = MILESTONES[i];
        if (!milestone) return;

        const carAt = geo.startX + driveEase(milestone.progress) * geo.travel;
        // the sign slides in from 22px right of its slot, so the slot has to
        // sit that much further inside the frame
        const margin = SIGN_SLIDE + 16;
        const half = slot.offsetWidth / 2;
        const centre = Math.min(
          Math.max(carAt + geo.carW * 0.62, margin + half),
          Math.max(geo.vw - margin - half, margin + half),
        );
        slot.style.left = `${Math.round(centre)}px`;
      });
    };

    /* ---- the renderer: transforms, opacity and class toggles only ---- */
    let prevT = 0;
    let velocity = 0;
    let lastStop = -1;
    let lastLabel = -1;
    let latest = 0;
    let hintArmed = false;

    const render = (progress: number) => {
      if (!geo.vw) return;
      const p = clamp01(progress);
      latest = p;

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
      if (els.hudTrace) {
        gsap.set(els.hudTrace, { opacity: range(p, 0.04, 0.12) });
      }

      /* ---- act 1: the run ---- */
      const t = driveEase(range(p, DRIVE.start, DRIVE.end));
      const x = geo.startX + t * geo.travel;
      gsap.set(rig, { x });

      // damped speed estimate → streaks and the road markings (1 frame of lag)
      velocity = velocity * 0.74 + Math.min(Math.abs(t - prevT), 0.08) * 0.26;
      prevT = t;
      const rush = clamp01(velocity * 26);

      els.streaks.forEach((streak, i) => {
        gsap.set(streak, { scaleX: rush * (1 - i * 0.16), opacity: rush * (0.9 - i * 0.22) });
      });

      /* ---- the words light up *behind* the car -------------------------
       * `glow` is the trailing edge of the light the car is casting. A glyph
       * only starts coming up once that has swept past it, so nothing is ever
       * lit ahead of the car; the glyphs stay on, so the phrase accumulates in
       * the car's wake. */
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

      /* ---- the road cursor: the line the car is sitting on right now ---- */
      if (els.cursor) {
        gsap.set(els.cursor, { x: x + geo.carW * 0.5, opacity: range(t, 0.01, 0.08) * 0.9 });
      }
      if (els.lane) {
        gsap.set(els.lane, { x: -(t * geo.vw * 0.6 + rush * 40) });
      }

      /* ---- act 2: road signs, arriving with the car --------------------- */
      let active = -1;
      let strongest = 0;
      MILESTONES.forEach((milestone, i) => {
        const box = els.cardBoxes[i];
        if (!box) return;

        const on = emerge(
          t,
          Math.max(0, milestone.progress - SIGN_REACH),
          milestone.progress + SIGN_REACH,
          SIGN_RAMP,
          0.6,
        );

        gsap.set(box, {
          // own layer: GSAP writes x/y/scale, CSS owns the placement
          x: (1 - on) * SIGN_SLIDE,
          y: (1 - on) * 26,
          opacity: on,
          scale: 0.97 + on * 0.03,
        });

        if (on > strongest) {
          strongest = on;
          active = i;
        }
      });

      // the readout and the road-side label name whatever sign is on screen
      if (active !== lastStop) {
        lastStop = active;
        if (els.cursorLabel) {
          els.cursorLabel.textContent = active === -1 ? "" : MILESTONES[active].step;
        }
      }
      if (els.cursorLabel) els.cursorLabel.style.opacity = strongest > 0.15 ? "1" : "0";

      /* ---- act 3: the report ------------------------------------------- */
      const reveal = (el: HTMLElement | null, stage: { from: number; to: number; y: number }, i = 0) => {
        if (!el) return;
        const on = easeOutCubic(range(p, stage.from + i * 0.012, stage.to + i * 0.012));
        gsap.set(el, { opacity: on, y: (1 - on) * stage.y });
      };
      reveal(els.lede, REPORT.lede);
      reveal(els.statsStrip, { ...REPORT.stats, y: 0 });
      const strip = range(p, REPORT.stats.from, REPORT.stats.to);
      els.statItems.forEach((item, i) => {
        const on = easeOutCubic(clamp01((strip - i * 0.16) / 0.5));
        gsap.set(item, { opacity: on, y: (1 - on) * REPORT.stats.y });
      });

      /* ---- instrumentation ---- */
      if (els.railFill) gsap.set(els.railFill, { scaleX: t });
      els.ticks.forEach((tick, i) => {
        const passed = t >= (MILESTONES[i]?.progress ?? 0.5) - 0.02;
        tick.classList.toggle("is-passed", passed);
        els.tickLabels[i]?.classList.toggle("is-passed", passed);
      });
      if (els.readout) {
        // whatever the car is closest to naming: the sign on screen wins,
        // otherwise the last one it has passed
        let index = active;
        if (index === -1) {
          MILESTONES.forEach((milestone, i) => {
            if (t >= milestone.progress - 0.04) index = i;
          });
        }
        if (index !== lastLabel) {
          lastLabel = index;
          const short =
            index === -1 ? RAIL_LABEL_START : `${MILESTONES[index].step}/${MILESTONES.length}`;
          const full =
            index === -1 ? RAIL_LABEL_START : `${MILESTONES[index].step} · ${MILESTONES[index].tag}`;
          if (els.readoutShort) els.readoutShort.textContent = short;
          if (els.readoutFull) els.readoutFull.textContent = full;
        }
      }
    };

    /* ---- the first screen holds nothing but the road and the car ---- */
    gsap.set(els.letters, { opacity: 0 }); // the car's lights switch them on
    gsap.set(els.cardBoxes, { opacity: 0, y: 26, scale: 0.97 });
    gsap.set(els.streaks, { scaleX: 0, opacity: 0 });
    if (els.hudTop) gsap.set(els.hudTop, { opacity: 0, y: -12 });
    if (els.hudHint) gsap.set(els.hudHint, { opacity: 0 });
    if (els.hudTrace) gsap.set(els.hudTrace, { opacity: 0 });
    if (els.cursor) gsap.set(els.cursor, { opacity: 0 });
    if (els.lede) gsap.set(els.lede, { opacity: 0, y: REPORT.lede.y });
    if (els.statsStrip) gsap.set(els.statsStrip, { opacity: 0 });
    gsap.set(els.statItems, { opacity: 0, y: REPORT.stats.y });

    measure();

    /* ---- the intro: only what belongs to the opening frame ---- */
    const intro = gsap.timeline({ paused: true, defaults: { ease: "expo.out" } });
    if (els.boot) {
      intro.to(els.boot, { autoAlpha: 0, duration: 0.45, ease: "power2.inOut" }, 0);
    }
    if (els.sprite) {
      intro.fromTo(
        els.sprite,
        { opacity: 0, scale: 0.96 },
        { opacity: 1, scale: 1, duration: 1.1 },
        0.25,
      );
    }
    introRef.current = intro;

    /* ---- scroll: one proxy tween drives the whole scene ---- *
     * Scrub-ed smoothing decouples the motion from the scroll event rate, and a
     * single onUpdate renders everything — no per-event work, no layout reads,
     * no ScrollTrigger pin (the stage is `position: sticky`). */
    const proxy = { p: 0 };
    const scrubbed = gsap.to(proxy, {
      p: 1,
      ease: "none",
      scrollTrigger: {
        trigger: scene,
        start: "top top",
        end: "bottom bottom",
        scrub: reduceMotion ? true : SCRUB,
        invalidateOnRefresh: true,
      },
      onUpdate: () => render(proxy.p),
    });

    /* ---- re-measure before ScrollTrigger recalculates its positions ---- */
    const onRefreshInit = () => measure();
    ScrollTrigger.addEventListener("refreshInit", onRefreshInit);

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        measure();
        ScrollTrigger.refresh();
      }, 150);
    };
    window.addEventListener("resize", onResize);

    // Webfonts change the headline's metrics → measure again once they land.
    document.fonts?.ready
      .then(() => {
        measure();
        ScrollTrigger.refresh();
      })
      .catch(() => {});

    // Paint the opening frame: the car and its road, nothing else.
    render(0);

    // Nothing but the car and the road at first — the hint waits for a pause.
    const hintTimer = window.setTimeout(() => {
      hintArmed = true;
      render(latest);
    }, HINT_DELAY_MS);

    // Reloading mid-page? Skip the intro and paint the scrubbed state instead.
    if (window.scrollY > 24) {
      intro.progress(1).pause();
      render(clamp01(window.scrollY / Math.max(scene.offsetHeight - geo.vh, 1)));
    } else if (reduceMotion) {
      intro.progress(1).pause();
      render(0);
    }

    // The first scroll retires the intro so nothing competes with the scrub.
    const retireIntro = () => {
      if (intro.progress() < 1) intro.progress(1).pause();
    };
    window.addEventListener("scroll", retireIntro, { passive: true, once: true });

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", retireIntro);
      window.clearTimeout(resizeTimer);
      window.clearTimeout(hintTimer);
      ScrollTrigger.removeEventListener("refreshInit", onRefreshInit);
      scrubbed.scrollTrigger?.kill();
      scrubbed.kill();
      intro.kill();
      introRef.current = null;
      gsap.killTweensOf([
        ...els.letters,
        ...els.cardBoxes,
        ...els.statItems,
        ...(els.sprite ? [els.sprite] : []),
      ]);
    };
  }, []);

  /* Play the intro the moment the sprite is ready. */
  useEffect(() => {
    if (!booted) return;
    introRef.current?.play(0);
  }, [booted]);

  return (
    <section id="hero" ref={sceneRef} className="scene" aria-label="ITFIZZ impact metrics">
      <div ref={stageRef} className="viewport">
        <div className="stage-vignette" aria-hidden="true" />

        {/* ---------- road ---------- */}
        <div className="road" aria-hidden="true">
          <div className="road__ticks" />
          <div className="road__lane" />
          {/* the line the car is sitting on right now */}
          <div className="road__cursor">
            <span className="road__cursor-label" />
          </div>
        </div>

        {/* ---------- headline, drawn on the road ---------- */}
        <h1 className="headline">
          <span className="sr-only">{HEADLINE_TEXT}</span>
          {HEADLINE_WORDS.map((word, w) => (
            <span className="headline__word" key={word}>
              {Array.from(word).map((glyph, i) => (
                <span className="headline__letter" key={`${word}-${glyph}-${i}`} aria-hidden="true">
                  {glyph}
                </span>
              ))}
              {w === 0 ? <span className="headline__break" aria-hidden="true" /> : null}
            </span>
          ))}
        </h1>

        {/* ---------- hero car ---------- */}
        <div ref={rigRef} className="car-rig" aria-hidden="true">
          <div className="car-rig__shadow" />
          <div className="car-rig__beam" />
          <div className="car-rig__streaks">
            <span />
            <span />
            <span />
          </div>
          <picture>
            <source srcSet={`${BASE_PATH}/car-top.webp`} type="image/webp" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={spriteRef}
              className="car-sprite"
              src={`${BASE_PATH}/car-top.png`}
              alt=""
              width={720}
              height={338}
              decoding="async"
              fetchPriority="high"
              draggable={false}
            />
          </picture>
        </div>

        {/* ---------- hero copy ---------- */}
        <p className="hero-lede">{HERO_LEDE}</p>

        {/* ---------- first-screen scoreboard ---------- */}
        <div className="metrics-strip">
          {HERO_STATS.map((stat) => (
            <div className="stat" key={stat.label}>
              <span className="stat__label">{stat.label}</span>
              <span className="stat__value">
                <span className="stat__arrow" aria-hidden="true">
                  {stat.direction === "up" ? "↑" : "↓"}
                </span>
                {stat.value}
              </span>
              <span className="stat__window">{stat.window}</span>
            </div>
          ))}
        </div>

        {/* ---------- milestone cards ---------- */}
        <div className="milestones">
          {MILESTONES.map((milestone) => (
            <article
              className={`milestone milestone--${milestone.side} milestone--${milestone.direction}`}
              key={milestone.tag}
            >
              <div className="milestone__inner">
                <div className="milestone__head">
                  <span className="milestone__step">{milestone.step}</span>
                  <span>{milestone.tag}</span>
                </div>
                <span className="milestone__value">{milestone.value}</span>
                <span className="milestone__text">{milestone.text}</span>
                <span className="milestone__context">{milestone.context}</span>
              </div>
              <div className="milestone__stem" />
            </article>
          ))}
        </div>

        {/* ---------- HUD ---------- */}
        <header className="hud hud--top">
          <a className="hud__brand" href="#hero">
            <Mark />
            {BRAND.name}
          </a>
          <nav className="hud__links" aria-label="Primary">
            {BRAND.nav.map((item) => (
              <a href={item.href} key={item.href}>
                {item.label}
              </a>
            ))}
            <a className="hud__cta" href={BRAND.cta.href}>
              {BRAND.cta.label}
            </a>
          </nav>
        </header>

        <div className="hud__trace">
          <span className="hud__trace-label">Shift trace</span>
          <div className="hud__rail">
            <div className="hud__rail-line" />
            <div className="hud__rail-fill" />
            {MILESTONES.map((milestone) => (
              <span key={`tick-${milestone.step}`}>
                <span className="hud__tick" style={{ left: `${milestone.progress * 100}%` }} />
                <span className="hud__tick-label" style={{ left: `${milestone.progress * 100}%` }}>
                  {milestone.step}
                </span>
              </span>
            ))}
          </div>
          <span className="hud__readout" data-readout>
            <span className="hud__readout-short">{RAIL_LABEL_START}</span>
            <span className="hud__readout-full">{RAIL_LABEL_START}</span>
          </span>
        </div>

        <div className="hud__hint">
          Scroll
          <span className="hud__hint-arrow" aria-hidden="true">
            ↓
          </span>
        </div>

        {/* ---------- boot veil ---------- */}
        <div ref={bootRef} className="boot" aria-hidden="true">
          <div className="boot__inner">
            <span>Loading scene</span>
            <span className="boot__track">
              <span className="boot__fill" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
