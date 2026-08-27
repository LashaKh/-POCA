import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

export type Breadcrumb = { label: string; href?: string };

export function Breadcrumbs({
  locale,
  label,
  items,
}: {
  locale: AppLocale;
  label: string;
  items: readonly Breadcrumb[];
}) {
  return (
    <nav className="breadcrumbs" aria-label={label}>
      <ol>
        {items.map((item, index) => {
          const current = index === items.length - 1;
          return (
            <li key={`${item.href ?? "current"}-${item.label}`}>
              {item.href && !current ? (
                <Link href={item.href} locale={locale}>
                  {item.label}
                </Link>
              ) : (
                <span aria-current={current ? "page" : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
