import type { CatalogProduct } from "@/features/catalog/types";

type FactLabels = {
  dimensions: string;
  materials: string;
  colors: string;
  origin: string;
};

export function ProductFacts({
  product,
  labels,
}: {
  product: CatalogProduct;
  labels: FactLabels;
}) {
  const facts = [
    product.dimensions
      ? {
          label: labels.dimensions,
          value: `${product.dimensions.widthMm / 10} × ${product.dimensions.lengthMm / 10} cm`,
        }
      : undefined,
    product.materials.length
      ? { label: labels.materials, value: product.materials.join(", ") }
      : undefined,
    product.colors.length
      ? { label: labels.colors, value: product.colors.join(", ") }
      : undefined,
    product.origin
      ? { label: labels.origin, value: product.origin }
      : undefined,
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact));

  return (
    <dl className="product-facts">
      {facts.map((fact) => (
        <div key={fact.label}>
          <dt>{fact.label}</dt>
          <dd>{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
