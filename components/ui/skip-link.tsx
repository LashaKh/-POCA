import type { ReactNode } from "react";

export function SkipLink({
  children,
  href = "#main-content",
}: {
  children: ReactNode;
  href?: string;
}) {
  return (
    <a className="skip-link" href={href}>
      {children}
    </a>
  );
}
