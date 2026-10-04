import { PILOT } from "@/lib/content";

/** Closing call to action. One decision, stated plainly. */
export default function Pilot() {
  return (
    <section id="pilot" className="band band--tint">
      <div className="shell">
        <div className="pilot">
          <div>
            <h2 className="title">{PILOT.title}</h2>
            <p className="lede">{PILOT.body}</p>
            <p className="pilot__note">{PILOT.note}</p>
          </div>
          <a className="btn btn--accent" href={PILOT.cta.href}>
            {PILOT.cta.label}
            <span className="btn__arrow" aria-hidden="true">
              →
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
