"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  itemName = "data",
}) {
  if (totalItems === 0) return null;

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  // Helper untuk membuat daftar nomor halaman cerdas dengan ellipsis
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }

    if (currentPage >= totalPages - 3) {
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }

    return [
      1,
      "...",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "...",
      totalPages,
    ];
  };

  const pages = getPageNumbers();

  return (
    <div className="px-5 py-3.5 border-t border-rakta-border bg-rakta-surface/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-rakta-muted">
      {/* Keterangan Data */}
      <div className="flex items-center gap-3">
        <p>
          Menampilkan{" "}
          <span className="font-semibold text-rakta-navy font-mono tabular-nums">
            {totalItems > 0 ? startIndex + 1 : 0}
          </span>
          {" - "}
          <span className="font-semibold text-rakta-navy font-mono tabular-nums">
            {endIndex}
          </span>{" "}
          dari{" "}
          <span className="font-semibold text-rakta-navy font-mono tabular-nums">
            {totalItems}
          </span>{" "}
          {itemName}
        </p>

        {/* Pilihan Ukuran Halaman */}
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 pl-3 border-l border-rakta-border">
            <span className="hidden md:inline">Per halaman:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="py-1 px-2 rounded-lg bg-white border border-rakta-border text-rakta-navy font-mono tabular-nums text-xs focus:outline-none focus:border-rakta-primary cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navigasi Nomor Halaman */}
      {totalPages > 1 && (
        <nav
          aria-label="Navigasi Halaman"
          className="flex items-center gap-1 self-center sm:self-auto"
        >
          {/* Tombol Sebelumnya */}
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            aria-label="Halaman Sebelumnya"
            className="p-1.5 rounded-lg border border-rakta-border bg-white text-rakta-navy hover:bg-rakta-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Nomor Halaman */}
          <div className="flex items-center gap-1">
            {pages.map((p, idx) => {
              if (p === "...") {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-2 py-1 text-rakta-muted font-mono select-none"
                  >
                    ...
                  </span>
                );
              }

              const isCurrent = p === currentPage;
              return (
                <button
                  key={`page-${p}`}
                  type="button"
                  onClick={() => onPageChange(p)}
                  aria-current={isCurrent ? "page" : undefined}
                  className={`min-w-8 h-8 px-2 rounded-lg text-xs font-semibold font-mono tabular-nums transition-all cursor-pointer ${
                    isCurrent
                      ? "bg-rakta-primary text-white shadow-xs"
                      : "bg-white border border-rakta-border text-rakta-navy hover:bg-rakta-surface"
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          {/* Tombol Berikutnya */}
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            aria-label="Halaman Berikutnya"
            className="p-1.5 rounded-lg border border-rakta-border bg-white text-rakta-navy hover:bg-rakta-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </nav>
      )}
    </div>
  );
}