"use client";

import { useState, useTransition } from "react";
import { updateSupplierStatusAction } from "@/app/actions/suppliers";
import Button from "@/components/ui/Button";
import { formatTanggal } from "@/lib/format";
import { CheckCircle2, XCircle, Clock, Search, Building2, Mail, Phone, AlertCircle } from "lucide-react";

export default function SupplierTable({ suppliers = [], counts = {} }) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [isPending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState(null);

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

  const handleStatusChange = (supplierId, newStatus) => {
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

  const statusBadges = {
    pending: (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
        <Clock className="w-3.5 h-3.5 text-amber-600" />
        Menunggu Verifikasi
      </span>
    ),
    approved: (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        Disetujui
      </span>
    ),
    rejected: (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
        <XCircle className="w-3.5 h-3.5 text-red-600" />
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
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          )}
          <span className="font-medium">{feedback.message}</span>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Kapsul Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`px-3.5 py-1.5 rounded-full text-xs transition-colors ${
              activeFilter === "all"
                ? "bg-rakta-primary text-white font-semibold shadow-2xs"
                : "bg-rakta-card border border-rakta-subtle/70 text-rakta-muted hover:text-rakta-navy font-medium"
            }`}
          >
            Semua ({counts.all || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("pending")}
            className={`px-3.5 py-1.5 rounded-full text-xs transition-colors ${
              activeFilter === "pending"
                ? "bg-amber-600 text-white font-semibold shadow-2xs"
                : "bg-rakta-card border border-rakta-subtle/70 text-rakta-muted hover:text-rakta-navy font-medium"
            }`}
          >
            Menunggu ({counts.pending || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("approved")}
            className={`px-3.5 py-1.5 rounded-full text-xs transition-colors ${
              activeFilter === "approved"
                ? "bg-emerald-600 text-white font-semibold shadow-2xs"
                : "bg-rakta-card border border-rakta-subtle/70 text-rakta-muted hover:text-rakta-navy font-medium"
            }`}
          >
            Disetujui ({counts.approved || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("rejected")}
            className={`px-3.5 py-1.5 rounded-full text-xs transition-colors ${
              activeFilter === "rejected"
                ? "bg-red-600 text-white font-semibold shadow-2xs"
                : "bg-rakta-card border border-rakta-subtle/70 text-rakta-muted hover:text-rakta-navy font-medium"
            }`}
          >
            Ditolak ({counts.rejected || 0})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-rakta-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari perusahaan / kontak..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-rakta-card border border-rakta-subtle rounded-full text-rakta-navy placeholder:text-rakta-muted/60 focus:outline-none focus:border-rakta-primary focus:ring-1 focus:ring-rakta-primary/20"
          />
        </div>
      </div>

      {/* Tabel Data Supplier */}
      <div className="bg-rakta-card border border-rakta-subtle/70 rounded-2xl rakta-card-shadow overflow-hidden">
        {filteredSuppliers.length === 0 ? (
          <div className="text-center py-12 text-xs text-rakta-muted">
            Tidak ada rekanan supplier yang sesuai dengan filter atau kata kunci pencarian.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-rakta-subtle/50 text-rakta-muted font-medium bg-rakta-surface/40">
                  <th className="py-3 px-5">Perusahaan &amp; Penanggung Jawab</th>
                  <th className="py-3 px-4">Kontak &amp; Email</th>
                  <th className="py-3 px-4">Tanggal Daftar</th>
                  <th className="py-3 px-4">Status Akun</th>
                  <th className="py-3 px-5 text-right">Aksi Verifikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rakta-subtle/30 text-rakta-navy">
                {filteredSuppliers.map((s) => {
                  const isLoading = isPending && loadingId === s.id;

                  return (
                    <tr key={s.id} className="hover:bg-rakta-surface/40 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-rakta-bg text-rakta-primary flex items-center justify-center font-bold text-xs shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-rakta-navy">
                              {s.nama_perusahaan || "Perusahaan Supplier"}
                            </div>
                            <div className="text-[11px] text-rakta-muted">{s.nama}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 space-y-0.5">
                        <div className="flex items-center gap-1.5 text-rakta-navy font-mono text-[11px]">
                          <Mail className="w-3 h-3 text-rakta-primary shrink-0" />
                          <span>{s.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-rakta-muted text-[11px]">
                          <Phone className="w-3 h-3 text-rakta-muted shrink-0" />
                          <span>{s.kontak || "-"}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-rakta-muted">
                        {formatTanggal(s.created_at)}
                      </td>

                      <td className="py-3.5 px-4">
                        {statusBadges[s.status] || s.status}
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {s.status === "pending" && (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                disabled={isLoading}
                                onClick={() => handleStatusChange(s.id, "approved")}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] px-3 py-1 font-semibold"
                              >
                                {isLoading ? "..." : "Setujui"}
                              </Button>
                              <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                disabled={isLoading}
                                onClick={() => handleStatusChange(s.id, "rejected")}
                                className="text-[11px] px-3 py-1 font-semibold"
                              >
                                {isLoading ? "..." : "Tolak"}
                              </Button>
                            </>
                          )}

                          {s.status === "approved" && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={isLoading}
                              onClick={() => handleStatusChange(s.id, "rejected")}
                              className="text-[11px] text-red-600 hover:bg-red-50 hover:text-red-700 px-3 py-1"
                            >
                              {isLoading ? "..." : "Cabut Izin (Tolak)"}
                            </Button>
                          )}

                          {s.status === "rejected" && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={isLoading}
                              onClick={() => handleStatusChange(s.id, "approved")}
                              className="text-[11px] text-emerald-700 hover:bg-emerald-50 px-3 py-1"
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
      </div>
    </div>
  );
}