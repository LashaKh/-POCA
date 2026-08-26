import type { ReactNode } from "react";

export function StatePanel({
  title,
  children,
  tone = "neutral",
  loading = false,
  action,
}: {
  title: string;
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "error";
  loading?: boolean;
  action?: ReactNode;
}) {
  return (
    <section
      className={`state-panel state-panel-${tone}`}
      role={tone === "error" ? "alert" : "status"}
      aria-label={title}
      aria-live={tone === "error" ? "assertive" : "polite"}
      aria-busy={loading || undefined}
    >
      <h2>{title}</h2>
      <div>{children}</div>
      {loading ? (
        <div className="state-panel-progress" aria-hidden="true" />
      ) : null}
      {action ? <div className="state-panel-action">{action}</div> : null}
    </section>
  );
}
