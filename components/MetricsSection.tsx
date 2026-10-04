import { METRICS } from "@/lib/content";

/**
 * The sourcing behind the headline percentages: before → after, one row per KPI.
 * A real table (not divs) so it reads correctly in a screen reader and prints.
 */
export default function MetricsSection() {
  return (
    <section id="metrics" className="band band--tint">
      <div className="shell">
        <p className="eyebrow">{METRICS.eyebrow}</p>
        <h2 className="title">{METRICS.title}</h2>
        <p className="lede">{METRICS.body}</p>

        <div className="table-wrap">
          <table className="mtable">
            <caption className="sr-only">
              Before and after results for each metric, measured over one quarter
            </caption>
            <thead>
              <tr>
                <th scope="col">Metric</th>
                <th scope="col">Before</th>
                <th scope="col" aria-hidden="true" />
                <th scope="col">After</th>
                <th scope="col">Delta</th>
              </tr>
            </thead>
            <tbody>
              {METRICS.rows.map((row) => (
                <tr key={row.metric}>
                  <td className="mtable__metric">
                    {row.metric}
                    <span className="mtable__axis">{row.axis}</span>
                  </td>
                  <td className="mtable__cell--was mtable__was">{row.before}</td>
                  <td className="mtable__arrow" aria-hidden="true">
                    →
                  </td>
                  <td className="mtable__cell--now mtable__now">{row.after}</td>
                  <td className={`mtable__delta mtable__delta--${row.direction}`}>{row.delta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="source-note">{METRICS.footnote}</p>
      </div>
    </section>
  );
}
