"use client";

import { useState, useTransition } from "react";
import { updateSupplierStatusAction } from "@/app/actions/suppliers";
import Button from "@/components/ui/Button";
import Pagination from "@/components/ui/Pagination";
import { formatTanggal } from "@/lib/format";
import { CheckCircle2, Search, Building2, Mail, Phone, AlertCircle, X, Loader2 } from "lucide-react";

export default function SupplierTable({ suppliers = [], counts = {} }) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [isPending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState(null);
  const [rejectModalSupplier, setRejectModalSupplier] = useState(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");

  // State navigasi halaman (Pagination & Lazy Rendering)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter supplier berdasarkan status tab dan teks pencarian
  const filteredSuppliers = suppliers.filter((s) => {
    const matchStatus = activeFilter === "all" || s.status === activeFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      s.nama?.toLowerCase().includes(q) ||
      s.nama_perusahaan?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.kontak?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  // Potong hanya data yang aktif pada halaman saat ini (Lazy Windowing Slicing)
  const totalItems = filteredSuppliers.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safePage = Math.max(1, Math.min(currentPage, totalPages));
  const startIndex = (safePage - 1) * pageSize;
  const paginatedSuppliers = filteredSuppliers.slice(startIndex, startIndex + pageSize);

  const handleStatusChange = (supplierId, newStatus) => {
    if (newStatus === "rejected") {
      const sup = suppliers.find((s) => s.id === supplierId);
      setRejectModalSupplier(sup || { id: supplierId, nama: "Supplier" });
      setRejectionReasonInput("");
      return;
    }

    setLoadingId(supplierId);
    setFeedback(null);

    startTransition(async () => {
      const res = await updateSupplierStatusAction(supplierId, newStatus);
      if (res?.success) {
        setFeedback({ type: "success", message: res.message });
      } else {
        setFeedback({ type: "error", message: res?.error || "Gagal memperbarui status." });
      }
      setLoadingId(null);
    });
  };

  const handleExecuteRejectSupplier = () => {
    if (!rejectModalSupplier) return;
    if (!rejectionReasonInput.trim()) {
      setFeedback({ type: "error", message: "Alasan penolakan akun supplier wajib diisi." });
      return;
    }

    const supplierId = rejectModalSupplier.id;
    setLoadingId(supplierId);
    setFeedback(null);

    startTransition(async () => {
      const res = await updateSupplierStatusAction(supplierId, "rejected", rejectionReasonInput.trim());
      if (res?.success) {
        setFeedback({ type: "success", message: res.message });
        setRejectModalSupplier(null);
        setRejectionReasonInput("");
      } else {
        setFeedback({ type: "error", message: res?.error || "Gagal menolak akun supplier." });
      }
      setLoadingId(null);
    });
  };

  const statusBadges = {
    pending: (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Menunggu Verifikasi
      </span>
    ),
    approved: (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Disetujui
      </span>
    ),
    rejected: (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        Ditolak
      </span>
    ),
  };

  return (
    <div className="space-y-4">
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
          <span className="font-medium flex-1">{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-rakta-muted hover:text-rakta-navy p-1 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white border border-rakta-border rounded-2xl p-4 md:p-5 rakta-card-shadow flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Kapsul Filter Tabs */}
        <div className="inline-flex p-1 bg-rakta-surface border border-rakta-border rounded-xl overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setActiveFilter("all");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
              activeFilter === "all"
                ? "bg-rakta-bg/80 text-rakta-navy font-semibold shadow-xs"
                : "text-rakta-muted hover:text-rakta-navy font-medium"
            }`}
          >
            Semua ({counts.all || 0})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveFilter("pending");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
              activeFilter === "pending"
                ? "bg-amber-100/80 text-amber-900 font-semibold shadow-xs"
                : "text-rakta-muted hover:text-rakta-navy font-medium"
            }`}
          >
            Menunggu ({counts.pending || 0})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveFilter("approved");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
              activeFilter === "approved"
                ? "bg-emerald-100/80 text-emerald-900 font-semibold shadow-xs"
                : "text-rakta-muted hover:text-rakta-navy font-medium"
            }`}
          >
            Disetujui ({counts.approved || 0})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveFilter("rejected");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
              activeFilter === "rejected"
                ? "bg-rose-100/80 text-rose-900 font-semibold shadow-xs"
                : "text-rakta-muted hover:text-rakta-navy font-medium"
            }`}
          >
            Ditolak ({counts.rejected || 0})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-rakta-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari perusahaan / kontak..."
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
      </div>

      {/* Tabel Data Supplier */}
      <div className="bg-white border border-rakta-border rounded-2xl rakta-card-shadow overflow-hidden">
        {filteredSuppliers.length === 0 ? (
          <div className="text-center py-12 text-sm text-rakta-muted">
            Tidak ada rekanan supplier yang sesuai dengan filter atau kata kunci pencarian.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-rakta-border bg-rakta-surface/80 text-xs font-semibold text-rakta-muted">
                  <th className="py-3.5 px-5">Perusahaan &amp; penanggung jawab</th>
                  <th className="py-3.5 px-4">Kontak &amp; email</th>
                  <th className="py-3.5 px-4">Tanggal daftar</th>
                  <th className="py-3.5 px-4">Status akun</th>
                  <th className="py-3.5 px-5 text-right">Aksi verifikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rakta-border/40 text-rakta-navy">
                {paginatedSuppliers.map((s) => {
                  const isLoading = isPending && loadingId === s.id;

                  return (
                    <tr key={s.id} className="hover:bg-rakta-surface/50 transition-colors">
                      <td className="py-4 px-5">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-rakta-navy flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-rakta-primary shrink-0" />
                            <span>{s.nama_perusahaan || "Perusahaan Supplier"}</span>
                          </div>
                          <div className="text-xs text-rakta-muted">PIC: {s.nama}</div>
                        </div>
                      </td>

                      <td className="py-4 px-4 space-y-1">
                        <div className="flex items-center gap-1.5 text-rakta-navy font-mono text-xs">
                          <Mail className="w-3.5 h-3.5 text-rakta-primary shrink-0" />
                          <span>{s.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-rakta-muted text-xs">
                          <Phone className="w-3.5 h-3.5 text-rakta-muted shrink-0" />
                          <span className="font-mono tabular-nums">{s.kontak || "-"}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4 font-mono tabular-nums text-xs text-rakta-muted">
                        {formatTanggal(s.created_at)}
                      </td>

                      <td className="py-4 px-4">
                        {statusBadges[s.status] || s.status}
                      </td>

                      <td className="py-4 px-5 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {s.status === "pending" && (
                            <>
                              <Button
                                type="button"
                                disabled={isLoading}
                                onClick={() => handleStatusChange(s.id, "approved")}
                                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 font-semibold cursor-pointer shadow-xs"
                              >
                                {isLoading ? "..." : "Setujui"}
                              </Button>
                              <Button
                                type="button"
                                variant="danger"
                                disabled={isLoading}
                                onClick={() => handleStatusChange(s.id, "rejected")}
                                className="rounded-xl text-xs px-3 py-1.5 font-semibold cursor-pointer"
                              >
                                {isLoading ? "..." : "Tolak"}
                              </Button>
                            </>
                          )}

                          {s.status === "approved" && (
                            <Button
                              type="button"
                              variant="ghost"
                              disabled={isLoading}
                              onClick={() => handleStatusChange(s.id, "rejected")}
                              className="rounded-xl text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 px-3 py-1.5 cursor-pointer"
                            >
                              {isLoading ? "..." : "Cabut Izin (Tolak)"}
                            </Button>
                          )}

                          {s.status === "rejected" && (
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={isLoading}
                              onClick={() => handleStatusChange(s.id, "approved")}
                              className="rounded-xl text-xs text-emerald-700 hover:bg-emerald-50 px-3 py-1.5 cursor-pointer"
                            >
                              {isLoading ? "..." : "Setujui Ulang"}
                            </Button>
                          )}
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
          itemName="supplier"
        />
      </div>

      {/* Modal Input Alasan Penolakan Supplier (Wajib) */}
      {rejectModalSupplier && (
        <div className="fixed inset-0 z-50 bg-rakta-navy/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-rakta-border rounded-2xl w-full max-w-md p-6 rakta-card-shadow relative my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-rakta-border">
              <div>
                <h3 className="text-base font-bold text-rose-700">
                  Tolak Akun Rekanan Supplier
                </h3>
                <p className="text-xs text-rakta-muted mt-0.5">
                  Berikan alasan penolakan permohonan kemitraan
                </p>
              </div>
              <button
                onClick={() => {
                  setRejectModalSupplier(null);
                  setRejectionReasonInput("");
                }}
                className="text-rakta-muted hover:text-rakta-navy p-1 rounded-xl hover:bg-rakta-surface transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-rakta-muted mt-3">
              Anda akan menolak pengajuan kemitraan untuk supplier <span className="font-bold text-rakta-navy">{rejectModalSupplier.nama_perusahaan || rejectModalSupplier.nama}</span>. Masukkan alasan penolakan wajib agar dapat ditinjau oleh pihak supplier.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-rakta-navy mb-1">
                  Alasan Penolakan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  rows={3}
                  required
                  placeholder="Contoh: Dokumen perizinan usaha kadaluarsa / Profil pemasok belum memenuhi standar logistik RAKTA..."
                  className="w-full px-3 py-2 text-sm rounded-xl bg-white border border-rakta-border text-rakta-navy placeholder:text-rakta-muted/60 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-rakta-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setRejectModalSupplier(null);
                    setRejectionReasonInput("");
                  }}
                  className="rounded-xl text-xs font-semibold px-4 py-2 border-rakta-border text-rakta-navy hover:bg-rakta-surface"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  disabled={Boolean(loadingId) || !rejectionReasonInput.trim()}
                  onClick={handleExecuteRejectSupplier}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-5 py-2 flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {Boolean(loadingId) && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{loadingId ? "Memproses..." : "Konfirmasi Penolakan"}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}