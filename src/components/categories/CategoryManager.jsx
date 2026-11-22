"use client";

import { useState, useTransition, useActionState } from "react";
import { createCategoryAction, updateCategoryAction, deleteCategoryAction } from "@/app/actions/categories";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { formatTanggal } from "@/lib/format";
import { Plus, Pencil, Trash2, Layers, Search, Package, AlertCircle, CheckCircle2, X } from "lucide-react";

export default function CategoryManager({ categories = [] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit' | null
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [deletingId, setDeletingId] = useState(null);

  // Filter pencarian kategori
  const filteredCategories = categories.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      c.nama?.toLowerCase().includes(q) ||
      c.deskripsi?.toLowerCase().includes(q)
    );
  });

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
    // Konfirmasi penghapusan
    if (!confirm(`Apakah Anda yakin ingin menghapus kategori "${cat.nama}"?`)) {
      return;
    }

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
    });
  };

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-start gap-2.5 p-4 rounded-xl text-xs border ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 font-medium">{feedback.message}</div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-rakta-muted hover:text-rakta-navy ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Toolbar: Search & Tombol Tambah Kategori */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-rakta-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama atau deskripsi kategori..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-rakta-card border border-rakta-subtle rounded-full text-rakta-navy placeholder:text-rakta-muted/60 focus:outline-none focus:border-rakta-primary focus:ring-1 focus:ring-rakta-primary/20"
          />
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={() => {
            setModalMode("add");
            setSelectedCategory(null);
          }}
          className="text-xs px-4 py-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Tambah Kategori Baru
        </Button>
      </div>

      {/* Tabel Kategori */}
      <div className="bg-rakta-card border border-rakta-subtle/70 rounded-2xl rakta-card-shadow overflow-hidden">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-12 text-xs text-rakta-muted">
            Belum ada kategori yang cocok dengan pencarian Anda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-rakta-subtle/50 text-rakta-muted font-medium bg-rakta-surface/40">
                  <th className="py-3 px-5">Nama Kategori</th>
                  <th className="py-3 px-4">Deskripsi</th>
                  <th className="py-3 px-4">Produk Terkait</th>
                  <th className="py-3 px-4">Tanggal Dibuat</th>
                  <th className="py-3 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rakta-subtle/30 text-rakta-navy">
                {filteredCategories.map((cat) => {
                  const isCurrentDeleting = isDeleting && deletingId === cat.id;

                  return (
                    <tr key={cat.id} className="hover:bg-rakta-surface/40 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-rakta-bg text-rakta-primary flex items-center justify-center shrink-0">
                            <Layers className="w-4 h-4" />
                          </div>
                          <span className="font-semibold text-rakta-navy">{cat.nama}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-rakta-muted max-w-xs truncate">
                        {cat.deskripsi || "-"}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 font-mono font-medium px-2.5 py-0.5 rounded-full bg-rakta-surface border border-rakta-subtle/60 text-rakta-navy text-[11px]">
                          <Package className="w-3 h-3 text-rakta-primary" />
                          {cat.total_produk} SKU
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-rakta-muted">
                        {formatTanggal(cat.created_at)}
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedCategory(cat);
                              setModalMode("edit");
                            }}
                            className="text-[11px] px-2.5 py-1"
                          >
                            <Pencil className="w-3.5 h-3.5 mr-1 text-rakta-primary" /> Edit
                          </Button>

                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            disabled={isCurrentDeleting}
                            onClick={() => handleDelete(cat)}
                            className="text-[11px] px-2.5 py-1"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            {isCurrentDeleting ? "..." : "Hapus"}
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
      </div>

      {/* Modal / Dialog Form Tambah Kategori */}
      {modalMode === "add" && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle>Tambah Kategori Baru</CardTitle>
                  <CardDescription>Kelompokkan master produk inventaris gudang</CardDescription>
                </div>
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="p-1 rounded-full text-rakta-muted hover:text-rakta-navy hover:bg-rakta-subtle/30"
                >
                  <X className="w-4 h-4" />
                </button>
              </CardHeader>

              <form action={addAction}>
                <CardContent className="space-y-3.5">
                  {addState?.error && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <span>{addState.error}</span>
                    </div>
                  )}

                  <Input
                    label="Nama Kategori"
                    id="nama"
                    name="nama"
                    placeholder="Contoh: Peralatan Safety & APD"
                    required
                    autoFocus
                  />

                  <div className="w-full flex flex-col gap-1.5">
                    <label
                      htmlFor="deskripsi"
                      className="text-xs font-medium text-rakta-navy"
                    >
                      Deskripsi Kategori (Opsional)
                    </label>
                    <textarea
                      id="deskripsi"
                      name="deskripsi"
                      rows={3}
                      placeholder="Penjelasan singkat barang yang termasuk dalam kelompok ini..."
                      className="w-full px-3.5 py-2 text-xs bg-rakta-card border border-rakta-subtle rounded-xl text-rakta-navy placeholder:text-rakta-muted/60 focus:outline-none focus:border-rakta-primary focus:ring-1 focus:ring-rakta-primary/20"
                    />
                  </div>
                </CardContent>

                <CardFooter className="gap-2 pt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setModalMode(null)}
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isAdding}
                  >
                    Simpan Kategori
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>
        </div>
      )}

      {/* Modal / Dialog Form Edit Kategori */}
      {modalMode === "edit" && selectedCategory && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle>Edit Kategori</CardTitle>
                  <CardDescription>Perbarui nama atau keterangan kategori barang</CardDescription>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setModalMode(null);
                    setSelectedCategory(null);
                  }}
                  className="p-1 rounded-full text-rakta-muted hover:text-rakta-navy hover:bg-rakta-subtle/30"
                >
                  <X className="w-4 h-4" />
                </button>
              </CardHeader>

              <form action={editAction}>
                <input type="hidden" name="id" value={selectedCategory.id} />

                <CardContent className="space-y-3.5">
                  {editState?.error && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <span>{editState.error}</span>
                    </div>
                  )}

                  <Input
                    label="Nama Kategori"
                    id="edit_nama"
                    name="nama"
                    defaultValue={selectedCategory.nama}
                    required
                    autoFocus
                  />

                  <div className="w-full flex flex-col gap-1.5">
                    <label
                      htmlFor="edit_deskripsi"
                      className="text-xs font-medium text-rakta-navy"
                    >
                      Deskripsi Kategori (Opsional)
                    </label>
                    <textarea
                      id="edit_deskripsi"
                      name="deskripsi"
                      rows={3}
                      defaultValue={selectedCategory.deskripsi || ""}
                      placeholder="Penjelasan kelompok kategori..."
                      className="w-full px-3.5 py-2 text-xs bg-rakta-card border border-rakta-subtle rounded-xl text-rakta-navy placeholder:text-rakta-muted/60 focus:outline-none focus:border-rakta-primary focus:ring-1 focus:ring-rakta-primary/20"
                    />
                  </div>
                </CardContent>

                <CardFooter className="gap-2 pt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setModalMode(null);
                      setSelectedCategory(null);
                    }}
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isEditing}
                  >
                    Simpan Perubahan
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}