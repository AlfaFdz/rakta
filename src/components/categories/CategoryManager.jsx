"use client";

import { useState, useTransition, useActionState } from "react";
import { createCategoryAction, updateCategoryAction, deleteCategoryAction } from "@/app/actions/categories";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ConfirmModal from "@/components/ConfirmModal";
import Pagination from "@/components/ui/Pagination";
import { formatTanggal } from "@/lib/format";
import { Plus, Pencil, Trash2, Search, Package, AlertCircle, CheckCircle2, X } from "lucide-react";

export default function CategoryManager({ categories = [] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit' | null
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteCat, setConfirmDeleteCat] = useState(null);

  // State navigasi halaman (Pagination & Lazy Rendering)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter pencarian kategori
  const filteredCategories = categories.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      c.nama?.toLowerCase().includes(q) ||
      c.deskripsi?.toLowerCase().includes(q)
    );
  });

  // Potong hanya data yang aktif pada halaman saat ini (Lazy Windowing Slicing)
  const totalItems = filteredCategories.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safePage = Math.max(1, Math.min(currentPage, totalPages));
  const startIndex = (safePage - 1) * pageSize;
  const paginatedCategories = filteredCategories.slice(startIndex, startIndex + pageSize);

  // Action state untuk form tambah kategori
  const [addState, addAction, isAdding] = useActionState(
    async (prev, formData) => {
      const res = await createCategoryAction(prev, formData);
      if (res?.success) {
        setModalMode(null);
        setFeedback({ type: "success", message: "Kategori baru berhasil ditambahkan." });
        return null;
      }
      return res;
    },
    null
  );

  // Action state untuk form edit kategori
  const [editState, editAction, isEditing] = useActionState(
    async (prev, formData) => {
      const res = await updateCategoryAction(prev, formData);
      if (res?.success) {
        setModalMode(null);
        setSelectedCategory(null);
        setFeedback({ type: "success", message: "Kategori berhasil diperbarui." });
        return null;
      }
      return res;
    },
    null
  );

  // Handler hapus kategori
  const handleDelete = (cat) => {
    setConfirmDeleteCat(cat);
  };

  const handleExecuteDelete = () => {
    if (!confirmDeleteCat) return;
    const cat = confirmDeleteCat;
    setDeletingId(cat.id);
    setFeedback(null);

    startDeleteTransition(async () => {
      const res = await deleteCategoryAction(cat.id);
      if (res?.success) {
        setFeedback({ type: "success", message: res.message });
      } else {
        setFeedback({ type: "error", message: res?.error || "Gagal menghapus kategori." });
      }
      setDeletingId(null);
      setConfirmDeleteCat(null);
    });
  };

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-start gap-2.5 p-4 rounded-xl text-xs border ${
            feedback.type === "success"
              ? "bg-emerald-50/90 border-emerald-200 text-emerald-800"
              : "bg-rose-50/90 border-rose-200 text-rose-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 font-medium">{feedback.message}</div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-rakta-muted hover:text-rakta-navy ml-2 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Toolbar: Search & Tombol Tambah Kategori */}
      <div className="bg-white border border-rakta-border rounded-2xl p-4 md:p-5 rakta-card-shadow flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-rakta-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama atau deskripsi kategori..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-rakta-border rounded-xl text-rakta-navy placeholder:text-rakta-muted/60 focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setCurrentPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-rakta-muted hover:text-rakta-navy"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <Button
          type="button"
          onClick={() => {
            setModalMode("add");
            setSelectedCategory(null);
          }}
          className="rounded-xl bg-rakta-primary hover:bg-rakta-primary-hover text-white text-xs font-semibold px-4 py-2 flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kategori Baru</span>
        </Button>
      </div>

      {/* Tabel Kategori */}
      <div className="bg-white border border-rakta-border rounded-2xl rakta-card-shadow overflow-hidden">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-12 text-sm text-rakta-muted">
            Belum ada kategori yang cocok dengan pencarian Anda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-rakta-border bg-rakta-surface/80 text-xs font-semibold text-rakta-muted">
                  <th className="py-3.5 px-5">Nama kategori</th>
                  <th className="py-3.5 px-4">Deskripsi</th>
                  <th className="py-3.5 px-4">Produk terkait</th>
                  <th className="py-3.5 px-4">Tanggal dibuat</th>
                  <th className="py-3.5 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rakta-border/40 text-rakta-navy">
                {paginatedCategories.map((cat) => {
                  const isCurrentDeleting = isDeleting && deletingId === cat.id;

                  return (
                    <tr key={cat.id} className="hover:bg-rakta-surface/50 transition-colors">
                      <td className="py-4 px-5">
                        <span className="font-semibold text-rakta-navy">{cat.nama}</span>
                      </td>

                      <td className="py-4 px-4 text-rakta-muted max-w-xs truncate">
                        {cat.deskripsi || "Tidak ada deskripsi"}
                      </td>

                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1.5 font-mono tabular-nums font-semibold px-2.5 py-0.5 rounded-md bg-rakta-surface border border-rakta-border text-rakta-navy text-xs">
                          <Package className="w-3.5 h-3.5 text-rakta-primary" />
                          <span>{cat.total_produk} SKU</span>
                        </span>
                      </td>

                      <td className="py-4 px-4 font-mono tabular-nums text-xs text-rakta-muted">
                        {formatTanggal(cat.created_at)}
                      </td>

                      <td className="py-4 px-5 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                              setSelectedCategory(cat);
                              setModalMode("edit");
                            }}
                            className="rounded-xl text-xs px-3 py-1.5 border-rakta-border text-rakta-navy hover:bg-rakta-surface cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5 text-rakta-primary" />
                            <span>Edit</span>
                          </Button>

                          <Button
                            type="button"
                            variant="danger"
                            disabled={isCurrentDeleting}
                            onClick={() => handleDelete(cat)}
                            className="rounded-xl text-xs px-3 py-1.5 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{isCurrentDeleting ? "..." : "Hapus"}</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Navigasi Halaman (Hanya me-render data aktif di DOM) */}
        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          itemName="kategori"
        />
      </div>

      {/* Modal / Dialog Form Tambah Kategori */}
      {modalMode === "add" && (
        <div className="fixed inset-0 z-50 bg-rakta-navy/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-rakta-border rounded-2xl p-6 rakta-card-shadow animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-rakta-border">
              <div>
                <h3 className="text-base font-bold text-rakta-navy">Tambah Kategori Baru</h3>
                <p className="text-xs text-rakta-muted mt-0.5">Kelompokkan master produk inventaris gudang</p>
              </div>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="p-1 rounded-xl text-rakta-muted hover:text-rakta-navy hover:bg-rakta-surface transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form action={addAction} className="mt-4 space-y-4">
              {addState?.error && (
                <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{addState.error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-rakta-navy mb-1">
                  Nama Kategori <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="nama"
                  placeholder="Contoh: Peralatan Safety & APD"
                  required
                  autoFocus
                  className="w-full px-3 py-2 text-sm rounded-xl bg-white border border-rakta-border text-rakta-navy placeholder:text-rakta-muted/60 focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-rakta-navy mb-1">
                  Deskripsi Kategori (Opsional)
                </label>
                <textarea
                  name="deskripsi"
                  rows={3}
                  placeholder="Penjelasan singkat barang yang termasuk dalam kelompok ini..."
                  className="w-full px-3 py-2 text-sm rounded-xl bg-white border border-rakta-border text-rakta-navy placeholder:text-rakta-muted/60 focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-rakta-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalMode(null)}
                  className="rounded-xl text-xs font-semibold px-4 py-2 border-rakta-border text-rakta-navy hover:bg-rakta-surface"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isAdding}
                  className="rounded-xl bg-rakta-primary hover:bg-rakta-primary-hover text-white text-xs font-semibold px-5 py-2 flex items-center gap-1.5 shadow-xs"
                >
                  {isAdding ? "Menyimpan..." : "Simpan Kategori"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Dialog Form Edit Kategori */}
      {modalMode === "edit" && selectedCategory && (
        <div className="fixed inset-0 z-50 bg-rakta-navy/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-rakta-border rounded-2xl p-6 rakta-card-shadow animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-rakta-border">
              <div>
                <h3 className="text-base font-bold text-rakta-navy">Edit Kategori</h3>
                <p className="text-xs text-rakta-muted mt-0.5">Perbarui nama atau keterangan kategori barang</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalMode(null);
                  setSelectedCategory(null);
                }}
                className="p-1 rounded-xl text-rakta-muted hover:text-rakta-navy hover:bg-rakta-surface transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form action={editAction} className="mt-4 space-y-4">
              <input type="hidden" name="id" value={selectedCategory.id} />

              {editState?.error && (
                <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{editState.error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-rakta-navy mb-1">
                  Nama Kategori <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="nama"
                  defaultValue={selectedCategory.nama}
                  required
                  autoFocus
                  className="w-full px-3 py-2 text-sm rounded-xl bg-white border border-rakta-border text-rakta-navy placeholder:text-rakta-muted/60 focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-rakta-navy mb-1">
                  Deskripsi Kategori (Opsional)
                </label>
                <textarea
                  name="deskripsi"
                  rows={3}
                  defaultValue={selectedCategory.deskripsi || ""}
                  placeholder="Penjelasan kelompok kategori..."
                  className="w-full px-3 py-2 text-sm rounded-xl bg-white border border-rakta-border text-rakta-navy placeholder:text-rakta-muted/60 focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-rakta-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setModalMode(null);
                    setSelectedCategory(null);
                  }}
                  className="rounded-xl text-xs font-semibold px-4 py-2 border-rakta-border text-rakta-navy hover:bg-rakta-surface"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isEditing}
                  className="rounded-xl bg-rakta-primary hover:bg-rakta-primary-hover text-white text-xs font-semibold px-5 py-2 flex items-center gap-1.5 shadow-xs"
                >
                  {isEditing ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Konfirmasi Hapus Kategori */}
      <ConfirmModal
        isOpen={Boolean(confirmDeleteCat)}
        onClose={() => setConfirmDeleteCat(null)}
        onConfirm={handleExecuteDelete}
        title="Hapus Kategori"
        message={`Apakah Anda yakin ingin menghapus kategori "${confirmDeleteCat?.nama}"?\n\nKategori yang sudah terhubung dengan data master produk tidak dapat dihapus.`}
        confirmText="Hapus Kategori"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}