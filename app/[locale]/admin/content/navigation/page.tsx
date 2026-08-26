import { MenuEditor } from "@/components/admin/content/menu-editor";
import { getContentAdminLabels } from "@/features/content/admin-copy";
import { getNavigationAdministration } from "@/features/content/queries";
import { isAppLocale } from "@/i18n/routing";

export default async function ContentNavigationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  const [labels, navigation] = await Promise.all([
    getContentAdminLabels(locale),
    getNavigationAdministration(),
  ]);
  return (
    <main className="admin-main admin-wide" id="main-content">
      <header className="admin-page-header">
        <p className="eyebrow">{labels.eyebrow}</p>
        <h1>{labels.navigation}</h1>
      </header>
      <div className="admin-card-grid">
        {navigation.menus.map((menu) => (
          <MenuEditor
            key={menu.id}
            locale={locale}
            menu={menu}
            labels={labels}
            initialItems={navigation.items
              .filter((item) => item.menu_id === menu.id)
              .map((item) => ({
                itemKey: item.item_key,
                destinationPath: item.destination_path,
                labels: item.labels_i18n,
                position: item.position,
                enabled: item.enabled,
                visibleFrom: item.visible_from,
                visibleUntil: item.visible_until,
              }))}
          />
        ))}
      </div>
    </main>
  );
}
