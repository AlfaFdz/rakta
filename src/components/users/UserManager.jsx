"use client";

import { useState, useTransition } from "react";
import { updateUserStatusAction } from "@/app/actions/users";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ConfirmModal";
import Pagination from "@/components/ui/Pagination";
import { formatTanggal } from "@/lib/format";
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Building2,
  Mail,
  Phone,
  Filter,
  X,
  AlertCircle,
  Loader2,
  Star,
} from "lucide-react";

export default function UserManager({ users = [], currentUserId }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [feedback, setFeedback] = useState(null);
  const [isUpdating, startUpdateTransition] = useTransition();
  const [updatingId, setUpdatingId] = useState(null);
  const [confirmUserAction, setConfirmUserAction] = useState(null);
  const [rejectModalUser, setRejectModalUser] = useState(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");

  // State navigasi halaman (Pagination & Lazy Rendering)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      u.nama?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.nama_perusahaan?.toLowerCase().includes(q) ||
      u.kontak?.toLowerCase().includes(q);

    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const matchStatus = statusFilter === "all" || u.status === statusFilter;

    return matchSearch && matchRole && matchStatus;
  });

  // Potong hanya data yang aktif pada halaman saat ini (Lazy Windowing Slicing)
  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safePage = Math.max(1, Math.min(currentPage, totalPages));
  const startIndex = (safePage - 1) * pageSize;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + pageSize);

  const handleToggleStatus = (user, newStatus) => {
    if (user.id === currentUserId) {
      setFeedback({
        type: "error",
        message: "Anda tidak dapat menonaktifkan akun Administrator Anda sendiri.",
      });
      return;
    }

    if (newStatus === "rejected") {
      setRejectModalUser(user);
      setRejectionReasonInput("");
      return;
    }

    setConfirmUserAction({ user, newStatus });
  };

  const handleExecuteStatusChange = () => {
    if (!confirmUserAction) return;
    const { user, newStatus } = confirmUserAction;

    setUpdatingId(user.id);
    setFeedback(null);

    startUpdateTransition(async () => {
      const res = await updateUserStatusAction(user.id, newStatus);
      if (res?.success) {
        setFeedback({ type: "success", message: res.message });
      } else {
        setFeedback({ type: "error", message: res?.error || "Gagal memperbarui status pengguna." });
      }
      setUpdatingId(null);
      setConfirmUserAction(null);
    });
  };

  const handleExecuteReject = () => {
    if (!rejectModalUser) return;
    if (!rejectionReasonInput.trim()) {
      setFeedback({ type: "error", message: "Alasan penolakan / penonaktifan akun wajib diisi." });
      return;
    }

    const user = rejectModalUser;
    setUpdatingId(user.id);
    setFeedback(null);

    startUpdateTransition(async () => {
      const res = await updateUserStatusAction(user.id, "rejected", rejectionReasonInput.trim());
      if (res?.success) {
        setFeedback({ type: "success", message: res.message });
        setRejectModalUser(null);
        setRejectionReasonInput("");
      } else {
        setFeedback({ type: "error", message: res?.error || "Gagal menolak akun pengguna." });
      }
      setUpdatingId(null);
    });
  };

  const roleMeta = {
    admin: { label: "Administrator", badge: "bg-rakta-bg/80 text-rakta-navy border-rakta-border" },
    warehouse_manager: { label: "Warehouse Manager", badge: "bg-blue-50 text-blue-700 border-blue-200" },
    staff_gudang: { label: "Staff Gudang", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    supplier: { label: "Mitra Supplier", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  };

  const statusMeta = {
    approved: { label: "Aktif", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
    pending: { label: "Menunggu", badge: "bg-amber-50 text-amber-800 border-amber-200", dot: "bg-amber-500" },
    rejected: { label: "Nonaktif / Ditolak", badge: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
  };

  return (
    <div className="space-y-6">
      {/* Feedback Alert */}
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
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Toolbar & Filter */}
      <div className="bg-white border border-rakta-border rounded-2xl p-4 md:p-5 rakta-card-shadow flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-60">
            <Search className="w-4 h-4 text-rakta-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama, email, perusahaan, atau kontak..."
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

          {/* Filter Peran */}
          <div className="relative min-w-45">
            <Filter className="w-4 h-4 text-rakta-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-8 py-2 text-sm rounded-xl bg-white border border-rakta-border text-rakta-navy focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20 transition-all appearance-none cursor-pointer"
            >
              <option value="all">Semua Peran</option>
              <option value="admin">Administrator</option>
              <option value="warehouse_manager">Warehouse Manager</option>
              <option value="staff_gudang">Staff Gudang</option>
              <option value="supplier">Mitra Supplier</option>
            </select>
          </div>
        </div>

        {/* Filter Status Kapsul */}
        <div className="inline-flex p-1 bg-rakta-surface border border-rakta-border rounded-xl shrink-0">
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
              setStatusFilter("approved");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              statusFilter === "approved"
                ? "bg-emerald-100/80 text-emerald-900 shadow-xs"
                : "text-rakta-muted hover:text-rakta-navy"
            }`}
          >
            Aktif
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
              setStatusFilter("rejected");
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              statusFilter === "rejected"
                ? "bg-rose-100/80 text-rose-900 shadow-xs"
                : "text-rakta-muted hover:text-rakta-navy"
            }`}
          >
            Nonaktif
          </button>
        </div>
      </div>

      {/* Tabel Pengguna */}
      <div className="bg-white border border-rakta-border rounded-2xl rakta-card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-rakta-border bg-rakta-surface/80 text-xs font-semibold text-rakta-muted">
                <th className="px-5 py-3.5">Pengguna &amp; kontak</th>
                <th className="px-5 py-3.5">Peran</th>
                <th className="px-5 py-3.5">Organisasi / perusahaan</th>
                <th className="px-5 py-3.5 text-center">Status akun</th>
                <th className="px-5 py-3.5">Terdaftar sejak</th>
                <th className="px-5 py-3.5 text-right">Aksi administrator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rakta-border/40">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-rakta-muted">
                    <Users className="w-10 h-10 mx-auto mb-2 text-rakta-muted/40" />
                    <p className="font-semibold text-rakta-navy text-base">Tidak ada pengguna ditemukan</p>
                    <p className="text-xs text-rakta-muted mt-1 max-w-sm mx-auto">
                      Sesuaikan kata kunci pencarian atau filter status dan peran di atas.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => {
                  const roleConfig = roleMeta[u.role] || { label: u.role, badge: "bg-rakta-surface text-rakta-navy border-rakta-border" };
                  const statusConfig = statusMeta[u.status] || { label: u.status, badge: "bg-rakta-surface text-rakta-navy border-rakta-border", dot: "bg-rakta-muted" };
                  const isCurrent = u.id === currentUserId;
                  const isPendingUpdating = isUpdating && updatingId === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-rakta-surface/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-rakta-surface border border-rakta-border text-rakta-navy font-bold flex items-center justify-center shrink-0 text-sm">
                            {u.nama?.charAt(0).toUpperCase() || "U"}
                          </div>
                          <div>
                            <div className="font-semibold text-rakta-navy flex items-center gap-1.5">
                              <span>{u.nama}</span>
                              {isCurrent && (
                                <span className="text-[10px] bg-rakta-bg/70 text-rakta-navy border border-rakta-border px-1.5 py-0.5 rounded font-medium">
                                  Akun Anda
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-rakta-muted flex items-center gap-1 mt-0.5 font-mono">
                              <Mail className="w-3 h-3 text-rakta-muted" />
                              <span>{u.email}</span>
                            </div>
                            {u.kontak && (
                              <div className="text-xs text-rakta-muted flex items-center gap-1 mt-0.5 font-mono tabular-nums">
                                <Phone className="w-3 h-3 text-rakta-muted" />
                                <span>{u.kontak}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-md border ${roleConfig.badge}`}>
                          {roleConfig.label}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-xs text-rakta-navy">
                        {u.nama_perusahaan ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-rakta-muted shrink-0" />
                              <span className="font-medium">{u.nama_perusahaan}</span>
                            </div>
                            {u.role === "supplier" && (
                              <div>
                                {u.avg_rating ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                                    <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                                    <span className="font-mono tabular-nums">{u.avg_rating}</span>
                                    <span className="text-[10px] text-rakta-muted font-normal font-mono tabular-nums">
                                      ({u.total_reviews} ulasan)
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-rakta-muted italic">
                                    Belum ada ulasan
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-rakta-muted italic">Internal RAKTA</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full border ${statusConfig.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                          <span>{statusConfig.label}</span>
                        </span>
                      </td>

                      <td className="px-5 py-4 text-xs text-rakta-muted font-mono tabular-nums">
                        {formatTanggal(u.created_at)}
                      </td>

                      <td className="px-5 py-4 text-right">
                        {isCurrent ? (
                          <span className="text-xs text-rakta-muted italic">Tidak dapat diubah</span>
                        ) : isPendingUpdating ? (
                          <div className="inline-flex items-center gap-1 text-xs text-rakta-primary font-medium">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Memproses...</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {u.status !== "approved" && (
                              <button
                                onClick={() => handleToggleStatus(u, "approved")}
                                className="px-3 py-1.5 text-xs rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{u.status === "pending" ? "Setujui" : "Aktifkan"}</span>
                              </button>
                            )}

                            {u.status !== "rejected" && (
                              <button
                                onClick={() => handleToggleStatus(u, "rejected")}
                                className="px-3 py-1.5 text-xs rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>{u.status === "pending" ? "Tolak" : "Nonaktifkan"}</span>
                              </button>
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
          itemName="pengguna"
        />
      </div>

      {/* Modal Konfirmasi Status Pengguna */}
      <ConfirmModal
        isOpen={Boolean(confirmUserAction)}
        onClose={() => setConfirmUserAction(null)}
        onConfirm={handleExecuteStatusChange}
        title={
          confirmUserAction?.newStatus === "approved"
            ? confirmUserAction?.user?.status === "pending"
              ? "Setujui Pendaftaran Akun"
              : "Aktifkan Akun Pengguna"
            : confirmUserAction?.user?.status === "pending"
            ? "Tolak Pendaftaran Akun"
            : "Nonaktifkan Akun Pengguna"
        }
        message={
          confirmUserAction?.newStatus === "approved"
            ? `Apakah Anda yakin ingin menyetujui dan mengaktifkan akun "${confirmUserAction?.user?.nama_perusahaan || confirmUserAction?.user?.nama}"?`
            : `Apakah Anda yakin ingin menonaktifkan akun "${confirmUserAction?.user?.nama_perusahaan || confirmUserAction?.user?.nama}"? Pengguna tidak akan dapat mengakses sistem.`
        }
        confirmText={
          confirmUserAction?.newStatus === "approved"
            ? confirmUserAction?.user?.status === "pending"
              ? "Setujui Akun"
              : "Aktifkan Akun"
            : confirmUserAction?.user?.status === "pending"
            ? "Tolak Akun"
            : "Nonaktifkan Akun"
        }
        variant={confirmUserAction?.newStatus === "approved" ? "primary" : "danger"}
        isLoading={isUpdating}
      />

      {/* Modal Input Alasan Penolakan Akun (Wajib) */}
      {rejectModalUser && (
        <div className="fixed inset-0 z-50 bg-rakta-navy/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-rakta-border rounded-2xl w-full max-w-md p-6 rakta-card-shadow relative my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-rakta-border">
              <div>
                <h3 className="text-base font-bold text-rose-700">
                  {rejectModalUser.status === "pending" ? "Tolak Pendaftaran Akun" : "Nonaktifkan Akun"}
                </h3>
                <p className="text-xs text-rakta-muted mt-0.5">
                  Berikan alasan penonaktifan atau penolakan
                </p>
              </div>
              <button
                onClick={() => {
                  setRejectModalUser(null);
                  setRejectionReasonInput("");
                }}
                className="text-rakta-muted hover:text-rakta-navy p-1 rounded-xl hover:bg-rakta-surface transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-rakta-muted mt-3">
              Anda akan menolak/menonaktifkan akun <span className="font-bold text-rakta-navy">{rejectModalUser.nama_perusahaan || rejectModalUser.nama}</span>. Masukkan alasan penolakan wajib agar pengguna dapat mengetahuinya.
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
                  placeholder="Contoh: Dokumen legalitas perusahaan belum lengkap / Nomor kontak tidak dapat dihubungi..."
                  className="w-full px-3 py-2 text-sm rounded-xl bg-white border border-rakta-border text-rakta-navy placeholder:text-rakta-muted/60 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-rakta-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setRejectModalUser(null);
                    setRejectionReasonInput("");
                  }}
                  className="rounded-xl text-xs font-semibold px-4 py-2 border-rakta-border text-rakta-navy hover:bg-rakta-surface"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  disabled={isUpdating || !rejectionReasonInput.trim()}
                  onClick={handleExecuteReject}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-5 py-2 flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isUpdating ? "Memproses..." : "Konfirmasi Penolakan"}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}