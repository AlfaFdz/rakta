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
} from "@/app/actions/transactions";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ConfirmModal";
import { formatTanggal } from "@/lib/format";
import {
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
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
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'pending' | 'approved' | 'completed' | 'rejected'
  
  const [modalMode, setModalMode] = useState(null); // 'out' | 'incoming_po' | 'reject' | null
  const [selectedReceivedOrder, setSelectedReceivedOrder] = useState(null);
  const [selectedTransactionForReject, setSelectedTransactionForReject] = useState(null);
  const [incomingNotesInput, setIncomingNotesInput] = useState("");
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");
  const [feedback, setFeedback] = useState(null);

  // State untuk melacak produk yang dipilih di form pengeluaran (untuk cek stok live)
  const [selectedProductForOut, setSelectedProductForOut] = useState(null);
  const [outQtyInput, setOutQtyInput] = useState("");

  const [isProcessing, startTransition] = useTransition();
  const [activeTrxId, setActiveTrxId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

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

      {/* SECTION: Pesanan Restock Tiba di Gudang (Staff Gudang & Admin)             */}
      {(userRole === "staff_gudang" || userRole === "admin") && (
        <div className="bg-rakta-card border border-rakta-subtle/80 rounded-2xl p-5 md:p-6 rakta-card-shadow space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-rakta-subtle/60">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                <PackageCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-rakta-navy">
                  Pesanan Tiba di Gudang (Siap Dibuatkan Dokumen Masuk)
                </h2>
                <p className="text-xs text-rakta-muted">
                  Pesanan PO yang telah ditandai tiba oleh Warehouse Manager. Buat dokumen transaksi masuk agar dapat disetujui untuk penambahan stok.
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {receivedOrders.length} Pesanan Tiba
            </span>
          </div>

          {receivedOrders.length === 0 ? (
            <div className="p-5 rounded-xl bg-rakta-surface/60 border border-dashed border-rakta-subtle text-center text-xs text-rakta-muted">
              Tidak ada pesanan restock berstatus <span className="font-semibold text-emerald-700">Received</span> yang belum diproses dokumen masuknya.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {receivedOrders.map((ro) => {
                const isItemProcessing = isProcessing && activeTrxId === ro.id;

                return (
                  <div
                    key={ro.id}
                    className="p-4 rounded-xl border border-rakta-subtle/80 bg-rakta-surface/40 hover:bg-rakta-surface/70 transition-all flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-rakta-subtle/50 text-rakta-navy border border-rakta-subtle">
                          {ro.nomor_po}
                        </span>
                        <span className="text-[11px] text-rakta-muted flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-rakta-primary" />
                          {formatTanggal(ro.tanggal_order)}
                        </span>
                      </div>

                      <div className="mt-2 text-xs font-semibold text-rakta-navy flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-rakta-muted shrink-0" />
                        <span>{ro.supplier_perusahaan || ro.supplier_nama}</span>
                      </div>

                      <div className="mt-2 pt-2 border-t border-rakta-subtle/60 flex items-center justify-between text-xs">
                        <span className="font-medium text-rakta-navy truncate max-w-45">
                          {ro.product_nama}
                        </span>
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                          +{ro.qty} {ro.unit}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button
                        onClick={() => {
                          setSelectedReceivedOrder(ro);
                          setIncomingNotesInput("");
                          setModalMode("incoming_po");
                        }}
                        disabled={isItemProcessing}
                        className="w-full rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
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

      {/* BILAH ALAT: Filter & Tombol Ajukan Barang Keluar                           */}
      <div className="bg-rakta-card border border-rakta-subtle/70 rounded-2xl p-4 md:p-5 rakta-card-shadow flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Kolom Kiri: Search & Filter Tipe */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-55">
            <Search className="w-4 h-4 text-rakta-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nomor transaksi, produk, customer, atau supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl bg-rakta-card border border-rakta-subtle text-rakta-navy placeholder:text-rakta-muted/60 focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-rakta-muted hover:text-rakta-navy"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Tipe Transaksi */}
          <div className="inline-flex p-1 bg-rakta-surface border border-rakta-subtle/80 rounded-full shrink-0">
            <button
              onClick={() => setTypeFilter("all")}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
                typeFilter === "all"
                  ? "bg-rakta-card text-rakta-navy shadow-xs"
                  : "text-rakta-muted hover:text-rakta-navy"
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setTypeFilter("incoming")}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
                typeFilter === "incoming"
                  ? "bg-emerald-50 text-emerald-700 shadow-xs border border-emerald-200"
                  : "text-rakta-muted hover:text-rakta-navy"
              }`}
            >
              Masuk
            </button>
            <button
              onClick={() => setTypeFilter("outgoing")}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
                typeFilter === "outgoing"
                  ? "bg-rose-50 text-rose-700 shadow-xs border border-rose-200"
                  : "text-rakta-muted hover:text-rakta-navy"
              }`}
            >
              Keluar
            </button>
            <button
              onClick={() => setTypeFilter("adjustment")}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
                typeFilter === "adjustment"
                  ? "bg-sky-50 text-sky-700 shadow-xs border border-sky-200"
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
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-3 pr-8 py-1.5 text-xs rounded-xl bg-rakta-card border border-rakta-subtle text-rakta-navy focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20 transition-all appearance-none cursor-pointer"
          >
            <option value="all">Semua Status</option>
            <option value="pending">Menunggu Persetujuan</option>
            <option value="approved">Disetujui / Packing</option>
            <option value="completed">Selesai (Completed)</option>
            <option value="rejected">Ditolak</option>
          </select>

          {(userRole === "staff_gudang" || userRole === "admin") && (
            <Button
              onClick={() => {
                setSelectedProductForOut(null);
                setOutQtyInput("");
                setModalMode("out");
              }}
              className="rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-4 py-2 flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Ajukan Barang Keluar</span>
            </Button>
          )}
        </div>
      </div>

      {/* TABEL: Daftar Transaksi Logistik                                          */}
      <div className="bg-rakta-card border border-rakta-subtle/70 rounded-2xl rakta-card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-rakta-subtle/60 bg-rakta-surface/70 text-xs font-semibold text-rakta-muted uppercase tracking-wider">
                <th className="px-5 py-3.5">Nomor &amp; Waktu</th>
                <th className="px-5 py-3.5 text-center">Tipe</th>
                <th className="px-5 py-3.5">Barang &amp; Kuantitas</th>
                <th className="px-5 py-3.5">Tujuan / Pemasok</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Aksi Alur Kerja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rakta-subtle/40">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-rakta-muted">
                    <ArrowLeftRight className="w-10 h-10 mx-auto mb-2 text-rakta-muted/50" />
                    <p className="font-semibold text-rakta-navy text-base">
                      Tidak ada riwayat transaksi ditemukan
                    </p>
                    <p className="text-xs text-rakta-muted mt-1 max-w-sm mx-auto">
                      Coba sesuaikan kata kunci pencarian atau tab filter jenis transaksi di atas.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => {
                  const isMasuk = t.type === "incoming" || t.tipe === "masuk";
                  const isKeluar = t.type === "outgoing" || t.tipe === "keluar";
                  const isPenyesuaian =
                    t.type === "adjustment" || t.tipe === "penyesuaian" || t.catatan?.toLowerCase().includes("stock opname");

                  const isTrxProcessing = isProcessing && activeTrxId === t.id;

                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-rakta-surface/40 transition-colors group text-rakta-navy"
                    >
                      {/* Nomor & Tanggal */}
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-rakta-subtle/40 text-rakta-navy border border-rakta-subtle/70">
                            {t.nomor_transaksi}
                          </span>
                          <div className="text-xs text-rakta-muted flex items-center gap-1">
                            <Clock className="w-3 h-3 text-rakta-primary shrink-0" />
                            <span>{formatTanggal(t.tanggal_transaksi || t.created_at, true)}</span>
                          </div>
                        </div>
                      </td>

                      {/* Tipe Transaksi */}
                      <td className="px-5 py-4 text-center">
                        {isMasuk && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ArrowDownLeft className="w-3 h-3" />
                            Barang Masuk
                          </span>
                        )}
                        {isKeluar && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            <ArrowUpRight className="w-3 h-3" />
                            Barang Keluar
                          </span>
                        )}
                        {isPenyesuaian && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                            <SlidersHorizontal className="w-3 h-3" />
                            Penyesuaian
                          </span>
                        )}
                      </td>

                      {/* Barang & Kuantitas */}
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          {t.single_product_nama ? (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-semibold text-rakta-navy truncate max-w-45">
                                {t.single_product_nama}
                              </span>
                              <span
                                className={`font-bold px-2 py-0.5 rounded-full text-[11px] shrink-0 ${
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
                                  className={`font-bold px-2 py-0.5 rounded-full text-[11px] shrink-0 ${
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
                      <td className="px-5 py-4">
                        <div className="text-xs">
                          {t.tujuan_customer ? (
                            <div className="font-semibold text-rakta-navy flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-rakta-primary shrink-0" />
                              <span>{t.tujuan_customer}</span>
                            </div>
                          ) : t.supplier_perusahaan || t.supplier_nama ? (
                            <div className="font-semibold text-rakta-navy flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-rakta-primary shrink-0" />
                              <span>{t.supplier_perusahaan || t.supplier_nama}</span>
                            </div>
                          ) : (
                            <span className="text-rakta-muted italic">-</span>
                          )}
                          {t.catatan && (
                            <p className="text-[11px] text-rakta-muted mt-0.5 truncate max-w-xs">
                              {t.catatan}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 text-center">
                        {t.status === "pending" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                        {t.status === "approved" && (
                          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                            isKeluar
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}>
                            <CheckCircle2 className="w-3 h-3" />
                            {isKeluar ? "Disetujui (Packing)" : "Disetujui"}
                          </span>
                        )}
                        {t.status === "completed" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Selesai (Terkirim)
                          </span>
                        )}
                        {t.status === "rejected" && (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-3 h-3" />
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
                      <td className="px-5 py-4 text-right">
                        {/* Aksi Warehouse Manager & Admin */}
                        {(userRole === "warehouse_manager" || userRole === "admin") && (
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Transaksi Pending: Tombol Approve & Reject */}
                            {t.status === "pending" && (
                              <>
                                <button
                                  onClick={() => isMasuk ? handleApproveIncoming(t) : handleApproveOutgoing(t)}
                                  disabled={isTrxProcessing}
                                  className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
                                  title={isMasuk ? "Setujui & Tambah Stok" : "Setujui untuk Packing"}
                                >
                                  {isTrxProcessing ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="w-3 h-3" />
                                  )}
                                  <span>Setujui</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setSelectedTransactionForReject(t);
                                    setRejectionReasonInput("");
                                    setModalMode("reject");
                                  }}
                                  disabled={isTrxProcessing}
                                  className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
                                  title="Tolak Transaksi"
                                >
                                  <XCircle className="w-3 h-3" />
                                  <span>Tolak</span>
                                </button>
                              </>
                            )}

                            {t.status === "approved" && isKeluar && (
                              <span className="text-xs text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
                                Menunggu Kirim Staff
                              </span>
                            )}

                            {(t.status === "completed" || (t.status === "approved" && isMasuk) || t.status === "rejected") && (
                              <span className="text-xs text-rakta-muted font-medium bg-rakta-surface px-2.5 py-1 rounded-full border border-rakta-subtle/60">
                                Selesai
                              </span>
                            )}
                          </div>
                        )}

                        {/* Aksi Staff Gudang */}
                        {userRole === "staff_gudang" && (
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Transaksi Keluar yang telah Approved: Tombol Kirim Barang */}
                            {t.status === "approved" && isKeluar && (
                              <button
                                onClick={() => handleDispatchOutgoing(t)}
                                disabled={isTrxProcessing}
                                className="px-3 py-1 text-xs font-semibold rounded-full bg-rakta-primary hover:bg-rakta-navy text-white flex items-center gap-1 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                                title="Pengemasan Selesai, Kirim Barang"
                              >
                                {isTrxProcessing ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Send className="w-3 h-3" />
                                )}
                                <span>Kirim Barang</span>
                              </button>
                            )}

                            {t.status === "pending" && (
                              <span className="text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                                Menunggu Persetujuan
                              </span>
                            )}

                            {(t.status === "completed" || (t.status === "approved" && isMasuk) || t.status === "rejected") && (
                              <span className="text-xs text-rakta-muted font-medium bg-rakta-surface px-2.5 py-1 rounded-full border border-rakta-subtle/60">
                                Selesai
                              </span>
                            )}
                          </div>
                        )}

                        {userRole === "supplier" && (
                          <div className="text-right">
                            <span className="text-xs text-rakta-muted font-medium bg-rakta-surface px-2.5 py-1 rounded-full border border-rakta-subtle/60">
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
      </div>

      {/* MODAL: Buat Dokumen Barang Masuk dari PO Received (Staff Gudang)           */}
      {modalMode === "incoming_po" && selectedReceivedOrder && (
        <div className="fixed inset-0 z-50 bg-rakta-navy/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-rakta-card border border-rakta-subtle/80 rounded-2xl w-full max-w-lg p-6 rakta-card-shadow relative my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-rakta-subtle/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-rakta-navy">Dokumen Barang Masuk PO</h3>
                  <p className="text-xs text-rakta-muted">Verifikasi fisik penerimaan barang restock dari supplier</p>
                </div>
              </div>
              <button
                onClick={() => setModalMode(null)}
                className="text-rakta-muted hover:text-rakta-navy p-1 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              <div className="p-3 bg-rakta-surface/70 rounded-xl border border-rakta-subtle/70 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-rakta-muted">Nomor PO:</span>
                  <span className="font-bold font-mono text-rakta-navy">{selectedReceivedOrder.nomor_po}</span>
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
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    +{selectedReceivedOrder.qty} {selectedReceivedOrder.unit}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-rakta-navy mb-1">
                  Catatan Pemeriksaan Fisik (Opsional)
                </label>
                <textarea
                  rows={3}
                  value={incomingNotesInput}
                  onChange={(e) => setIncomingNotesInput(e.target.value)}
                  placeholder="Contoh: Dus dalam keadaan baik, barcode sesuai dan segel utuh."
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-rakta-card border border-rakta-subtle text-rakta-navy placeholder:text-rakta-muted/60 focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20 transition-all resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-800 space-y-1">
                <p className="font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Alur Barang Masuk 2 Tahap:
                </p>
                <p>
                  Setelah dokumen dibuat (status: Pending), Warehouse Manager akan meninjau dan menyetujuinya. Stok barang baru akan bertambah secara atomik tepat saat disetujui.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-rakta-subtle/60">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setModalMode(null)}
                  disabled={isProcessing}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  onClick={handleCreateIncomingFromPO}
                  disabled={isProcessing}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isProcessing ? "Menyimpan..." : "Buat Dokumen Masuk"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Ajukan Barang Keluar (Staff Gudang)                                 */}
      {modalMode === "out" && (
        <div className="fixed inset-0 z-50 bg-rakta-navy/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-rakta-card border border-rakta-subtle/80 rounded-2xl w-full max-w-lg p-6 rakta-card-shadow relative my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-rakta-subtle/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-rakta-navy">Pengajuan Barang Keluar</h3>
                  <p className="text-xs text-rakta-muted">Pengeluaran barang ke customer / distribusi</p>
                </div>
              </div>
              <button
                onClick={() => setModalMode(null)}
                className="text-rakta-muted hover:text-rakta-navy p-1 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {outState?.error && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{outState.error}</span>
              </div>
            )}

            <form action={outAction} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-rakta-navy mb-1">
                  Pilih Produk Gudang <span className="text-rose-500">*</span>
                </label>
                <select
                  name="product_id"
                  required
                  onChange={(e) => {
                    const prod = products.find((p) => String(p.id) === e.target.value);
                    setSelectedProductForOut(prod || null);
                  }}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-rakta-card border border-rakta-subtle text-rakta-navy focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20 transition-all cursor-pointer"
                >
                  <option value="">-- Pilih Produk yang Hendak Dikeluarkan --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama} ({p.sku}) | Stok Tersedia: {p.jumlah_stok} {p.unit}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProductForOut && (
                <div className="p-3 bg-rakta-surface/70 rounded-xl border border-rakta-subtle/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-rakta-muted">Lokasi Rak:</span>{" "}
                    <span className="font-semibold text-rakta-navy font-mono">
                      {selectedProductForOut.lokasi_rak || "Belum diatur"}
                    </span>
                  </div>
                  <div>
                    <span className="text-rakta-muted">Stok Gudang:</span>{" "}
                    <span className="font-bold text-rakta-primary">
                      {selectedProductForOut.jumlah_stok} {selectedProductForOut.unit}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-rakta-navy mb-1">
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
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-rakta-card border border-rakta-subtle text-rakta-navy focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-rakta-navy mb-1">
                    Nama Tujuan / Customer <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="tujuan_customer"
                    required
                    placeholder="Contoh: Toko Elektronik Jaya"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-rakta-card border border-rakta-subtle text-rakta-navy focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-rakta-navy mb-1">
                  Catatan / Keterangan Pengeluaran
                </label>
                <textarea
                  name="catatan"
                  rows={2}
                  placeholder="Keterangan pengiriman barang..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-rakta-card border border-rakta-subtle text-rakta-navy placeholder:text-rakta-muted/60 focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20 transition-all resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/80 text-[11px] text-rose-800 space-y-1">
                <p className="font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-rose-600" />
                  Alur Barang Keluar 2 Tahap:
                </p>
                <p>
                  Pengajuan akan masuk status Pending. Saat Warehouse Manager menyetujui, barang masuk tahap pengemasan (packing) dan stok belum berkurang. Stok baru berkurang tepat saat Staff menekan tombol Kirim Barang.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-rakta-subtle/60">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setModalMode(null)}
                  disabled={isOutProgress}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isOutProgress}
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                >
                  {isOutProgress ? "Mengajukan..." : "Ajukan Barang Keluar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Tolak Transaksi (Warehouse Manager)                                 */}
      {modalMode === "reject" && selectedTransactionForReject && (
        <div className="fixed inset-0 z-50 bg-rakta-navy/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-rakta-card border border-rakta-subtle/80 rounded-2xl w-full max-w-md p-6 rakta-card-shadow relative my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-rakta-subtle/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                  <XCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-rakta-navy">Penolakan Transaksi</h3>
                  <p className="text-[11px] text-rakta-muted">
                    Nomor: {selectedTransactionForReject.nomor_transaksi}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalMode(null)}
                className="text-rakta-muted hover:text-rakta-navy p-1 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3.5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-rakta-navy mb-1">
                  Alasan Penolakan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  placeholder="Tuliskan alasan penolakan secara jelas..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-rakta-card border border-rakta-subtle text-rakta-navy placeholder:text-rakta-muted/60 focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20 transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-rakta-subtle/60">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setModalMode(null)}
                  disabled={isProcessing}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={isProcessing || !rejectionReasonInput.trim()}
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                >
                  {isProcessing ? "Menyimpan..." : "Konfirmasi Tolak"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
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
            ? `Setujui dokumen barang masuk ${confirmDialog?.trx?.nomor_transaksi}?\n\nStok produk di sistem akan bertambah secara atomik.`
            : confirmDialog?.type === "approve_out"
            ? `Setujui pengajuan barang keluar ${confirmDialog?.trx?.nomor_transaksi}?\n\nStatus akan berubah menjadi Disetujui (Packing). Stok fisik belum berkurang hingga Staff Gudang menekan tombol Kirim Barang.`
            : `Kirim barang untuk transaksi ${confirmDialog?.trx?.nomor_transaksi}?\n\nPengemasan selesai. Stok produk akan berkurang secara atomik dan status transaksi menjadi Selesai (Completed).`
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