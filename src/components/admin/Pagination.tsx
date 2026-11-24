import Link from 'next/link';

interface PaginationProps {
  basePath: string;
  /** Filtres à conserver d'une page à l'autre (valeurs vides ignorées). */
  params: Record<string, string | undefined>;
  page: number;
  pageCount: number;
}

function href(basePath: string, params: Record<string, string | undefined>, page: number): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  if (page > 1) search.set('page', String(page));
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function Pagination({ basePath, params, page, pageCount }: PaginationProps) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Pagination" className="pagination">
      {page > 1 ? (
        <Link className="btn btn-quiet" href={href(basePath, params, page - 1)} rel="prev">
          ← Précédente
        </Link>
      ) : (
        <span />
      )}
      <span className="help-text">
        Page {page} sur {pageCount}
      </span>
      {page < pageCount ? (
        <Link className="btn btn-quiet" href={href(basePath, params, page + 1)} rel="next">
          Suivante →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
