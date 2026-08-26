"use server";

import {
  reorderCollectionFormAction as reorderCatalogCollection,
  saveCollectionFormAction as saveCatalogCollection,
} from "@/features/catalog/admin-actions";

export async function saveCollectionFormAction(
  formData: FormData,
): Promise<void> {
  await saveCatalogCollection(formData);
}

export async function reorderCollectionFormAction(
  formData: FormData,
): Promise<void> {
  await reorderCatalogCollection(formData);
}
