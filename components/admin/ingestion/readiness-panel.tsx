import type { ProductReadiness } from "@/features/catalog/readiness";

export function ReadinessPanel({
  readiness,
  labels,
}: {
  readiness: ProductReadiness;
  labels: {
    title: string;
    ready: string;
    blocked: string;
    confirm: string;
    publish: string;
  } & Record<string, string>;
}) {
  return (
    <section
      className={`admin-panel readiness-panel ${readiness.ready ? "is-ready" : "is-blocked"}`}
      aria-labelledby="readiness-heading"
    >
      <p className="eyebrow">PUBLICATION GATE</p>
      <h2 id="readiness-heading">{labels.title}</h2>
      <p role="status">{readiness.ready ? labels.ready : labels.blocked}</p>
      {!readiness.ready ? (
        <ul>
          {readiness.blockers.map((blocker) => (
            <li key={`${blocker.group}-${blocker.code}`}>
              <strong>{blocker.group}</strong> ·{" "}
              {labels[blocker.code] ?? blocker.code}
            </li>
          ))}
        </ul>
      ) : null}
      {readiness.warnings.length ? (
        <div className="admin-notice" role="status">
          <ul>
            {readiness.warnings.map((warning) => (
              <li key={`${warning.group}-${warning.code}`}>
                <strong>{warning.group}</strong> ·{" "}
                {labels[warning.code] ?? warning.code}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
