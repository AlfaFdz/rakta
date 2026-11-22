"use client";

import { useState, useTransition, useActionState } from "react";
import {
  receiveRestockOrderAction,
  createManualIncomingTransactionAction,
  createOutgoingTransactionAction,
} from "@/app/actions/transactions";
import Button from "@/components/ui/Button";
import { formatTanggal } from "@/lib/format";
import {
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  SlidersHorizontal,
  Plus,
  CheckCircle2,
  AlertCircle,
  Truck,
  Package,
  Search,
  X,
  Building2,
  User,
  Calendar,
  Loader2,
  MapPin,
  Clock,
  Send,
  Boxes,
} from "lucide-react";

export default function TransactionManager({
  transactions = [],
  inTransitOrders = [],
  products = [],
  suppliers = [],
  userRole = "staff_gudang",
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all"); // 'all' | 'masuk' | 'keluar' | 'penyesuaian'
  const [modalMode, setModalMode] = useState(null); // 'in_manual' | 'out' | null
  const [feedback, setFeedback] = useState(null);

  // State untuk melacak produk yang dipilih di form pengeluaran (untuk cek stok live)
  const [selectedProductForOut, setSelectedProductForOut] = useState(null);
  const [outQtyInput, setOutQtyInput] = useState("");

  const [isReceiving, startReceiveTransition] = useTransition();
  const [receivingOrderId, setReceivingOrderId] = useState(null);

  // Filter daftar transaksi
  const filteredTransactions = transactions.filter((t) => {
    // 1. Pencarian
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      t.nomor_transaksi?.toLowerCase().includes(q) ||
      t.tujuan_customer?.toLowerCase().includes(q) ||
      t.supplier_nama?.toLowerCase().includes(q) ||
      t.supplier_perusahaan?.toLowerCase().includes(q) ||
      t.catatan?.toLowerCase().includes(q) ||
      t.operator_nama?.toLowerCase().includes(q) ||
      t.items?.some((it) => it.product_nama?.toLowerCase().includes(q) || it.product_sku?.toLowerCase().includes(q));

    // 2. Filter Tipe
    let matchType = true;
    if (typeFilter === "masuk") {
      matchType = t.tipe === "masuk";
    } else if (typeFilter === "keluar") {
      matchType = t.tipe === "keluar";
    } else if (typeFilter === "penyesuaian") {
      matchType = t.tipe === "penyesuaian" || t.catatan?.toLowerCase().includes("stock opname");
    }

    return matchSearch && matchType;
  });

  // Action state untuk Barang Masuk Manual
  const [inState, inAction, isInProgress] = useActionState(async (prev, formData) => {
    const res = await createManualIncomingTransactionAction(prev, formData);
    if (res?.success) {
      setModalMode(null);
      setFeedback({ type: "success", message: res.message });
      return null;
    }
    return res;
  }, null);

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

  // Handler Terima Barang Masuk dari PO Restock
  const handleReceiveRestock = (order) => {
    if (
      !confirm(
        `Terima barang masuk untuk pesanan ${order.nomor_po}?\n\nStok produk di sistem akan bertambah secara otomatis.`
      )
    ) {
      return;
    }

    setReceivingOrderId(order.id);
    startReceiveTransition(async () => {
      const res = await receiveRestockOrderAction(order.id);
      if (res?.success) {
        setFeedback({ type: "success", message: res.message });
      } else {
        setFeedback({ type: "error", message: res?.error || "Gagal menerima barang masuk." });
      }
      setReceivingOrderId(null);
    });
  };

  return (
    <div className="space-y-6">
      {/* Notifikasi Umpan Balik */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-start justify-between gap-3 border ${
            feedback.type === "success"
              ? "bg-emerald-50/80 border-emerald-200 text-emerald-800"
              : "bg-rose-50/80 border-rose-200 text-rose-800"
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

      {/* ========================================================================= */}
      {/* SECTION KHUSUS: Penerimaan Barang dari Supplier (Staff Gudang & Admin)     */}
      {/* ========================================================================= */}
      {(userRole === "staff_gudang" || userRole === "admin") && (
        <div className="bg-rakta-card border border-rakta-subtle/80 rounded-2xl p-5 md:p-6 rakta-card-shadow space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-rakta-subtle/60">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-rakta-navy">
                  Penerimaan Barang dari Supplier (In Transit)
                </h2>
                <p className="text-xs text-rakta-muted">
                  Pesanan restock yang sedang dikirim oleh mitra supplier dan menunggu verifikasi fisik gudang
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              {inTransitOrders.length} Pengiriman
            </span>
          </div>

          {inTransitOrders.length === 0 ? (
            <div className="p-6 rounded-xl bg-rakta-surface/60 border border-dashed border-rakta-subtle text-center text-xs text-rakta-muted">
              Tidak ada kiriman restock yang berstatus <span className="font-semibold text-purple-700">In Transit</span> saat ini. Semua kiriman telah diterima atau belum diproses supplier.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inTransitOrders.map((order) => {
                const isItemReceiving = isReceiving && receivingOrderId === order.id;

                return (
                  <div
                    key={order.id}
                    className="p-4 rounded-xl border border-rakta-subtle/80 bg-rakta-surface/40 hover:bg-rakta-surface/70 transition-all flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-rakta-subtle/50 text-rakta-navy border border-rakta-subtle">
                          {order.nomor_po}
                        </span>
                        <span className="text-[11px] text-rakta-muted flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-rakta-primary" />
                          {formatTanggal(order.tanggal_order)}
                        </span>
                      </div>

                      <div className="mt-2 text-xs font-semibold text-rakta-navy flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-rakta-muted shrink-0" />
                        <span>{order.supplier_perusahaan || order.supplier_nama}</span>
                      </div>

                      {order.nomor_resi && (
                        <div className="mt-1 text-[11px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200/60 inline-block">
                          No. Resi: {order.nomor_resi}
                        </div>
                      )}

                      <div className="mt-2.5 pt-2 border-t border-rakta-subtle/60 space-y-1">
                        {order.items?.map((it, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="font-medium text-rakta-navy truncate max-w-55">
                              {it.product_nama}
                            </span>
                            <span className="font-bold text-rakta-primary bg-rakta-card px-2 py-0.5 rounded border border-rakta-subtle shrink-0">
                              +{it.qty} {it.unit}
                            </span>
                          </div>
                        ))}
                      </div>

                      {order.catatan_status && (
                        <p className="mt-2 text-[11px] text-rakta-muted italic line-clamp-1">
                          &ldquo;{order.catatan_status}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="pt-2">
                      <Button
                        onClick={() => handleReceiveRestock(order)}
                        disabled={isItemReceiving}
                        className="w-full rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 flex items-center justify-center gap-1.5 shadow-2xs transition-colors disabled:opacity-50"
                      >
                        {isItemReceiving ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>{isItemReceiving ? "Memproses Penerimaan..." : "Terima Barang Masuk"}</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* BILAH ALAT: Filter & Tombol Mutasi Cepat                                   */}
      {/* ========================================================================= */}
      <div className="bg-rakta-card border border-rakta-subtle/70 rounded-2xl p-4 md:p-5 rakta-card-shadow flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Pencarian */}
        <div className="relative flex-1 min-w-55">
          <Search className="w-4 h-4 text-rakta-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari transaksi, produk, SKU, penerima, atau catatan..."
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

        {/* Tab Filter Tipe & Tombol Formulir Transaksi */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Tab Filter Tipe */}
          <div className="inline-flex p-1 bg-rakta-surface border border-rakta-subtle/80 rounded-full">
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
              onClick={() => setTypeFilter("masuk")}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
                typeFilter === "masuk"
                  ? "bg-emerald-50 text-emerald-700 shadow-xs border border-emerald-200/60"
                  : "text-rakta-muted hover:text-rakta-navy"
              }`}
            >
              Masuk
            </button>
            <button
              onClick={() => setTypeFilter("keluar")}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
                typeFilter === "keluar"
                  ? "bg-rose-50 text-rose-700 shadow-xs border border-rose-200/60"
                  : "text-rakta-muted hover:text-rakta-navy"
              }`}
            >
              Keluar
            </button>
            <button
              onClick={() => setTypeFilter("penyesuaian")}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
                typeFilter === "penyesuaian"
                  ? "bg-blue-50 text-blue-700 shadow-xs border border-blue-200/60"
                  : "text-rakta-muted hover:text-rakta-navy"
              }`}
            >
              Penyesuaian
            </button>
          </div>

          {/* Tombol Mutasi Cepat (Staff Gudang & Admin) */}
          {(userRole === "staff_gudang" || userRole === "admin") && (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setModalMode("in_manual")}
                className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2 flex items-center gap-1.5 shadow-xs transition-all"
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Barang Masuk</span>
              </Button>
              <Button
                onClick={() => {
                  setSelectedProductForOut(null);
                  setOutQtyInput("");
                  setModalMode("out");
                }}
                className="rounded-full bg-rakta-card hover:bg-rakta-surface text-rakta-navy border border-rakta-subtle text-xs font-semibold px-3.5 py-2 flex items-center gap-1.5 shadow-xs transition-all"
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                <span>Barang Keluar</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TABEL: Riwayat Lengkap Transaksi Logistik                                 */}
      {/* ========================================================================= */}
      <div className="bg-rakta-card border border-rakta-subtle/70 rounded-2xl rakta-card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-rakta-subtle/60 bg-rakta-surface/70 text-xs font-semibold text-rakta-muted uppercase tracking-wider">
                <th className="px-5 py-3.5">Nomor Transaksi &amp; Tanggal</th>
                <th className="px-5 py-3.5 text-center">Tipe</th>
                <th className="px-5 py-3.5">Barang &amp; Kuantitas</th>
                <th className="px-5 py-3.5">Pihak Terkait</th>
                <th className="px-5 py-3.5">Dicatat Oleh</th>
                <th className="px-5 py-3.5">Keterangan</th>
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
                  const isMasuk = t.tipe === "masuk";
                  const isKeluar = t.tipe === "keluar";
                  const isPenyesuaian =
                    t.tipe === "penyesuaian" || t.catatan?.toLowerCase().includes("stock opname");

                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-rakta-surface/40 transition-colors group text-rakta-navy"
                    >
                      {/* Nomor Transaksi & Tanggal */}
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-rakta-subtle/40 text-rakta-navy border border-rakta-subtle/70">
                            {t.nomor_transaksi}
                          </span>
                          <div className="text-xs text-rakta-muted flex items-center gap-1">
                            <Clock className="w-3 h-3 text-rakta-primary shrink-0" />
                            <span>{formatTanggal(t.tanggal_transaksi, true)}</span>
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
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            <SlidersHorizontal className="w-3 h-3" />
                            Penyesuaian
                          </span>
                        )}
                      </td>

                      {/* Barang & Kuantitas */}
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          {t.items?.map((it, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                              <span className="font-semibold text-rakta-navy">
                                {it.product_nama}
                              </span>
                              <span className="font-mono text-[11px] text-rakta-muted">
                                ({it.product_sku})
                              </span>
                              <span
                                className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                                  isMasuk
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : isKeluar
                                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                                    : "bg-blue-50 text-blue-700 border border-blue-200"
                                }`}
                              >
                                {isMasuk ? "+" : isKeluar ? "-" : "±"}
                                {it.qty} {it.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Pihak Terkait */}
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
                        </div>
                      </td>

                      {/* Dicatat Oleh */}
                      <td className="px-5 py-4">
                        <div className="text-xs text-rakta-navy font-medium flex items-center gap-1">
                          <User className="w-3 h-3 text-rakta-muted shrink-0" />
                          <span>{t.operator_nama || "Sistem Gudang"}</span>
                        </div>
                      </td>

                      {/* Keterangan */}
                      <td className="px-5 py-4">
                        <p className="text-xs text-rakta-muted max-w-xs line-clamp-2">
                          {t.catatan || "-"}
                        </p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: Catat Barang Masuk Manual (Non-PO / Retur)                         */}
      {/* ========================================================================= */}
      {modalMode === "in_manual" && (
        <div className="fixed inset-0 z-50 bg-rakta-navy/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-rakta-card border border-rakta-subtle/80 rounded-2xl w-full max-w-lg p-6 rakta-card-shadow relative my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-rakta-subtle/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-rakta-navy">Catat Barang Masuk Manual</h3>
                  <p className="text-xs text-rakta-muted">Penerimaan fisik non-PO, retur barang, atau sampel</p>
                </div>
              </div>
              <button
                onClick={() => setModalMode(null)}
                className="text-rakta-muted hover:text-rakta-navy p-1 rounded-full hover:bg-rakta-surface transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {inState?.error && (
              <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {inState.error}
              </div>
            )}

            <form action={inAction} className="mt-4 space-y-4">
              {/* Pilih Produk */}
              <div>
                <label className="block text-xs font-semibold text-rakta-navy mb-1">
                  Pilih Produk <span className="text-rose-500">*</span>
                </label>
                <select
                  name="product_id"
                  required
                  className="w-full px-3 py-2 text-sm rounded-xl bg-rakta-card border border-rakta-subtle text-rakta-navy focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20"
                >
                  <option value="">Pilih Produk yang Masuk</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.sku}] {p.nama} (Stok saat ini: {p.jumlah_stok} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Jumlah Qty & Supplier Opsional */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-rakta-navy mb-1">
                    Kuantitas Masuk <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="qty"
                    min="1"
                    required
                    placeholder="1"
                    className="w-full px-3 py-2 text-sm rounded-xl bg-rakta-card border border-rakta-subtle text-rakta-navy focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-rakta-navy mb-1">
                    Mitra Supplier (Opsional)
                  </label>
                  <select
                    name="supplier_id"
                    className="w-full px-3 py-2 text-sm rounded-xl bg-rakta-card border border-rakta-subtle text-rakta-navy focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20"
                  >
                    <option value="">Tidak ada supplier rekanan</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nama_perusahaan ? `${s.nama_perusahaan} (${s.nama})` : s.nama}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Catatan / Alasan */}
              <div>
                <label className="block text-xs font-semibold text-rakta-navy mb-1">
                  Catatan / Keterangan Penerimaan
                </label>
                <textarea
                  name="catatan"
                  rows={2}
                  placeholder="Contoh: Retur barang dari customer X karena salah ukuran / Bonus sampel mitra..."
                  className="w-full px-3 py-2 text-sm rounded-xl bg-rakta-card border border-rakta-subtle text-rakta-navy placeholder:text-rakta-muted/60 focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-rakta-subtle/60">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalMode(null)}
                  className="rounded-full text-xs font-semibold px-4 py-2"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isInProgress}
                  className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-5 py-2 flex items-center gap-1.5 shadow-xs"
                >
                  {isInProgress && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isInProgress ? "Menyimpan..." : "Simpan Barang Masuk"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Catat Pengeluaran Barang ke Customer                                */}
      {/* ========================================================================= */}
      {modalMode === "out" && (
        <div className="fixed inset-0 z-50 bg-rakta-navy/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-rakta-card border border-rakta-subtle/80 rounded-2xl w-full max-w-lg p-6 rakta-card-shadow relative my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-rakta-subtle/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-rakta-navy">Catat Pengeluaran Barang</h3>
                  <p className="text-xs text-rakta-muted">Pengiriman ke customer, pemakaian operasional, atau distribusi</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setModalMode(null);
                  setSelectedProductForOut(null);
                  setOutQtyInput("");
                }}
                className="text-rakta-muted hover:text-rakta-navy p-1 rounded-full hover:bg-rakta-surface transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {outState?.error && (
              <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {outState.error}
              </div>
            )}

            <form action={outAction} className="mt-4 space-y-4">
              {/* Pilih Produk */}
              <div>
                <label className="block text-xs font-semibold text-rakta-navy mb-1">
                  Pilih Produk yang Dikeluarkan <span className="text-rose-500">*</span>
                </label>
                <select
                  name="product_id"
                  required
                  onChange={(e) => {
                    const found = products.find((p) => String(p.id) === e.target.value);
                    setSelectedProductForOut(found || null);
                  }}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-rakta-card border border-rakta-subtle text-rakta-navy focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20"
                >
                  <option value="">Pilih Produk</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.sku}] {p.nama} (Stok: {p.jumlah_stok} {p.unit})
                    </option>
                  ))}
                </select>

                {/* Indikator Stok Terpilih */}
                {selectedProductForOut && (
                  <div className="mt-2 p-2.5 rounded-xl bg-rakta-surface/70 border border-rakta-subtle/60 text-xs flex items-center justify-between">
                    <span className="text-rakta-muted">Stok Maksimum yang Tersedia:</span>
                    <span className="font-bold text-rakta-navy">
                      {selectedProductForOut.jumlah_stok} {selectedProductForOut.unit}
                    </span>
                  </div>
                )}
              </div>

              {/* Kuantitas & Tujuan Customer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-rakta-navy mb-1">
                    Jumlah Kuantitas <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="qty"
                    min="1"
                    max={selectedProductForOut ? selectedProductForOut.jumlah_stok : undefined}
                    required
                    value={outQtyInput}
                    onChange={(e) => setOutQtyInput(e.target.value)}
                    placeholder="1"
                    className="w-full px-3 py-2 text-sm rounded-xl bg-rakta-card border border-rakta-subtle text-rakta-navy focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20"
                  />
                  {selectedProductForOut && outQtyInput !== "" && Number(outQtyInput) > Number(selectedProductForOut.jumlah_stok) && (
                    <p className="text-[11px] text-rose-600 mt-1 font-semibold">
                      Jumlah melebihi stok tersedia ({selectedProductForOut.jumlah_stok} {selectedProductForOut.unit})!
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-rakta-navy mb-1">
                    Tujuan / Nama Customer <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="tujuan_customer"
                    required
                    placeholder="Contoh: PT Sinar Abadi / Toko Makmur"
                    className="w-full px-3 py-2 text-sm rounded-xl bg-rakta-card border border-rakta-subtle text-rakta-navy focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20"
                  />
                </div>
              </div>

              {/* Catatan / Keterangan */}
              <div>
                <label className="block text-xs font-semibold text-rakta-navy mb-1">
                  Catatan / Nomor Invoice / Keterangan
                </label>
                <textarea
                  name="catatan"
                  rows={2}
                  placeholder="Contoh: No. Surat Jalan: SJ-OUT-2026-11 / Invoice #INV-0091..."
                  className="w-full px-3 py-2 text-sm rounded-xl bg-rakta-card border border-rakta-subtle text-rakta-navy placeholder:text-rakta-muted/60 focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-rakta-subtle/60">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setModalMode(null);
                    setSelectedProductForOut(null);
                    setOutQtyInput("");
                  }}
                  className="rounded-full text-xs font-semibold px-4 py-2"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isOutProgress ||
                    (selectedProductForOut &&
                      outQtyInput !== "" &&
                      Number(outQtyInput) > Number(selectedProductForOut.jumlah_stok))
                  }
                  className="rounded-full bg-rakta-primary hover:bg-rakta-navy text-white text-xs font-semibold px-5 py-2 flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {isOutProgress && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isOutProgress ? "Menyimpan..." : "Simpan Barang Keluar"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
