import type { ReactNode } from "react";

export function Pagination({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <nav className="pagination" aria-label={label}>
      <ul>{children}</ul>
    </nav>
  );
}
