export default function ProductsLoading() {
  return (
    <main aria-busy="true" aria-live="polite">
      <div className="page-head">
        <h1>Produits</h1>
      </div>
      <span className="visually-hidden">Chargement des produits…</span>
      <ul className="product-list" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <li key={index} className="skeleton" />
        ))}
      </ul>
    </main>
  );
}
