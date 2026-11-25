"use client";

import { useState, useTransition, useActionState } from "react";
import Link from "next/link";
import { createProductAction, updateProductAction, deleteProductAction, adjustStockAction } from "@/app/actions/products";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ConfirmModal";
import StockBadge from "@/components/ui/StockBadge";
import Pagination from "@/components/ui/Pagination";
import { formatRupiah, hitungStatusStok } from "@/lib/format";
import { exportToCsv } from "@/lib/exportCsv";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  SlidersHorizontal,
  Search,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  X,
  MapPin,
  Building2,
  Filter,
  Loader2,
  QrCode,
  Download,
} from "lucide-react";

export default function ProductManager({
  products = [],
  categories = [],
  suppliers = [],
  userRole = "admin",
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [stockFilter, setStockFilter] = useState("all"); // 'all' | 'aman' | 'kritis'

  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit' | 'adjust' | null
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [physicalStockInput, setPhysicalStockInput] = useState("");
  const [feedback, setFeedback] = useState(null);

  const [isDeleting, startDeleteTransition] = useTransition();
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteProd, setConfirmDeleteProd] = useState(null);

  // State navigasi halaman (Pagination & Lazy Rendering)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter daftar produk
  const filteredProducts = products.filter((p) => {
    // 1. Pencarian teks (Nama, SKU, Lokasi Rak)
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      p.nama?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      p.lokasi_rak?.toLowerCase().includes(q);

    // 2. Filter Kategori
    const matchCategory =
      selectedCategory === "all" || String(p.category_id) === String(selectedCategory);

    // 3. Filter Status Stok
    const stok = Number(p.jumlah_stok) || 0;
    const stokLow = Number(p.stok_low) || 0;
    let matchStock = true;
    if (stockFilter === "aman") {
      matchStock = stok > stokLow;
    } else if (stockFilter === "kritis") {
      matchStock = stok <= stokLow;
    }

    return matchSearch && matchCategory && matchStock;
  });

  // Potong hanya data yang aktif pada halaman saat ini (Lazy Windowing Slicing)
  const totalItems = filteredProducts.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safePage = Math.max(1, Math.min(currentPage, totalPages));
  const startIndex = (safePage - 1) * pageSize;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + pageSize);

  // Action state untuk Tambah Produk
  const [addState, addAction, isAdding] = useActionState(async (prev, formData) => {
    const res = await createProductAction(prev, formData);
    if (res?.success) {
      setModalMode(null);
      setFeedback({ type: "success", message: res.message });
      return null;
    }
    return res;
  }, null);

  // Action state untuk Edit Produk
  const [editState, editAction, isEditing] = useActionState(async (prev, formData) => {
    const res = await updateProductAction(prev, formData);
    if (res?.success) {
      setModalMode(null);
      setSelectedProduct(null);
      setFeedback({ type: "success", message: res.message });
      return null;
    }
    return res;
  }, null);

  // Action state untuk Penyesuaian Stok (Stock Opname)
  const [adjustState, adjustAction, isAdjusting] = useActionState(async (prev, formData) => {
    const res = await adjustStockAction(prev, formData);
    if (res?.success) {
      setModalMode(null);
      setSelectedProduct(null);
      setPhysicalStockInput("");
      setFeedback({ type: "success", message: res.message });
      return null;
    }
    return res;
  }, null);

  // Handler Hapus Produk
  const handleDeleteProduct = (prod) => {
    setConfirmDeleteProd(prod);
  };

  const handleExecuteDeleteProduct = () => {
    if (!confirmDeleteProd) return;
    const prod = confirmDeleteProd;
    setDeletingId(prod.id);
    setFeedback(null);

    startDeleteTransition(async () => {
      const res = await deleteProductAction(prod.id);
      if (res?.success) {
        setFeedback({ type: "success", message: res.message });
      } else {
        setFeedback({ type: "error", message: res?.error || "Gagal menghapus produk." });
      }
      setDeletingId(null);
      setConfirmDeleteProd(null);
    });
  };

  // Helper buka modal edit
  const openEditModal = (prod) => {
    setSelectedProduct(prod);
    setModalMode("edit");
  };

  // Helper buka modal sesuaikan stok
  const openAdjustModal = (prod) => {
    setSelectedProduct(prod);
    setPhysicalStockInput(String(prod.jumlah_stok));
    setModalMode("adjust");
  };

  // Kalkulasi selisih stok fisik vs sistem saat stock opname
  const currentStokNum = selectedProduct ? Number(selectedProduct.jumlah_stok) : 0;
  const newStokNum = physicalStockInput !== "" ? Number(physicalStockInput) : currentStokNum;
  const selisihStok = newStokNum - currentStokNum;

  // Handler Ekspor CSV Katalog Master Produk
  const handleExportCsv = () => {
    const columns = [
      { label: "SKU", key: "sku" },
      { label: "Nama Produk", key: "nama" },
      { label: "Kategori", key: "category_nama" },
      { label: "Supplier Rekanan", key: (p) => p.supplier_perusahaan || p.supplier_nama || "-" },
      { label: "Stok Fisik", key: "jumlah_stok" },
      { label: "Satuan Unit", key: "unit" },
      { label: "Stok Minimum", key: "stok_minimum" },
      { label: "Stok Low", key: "stok_low" },
      { label: "Lokasi Rak", key: (p) => p.lokasi_rak || "-" },
      { label: "Harga Beli", key: "harga_beli" },
      { label: "Harga Jual", key: "harga_jual" },
      { label: "Status Ketersediaan", key: (p) => hitungStatusStok(p.jumlah_stok, p.stok_minimum, p.stok_low).label },
    ];
    exportToCsv("laporan-master-produk-rakta.csv", columns, filteredProducts);
  };

  return (
    <div className="space-y-6">
      {/* Notifikasi Umpan Balik */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-start justify-between gap-3 border ${
            feedback.type === "success"
              ? "bg-emerald-50/90 border-emerald-200 text-emerald-800"
              : "bg-rose-50/90 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-start gap-2.5">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
            )}
            <p className="text-sm font-medium">{feedback.message}</p>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-rakta-muted hover:text-rakta-navy p-1 transition-colors cursor-pointer"
            title="Tutup pemberitahuan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bilah Alat & Filter (Toolbar) */}
      <div className="bg-white border border-rakta-border rounded-2xl p-4 md:p-5 rakta-card-shadow flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Kolom Kiri: Search & Filter Kategori */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Input Pencarian */}
          <div className="relative flex-1 min-w-60">
            <Search className="w-4 h-4 text-rakta-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama produk, SKU, atau rak..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-8 py-2 text-sm rounded-xl bg-white border border-rakta-border text-rakta-navy placeholder:text-rakta-muted/60 focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20 transition-all"
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

          {/* Dropdown Kategori */}
          <div className="relative min-w-45">
            <Filter className="w-4 h-4 text-rakta-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-8 py-2 text-sm rounded-xl bg-white border border-rakta-border text-rakta-navy focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20 transition-all appearance-none cursor-pointer"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nama}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Kolom Kanan: Tab Status Stok & Tombol Tambah */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Filter Tab Status Stok */}
          <div className="inline-flex p-1 bg-rakta-surface border border-rakta-border rounded-xl">
            <button
              onClick={() => {
                setStockFilter("all");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                stockFilter === "all"
                  ? "bg-rakta-bg/80 text-rakta-navy shadow-xs"
                  : "text-rakta-muted hover:text-rakta-navy"
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => {
                setStockFilter("aman");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                stockFilter === "aman"
                  ? "bg-emerald-100/80 text-emerald-900 shadow-xs"
                  : "text-rakta-muted hover:text-rakta-navy"
              }`}
            >
              Stok Aman
            </button>
            <button
              onClick={() => {
                setStockFilter("kritis");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                stockFilter === "kritis"
                  ? "bg-rose-100/80 text-rose-900 shadow-xs"
                  : "text-rakta-muted hover:text-rakta-navy"
              }`}
            >
              Menipis / Kritis
            </button>
          </div>

          {/* Tombol Ekspor CSV */}
          <Button
            onClick={handleExportCsv}
            variant="outline"
            className="rounded-xl border-rakta-border text-rakta-navy hover:bg-rakta-surface text-xs font-semibold px-3.5 py-2 flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4 text-rakta-muted" />
            <span>Ekspor CSV</span>
          </Button>

          {/* Tombol Tambah Produk Baru (Admin & Warehouse Manager) */}
          {(userRole === "admin" || userRole === "warehouse_manager") && (
            <Button
              onClick={() => {
                setSelectedProduct(null);
                setModalMode("add");
              }}
              className="rounded-xl bg-rakta-primary hover:bg-rakta-primary-hover text-white text-xs font-semibold px-4 py-2 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Produk Baru</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabel Data Produk */}
      <div className="bg-white border border-rakta-border rounded-2xl rakta-card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-rakta-border bg-rakta-surface/80 text-xs font-semibold text-rakta-muted">
                <th className="px-5 py-3.5">Produk &amp; SKU</th>
                <th className="px-5 py-3.5">Kategori &amp; rak</th>
                <th className="px-5 py-3.5">Supplier rekanan</th>
                <th className="px-5 py-3.5 text-right">Harga beli / jual</th>
                <th className="px-5 py-3.5 text-center">Tingkat stok</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rakta-border/40">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-rakta-muted">
                    <Package className="w-10 h-10 mx-auto mb-2 text-rakta-muted/40" />
                    <p className="font-semibold text-rakta-navy text-base">Tidak ada produk ditemukan</p>
                    <p className="text-xs text-rakta-muted mt-1 max-w-sm mx-auto">
                      Coba sesuaikan kata kunci pencarian, filter kategori, atau tab status stok di atas.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p) => {
                  const statusInfo = hitungStatusStok(p.jumlah_stok, p.stok_minimum, p.stok_low);

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-rakta-surface/50 transition-colors group text-rakta-navy"
                    >
                      {/* Produk & SKU */}
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-rakta-surface text-rakta-navy border border-rakta-border">
                            {p.sku}
                          </span>
                          <div className="font-semibold text-rakta-navy group-hover:text-rakta-primary transition-colors">
                            {p.nama}
                          </div>
                          {p.deskripsi && (
                            <p className="text-xs text-rakta-muted line-clamp-1">
                              {p.deskripsi}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Kategori & Rak */}
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <span className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-md bg-rakta-surface text-rakta-navy border border-rakta-border">
                            {p.category_nama}
                          </span>
                          <div className="flex items-center gap-1 text-xs text-rakta-muted">
                            <MapPin className="w-3.5 h-3.5 text-rakta-primary shrink-0" />
                            <span>Rak: {p.lokasi_rak || "Belum Ditentukan"}</span>
                          </div>
                        </div>
                      </td>

                      {/* Supplier Rekanan */}
                      <td className="px-5 py-4">
                        {p.supplier_perusahaan || p.supplier_nama ? (
                          <div className="flex items-center gap-1.5 text-xs text-rakta-navy font-medium">
                            <Building2 className="w-3.5 h-3.5 text-rakta-muted shrink-0" />
                            <span>{p.supplier_perusahaan || p.supplier_nama}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-rakta-muted italic">Tidak ditentukan</span>
                        )}
                      </td>

                      {/* Harga Beli & Jual */}
                      <td className="px-5 py-4 text-right">
                        <div className="text-xs">
                          <div className="font-semibold text-rakta-navy font-mono tabular-nums">
                            {formatRupiah(p.harga_jual)}
                          </div>
                          <div className="text-[11px] text-rakta-muted font-mono tabular-nums">
                            Beli: {formatRupiah(p.harga_beli)}
                          </div>
                        </div>
                      </td>

                      {/* Tingkat Stok & Badge */}
                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <div className="text-sm font-bold text-rakta-navy font-mono tabular-nums">
                            {p.jumlah_stok}{" "}
                            <span className="text-xs font-normal text-rakta-muted">{p.unit}</span>
                          </div>
                          <StockBadge status={statusInfo} className="mt-1" />
                          <span className="text-[10px] text-rakta-muted font-mono tabular-nums mt-0.5">
                            Min: {p.stok_minimum} | Low: {p.stok_low}
                          </span>
                        </div>
                      </td>

                      {/* Aksi Berdasarkan Peran Pengguna */}
                      <td className="px-5 py-4 text-right">
                        {(userRole === "admin" || userRole === "warehouse_manager") && (
                          <div className="flex items-center justify-end gap-1">
                            {/* Tombol Detail & QR */}
                            <Link
                              href={`/products/${p.id}`}
                              className="p-1.5 text-rakta-muted hover:text-rakta-navy rounded-xl hover:bg-rakta-surface transition-colors"
                              title="Detail produk & QR Code"
                            >
                              <QrCode className="w-4 h-4" />
                            </Link>

                            {/* Tombol Sesuaikan Stok */}
                            <button
                              onClick={() => openAdjustModal(p)}
                              className="p-1.5 text-rakta-muted hover:text-rakta-navy rounded-xl hover:bg-rakta-surface transition-colors cursor-pointer"
                              title="Sesuaikan stok (Stock Opname)"
                            >
                              <SlidersHorizontal className="w-4 h-4" />
                            </button>

                            {/* Tombol Edit Produk */}
                            <button
                              onClick={() => openEditModal(p)}
                              className="p-1.5 text-rakta-primary hover:text-rakta-primary-hover rounded-xl hover:bg-rakta-surface transition-colors cursor-pointer"
                              title="Edit informasi produk"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

                            {/* Tombol Hapus Produk */}
                            <button
                              onClick={() => handleDeleteProduct(p)}
                              disabled={isDeleting && deletingId === p.id}
                              className="p-1.5 text-rose-500 hover:text-rose-700 rounded-xl hover:bg-rose-50 transition-colors disabled:opacity-50 cursor-pointer"
                              title="Hapus produk"
                            >
                              {isDeleting && deletingId === p.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        )}

                        {userRole === "staff_gudang" && (
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/products/${p.id}`}
                              className="p-1.5 text-rakta-muted hover:text-rakta-navy rounded-xl hover:bg-rakta-surface transition-colors"
                              title="Detail produk & QR Code"
                            >
                              <QrCode className="w-4 h-4" />
                            </Link>
                            <Button
                              onClick={() => openAdjustModal(p)}
                              className="rounded-xl text-xs font-semibold px-3 py-1.5 bg-rakta-surface hover:bg-rakta-bg border border-rakta-border text-rakta-navy flex items-center gap-1.5 transition-all shadow-none"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5" />
                              <span>Sesuaikan Stok</span>
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

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
          itemName="produk"
        />
      </div>

      {/* MODAL: Tambah / Edit Produk (Admin & Warehouse Manager) */}
      {(modalMode === "add" || modalMode === "edit") && (
        <div className="fixed inset-0 z-50 bg-rakta-navy/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-rakta-border rounded-2xl w-full max-w-2xl p-6 rakta-card-shadow relative my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-rakta-border">
              <div>
                <h3 className="text-lg font-bold text-rakta-navy">
                  {modalMode === "add" ? "Tambah Produk Baru" : "Edit Informasi Produk"}
                </h3>
                <p className="text-xs text-rakta-muted mt-0.5">
                  {modalMode === "add"
                    ? "Lengkapi rincian katalog produk, harga, dan level minimum stok gudang."
                    : `Memperbarui rincian produk SKU: ${selectedProduct?.sku}`}
                </p>
              </div>
              <button
                onClick={() => {
                  setModalMode(null);
                  setSelectedProduct(null);
                }}
                className="text-rakta-muted hover:text-rakta-navy p-1.5 rounded-xl hover:bg-rakta-surface transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Alert Error jika aksi gagal */}
            {(modalMode === "add" ? addState?.error : editState?.error) && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalMode === "add" ? addState?.error : editState?.error}</span>
              </div>
            )}

            {/* Form Input */}
            <form action={modalMode === "add" ? addAction : editAction} className="mt-5 space-y-4">
              {modalMode === "edit" && (
                <input type="hidden" name="id" value={selectedProduct?.id} />
              )}

              {/* Baris 1: SKU & Nama Produk */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-rakta-navy mb-1">
                    Kode SKU <span className="text-rose-500">*</span>
                    {modalMode === "edit" && (
                      <span className="ml-1 text-[10px] text-rakta-muted font-normal">(Terkunci)</span>
                    )}
                  </label>
                  <input
                    type="text"
                    name="sku"
                    required
                    readOnly={modalMode === "edit"}
                    placeholder="Contoh: ELK-SCN-001"
                    defaultValue={selectedProduct?.sku || ""}
                    className={`w-full px-3 py-2 text-sm uppercase rounded-xl border text-rakta-navy placeholder:text-rakta-muted/60 focus:outline-none ${
                      modalMode === "edit"
                        ? "bg-rakta-surface text-rakta-muted cursor-not-allowed border-rakta-border font-mono"
                        : "bg-white border-rakta-border focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20"
                    }`}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-rakta-navy mb-1">
                    Nama Produk <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="nama"
                    required
                    placeholder="Contoh: Barcode Scanner 2D Wireless"
                    defaultValue={selectedProduct?.nama || ""}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-white border border-rakta-border text-rakta-navy placeholder:text-rakta-muted/60 focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20"
                  />
                </div>
              </div>

              {/* Baris 2: Kategori & Supplier Rekanan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-rakta-navy mb-1">
                    Kategori <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="category_id"
                    required
                    defaultValue={selectedProduct?.category_id || ""}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-white border border-rakta-border text-rakta-navy focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20"
                  >
                    <option value="" disabled>
                      Pilih Kategori Produk
                    </option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nama}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-rakta-navy mb-1">
                    Supplier Rekanan (Opsional)
                  </label>
                  <select
                    name="supplier_id"
                    defaultValue={selectedProduct?.supplier_id || ""}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-white border border-rakta-border text-rakta-navy focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20"
                  >
                    <option value="">Tidak ada supplier rekanan default</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nama_perusahaan ? `${s.nama_perusahaan} (${s.nama})` : s.nama}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Baris 3: Deskripsi Singkat */}
              <div>
                <label className="block text-xs font-semibold text-rakta-navy mb-1">
                  Deskripsi / Spesifikasi
                </label>
                <textarea
                  name="deskripsi"
                  rows={2}
                  placeholder="Keterangan singkat mengenai produk, spesifikasi teknis, atau instruksi simpan..."
                  defaultValue={selectedProduct?.deskripsi || ""}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-white border border-rakta-border text-rakta-navy placeholder:text-rakta-muted/60 focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20 resize-none"
                />
              </div>

              {/* Baris 4: Harga Beli & Harga Jual */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-rakta-navy mb-1">
                    Harga Beli (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="harga_beli"
                    min="0"
                    step="500"
                    required
                    placeholder="0"
                    defaultValue={selectedProduct?.harga_beli ?? 0}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-xl bg-white border border-rakta-border text-rakta-navy focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-rakta-navy mb-1">
                    Harga Jual (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="harga_jual"
                    min="0"
                    step="500"
                    required
                    placeholder="0"
                    defaultValue={selectedProduct?.harga_jual ?? 0}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-xl bg-white border border-rakta-border text-rakta-navy focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20"
                  />
                </div>
              </div>

              {/* Baris 5: Stok Minimum, Stok Low, dan Stok Awal (jika add) */}
              <div
                className={`grid grid-cols-1 gap-3 ${
                  modalMode === "add" ? "sm:grid-cols-3" : "sm:grid-cols-2"
                }`}
              >
                <div>
                  <label className="block text-xs font-semibold text-rakta-navy mb-1">
                    Stok Minimum (Kritis) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="stok_minimum"
                    min="0"
                    required
                    placeholder="10"
                    defaultValue={selectedProduct?.stok_minimum ?? 10}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-xl bg-white border border-rakta-border text-rakta-navy focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20"
                  />
                  <p className="text-[10px] text-rakta-muted mt-1">Batas status darurat/kritis</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-rakta-navy mb-1">
                    Stok Low (Menipis) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="stok_low"
                    min="1"
                    required
                    placeholder="20"
                    defaultValue={selectedProduct?.stok_low ?? 20}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-xl bg-white border border-rakta-border text-rakta-navy focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20"
                  />
                  <p className="text-[10px] text-rakta-muted mt-1">Harus lebih besar dari stok minimum</p>
                </div>
                {modalMode === "add" && (
                  <div>
                    <label className="block text-xs font-semibold text-rakta-navy mb-1">
                      Stok Awal Fisik
                    </label>
                    <input
                      type="number"
                      name="jumlah_stok"
                      min="0"
                      placeholder="0"
                      defaultValue="0"
                      className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-xl bg-white border border-rakta-border text-rakta-navy focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20"
                    />
                    <p className="text-[10px] text-rakta-muted mt-1">Jumlah unit saat ini</p>
                  </div>
                )}
              </div>

              {/* Baris 6: Satuan Unit & Lokasi Rak */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-rakta-navy mb-1">
                    Satuan Unit <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="unit"
                    defaultValue={selectedProduct?.unit || "pcs"}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-white border border-rakta-border text-rakta-navy focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20"
                  >
                    <option value="pcs">pcs (Pieces)</option>
                    <option value="unit">unit (Unit Barang)</option>
                    <option value="box">box / dus</option>
                    <option value="roll">roll (Gulungan)</option>
                    <option value="set">set (Paket)</option>
                    <option value="pack">pack (Kemasan)</option>
                    <option value="kg">kg (Kilogram)</option>
                    <option value="meter">meter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-rakta-navy mb-1">
                    Lokasi Rak Gudang
                  </label>
                  <input
                    type="text"
                    name="lokasi_rak"
                    placeholder="Contoh: A-01-02"
                    defaultValue={selectedProduct?.lokasi_rak || ""}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-white border border-rakta-border text-rakta-navy placeholder:text-rakta-muted/60 focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20"
                  />
                </div>
              </div>

              {/* Tombol Aksi Modal */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-rakta-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setModalMode(null);
                    setSelectedProduct(null);
                  }}
                  className="rounded-xl text-xs font-semibold px-4 py-2 border-rakta-border text-rakta-navy hover:bg-rakta-surface"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isAdding || isEditing}
                  className="rounded-xl bg-rakta-primary hover:bg-rakta-primary-hover text-white text-xs font-semibold px-5 py-2 flex items-center gap-1.5 shadow-xs"
                >
                  {(isAdding || isEditing) && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>
                    {modalMode === "add"
                      ? isAdding
                        ? "Menyimpan..."
                        : "Simpan Produk Baru"
                      : isEditing
                      ? "Memperbarui..."
                      : "Perbarui Produk"}
                  </span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Sesuaikan Stok (Stock Opname) */}
      {modalMode === "adjust" && selectedProduct && (
        <div className="fixed inset-0 z-50 bg-rakta-navy/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-rakta-border rounded-2xl w-full max-w-lg p-6 rakta-card-shadow relative my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-rakta-border">
              <div>
                <h3 className="text-base font-bold text-rakta-navy">
                  Sesuaikan Stok Fisik (Stock Opname)
                </h3>
                <p className="text-xs text-rakta-muted mt-0.5">
                  Rekonsiliasi stok sistem dengan hasil audit fisik gudang
                </p>
              </div>
              <button
                onClick={() => {
                  setModalMode(null);
                  setSelectedProduct(null);
                  setPhysicalStockInput("");
                }}
                className="text-rakta-muted hover:text-rakta-navy p-1.5 rounded-xl hover:bg-rakta-surface transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message */}
            {adjustState?.error && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{adjustState.error}</span>
              </div>
            )}

            {/* Ringkasan Produk */}
            <div className="mt-4 p-3.5 rounded-xl bg-rakta-surface border border-rakta-border space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rakta-navy text-sm">{selectedProduct.nama}</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-white text-rakta-navy border border-rakta-border font-semibold">
                  {selectedProduct.sku}
                </span>
              </div>
              <div className="flex items-center justify-between text-rakta-muted pt-1 border-t border-rakta-border/60">
                <span>Stok Sistem Saat Ini:</span>
                <span className="font-semibold text-rakta-navy font-mono tabular-nums">
                  {selectedProduct.jumlah_stok} {selectedProduct.unit}
                </span>
              </div>
              <div className="flex items-center justify-between text-rakta-muted">
                <span>Lokasi Rak:</span>
                <span className="font-medium text-rakta-navy">
                  {selectedProduct.lokasi_rak || "Belum Ditentukan"}
                </span>
              </div>
            </div>

            {/* Form Penyesuaian Stok */}
            <form action={adjustAction} className="mt-4 space-y-4">
              <input type="hidden" name="product_id" value={selectedProduct.id} />

              {/* Input Stok Fisik Baru */}
              <div>
                <label className="block text-xs font-semibold text-rakta-navy mb-1">
                  Jumlah Stok Fisik Riil di Rak <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="stok_fisik"
                    min="0"
                    required
                    value={physicalStockInput}
                    onChange={(e) => setPhysicalStockInput(e.target.value)}
                    placeholder="Masukkan jumlah fisik hasil hitung..."
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-xl bg-white border border-rakta-border text-rakta-navy focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-rakta-muted">
                    {selectedProduct.unit}
                  </span>
                </div>

                {/* Indikator Selisih Real-time */}
                <div className="mt-2 text-xs">
                  {physicalStockInput === "" ? (
                    <span className="text-rakta-muted">Masukkan jumlah fisik di atas.</span>
                  ) : selisihStok > 0 ? (
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 inline-flex items-center gap-1 font-mono tabular-nums">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Selisih: +{selisihStok} {selectedProduct.unit} (Barang Masuk / Ditemukan Lebih)
                    </span>
                  ) : selisihStok < 0 ? (
                    <span className="font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200 inline-flex items-center gap-1 font-mono tabular-nums">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Selisih: {selisihStok} {selectedProduct.unit} (Barang Keluar / Rusak / Hilang)
                    </span>
                  ) : (
                    <span className="font-medium text-rakta-navy bg-rakta-surface px-2.5 py-1 rounded-md border border-rakta-border inline-block">
                      Stok sama dengan catatan sistem (Tidak ada selisih).
                    </span>
                  )}
                </div>
              </div>

              {/* Alasan Penyesuaian */}
              <div>
                <label className="block text-xs font-semibold text-rakta-navy mb-1">
                  Alasan Penyesuaian <span className="text-rose-500">*</span>
                </label>
                <select
                  name="alasan"
                  required
                  defaultValue="Pengecekan Fisik Rutin (Stock Opname)"
                  className="w-full px-3 py-2 text-sm rounded-xl bg-white border border-rakta-border text-rakta-navy focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20"
                >
                  <option value="Pengecekan Fisik Rutin (Stock Opname)">
                    Pengecekan Fisik Rutin (Stock Opname)
                  </option>
                  <option value="Barang Rusak / Cacat / Kadaluarsa">
                    Barang Rusak / Cacat / Kadaluarsa
                  </option>
                  <option value="Selisih Fisik Rak Gudang">
                    Selisih Fisik Rak Gudang (Human Error)
                  </option>
                  <option value="Koreksi Kesalahan Input Sistem">
                    Koreksi Kesalahan Input Sistem Sebelumnya
                  </option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              {/* Catatan Tambahan */}
              <div>
                <label className="block text-xs font-semibold text-rakta-navy mb-1">
                  Catatan Tambahan (Opsional)
                </label>
                <textarea
                  name="catatan"
                  rows={2}
                  placeholder="Contoh: Ditemukan 2 unit retak saat audit mingguan di rak B-02..."
                  className="w-full px-3 py-2 text-sm rounded-xl bg-white border border-rakta-border text-rakta-navy placeholder:text-rakta-muted/60 focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20 resize-none"
                />
              </div>

              {/* Tombol Aksi */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-rakta-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setModalMode(null);
                    setSelectedProduct(null);
                    setPhysicalStockInput("");
                  }}
                  className="rounded-xl text-xs font-semibold px-4 py-2 border-rakta-border text-rakta-navy hover:bg-rakta-surface"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isAdjusting}
                  className="rounded-xl bg-rakta-primary hover:bg-rakta-primary-hover text-white text-xs font-semibold px-5 py-2 flex items-center gap-1.5 shadow-xs"
                >
                  {isAdjusting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isAdjusting ? "Menyimpan Transaksi..." : "Simpan Penyesuaian"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Produk */}
      <ConfirmModal
        isOpen={Boolean(confirmDeleteProd)}
        onClose={() => setConfirmDeleteProd(null)}
        onConfirm={handleExecuteDeleteProduct}
        title="Hapus Master Produk"
        message={
          confirmDeleteProd?.jumlah_stok > 0
            ? `Peringatan: Produk "${confirmDeleteProd?.nama}" (${confirmDeleteProd?.sku}) saat ini masih memiliki sisa stok fisik sebanyak ${confirmDeleteProd.jumlah_stok} ${confirmDeleteProd.unit} di rak gudang.\n\nApakah Anda yakin ingin tetap menghapus master produk ini? Produk yang memiliki riwayat transaksi operasional tidak dapat dihapus.`
            : `Apakah Anda yakin ingin menghapus produk "${confirmDeleteProd?.nama}" (${confirmDeleteProd?.sku}) dari sistem?\n\nPerhatian: Produk yang sudah memiliki riwayat transaksi tidak dapat dihapus.`
        }
        confirmText="Hapus Produk"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}