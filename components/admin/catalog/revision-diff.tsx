export type CatalogRevision = {
  id: number;
  version: number;
  kind: string;
  changedFields: string[];
  note: string;
  createdAt: string;
  snapshot?: unknown;
};

function compactSnapshot(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object") return "—";
  const text = JSON.stringify(snapshot, null, 2);
  return text.length > 4000 ? `${text.slice(0, 4000)}\n…` : text;
}

export function RevisionDiff({
  revisions,
  labels,
}: {
  revisions: CatalogRevision[];
  labels: Record<string, string>;
}) {
  return (
    <ol className="revision-timeline">
      {revisions.map((revision, index) => {
        const previous = revisions[index + 1];
        return (
          <li key={revision.id}>
            <div className="revision-heading">
              <span className={`status-chip status-${revision.kind}`}>
                {revision.kind}
              </span>
              <strong>v{revision.version}</strong>
              <time dateTime={revision.createdAt}>
                {formatBusinessDateTime(revision.createdAt)}
              </time>
            </div>
            <p>{revision.note}</p>
            <p className="muted-copy">
              {labels.changedFields}: {revision.changedFields.join(", ") || "—"}
            </p>
            <details>
              <summary>
                {previous
                  ? labels.compareVersions
                      .replace("{current}", String(revision.version))
                      .replace("{previous}", String(previous.version))
                  : labels.viewSnapshot}
              </summary>
              <pre className="revision-snapshot">
                {compactSnapshot(revision.snapshot)}
              </pre>
            </details>
          </li>
        );
      })}
    </ol>
  );
}
import { formatBusinessDateTime } from "@/lib/datetime/format";
