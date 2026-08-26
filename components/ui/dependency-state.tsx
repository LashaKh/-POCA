import type { ReactNode } from "react";

export function DependencyState({
  state,
  title,
  children,
  action,
}: {
  state: "disabled" | "degraded" | "unavailable";
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section
      className={`dependency-state dependency-state-${state}`}
      role={state === "unavailable" ? "alert" : "status"}
      aria-labelledby={`dependency-${state}-title`}
    >
      <h2 id={`dependency-${state}-title`}>{title}</h2>
      <div>{children}</div>
      {action ? <div className="dependency-state-action">{action}</div> : null}
    </section>
  );
}
