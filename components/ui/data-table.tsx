import type { ReactNode } from "react";

export function DataTable({
  caption,
  children,
}: {
  caption: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className="table-scroll"
      role="region"
      aria-label={typeof caption === "string" ? caption : undefined}
      tabIndex={0}
    >
      <table>
        <caption>{caption}</caption>
        {children}
      </table>
    </div>
  );
}
