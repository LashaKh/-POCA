export default function CatalogLoading() {
  return (
    <div className="catalog-loading" aria-busy="true">
      <div className="catalog-loading-title" />
      <div className="product-grid" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <div className="product-skeleton" key={index} />
        ))}
      </div>
      <p className="visually-hidden" role="status">
        Loading published catalog.
      </p>
    </div>
  );
}
