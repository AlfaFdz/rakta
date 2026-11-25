"use client";

import { useState, useTransition, useActionState } from "react";
import {
  createRestockOrderAction,
  cancelRestockOrderAction,
  confirmRestockOrderAction,
  rejectRestockOrderAction,
  shipRestockOrderAction,
  markRestockInspectingAction,
  markRestockReceivedAction,
  claimRefundAction,
  rateSupplierOrderAction,
} from "@/app/actions/restock";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ConfirmModal";
import Pagination from "@/components/ui/Pagination";
import { formatTanggal } from "@/lib/format";
import { exportToCsv } from "@/lib/exportCsv";
import {
  Truck,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Search,
  X,
  Building2,
  Calendar,
  Loader2,
  Info,
  ShieldAlert,
  Star,
  Download,
  Image as ImageIcon,
} from "lucide-react";

export default function RestockManager({
  orders = [],
  suppliers = [],
  products = [],
  userRole = "warehouse_manager",
  userId = null,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalMode, setModalMode] = useState(null); // 'create' | 'reject' | 'ship' | 'inspect' | 'refund' | null
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isPendingAction, startTransition] = useTransition();
  const [activeActionId, setActiveActionId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  // State navigasi halaman (Pagination & Lazy Rendering)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter daftar pesanan
  const filteredOrders = orders.filter((o) => {
    // 1. Pencarian
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      o.nomor_po?.toLowerCase().includes(q) ||
      o.supplier_nama?.toLowerCase().includes(q) ||
      o.supplier_perusahaan?.toLowerCase().includes(q) ||
      o.items?.some((it) => it.product_nama?.toLowerCase().includes(q) || it.product_sku?.toLowerCase().includes(q));

    // 2. Filter Status
    const matchStatus = statusFilter === "all" || o.status === statusFilter;

    return matchSearch && matchStatus;
  });

  // Potong hanya data yang aktif pada halaman saat ini (Lazy Windowing Slicing)
  const totalItems = filteredOrders.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safePage = Math.max(1, Math.min(currentPage, totalPages));
  const startIndex = (safePage - 1) * pageSize;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + pageSize);

  // Action state untuk Buat PO (Warehouse Manager)
  const [createState, createAction, isCreating] = useActionState(async (prev, formData) => {
    const res = await createRestockOrderAction(prev, formData);
    if (res?.success) {
      setModalMode(null);
      setFeedback({ type: "success", message: res.message });
      return null;
    }
    return res;
  }, null);

  // Action state untuk Tolak PO (Supplier)
  const [rejectState, rejectAction, isRejecting] = useActionState(async (prev, formData) => {
    const res = await rejectRestockOrderAction(prev, formData);
    if (res?.success) {
      setModalMode(null);
      setSelectedOrder(null);
      setFeedback({ type: "success", message: res.message });
      return null;
    }
    return res;
  }, null);

  // Action state untuk Kirim PO (Supplier)
  const [shipState, shipAction, isShipping] = useActionState(async (prev, formData) => {
    const res = await shipRestockOrderAction(prev, formData);
    if (res?.success) {
      setModalMode(null);
      setSelectedOrder(null);
      setFeedback({ type: "success", message: res.message });
      return null;
    }
    return res;
  }, null);

  // Action state untuk Tandai Tiba & Mulai Cek Fisik (Warehouse Manager)
  const [inspectState, inspectAction, isInspecting] = useActionState(async (prev, formData) => {
    const res = await markRestockInspectingAction(prev, formData);
    if (res?.success) {
      setModalMode(null);
      setSelectedOrder(null);
      setFeedback({ type: "success", message: res.message });
      return null;
    }
    return res;
  }, null);

  // Action state untuk Klaim Refund (Warehouse Manager)
  const [refundState, refundAction, isRefunding] = useActionState(async (prev, formData) => {
    const res = await claimRefundAction(prev, formData);
    if (res?.success) {
      setModalMode(null);
      setSelectedOrder(null);
      setFeedback({ type: "success", message: res.message });
      return null;
    }
    return res;
  }, null);

  // State untuk Penilaian / Rating Supplier (Warehouse Manager & Admin)
  const [ratingOrder, setRatingOrder] = useState(null);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingHover, setRatingHover] = useState(0);

  // Action state untuk Penilaian Supplier
  const [rateState, rateAction, isRating] = useActionState(async (prev, formData) => {
    const res = await rateSupplierOrderAction(prev, formData);
    if (res?.success) {
      setRatingOrder(null);
      setFeedback({ type: "success", message: res.message });
      return null;
    }
    return res;
  }, null);

  // Handler Ekspor CSV Laporan Pesanan Restock
  const handleExportCsv = () => {
    const columns = [
      { label: "Nomor PO", key: "nomor_po" },
      { label: "Tanggal Order", key: (o) => formatTanggal(o.tanggal_order) },
      { label: "Estimasi Tiba", key: (o) => (o.estimasi_tiba ? formatTanggal(o.estimasi_tiba) : "-") },
      { label: "Mitra Supplier", key: (o) => o.supplier_perusahaan || o.supplier_nama },
      { label: "Kontak PIC", key: (o) => o.supplier_nama },
      {
        label: "Rincian Barang",
        key: (o) => o.items?.map((it) => `${it.product_nama} (${it.qty} ${it.unit})`).join("; ") || "-",
      },
      { label: "Status Pengiriman", key: (o) => o.status },
      { label: "Nomor Resi", key: (o) => o.nomor_resi || "-" },
      { label: "Skor Rating", key: (o) => (o.rating ? `${o.rating} Bintang` : "Belum Dinilai") },
      { label: "Catatan Evaluasi", key: (o) => o.review_note || "-" },
      { label: "Dibuat Oleh", key: "dibuat_oleh_nama" },
    ];
    exportToCsv("laporan-restock-rakta.csv", columns, filteredOrders);
  };

  // Handler Konfirmasi PO (Supplier)
  const handleConfirmOrder = (order) => {
    setConfirmDialog({ type: "confirm", order });
  };

  // Handler Batalkan PO (Warehouse Manager)
  const handleCancelOrder = (order) => {
    setConfirmDialog({ type: "cancel", order });
  };

  // Handler eksekusi konfirmasi modal
  const handleExecuteConfirmDialog = () => {
    if (!confirmDialog) return;
    const { type, order } = confirmDialog;
    setActiveActionId(order.id);

    startTransition(async () => {
      let res;
      if (type === "confirm") {
        res = await confirmRestockOrderAction(order.id);
      } else if (type === "cancel") {
        res = await cancelRestockOrderAction(order.id);
      } else if (type === "received") {
        res = await markRestockReceivedAction(order.id);
      }

      if (res?.success) {
        setFeedback({ type: "success", message: res.message });
      } else {
        const defaultErr =
          type === "confirm"
            ? "Gagal mengonfirmasi pesanan."
            : type === "cancel"
            ? "Gagal membatalkan pesanan."
            : "Gagal memperbarui status pesanan.";
        setFeedback({ type: "error", message: res?.error || defaultErr });
      }
      setActiveActionId(null);
      setConfirmDialog(null);
    });
  };

  // Helper badge status pesanan
  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return {
          label: "Menunggu Konfirmasi",
          classes: "bg-amber-50 text-amber-700 border-amber-200/80",
          dot: "bg-amber-500",
        };
      case "confirmed":
        return {
          label: "Dikonfirmasi",
          classes: "bg-rakta-bg/70 text-rakta-navy border-rakta-border",
          dot: "bg-rakta-primary",
        };
      case "in_transit":
        return {
          label: "Dalam Pengiriman",
          classes: "bg-purple-50 text-purple-700 border-purple-200/80",
          dot: "bg-purple-500",
        };
      case "inspecting":
        return {
          label: "Pemeriksaan Fisik",
          classes: "bg-amber-50 text-amber-800 border-amber-200/80",
          dot: "bg-amber-500",
        };
      case "received":
        return {
          label: "Selesai Diterima",
          classes: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
          dot: "bg-emerald-500",
        };
      case "returned":
        return {
          label: "Diretur",
          classes: "bg-rose-50 text-rose-700 border-rose-200/80",
          dot: "bg-rose-500",
        };
      case "rejected":
        return {
          label: "Dibatalkan",
          classes: "bg-rose-50 text-rose-700 border-rose-200/80",
          dot: "bg-rose-500",
        };
      default:
        return {
          label: status,
          classes: "bg-rakta-surface text-rakta-navy border-rakta-border",
          dot: "bg-rakta-muted",
        };
    }
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
            className="text-rakta-muted hover:text-rakta-navy p-1 transition-colors"
            title="Tutup pemberitahuan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bilah Alat & Filter (Toolbar) */}
      <div className="bg-white border border-rakta-border rounded-2xl p-4 md:p-5 rakta-card-shadow flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Kolom Kiri: Input Pencarian */}
        <div className="relative flex-1 min-w-60">
          <Search className="w-4 h-4 text-rakta-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nomor PO, nama produk, SKU, atau supplier..."
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

        {/* Kolom Kanan: Filter Status & Tombol Aksi */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Tab Filter Status */}
          <div className="inline-flex p-1 bg-rakta-surface border border-rakta-border rounded-xl overflow-x-auto">
            <button
              onClick={() => {
                setStatusFilter("all");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === "all"
                  ? "bg-rakta-bg/80 text-rakta-navy shadow-xs"
                  : "text-rakta-muted hover:text-rakta-navy"
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => {
                setStatusFilter("pending");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === "pending"
                  ? "bg-amber-100/80 text-amber-900 shadow-xs"
                  : "text-rakta-muted hover:text-rakta-navy"
              }`}
            >
              Menunggu
            </button>
            <button
              onClick={() => {
                setStatusFilter("confirmed");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === "confirmed"
                  ? "bg-rakta-bg/90 text-rakta-navy shadow-xs"
                  : "text-rakta-muted hover:text-rakta-navy"
              }`}
            >
              Dikonfirmasi
            </button>
            <button
              onClick={() => {
                setStatusFilter("in_transit");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === "in_transit"
                  ? "bg-purple-100/80 text-purple-900 shadow-xs"
                  : "text-rakta-muted hover:text-rakta-navy"
              }`}
            >
              Dikirim
            </button>
            <button
              onClick={() => {
                setStatusFilter("inspecting");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === "inspecting"
                  ? "bg-amber-100/80 text-amber-900 shadow-xs"
                  : "text-rakta-muted hover:text-rakta-navy"
              }`}
            >
              Pemeriksaan
            </button>
            <button
              onClick={() => {
                setStatusFilter("received");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === "received"
                  ? "bg-emerald-100/80 text-emerald-900 shadow-xs"
                  : "text-rakta-muted hover:text-rakta-navy"
              }`}
            >
              Selesai
            </button>
            <button
              onClick={() => {
                setStatusFilter("returned");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === "returned"
                  ? "bg-rose-100/80 text-rose-900 shadow-xs"
                  : "text-rakta-muted hover:text-rakta-navy"
              }`}
            >
              Diretur
            </button>
            <button
              onClick={() => {
                setStatusFilter("rejected");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === "rejected"
                  ? "bg-rose-100/80 text-rose-900 shadow-xs"
                  : "text-rakta-muted hover:text-rakta-navy"
              }`}
            >
              Batal
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

          {/* Tombol Buat Pesanan Restock (Warehouse Manager & Admin) */}
          {(userRole === "warehouse_manager" || userRole === "admin") && (
            <Button
              onClick={() => setModalMode("create")}
              className="rounded-xl bg-rakta-primary hover:bg-rakta-primary-hover text-white text-xs font-semibold px-4 py-2 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Pesanan Restock</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabel Daftar Pesanan Restock */}
      <div className="bg-white border border-rakta-border rounded-2xl rakta-card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-rakta-border bg-rakta-surface/80 text-xs font-semibold text-rakta-muted">
                <th className="px-5 py-3.5">Nomor PO &amp; tanggal</th>
                <th className="px-5 py-3.5">Mitra supplier</th>
                <th className="px-5 py-3.5">Barang &amp; kuantitas</th>
                <th className="px-5 py-3.5">Status &amp; keterangan</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rakta-border/40">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-rakta-muted">
                    <Truck className="w-10 h-10 mx-auto mb-2 text-rakta-muted/40" />
                    <p className="font-semibold text-rakta-navy text-base">
                      Tidak ada pesanan restock ditemukan
                    </p>
                    <p className="text-xs text-rakta-muted mt-1 max-w-sm mx-auto">
                      Coba sesuaikan kata kunci pencarian atau filter status di atas.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => {
                  const badge = getStatusBadge(order.status);
                  const isProcessing = isPendingAction && activeActionId === order.id;

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-rakta-surface/50 transition-colors group text-rakta-navy"
                    >
                      {/* Nomor PO & Tanggal */}
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-rakta-surface text-rakta-navy border border-rakta-border">
                            {order.nomor_po}
                          </span>
                          <div className="text-xs text-rakta-muted flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-rakta-primary shrink-0" />
                            <span className="font-mono tabular-nums">{formatTanggal(order.tanggal_order)}</span>
                          </div>
                          {order.estimasi_tiba && (
                            <p className="text-[11px] text-rakta-muted">
                              Est. Tiba: <span className="font-mono tabular-nums">{formatTanggal(order.estimasi_tiba)}</span>
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Mitra Supplier */}
                      <td className="px-5 py-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-rakta-navy">
                            <Building2 className="w-3.5 h-3.5 text-rakta-primary shrink-0" />
                            <span>{order.supplier_perusahaan || order.supplier_nama}</span>
                          </div>
                          {order.supplier_perusahaan && (
                            <p className="text-[11px] text-rakta-muted">PIC: {order.supplier_nama}</p>
                          )}
                        </div>
                      </td>

                      {/* Barang & Kuantitas */}
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          {order.items?.map((it, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                              <span className="font-medium text-rakta-navy">
                                {it.product_nama}
                              </span>
                              <span className="font-mono tabular-nums font-semibold px-2 py-0.5 rounded-lg bg-rakta-surface border border-rakta-border text-rakta-navy text-[11px]">
                                {it.qty} {it.unit}
                              </span>
                            </div>
                          ))}
                          {order.catatan && (
                            <p className="text-[11px] text-rakta-muted italic line-clamp-1">
                              &ldquo;{order.catatan}&rdquo;
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Status & Keterangan */}
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${badge.classes}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                            <span>{badge.label}</span>
                          </span>
                          {order.nomor_resi && (
                            <div className="text-[11px] font-mono tabular-nums text-rakta-navy">
                              Resi: <span className="font-semibold">{order.nomor_resi}</span>
                            </div>
                          )}
                          {order.foto_bukti_url && (
                            <div>
                              <a
                                href={order.foto_bukti_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-rakta-primary hover:underline"
                              >
                                <ImageIcon className="w-3 h-3" />
                                <span>Foto Kedatangan</span>
                              </a>
                            </div>
                          )}
                          {order.refund_status && (
                            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                              <span>{order.refund_status}</span>
                            </div>
                          )}
                          {order.catatan_status && (
                            <p className="text-[11px] text-rakta-muted max-w-xs line-clamp-2">
                              {order.catatan_status}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Aksi Berdasarkan Peran */}
                      <td className="px-5 py-4 text-right">
                        {/* Aksi Khusus Supplier */}
                        {userRole === "supplier" && (
                          <div className="flex items-center justify-end gap-1.5">
                            {order.status === "pending" && (
                              <>
                                <button
                                  onClick={() => handleConfirmOrder(order)}
                                  disabled={isProcessing}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                  {isProcessing ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  )}
                                  <span>Konfirmasi</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setModalMode("reject");
                                  }}
                                  disabled={isProcessing}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Tolak</span>
                                </button>
                              </>
                            )}

                            {order.status === "confirmed" && (
                              <button
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setModalMode("ship");
                                }}
                                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-rakta-primary hover:bg-rakta-primary-hover text-white flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                <span>Proses &amp; Kirim</span>
                              </button>
                            )}

                            {(order.status === "in_transit" ||
                              order.status === "inspecting" ||
                              order.status === "received" ||
                              order.status === "returned" ||
                              order.status === "rejected") && (
                              <div className="flex items-center gap-1.5">
                                {order.rating && (
                                  <span
                                    className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl"
                                    title={order.review_note ? `Ulasan: "${order.review_note}"` : "Rating pesanan"}
                                  >
                                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                                    <span className="font-mono tabular-nums">{order.rating} / 5</span>
                                  </span>
                                )}
                                <span className="text-xs text-rakta-muted font-medium bg-rakta-surface px-2.5 py-1 rounded-xl border border-rakta-border">
                                  {order.status === "returned" ? "Diretur" : "Selesai"}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Aksi Khusus Warehouse Manager & Admin */}
                        {(userRole === "warehouse_manager" || userRole === "admin") && (
                          <div className="flex items-center justify-end gap-2">
                            {order.status === "pending" && (
                              <button
                                onClick={() => handleCancelOrder(order)}
                                disabled={isProcessing}
                                className="px-3 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                {isProcessing ? "Membatalkan..." : "Batalkan Pesanan"}
                              </button>
                            )}

                            {order.status === "in_transit" && (
                              <button
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setModalMode("inspect");
                                }}
                                disabled={isProcessing}
                                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Tandai Tiba &amp; Cek Fisik</span>
                              </button>
                            )}

                            {order.status === "inspecting" && (
                              <span className="text-xs text-amber-800 font-semibold bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                                Pemeriksaan Fisik Staff
                              </span>
                            )}

                            {order.status === "received" && (
                              <div className="flex items-center gap-1.5">
                                {order.rating ? (
                                  <div
                                    className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl"
                                    title={order.review_note ? `Ulasan: "${order.review_note}"` : "Rating tersimpan"}
                                  >
                                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                                    <span className="font-mono tabular-nums">{order.rating} / 5</span>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setRatingOrder(order);
                                      setRatingScore(5);
                                      setRatingHover(0);
                                    }}
                                    className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                                    title="Beri rating supplier untuk PO ini"
                                  >
                                    <Star className="w-3.5 h-3.5 fill-current" />
                                    <span>Beri Rating</span>
                                  </button>
                                )}
                                <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                                  Barang Tiba
                                </span>
                              </div>
                            )}

                            {order.status === "returned" && (
                              <div className="flex items-center gap-1.5">
                                {!order.refund_status ? (
                                  <button
                                    onClick={() => {
                                      setSelectedOrder(order);
                                      setModalMode("refund");
                                    }}
                                    className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                                    title="Ajukan klaim refund ke supplier"
                                  >
                                    <ShieldAlert className="w-3.5 h-3.5" />
                                    <span>Klaim Refund</span>
                                  </button>
                                ) : (
                                  <span className="text-xs text-rose-700 font-semibold bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200">
                                    Refund Diajukan
                                  </span>
                                )}
                              </div>
                            )}

                            {(order.status === "confirmed" || order.status === "rejected") && (
                              <span className="text-xs text-rakta-muted font-medium bg-rakta-surface px-2.5 py-1 rounded-xl border border-rakta-border">
                                {order.status === "confirmed" ? "Sedang Disiapkan Supplier" : "Dibatalkan"}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Aksi Khusus Staff Gudang */}
                        {userRole === "staff_gudang" && (
                          <div className="text-right">
                            {order.status === "inspecting" ? (
                              <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                                Perlu Cek Fisik (Transaksi)
                              </span>
                            ) : order.status === "received" ? (
                              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                                Selesai Diterima
                              </span>
                            ) : order.status === "returned" ? (
                              <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200">
                                Diretur
                              </span>
                            ) : order.status === "in_transit" ? (
                              <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-200">
                                Dalam Pengiriman
                              </span>
                            ) : (
                              <span className="text-xs text-rakta-muted font-medium bg-rakta-surface px-2.5 py-1 rounded-xl border border-rakta-border">
                                Mode Pantau
                              </span>
                            )}
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
          itemName="pesanan"
        />
      </div>

      {/* MODAL: Buat Pesanan Restock Baru (Warehouse Manager) */}
      {modalMode === "create" && (
        <div className="fixed inset-0 z-50 bg-rakta-navy/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-rakta-border rounded-2xl w-full max-w-lg p-6 rakta-card-shadow relative my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-rakta-border">
              <div>
                <h3 className="text-base font-bold text-rakta-navy">
                  Buat Pengajuan Restock (PO)
                </h3>
                <p className="text-xs text-rakta-muted mt-0.5">
                  Kirim Purchase Order resmi ke mitra supplier terdaftar
                </p>
              </div>
              <button
                onClick={() => setModalMode(null)}
                className="text-rakta-muted hover:text-rakta-navy p-1.5 rounded-xl hover:bg-rakta-surface transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createState?.error && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createState.error}</span>
              </div>
            )}

            <form action={createAction} className="mt-5 space-y-4">
              {/* Pilih Supplier */}
              <div>
                <label className="block text-xs font-semibold text-rakta-navy mb-1">
                  Mitra Supplier Rekanan <span className="text-rose-500">*</span>
                </label>
                <select
                  name="supplier_id"
                  required
                  className="w-full px-3 py-2 text-sm rounded-xl bg-white border border-rakta-border text-rakta-navy focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20"
                >
                  <option value="">Pilih Mitra Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama_perusahaan ? `${s.nama_perusahaan} (${s.nama})` : s.nama}
                      {s.avg_rating ? ` - ★ ${s.avg_rating} (${s.total_reviews} ulasan)` : " - Belum ada rating"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pilih Produk & Jumlah */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-rakta-navy mb-1">
                    Produk yang Dipesan <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="product_id"
                    required
                    className="w-full px-3 py-2 text-sm rounded-xl bg-white border border-rakta-border text-rakta-navy focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20"
                  >
                    <option value="">Pilih Produk</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.sku}] {p.nama} (Stok: {p.jumlah_stok} {p.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-rakta-navy mb-1">
                    Jumlah (Qty) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="qty"
                    min="1"
                    required
                    placeholder="10"
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-xl bg-white border border-rakta-border text-rakta-navy focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20"
                  />
                </div>
              </div>

              {/* Estimasi Tiba */}
              <div>
                <label className="block text-xs font-semibold text-rakta-navy mb-1">
                  Estimasi Tanggal Tiba di Gudang
                </label>
                <input
                  type="date"
                  name="estimasi_tiba"
                  className="w-full px-3 py-2 text-sm rounded-xl bg-white border border-rakta-border text-rakta-navy focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20"
                />
              </div>

              {/* Catatan PO */}
              <div>
                <label className="block text-xs font-semibold text-rakta-navy mb-1">
                  Instruksi / Catatan Tambahan (Opsional)
                </label>
                <textarea
                  name="catatan"
                  rows={2}
                  placeholder="Contoh: Harap kemas dengan bubble wrap tebal dan sertakan packing slip..."
                  className="w-full px-3 py-2 text-sm rounded-xl bg-white border border-rakta-border text-rakta-navy placeholder:text-rakta-muted/60 focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20 resize-none"
                />
              </div>

              {/* Tombol Aksi */}
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
                  disabled={isCreating}
                  className="rounded-xl bg-rakta-primary hover:bg-rakta-primary-hover text-white text-xs font-semibold px-5 py-2 flex items-center gap-1.5 shadow-xs"
                >
                  {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isCreating ? "Mengajukan PO..." : "Kirim Pengajuan PO"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Tolak Pesanan (Supplier) */}
      {modalMode === "reject" && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-rakta-navy/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-rakta-border rounded-2xl w-full max-w-md p-6 rakta-card-shadow relative my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-rakta-border">
              <h3 className="text-base font-bold text-rose-700 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <span>Tolak Pesanan Restock</span>
              </h3>
              <button
                onClick={() => {
                  setModalMode(null);
                  setSelectedOrder(null);
                }}
                className="text-rakta-muted hover:text-rakta-navy p-1 rounded-xl hover:bg-rakta-surface transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {rejectState?.error && (
              <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {rejectState.error}
              </div>
            )}

            <p className="text-xs text-rakta-muted mt-3">
              Anda akan menolak pesanan <span className="font-bold text-rakta-navy font-mono">{selectedOrder.nomor_po}</span>. Berikan alasan penolakan agar tim gudang dapat mengetahui kendalanya.
            </p>

            <form action={rejectAction} className="mt-4 space-y-4">
              <input type="hidden" name="order_id" value={selectedOrder.id} />

              <div>
                <label className="block text-xs font-semibold text-rakta-navy mb-1">
                  Alasan Penolakan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  name="alasan"
                  rows={3}
                  required
                  placeholder="Contoh: Stok bahan baku sedang kosong di pabrik / Kapasitas produksi penuh hingga akhir bulan..."
                  className="w-full px-3 py-2 text-sm rounded-xl bg-white border border-rakta-border text-rakta-navy placeholder:text-rakta-muted/60 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-rakta-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setModalMode(null);
                    setSelectedOrder(null);
                  }}
                  className="rounded-xl text-xs font-semibold px-4 py-2 border-rakta-border text-rakta-navy hover:bg-rakta-surface"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isRejecting}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-5 py-2 flex items-center gap-1.5 shadow-xs"
                >
                  {isRejecting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isRejecting ? "Memproses..." : "Konfirmasi Penolakan"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Proses & Kirim Barang (Supplier) */}
      {modalMode === "ship" && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-rakta-navy/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-rakta-border rounded-2xl w-full max-w-md p-6 rakta-card-shadow relative my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-rakta-border">
              <div>
                <h3 className="text-base font-bold text-rakta-navy">
                  Proses Pengiriman Barang
                </h3>
                <p className="text-xs text-rakta-muted mt-0.5">
                  Perbarui status pengiriman pesanan restock
                </p>
              </div>
              <button
                onClick={() => {
                  setModalMode(null);
                  setSelectedOrder(null);
                }}
                className="text-rakta-muted hover:text-rakta-navy p-1 rounded-xl hover:bg-rakta-surface transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {shipState?.error && (
              <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {shipState.error}
              </div>
            )}

            <p className="text-xs text-rakta-muted mt-3">
              Pesanan <span className="font-bold text-rakta-navy font-mono">{selectedOrder.nomor_po}</span> akan ditandai dalam perjalanan (In Transit). Masukkan nomor resi atau ekspedisi pengiriman.
            </p>

            <form action={shipAction} className="mt-4 space-y-4">
              <input type="hidden" name="order_id" value={selectedOrder.id} />

              <div>
                <label className="block text-xs font-semibold text-rakta-navy mb-1">
                  Nomor Resi / Surat Jalan Ekspedisi
                </label>
                <input
                  type="text"
                  name="nomor_resi"
                  placeholder="Contoh: JNE-TRK-9900123 / SJ-2026-08"
                  className="w-full px-3 py-2 text-sm rounded-xl bg-white border border-rakta-border text-rakta-navy placeholder:text-rakta-muted/60 focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-rakta-navy mb-1">
                  Catatan Pengiriman / Nama Kurir
                </label>
                <input
                  type="text"
                  name="catatan_pengiriman"
                  placeholder="Contoh: Dikirim via Truk Engkel Box (Supir: Bpk. Joko)"
                  className="w-full px-3 py-2 text-sm rounded-xl bg-white border border-rakta-border text-rakta-navy placeholder:text-rakta-muted/60 focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-rakta-border">
                <label className="block text-xs font-semibold text-rakta-navy">
                  Bukti Foto Pengiriman / Kedatangan (Opsional)
                </label>
                <div>
                  <span className="text-[11px] text-rakta-muted block mb-1">Unggah berkas foto:</span>
                  <input
                    type="file"
                    name="foto_file"
                    accept="image/*"
                    className="w-full text-xs text-rakta-navy file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-rakta-surface file:text-rakta-navy hover:file:bg-rakta-bg cursor-pointer"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-rakta-muted block mb-1">Atau masukkan URL gambar:</span>
                  <input
                    type="url"
                    name="foto_url"
                    placeholder="https://example.com/foto-bukti.jpg"
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-rakta-border text-rakta-navy placeholder:text-rakta-muted/60 focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-rakta-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setModalMode(null);
                    setSelectedOrder(null);
                  }}
                  className="rounded-xl text-xs font-semibold px-4 py-2 border-rakta-border text-rakta-navy hover:bg-rakta-surface"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isShipping}
                  className="rounded-xl bg-rakta-primary hover:bg-rakta-primary-hover text-white text-xs font-semibold px-5 py-2 flex items-center gap-1.5 shadow-xs"
                >
                  {isShipping && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isShipping ? "Memproses..." : "Tandai Dikirim"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Tandai Tiba & Mulai Pemeriksaan Fisik (Warehouse Manager) */}
      {modalMode === "inspect" && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-rakta-navy/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-rakta-border rounded-2xl w-full max-w-md p-6 rakta-card-shadow relative my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-rakta-border">
              <div>
                <h3 className="text-base font-bold text-rakta-navy">
                  Konfirmasi Kedatangan Barang
                </h3>
                <p className="text-xs text-rakta-muted mt-0.5">
                  Barang tiba di gudang dan masuk antrean pemeriksaan fisik
                </p>
              </div>
              <button
                onClick={() => {
                  setModalMode(null);
                  setSelectedOrder(null);
                }}
                className="text-rakta-muted hover:text-rakta-navy p-1 rounded-xl hover:bg-rakta-surface transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {inspectState?.error && (
              <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {inspectState.error}
              </div>
            )}

            <p className="text-xs text-rakta-muted mt-3">
              Tandai barang pesanan <span className="font-bold text-rakta-navy font-mono">{selectedOrder.nomor_po}</span> telah tiba di gudang. Status akan beralih ke <span className="font-semibold text-amber-700">Inspecting</span> agar Staff Gudang dapat melakukan pemeriksaan fisik dan menginput dokumen masuk.
            </p>

            <form action={inspectAction} className="mt-4 space-y-4">
              <input type="hidden" name="order_id" value={selectedOrder.id} />

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-rakta-navy">
                  Foto Bukti Kedatangan Fisik (Opsional)
                </label>
                <div>
                  <span className="text-[11px] text-rakta-muted block mb-1">Unggah berkas foto langsung:</span>
                  <input
                    type="file"
                    name="foto_file"
                    accept="image/*"
                    className="w-full text-xs text-rakta-navy file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-rakta-surface file:text-rakta-navy hover:file:bg-rakta-bg cursor-pointer"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-rakta-muted block mb-1">Atau masukkan URL gambar:</span>
                  <input
                    type="url"
                    name="foto_url"
                    placeholder="https://example.com/foto-bukti.jpg"
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-rakta-border text-rakta-navy placeholder:text-rakta-muted/60 focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-rakta-navy mb-1">
                  Instruksi / Catatan Pemeriksaan
                </label>
                <textarea
                  name="catatan_tiba"
                  rows={2}
                  placeholder="Contoh: Barang telah tiba di loading dock A. Harap periksa segel kardus dan jumlah barang."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-rakta-border text-rakta-navy placeholder:text-rakta-muted/60 focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-rakta-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setModalMode(null);
                    setSelectedOrder(null);
                  }}
                  className="rounded-xl text-xs font-semibold px-4 py-2 border-rakta-border text-rakta-navy hover:bg-rakta-surface"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isInspecting}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-5 py-2 flex items-center gap-1.5 shadow-xs"
                >
                  {isInspecting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isInspecting ? "Memproses..." : "Konfirmasi Tiba & Cek Fisik"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Ajukan Klaim Refund (Warehouse Manager) */}
      {modalMode === "refund" && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-rakta-navy/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-rakta-border rounded-2xl w-full max-w-md p-6 rakta-card-shadow relative my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-rakta-border">
              <h3 className="text-base font-bold text-rose-700 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <span>Pengajuan Klaim Refund / Retur</span>
              </h3>
              <button
                onClick={() => {
                  setModalMode(null);
                  setSelectedOrder(null);
                }}
                className="text-rakta-muted hover:text-rakta-navy p-1 rounded-xl hover:bg-rakta-surface transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {refundState?.error && (
              <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {refundState.error}
              </div>
            )}

            <p className="text-xs text-rakta-muted mt-3">
              Ajukan klaim refund kepada mitra supplier untuk pesanan <span className="font-bold text-rakta-navy font-mono">{selectedOrder.nomor_po}</span> yang ditolak karena cacat fisik atau tidak sesuai spesifikasi.
            </p>

            <form action={refundAction} className="mt-4 space-y-4">
              <input type="hidden" name="order_id" value={selectedOrder.id} />

              <div>
                <label className="block text-xs font-semibold text-rakta-navy mb-1">
                  Rincian Klaim Refund &amp; Kerusakan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  name="refund_note"
                  rows={3}
                  required
                  placeholder="Contoh: Barang mengalami kerusakan segel dan 15 unit penyok saat tiba di gudang. Meminta pengembalian dana 100% atau penggantian batch pengiriman baru."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-rakta-border text-rakta-navy placeholder:text-rakta-muted/60 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-rakta-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setModalMode(null);
                    setSelectedOrder(null);
                  }}
                  className="rounded-xl text-xs font-semibold px-4 py-2 border-rakta-border text-rakta-navy hover:bg-rakta-surface"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isRefunding}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-5 py-2 flex items-center gap-1.5 shadow-xs"
                >
                  {isRefunding && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isRefunding ? "Mengajukan..." : "Kirim Klaim Refund"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Tindakan PO */}
      <ConfirmModal
        isOpen={Boolean(confirmDialog)}
        onClose={() => setConfirmDialog(null)}
        onConfirm={handleExecuteConfirmDialog}
        title={
          confirmDialog?.type === "confirm"
            ? "Konfirmasi Pesanan"
            : confirmDialog?.type === "cancel"
            ? "Batalkan Pesanan"
            : "Konfirmasi Penerimaan Barang"
        }
        message={
          confirmDialog?.type === "confirm"
            ? `Konfirmasi pesanan ${confirmDialog?.order?.nomor_po}? Pesanan akan masuk ke tahap persiapan barang oleh Supplier.`
            : confirmDialog?.type === "cancel"
            ? `Apakah Anda yakin ingin membatalkan pesanan ${confirmDialog?.order?.nomor_po}?`
            : `Tandai barang pesanan ${confirmDialog?.order?.nomor_po} telah tiba di gudang?\n\nCatatan: Status akan berubah menjadi 'Inspecting' untuk pemeriksaan fisik. Jumlah stok produk tidak bertambah sampai Incoming Transaction disetujui di menu Transaksi.`
        }
        confirmText={
          confirmDialog?.type === "confirm"
            ? "Konfirmasi Pesanan"
            : confirmDialog?.type === "cancel"
            ? "Batalkan Pesanan"
            : "Tandai Diterima"
        }
        variant={confirmDialog?.type === "cancel" ? "danger" : "primary"}
        isLoading={isPendingAction}
      />

      {/* MODAL: Beri Rating Mitra Supplier */}
      {ratingOrder && (
        <div className="fixed inset-0 z-50 bg-rakta-navy/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-rakta-border rounded-2xl w-full max-w-lg p-6 rakta-card-shadow relative my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-rakta-border">
              <div>
                <h3 className="text-base font-bold text-rakta-navy">
                  Beri Rating Mitra Supplier
                </h3>
                <p className="text-xs text-rakta-muted mt-0.5">
                  Evaluasi performa pengiriman untuk pesanan {ratingOrder.nomor_po}
                </p>
              </div>
              <button
                onClick={() => {
                  setRatingOrder(null);
                  setRatingScore(5);
                  setRatingHover(0);
                }}
                className="text-rakta-muted hover:text-rakta-navy p-1.5 rounded-xl hover:bg-rakta-surface transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message */}
            {rateState?.error && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{rateState.error}</span>
              </div>
            )}

            {/* Rincian Supplier */}
            <div className="mt-4 p-3.5 rounded-xl bg-rakta-surface border border-rakta-border text-xs space-y-1">
              <div className="flex items-center justify-between font-bold text-rakta-navy">
                <span>{ratingOrder.supplier_perusahaan || ratingOrder.supplier_nama}</span>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-white border border-rakta-border font-semibold">
                  {ratingOrder.nomor_po}
                </span>
              </div>
              <div className="text-[11px] text-rakta-muted flex items-center gap-2">
                <span>PIC: {ratingOrder.supplier_nama}</span>
                <span>•</span>
                <span>Barang telah tiba di gudang</span>
              </div>
            </div>

            <form action={rateAction} className="mt-5 space-y-4">
              <input type="hidden" name="order_id" value={ratingOrder.id} />
              <input type="hidden" name="rating" value={ratingScore} />

              {/* Pemilihan Skor Bintang 1-5 */}
              <div>
                <label className="block text-xs font-semibold text-rakta-navy mb-2 text-center">
                  Pilih Skor Penilaian Performa <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center justify-center gap-2 py-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = (ratingHover || ratingScore) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRatingScore(star)}
                        onMouseEnter={() => setRatingHover(star)}
                        onMouseLeave={() => setRatingHover(0)}
                        className="p-1.5 rounded-lg hover:bg-amber-50/60 transition-transform hover:scale-110 cursor-pointer focus:outline-none"
                        title={`${star} Bintang`}
                      >
                        <Star
                          className={`w-8 h-8 transition-colors ${
                            isFilled
                              ? "fill-amber-400 text-amber-500"
                              : "text-rakta-border hover:text-amber-300"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <p className="text-center text-xs font-semibold text-amber-800 mt-1">
                  {ratingScore === 5
                    ? "5 Bintang - Sangat Memuaskan"
                    : ratingScore === 4
                    ? "4 Bintang - Pengiriman Baik"
                    : ratingScore === 3
                    ? "3 Bintang - Cukup / Sesuai Standar"
                    : ratingScore === 2
                    ? "2 Bintang - Perlu Peningkatan"
                    : "1 Bintang - Sangat Mengecewakan"}
                </p>
              </div>

              {/* Catatan Ulasan */}
              <div>
                <label className="block text-xs font-semibold text-rakta-navy mb-1">
                  Catatan Evaluasi / Ulasan Singkat (Opsional)
                </label>
                <textarea
                  name="review_note"
                  rows={3}
                  placeholder="Contoh: Pengiriman tepat waktu, kemasan barang rapi dan tersegel dengan baik..."
                  className="w-full px-3 py-2 text-sm rounded-xl bg-white border border-rakta-border text-rakta-navy placeholder:text-rakta-muted/60 focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20 resize-none"
                />
              </div>

              {/* Tombol Aksi */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-rakta-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setRatingOrder(null);
                    setRatingScore(5);
                    setRatingHover(0);
                  }}
                  className="rounded-xl text-xs font-semibold px-4 py-2 border-rakta-border text-rakta-navy hover:bg-rakta-surface"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isRating}
                  className="rounded-xl bg-rakta-primary hover:bg-rakta-primary-hover text-white text-xs font-semibold px-5 py-2 flex items-center gap-1.5 shadow-xs"
                >
                  {isRating && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isRating ? "Menyimpan..." : "Simpan Penilaian"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}