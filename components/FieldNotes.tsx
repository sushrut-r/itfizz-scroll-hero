import { FIELD_NOTES } from "@/lib/content";

/** A single quote, given room. Attribution carries the credibility, so it is not decorative. */
export default function FieldNotes() {
  return (
    <section id="notes" className="band">
      <div className="shell">
        <p className="eyebrow">{FIELD_NOTES.eyebrow}</p>
        <div className="note">
          <blockquote className="note__quote">{FIELD_NOTES.quote}</blockquote>
          <p className="note__attribution">
            <span className="note__author">{FIELD_NOTES.author}</span>
            {FIELD_NOTES.role}
          </p>
        </div>
      </div>
    </section>
  );
}
