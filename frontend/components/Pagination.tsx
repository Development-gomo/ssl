import Link from "next/link";

export function Pagination({ basePath, page, totalPages }: { basePath: string; page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  const href = (p: number) => (p === 1 ? basePath : `${basePath}?page=${p}`);
  return (
    <nav className="pagination" aria-label="Pagination">
      {page > 1 ? <Link href={href(page - 1)}>← Newer</Link> : <span />}
      <span>Page {page} of {totalPages}</span>
      {page < totalPages ? <Link href={href(page + 1)}>Older →</Link> : <span />}
    </nav>
  );
}
