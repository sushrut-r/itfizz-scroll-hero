import { HOW_IT_WORKS } from "@/lib/content";

/** Three-step explanation. Numbers in mono, hairline dividers, no icon soup. */
export default function HowItWorks() {
  return (
    <section id="how" className="band">
      <div className="shell">
        <p className="eyebrow">{HOW_IT_WORKS.eyebrow}</p>
        <h2 className="title">{HOW_IT_WORKS.title}</h2>
        <p className="lede">{HOW_IT_WORKS.body}</p>

        <div className="steps">
          {HOW_IT_WORKS.steps.map((step) => (
            <article className="step" key={step.step}>
              <p className="step__index">{step.step}</p>
              <h3 className="step__title">{step.title}</h3>
              <p className="step__body">{step.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
