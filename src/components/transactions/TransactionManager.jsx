"use client";

import { useState, useTransition, useActionState } from "react";
import {
  createIncomingFromRestockAction,
  approveIncomingTransactionAction,
  rejectIncomingTransactionAction,
  createOutgoingTransactionAction,
  approveOutgoingTransactionAction,
  rejectOutgoingTransactionAction,
  dispatchOutgoingTransactionAction,
  updatePendingOutgoingTransactionAction,
  deletePendingOutgoingTransactionAction,
} from "@/app/actions/transactions";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ConfirmModal";
import Pagination from "@/components/ui/Pagination";
import { formatTanggal } from "@/lib/format";
import { exportToCsv } from "@/lib/exportCsv";
import {
  ArrowLeftRight,
  SlidersHorizontal,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Truck,
  Package,
  Search,
  X,
  Building2,
  User,
  Calendar,
  Loader2,
  Clock,
  Send,
  Boxes,
  PackageCheck,
  FileText,
  Download,
  Pencil,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";

export default function TransactionManager({
  transactions = [],
  receivedOrders = [],
  products = [],
  userRole = "staff_gudang",
  userId = null,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all"); // 'all' | 'incoming' | 'outgoing' | 'adjustment'
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'pending' | 'approved' | 'shipped' | 'completed' | 'rejected'
  
  const [modalMode, setModalMode] = useState(null); // 'out' | 'edit_out' | 'incoming_po' | 'reject' | null
  const [selectedReceivedOrder, setSelectedReceivedOrder] = useState(null);
  const [selectedTransactionForReject, setSelectedTransactionForReject] = useState(null);
  const [selectedTrxForEdit, setSelectedTrxForEdit] = useState(null);
  const [confirmDeleteTrx, setConfirmDeleteTrx] = useState(null);
  const [incomingNotesInput, setIncomingNotesInput] = useState("");
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");
  const [feedback, setFeedback] = useState(null);

  // State untuk melacak produk yang dipilih di form pengeluaran (untuk cek stok live)
  const [selectedProductForOut, setSelectedProductForOut] = useState(null);
  const [outQtyInput, setOutQtyInput] = useState("");

  const [isProcessing, startTransition] = useTransition();
  const [activeTrxId, setActiveTrxId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  // State navigasi halaman (Pagination & Lazy Rendering)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter daftar transaksi
  const filteredTransactions = transactions.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      t.nomor_transaksi?.toLowerCase().includes(q) ||
      t.tujuan_customer?.toLowerCase().includes(q) ||
      t.supplier_nama?.toLowerCase().includes(q) ||
      t.supplier_perusahaan?.toLowerCase().includes(q) ||
      t.catatan?.toLowerCase().includes(q) ||
      t.notes?.toLowerCase().includes(q) ||
      t.operator_nama?.toLowerCase().includes(q) ||
      t.single_product_nama?.toLowerCase().includes(q) ||
      t.single_product_sku?.toLowerCase().includes(q) ||
      t.items?.some((it) => it.product_nama?.toLowerCase().includes(q) || it.product_sku?.toLowerCase().includes(q));

    // Filter Tipe
    let matchType = true;
    const itemType = t.type || t.tipe;
    if (typeFilter === "incoming") {
      matchType = itemType === "incoming" || itemType === "masuk";
    } else if (typeFilter === "outgoing") {
      matchType = itemType === "outgoing" || itemType === "keluar";
    } else if (typeFilter === "adjustment") {
      matchType = itemType === "adjustment" || itemType === "penyesuaian" || t.catatan?.toLowerCase().includes("stock opname");
    }

    // Filter Status
    let matchStatus = true;
    if (statusFilter !== "all") {
      matchStatus = t.status === statusFilter;
    }

    return matchSearch && matchType && matchStatus;
  });

  // Potong hanya data yang aktif pada halaman saat ini (Lazy Windowing Slicing)
  const totalItems = filteredTransactions.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safePage = Math.max(1, Math.min(currentPage, totalPages));
  const startIndex = (safePage - 1) * pageSize;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + pageSize);

  // Action state untuk Barang Keluar
  const [outState, outAction, isOutProgress] = useActionState(async (prev, formData) => {
    const res = await createOutgoingTransactionAction(prev, formData);
    if (res?.success) {
      setModalMode(null);
      setSelectedProductForOut(null);
      setOutQtyInput("");
      setFeedback({ type: "success", message: res.message });
      return null;
    }
    return res;
  }, null);

  // Action state untuk Edit Barang Keluar Pending
  const [editOutState, editOutAction, isEditOutProgress] = useActionState(async (prev, formData) => {
    const res = await updatePendingOutgoingTransactionAction(prev, formData);
    if (res?.success) {
      setModalMode(null);
      setSelectedTrxForEdit(null);
      setFeedback({ type: "success", message: res.message });
      return null;
    }
    return res;
  }, null);

  // Handler Hapus Transaksi Pending
  const handleExecuteDeleteTrx = () => {
    if (!confirmDeleteTrx) return;
    const trxId = confirmDeleteTrx.id;
    startTransition(async () => {
      const res = await deletePendingOutgoingTransactionAction(trxId);
      if (res?.success) {
        setFeedback({ type: "success", message: res.message });
      } else {
        setFeedback({ type: "error", message: res?.error || "Gagal membatalkan transaksi." });
      }
      setConfirmDeleteTrx(null);
    });
  };

  // Handler: Staff Gudang membuat dokumen barang masuk dari PO yang sudah berstatus 'received'
  const handleCreateIncomingFromPO = () => {
    if (!selectedReceivedOrder) return;

    setActiveTrxId(selectedReceivedOrder.id);
    startTransition(async () => {
      const res = await createIncomingFromRestockAction(selectedReceivedOrder.id, incomingNotesInput);
      if (res?.success) {
        setModalMode(null);
        setSelectedReceivedOrder(null);
        setIncomingNotesInput("");
        setFeedback({ type: "success", message: res.message });
      } else {
        setFeedback({ type: "error", message: res?.error || "Gagal membuat dokumen barang masuk." });
      }
      setActiveTrxId(null);
    });
  };

  // Handler: Warehouse Manager menyetujui barang masuk (Stok bertambah secara atomik)
  const handleApproveIncoming = (trx) => {
    setConfirmDialog({ type: "approve_in", trx });
  };

  // Handler: Warehouse Manager menyetujui barang keluar (Tahap Packing, Stok belum berkurang)
  const handleApproveOutgoing = (trx) => {
    setConfirmDialog({ type: "approve_out", trx });
  };

  // Handler: Staff Gudang mengeksekusi pengiriman barang (Stok berkurang secara atomik)
  const handleDispatchOutgoing = (trx) => {
    setConfirmDialog({ type: "dispatch_out", trx });
  };

  // Handler eksekusi konfirmasi modal transaksi
  const handleExecuteConfirmDialog = () => {
    if (!confirmDialog) return;
    const { type, trx } = confirmDialog;
    setActiveTrxId(trx.id);

    startTransition(async () => {
      let res;
      if (type === "approve_in") {
        res = await approveIncomingTransactionAction(trx.id);
      } else if (type === "approve_out") {
        res = await approveOutgoingTransactionAction(trx.id);
      } else if (type === "dispatch_out") {
        res = await dispatchOutgoingTransactionAction(trx.id);
      }

      if (res?.success) {
        setFeedback({ type: "success", message: res.message });
      } else {
        const defaultErr =
          type === "approve_in"
            ? "Gagal menyetujui barang masuk."
            : type === "approve_out"
            ? "Gagal menyetujui barang keluar."
            : "Gagal mengeksekusi pengiriman barang.";
        setFeedback({ type: "error", message: res?.error || defaultErr });
      }
      setActiveTrxId(null);
      setConfirmDialog(null);
    });
  };

  // Handler: Konfirmasi tolak transaksi (Masuk atau Keluar)
  const handleConfirmReject = () => {
    if (!selectedTransactionForReject || !rejectionReasonInput.trim()) {
      alert("Alasan penolakan wajib diisi.");
      return;
    }

    const trx = selectedTransactionForReject;
    const isIncoming = trx.type === "incoming" || trx.tipe === "masuk";
    setActiveTrxId(trx.id);

    startTransition(async () => {
      const actionFn = isIncoming ? rejectIncomingTransactionAction : rejectOutgoingTransactionAction;
      const res = await actionFn(trx.id, rejectionReasonInput);
      if (res?.success) {
        setModalMode(null);
        setSelectedTransactionForReject(null);
        setRejectionReasonInput("");
        setFeedback({ type: "success", message: res.message });
      } else {
        setFeedback({ type: "error", message: res?.error || "Gagal menolak transaksi." });
      }
      setActiveTrxId(null);
    });
  };

  // Handler Ekspor CSV Riwayat Transaksi Logistik
  const handleExportCsv = () => {
    const columns = [
      { label: "Nomor Transaksi", key: "nomor_transaksi" },
      { label: "Tanggal Transaksi", key: (t) => formatTanggal(t.tanggal_transaksi || t.created_at, true) },
      {
        label: "Tipe Transaksi",
        key: (t) =>
          t.type === "incoming" || t.tipe === "masuk"
            ? "Barang Masuk"
            : t.type === "outgoing" || t.tipe === "keluar"
            ? "Barang Keluar"
            : "Penyesuaian (Stock Opname)",
      },
      {
        label: "Barang / Produk",
        key: (t) =>
          t.items && t.items.length > 0
            ? t.items.map((it) => it.product_nama).join("; ")
            : t.single_product_nama || "-",
      },
      {
        label: "SKU",
        key: (t) =>
          t.items && t.items.length > 0
            ? t.items.map((it) => it.product_sku).join("; ")
            : t.single_product_sku || "-",
      },
      {
        label: "Jumlah Mutasi",
        key: (t) =>
          t.items && t.items.length > 0
            ? t.items.map((it) => `${it.qty} ${it.unit || ""}`).join("; ")
            : `${t.quantity || 1} ${t.single_unit || ""}`,
      },
      { label: "Status Dokumen", key: "status" },
      { label: "Petugas Pembuat", key: (t) => t.operator_nama || "-" },
      { label: "Petugas Verifikator", key: (t) => t.approver_nama || "-" },
      { label: "Catatan / Keterangan", key: (t) => t.catatan || t.notes || "-" },
    ];
    exportToCsv("laporan-transaksi-logistik-rakta.csv", columns, filteredTransactions);
  };

  return (
    <div className="space-y-6">
      {/* Notifikasi Umpan Balik */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-start justify-between gap-3 border ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
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
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* BILAH ALAT: Filter & Tombol Aksi Utama */}
      <div className="bg-white border border-rakta-border rounded-2xl p-4 md:p-5 rakta-card-shadow flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Kolom Kiri: Search & Filter Tipe */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-55">
            <Search className="w-4 h-4 text-rakta-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nomor transaksi, produk, customer, atau supplier..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white border border-rakta-border text-rakta-navy placeholder:text-rakta-muted/60 focus:outline-none focus:border-rakta-primary focus:ring-1 focus:ring-rakta-primary/20 transition-all"
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

          {/* Filter Tipe Transaksi */}
          <div className="inline-flex p-0.5 bg-rakta-surface border border-rakta-border rounded-xl shrink-0">
            <button
              onClick={() => {
                setTypeFilter("all");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                typeFilter === "all"
                  ? "bg-white text-rakta-navy shadow-2xs font-semibold"
                  : "text-rakta-muted hover:text-rakta-navy"
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => {
                setTypeFilter("incoming");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                typeFilter === "incoming"
                  ? "bg-white text-emerald-700 shadow-2xs font-semibold"
                  : "text-rakta-muted hover:text-rakta-navy"
              }`}
            >
              Masuk
            </button>
            <button
              onClick={() => {
                setTypeFilter("outgoing");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                typeFilter === "outgoing"
                  ? "bg-white text-rose-700 shadow-2xs font-semibold"
                  : "text-rakta-muted hover:text-rakta-navy"
              }`}
            >
              Keluar
            </button>
            <button
              onClick={() => {
                setTypeFilter("adjustment");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                typeFilter === "adjustment"
                  ? "bg-white text-sky-700 shadow-2xs font-semibold"
                  : "text-rakta-muted hover:text-rakta-navy"
              }`}
            >
              Penyesuaian
            </button>
          </div>
        </div>

        {/* Kolom Kanan: Filter Status & Tombol Ajukan Barang Keluar */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-3 pr-8 py-2 text-xs rounded-xl bg-white border border-rakta-border text-rakta-navy focus:outline-none focus:border-rakta-primary focus:ring-1 focus:ring-rakta-primary/20 transition-all appearance-none cursor-pointer"
          >
            <option value="all">Semua Status</option>
            <option value="pending">Menunggu Persetujuan</option>
            <option value="approved">Disetujui / Packing</option>
            <option value="shipped">Terkirim (Shipped)</option>
            <option value="completed">Selesai (Completed)</option>
            <option value="rejected">Ditolak</option>
          </select>

          {/* Tombol Ekspor CSV */}
          <Button
            onClick={handleExportCsv}
            variant="secondary"
            className="text-xs font-medium px-3.5 py-2 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-rakta-muted" />
            <span>Ekspor CSV</span>
          </Button>

          {(userRole === "staff_gudang" || userRole === "admin") && (
            <Button
              onClick={() => {
                setSelectedProductForOut(null);
                setOutQtyInput("");
                setModalMode("out");
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium px-4 py-2 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Ajukan Barang Keluar</span>
            </Button>
          )}
        </div>
      </div>

      {/* SECTION: Pesanan Restock Tiba di Gudang (Staff Gudang & Admin) */}
      {(userRole === "staff_gudang" || userRole === "admin") && (
        <div className="bg-white border border-rakta-border rounded-2xl p-5 md:p-6 rakta-card-shadow space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-rakta-border/60">
            <div>
              <h2 className="text-base font-bold text-rakta-navy">
                Pesanan Tiba dan Pemeriksaan Fisik
              </h2>
              <p className="text-xs text-rakta-muted mt-0.5">
                Pesanan PO yang telah tiba di gudang. Lakukan cek fisik, periksa bukti foto, dan buat dokumen transaksi masuk agar dapat disetujui.
              </p>
            </div>
            <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              {receivedOrders.length} Pesanan Tiba
            </span>
          </div>

          {receivedOrders.length === 0 ? (
            <div className="p-5 rounded-xl bg-rakta-surface/50 border border-dashed border-rakta-border text-center text-xs text-rakta-muted">
              Tidak ada pesanan restock tiba yang belum diproses dokumen masuknya.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {receivedOrders.map((ro) => {
                const isItemProcessing = isProcessing && activeTrxId === ro.id;

                return (
                  <div
                    key={ro.id}
                    className="p-4 rounded-xl border border-rakta-border bg-rakta-surface/30 hover:bg-rakta-surface/60 transition-all flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-white text-rakta-navy border border-rakta-border tabular-nums">
                          {ro.nomor_po}
                        </span>
                        <span className="text-[11px] text-rakta-muted font-mono tabular-nums">
                          {formatTanggal(ro.tanggal_order)}
                        </span>
                      </div>

                      <div className="mt-2 text-xs font-semibold text-rakta-navy flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-rakta-muted shrink-0" />
                        <span>{ro.supplier_perusahaan || ro.supplier_nama}</span>
                      </div>

                      <div className="mt-2 pt-2 border-t border-rakta-border/60 flex items-center justify-between text-xs">
                        <span className="font-medium text-rakta-navy truncate max-w-45">
                          {ro.product_nama}
                        </span>
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 font-mono tabular-nums shrink-0">
                          +{ro.qty} {ro.unit}
                        </span>
                      </div>

                      {ro.foto_bukti_url && (
                        <div className="mt-2 pt-2 border-t border-rakta-border/40">
                          <a
                            href={ro.foto_bukti_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-rakta-primary hover:underline"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>Lihat Bukti Foto Kedatangan</span>
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      <Button
                        onClick={() => {
                          setSelectedReceivedOrder(ro);
                          setIncomingNotesInput("");
                          setModalMode("incoming_po");
                        }}
                        disabled={isItemProcessing}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium py-2 flex items-center justify-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Buat Dokumen Masuk</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TABEL: Daftar Transaksi Logistik */}
      <div className="bg-white border border-rakta-border rounded-2xl rakta-card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-rakta-border bg-rakta-surface text-rakta-muted font-medium">
                <th className="px-5 py-3">Nomor dan waktu</th>
                <th className="px-5 py-3 text-center">Tipe</th>
                <th className="px-5 py-3">Barang dan kuantitas</th>
                <th className="px-5 py-3">Tujuan / pemasok</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-right">Aksi alur kerja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rakta-border/40">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-rakta-muted">
                    <ArrowLeftRight className="w-8 h-8 mx-auto mb-2 text-rakta-muted/40" />
                    <p className="font-semibold text-rakta-navy text-sm">
                      Tidak ada riwayat transaksi ditemukan
                    </p>
                    <p className="text-xs text-rakta-muted mt-1">
                      Sesuaikan kata kunci pencarian atau tab filter jenis transaksi di atas.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((t) => {
                  const isMasuk = t.type === "incoming" || t.tipe === "masuk";
                  const isKeluar = t.type === "outgoing" || t.tipe === "keluar";
                  const isPenyesuaian =
                    t.type === "adjustment" || t.tipe === "penyesuaian" || t.catatan?.toLowerCase().includes("stock opname");

                  const isTrxProcessing = isProcessing && activeTrxId === t.id;

                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-rakta-surface/60 transition-colors text-rakta-navy"
                    >
                      {/* Nomor & Tanggal */}
                      <td className="px-5 py-3.5">
                        <div className="space-y-1">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-rakta-surface text-rakta-navy border border-rakta-border tabular-nums">
                            {t.nomor_transaksi}
                          </span>
                          <div className="text-[11px] text-rakta-muted font-mono tabular-nums">
                            {formatTanggal(t.tanggal_transaksi || t.created_at, true)}
                          </div>
                        </div>
                      </td>

                      {/* Tipe Transaksi */}
                      <td className="px-5 py-3.5 text-center">
                        {isMasuk && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Barang Masuk
                          </span>
                        )}
                        {isKeluar && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                            Barang Keluar
                          </span>
                        )}
                        {isPenyesuaian && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Penyesuaian
                          </span>
                        )}
                      </td>

                      {/* Barang & Kuantitas */}
                      <td className="px-5 py-3.5">
                        <div className="space-y-1">
                          {t.single_product_nama ? (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-semibold text-rakta-navy truncate max-w-45">
                                {t.single_product_nama}
                              </span>
                              <span
                                className={`font-mono tabular-nums font-bold px-2 py-0.5 rounded-lg text-[11px] shrink-0 ${
                                  isMasuk
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : isKeluar
                                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                                    : "bg-sky-50 text-sky-700 border border-sky-200"
                                }`}
                              >
                                {isMasuk ? "+" : isKeluar ? "-" : "±"}
                                {t.quantity} {t.single_unit}
                              </span>
                            </div>
                          ) : (
                            t.items?.map((it, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs">
                                <span className="font-semibold text-rakta-navy truncate max-w-45">
                                  {it.product_nama}
                                </span>
                                <span
                                  className={`font-mono tabular-nums font-bold px-2 py-0.5 rounded-lg text-[11px] shrink-0 ${
                                    isMasuk
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : isKeluar
                                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                                      : "bg-sky-50 text-sky-700 border border-sky-200"
                                  }`}
                                >
                                  {isMasuk ? "+" : isKeluar ? "-" : "±"}
                                  {it.qty} {it.unit}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </td>

                      {/* Pihak Terkait (Customer / Supplier) */}
                      <td className="px-5 py-3.5">
                        <div className="text-xs">
                          {t.tujuan_customer ? (
                            <div className="font-semibold text-rakta-navy flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-rakta-muted shrink-0" />
                              <span>{t.tujuan_customer}</span>
                            </div>
                          ) : t.supplier_perusahaan || t.supplier_nama ? (
                            <div className="font-semibold text-rakta-navy flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-rakta-muted shrink-0" />
                              <span>{t.supplier_perusahaan || t.supplier_nama}</span>
                            </div>
                          ) : (
                            <span className="text-rakta-muted italic">:</span>
                          )}
                          {t.catatan && (
                            <p className="text-[11px] text-rakta-muted mt-0.5 truncate max-w-xs">
                              {t.catatan}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5 text-center">
                        {t.status === "pending" && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Pending
                          </span>
                        )}
                        {t.status === "approved" && (
                          <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-lg border ${
                            isKeluar
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isKeluar ? "bg-purple-500" : "bg-emerald-500"}`} />
                            {isKeluar ? "Disetujui (Packing)" : "Disetujui"}
                          </span>
                        )}
                        {t.status === "shipped" && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Terkirim
                          </span>
                        )}
                        {t.status === "completed" && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Selesai
                          </span>
                        )}
                        {t.status === "rejected" && (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              Ditolak
                            </span>
                            {t.rejection_reason && (
                              <span className="text-[10px] text-rose-600 mt-0.5 max-w-36 truncate" title={t.rejection_reason}>
                                {t.rejection_reason}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Aksi Berdasarkan Peran Pengguna */}
                      <td className="px-5 py-3.5 text-right">
                        {(userRole === "warehouse_manager" || userRole === "admin") && (
                          <div className="flex items-center justify-end gap-1.5">
                            {t.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => isMasuk ? handleApproveIncoming(t) : handleApproveOutgoing(t)}
                                  disabled={isTrxProcessing}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] px-2.5 py-1"
                                >
                                  {isTrxProcessing ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                  )}
                                  <span>Setujui</span>
                                </Button>

                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedTransactionForReject(t);
                                    setRejectionReasonInput("");
                                    setModalMode("reject");
                                  }}
                                  disabled={isTrxProcessing}
                                  className="text-[11px] px-2.5 py-1"
                                >
                                  <XCircle className="w-3 h-3 mr-1" />
                                  <span>Tolak</span>
                                </Button>
                              </>
                            )}

                            {t.status === "approved" && isKeluar && (
                              <span className="text-xs text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-200 font-medium">
                                Menunggu Kirim Staff
                              </span>
                            )}

                            {(t.status === "completed" || t.status === "shipped" || (t.status === "approved" && isMasuk) || t.status === "rejected") && (
                              <span className="text-xs text-rakta-muted font-medium bg-rakta-surface px-2.5 py-0.5 rounded-lg border border-rakta-border">
                                Selesai
                              </span>
                            )}
                          </div>
                        )}

                        {userRole === "staff_gudang" && (
                          <div className="flex items-center justify-end gap-1.5">
                            {t.status === "approved" && isKeluar && (
                              <Button
                                size="sm"
                                onClick={() => handleDispatchOutgoing(t)}
                                disabled={isTrxProcessing}
                                className="bg-rakta-primary hover:bg-rakta-primary-hover text-white text-[11px] px-3 py-1 font-medium"
                              >
                                {isTrxProcessing ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Send className="w-3 h-3 mr-1" />
                                )}
                                <span>Kirim Barang</span>
                              </Button>
                            )}

                            {t.status === "pending" && isKeluar && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setSelectedTrxForEdit(t);
                                    setModalMode("edit_out");
                                  }}
                                  className="p-1.5 rounded-lg text-rakta-navy hover:bg-rakta-surface border border-rakta-border transition-colors"
                                  title="Edit Pengajuan Keluar"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-rakta-muted" />
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteTrx(t)}
                                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                                  title="Batalkan Pengajuan Keluar"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 font-medium">
                                  Pending
                                </span>
                              </div>
                            )}

                            {t.status === "pending" && !isKeluar && (
                              <span className="text-xs text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200 font-medium">
                                Menunggu Persetujuan
                              </span>
                            )}

                            {(t.status === "completed" || t.status === "shipped" || (t.status === "approved" && isMasuk) || t.status === "rejected") && (
                              <span className="text-xs text-rakta-muted font-medium bg-rakta-surface px-2.5 py-0.5 rounded-lg border border-rakta-border">
                                Selesai
                              </span>
                            )}
                          </div>
                        )}

                        {userRole === "supplier" && (
                          <div className="text-right">
                            <span className="text-xs text-rakta-muted font-medium bg-rakta-surface px-2.5 py-0.5 rounded-lg border border-rakta-border">
                              Riwayat
                            </span>
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
          itemName="transaksi"
        />
      </div>

      {/* MODAL: Buat Dokumen Barang Masuk dari PO Received (Staff Gudang) */}
      {modalMode === "incoming_po" && selectedReceivedOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-rakta-border rounded-2xl w-full max-w-lg shadow-xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-rakta-border/60">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-rakta-navy">Dokumen Barang Masuk PO</h3>
                  <p className="text-[11px] text-rakta-muted">Verifikasi fisik penerimaan barang restock dari supplier</p>
                </div>
              </div>
              <button
                onClick={() => setModalMode(null)}
                className="text-rakta-muted hover:text-rakta-navy p-1 rounded-lg hover:bg-rakta-surface transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-rakta-surface/60 rounded-xl border border-rakta-border space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-rakta-muted">Nomor PO:</span>
                  <span className="font-bold font-mono text-rakta-navy tabular-nums">{selectedReceivedOrder.nomor_po}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-rakta-muted">Supplier:</span>
                  <span className="font-semibold text-rakta-navy">{selectedReceivedOrder.supplier_perusahaan || selectedReceivedOrder.supplier_nama}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-rakta-muted">Produk Diterima:</span>
                  <span className="font-bold text-rakta-navy">{selectedReceivedOrder.product_nama}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-rakta-muted">Kuantitas Masuk:</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 font-mono tabular-nums">
                    +{selectedReceivedOrder.qty} {selectedReceivedOrder.unit}
                  </span>
                </div>
                {selectedReceivedOrder.foto_bukti_url && (
                  <div className="flex items-center justify-between pt-1 border-t border-rakta-border/50">
                    <span className="text-rakta-muted">Bukti Foto:</span>
                    <a
                      href={selectedReceivedOrder.foto_bukti_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-rakta-primary font-semibold hover:underline flex items-center gap-1 text-[11px]"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      Lihat Foto Kedatangan
                    </a>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-rakta-navy mb-1">
                  Laporan Hasil Pemeriksaan Fisik Gudang (Opsional)
                </label>
                <textarea
                  rows={3}
                  value={incomingNotesInput}
                  onChange={(e) => setIncomingNotesInput(e.target.value)}
                  placeholder="Contoh: Kondisi fisik barang utuh, barcode sesuai, segel pabrik aman, tidak ada cacat atau kerusakan..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-rakta-border text-rakta-navy placeholder:text-rakta-muted/60 focus:outline-none focus:border-rakta-primary focus:ring-1 focus:ring-rakta-primary/20 transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-rakta-border/60">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setModalMode(null)}
                  disabled={isProcessing}
                  className="text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  onClick={handleCreateIncomingFromPO}
                  disabled={isProcessing}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                >
                  {isProcessing ? "Menyimpan..." : "Buat Dokumen Masuk"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Ajukan Barang Keluar (Staff Gudang) */}
      {modalMode === "out" && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-rakta-border rounded-2xl w-full max-w-lg shadow-xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-rakta-border/60">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-rakta-navy">Pengajuan Barang Keluar</h3>
                  <p className="text-[11px] text-rakta-muted">Pengeluaran barang ke customer / distribusi</p>
                </div>
              </div>
              <button
                onClick={() => setModalMode(null)}
                className="text-rakta-muted hover:text-rakta-navy p-1 rounded-lg hover:bg-rakta-surface transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {outState?.error && (
              <div className="m-6 mb-0 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{outState.error}</span>
              </div>
            )}

            <form action={outAction} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-rakta-navy mb-1">
                  Pilih Produk Gudang <span className="text-rose-500">*</span>
                </label>
                <select
                  name="product_id"
                  required
                  onChange={(e) => {
                    const prod = products.find((p) => String(p.id) === e.target.value);
                    setSelectedProductForOut(prod || null);
                  }}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-rakta-border text-rakta-navy focus:outline-none focus:border-rakta-primary focus:ring-1 focus:ring-rakta-primary/20 transition-all cursor-pointer"
                >
                  <option value="">Pilih produk yang hendak dikeluarkan</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama} ({p.sku}) | Stok: {p.jumlah_stok} {p.unit}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProductForOut && (
                <div className="p-3 bg-rakta-surface/60 rounded-xl border border-rakta-border flex items-center justify-between text-xs">
                  <div>
                    <span className="text-rakta-muted">Lokasi Rak:</span>{" "}
                    <span className="font-semibold text-rakta-navy font-mono">
                      {selectedProductForOut.lokasi_rak || "Belum diatur"}
                    </span>
                  </div>
                  <div>
                    <span className="text-rakta-muted">Stok Tersedia:</span>{" "}
                    <span className="font-bold text-rakta-primary font-mono tabular-nums">
                      {selectedProductForOut.jumlah_stok} {selectedProductForOut.unit}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-rakta-navy mb-1">
                    Kuantitas Keluar <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="qty"
                    min="1"
                    max={selectedProductForOut ? selectedProductForOut.jumlah_stok : undefined}
                    value={outQtyInput}
                    onChange={(e) => setOutQtyInput(e.target.value)}
                    required
                    placeholder="Minimal 1"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-rakta-border text-rakta-navy focus:outline-none focus:border-rakta-primary focus:ring-1 focus:ring-rakta-primary/20 transition-all font-mono tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-rakta-navy mb-1">
                    Nama Tujuan / Customer <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="tujuan_customer"
                    required
                    placeholder="Contoh: Toko Elektronik Jaya"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-rakta-border text-rakta-navy focus:outline-none focus:border-rakta-primary focus:ring-1 focus:ring-rakta-primary/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-rakta-navy mb-1">
                  Catatan / Keterangan Pengeluaran
                </label>
                <textarea
                  name="catatan"
                  rows={2}
                  placeholder="Keterangan pengiriman barang..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-rakta-border text-rakta-navy placeholder:text-rakta-muted/60 focus:outline-none focus:border-rakta-primary focus:ring-1 focus:ring-rakta-primary/20 transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-rakta-border/60">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setModalMode(null)}
                  disabled={isOutProgress}
                  className="text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isOutProgress}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs"
                >
                  {isOutProgress ? "Mengajukan..." : "Ajukan Barang Keluar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Tolak Transaksi (Warehouse Manager) */}
      {modalMode === "reject" && selectedTransactionForReject && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-rakta-border rounded-2xl w-full max-w-md shadow-xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-rakta-border/60">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <XCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-rakta-navy">Penolakan Transaksi</h3>
                  <p className="text-[11px] text-rakta-muted font-mono tabular-nums">
                    Nomor: {selectedTransactionForReject.nomor_transaksi}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalMode(null)}
                className="text-rakta-muted hover:text-rakta-navy p-1 rounded-lg hover:bg-rakta-surface transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-rakta-navy mb-1">
                  Alasan Penolakan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  placeholder="Tuliskan alasan penolakan secara jelas..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-rakta-border text-rakta-navy placeholder:text-rakta-muted/60 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-rakta-border/60">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setModalMode(null)}
                  disabled={isProcessing}
                  className="text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={isProcessing || !rejectionReasonInput.trim()}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs"
                >
                  {isProcessing ? "Menyimpan..." : "Konfirmasi Tolak"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Edit Pengajuan Barang Keluar (Staff Gudang) */}
      {modalMode === "edit_out" && selectedTrxForEdit && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-rakta-border rounded-2xl w-full max-w-lg shadow-xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-rakta-border/60">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rakta-surface text-rakta-primary flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-rakta-navy">Edit Pengajuan Barang Keluar</h3>
                  <p className="text-[11px] text-rakta-muted font-mono tabular-nums">Nomor: {selectedTrxForEdit.nomor_transaksi}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setModalMode(null);
                  setSelectedTrxForEdit(null);
                }}
                className="text-rakta-muted hover:text-rakta-navy p-1 rounded-lg hover:bg-rakta-surface transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editOutState?.error && (
              <div className="m-6 mb-0 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{editOutState.error}</span>
              </div>
            )}

            <form action={editOutAction} className="p-6 space-y-4">
              <input type="hidden" name="transaction_id" value={selectedTrxForEdit.id} />
              <input
                type="hidden"
                name="product_id"
                value={
                  selectedTrxForEdit.single_product_id ||
                  (selectedTrxForEdit.items && selectedTrxForEdit.items[0]?.product_id) ||
                  ""
                }
              />

              <div>
                <label className="block text-xs font-medium text-rakta-navy mb-1">
                  Produk
                </label>
                <div className="w-full px-3.5 py-2 text-xs rounded-xl bg-rakta-surface border border-rakta-border text-rakta-navy font-medium">
                  {selectedTrxForEdit.single_product_nama ||
                    (selectedTrxForEdit.items && selectedTrxForEdit.items[0]?.product_nama) ||
                    "-"}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-rakta-navy mb-1">
                    Kuantitas Keluar <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="qty"
                    min="1"
                    defaultValue={
                      selectedTrxForEdit.quantity ||
                      (selectedTrxForEdit.items && selectedTrxForEdit.items[0]?.qty) ||
                      1
                    }
                    required
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-rakta-border text-rakta-navy focus:outline-none focus:border-rakta-primary focus:ring-1 focus:ring-rakta-primary/20 transition-all font-mono tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-rakta-navy mb-1">
                    Nama Tujuan / Customer <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="tujuan_customer"
                    defaultValue={selectedTrxForEdit.tujuan_customer || ""}
                    required
                    placeholder="Contoh: Toko Elektronik Jaya"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-rakta-border text-rakta-navy focus:outline-none focus:border-rakta-primary focus:ring-1 focus:ring-rakta-primary/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-rakta-navy mb-1">
                  Catatan / Keterangan Pengeluaran
                </label>
                <textarea
                  name="catatan"
                  rows={2}
                  defaultValue={selectedTrxForEdit.catatan || selectedTrxForEdit.notes || ""}
                  placeholder="Keterangan pengiriman barang..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-rakta-border text-rakta-navy placeholder:text-rakta-muted/60 focus:outline-none focus:border-rakta-primary focus:ring-1 focus:ring-rakta-primary/20 transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-rakta-border/60">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setModalMode(null);
                    setSelectedTrxForEdit(null);
                  }}
                  disabled={isEditOutProgress}
                  className="text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isEditOutProgress}
                  className="bg-rakta-primary hover:bg-rakta-primary-hover text-white text-xs"
                >
                  {isEditOutProgress ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Transaksi Pending */}
      <ConfirmModal
        isOpen={Boolean(confirmDeleteTrx)}
        onClose={() => setConfirmDeleteTrx(null)}
        onConfirm={handleExecuteDeleteTrx}
        title="Batalkan Pengajuan Barang Keluar"
        message={`Apakah Anda yakin ingin membatalkan pengajuan transaksi ${confirmDeleteTrx?.nomor_transaksi}? Data transaksi yang dibatalkan akan dihapus dari antrean pending.`}
        confirmText="Ya, Batalkan"
        variant="danger"
        isLoading={isProcessing}
      />

      {/* Modal Konfirmasi Transaksi */}
      <ConfirmModal
        isOpen={Boolean(confirmDialog)}
        onClose={() => setConfirmDialog(null)}
        onConfirm={handleExecuteConfirmDialog}
        title={
          confirmDialog?.type === "approve_in"
            ? "Setujui Dokumen Barang Masuk"
            : confirmDialog?.type === "approve_out"
            ? "Setujui Pengajuan Barang Keluar"
            : "Konfirmasi Pengiriman Barang"
        }
        message={
          confirmDialog?.type === "approve_in"
            ? `Setujui dokumen barang masuk ${confirmDialog?.trx?.nomor_transaksi}? Stok produk di sistem akan bertambah secara atomik.`
            : confirmDialog?.type === "approve_out"
            ? `Setujui pengajuan barang keluar ${confirmDialog?.trx?.nomor_transaksi}? Status akan berubah menjadi Disetujui (Packing). Stok fisik belum berkurang hingga Staff Gudang menekan tombol Kirim Barang.`
            : `Kirim barang untuk transaksi ${confirmDialog?.trx?.nomor_transaksi}? Pengemasan selesai. Stok produk akan berkurang secara atomik dan status transaksi menjadi Selesai (Completed).`
        }
        confirmText={
          confirmDialog?.type === "approve_in"
            ? "Setujui Masuk"
            : confirmDialog?.type === "approve_out"
            ? "Setujui (Packing)"
            : "Kirim Sekarang"
        }
        variant="primary"
        isLoading={isProcessing}
      />
    </div>
  );
}