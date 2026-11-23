"use client";

import { useState, useTransition } from "react";
import { updateUserStatusAction } from "@/app/actions/users";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ConfirmModal";
import { formatTanggal } from "@/lib/format";
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Building2,
  Mail,
  Phone,
  Filter,
  X,
  AlertCircle,
  Loader2,
} from "lucide-react";

export default function UserManager({ users = [], currentUserId }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [feedback, setFeedback] = useState(null);
  const [isUpdating, startUpdateTransition] = useTransition();
  const [updatingId, setUpdatingId] = useState(null);
  const [confirmUserAction, setConfirmUserAction] = useState(null);

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

  const handleToggleStatus = (user, newStatus) => {
    if (user.id === currentUserId) {
      setFeedback({
        type: "error",
        message: "Anda tidak dapat menonaktifkan akun Administrator Anda sendiri.",
      });
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

  const roleMeta = {
    admin: { label: "Administrator", badge: "bg-purple-50 text-purple-700 border-purple-200" },
    warehouse_manager: { label: "Warehouse Manager", badge: "bg-sky-50 text-sky-700 border-sky-200" },
    staff_gudang: { label: "Staff Gudang", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    supplier: { label: "Mitra Supplier", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  };

  const statusMeta = {
    approved: { label: "Aktif", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    pending: { label: "Menunggu", badge: "bg-amber-50 text-amber-700 border-amber-200" },
    rejected: { label: "Nonaktif / Ditolak", badge: "bg-rose-50 text-rose-700 border-rose-200" },
  };

  return (
    <div className="space-y-6">
      {/* Feedback Alert */}
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

      {/* Toolbar & Filter */}
      <div className="bg-rakta-card border border-rakta-subtle/70 rounded-2xl p-4 md:p-5 rakta-card-shadow flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-55">
            <Search className="w-4 h-4 text-rakta-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama, email, perusahaan, atau kontak..."
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

          {/* Filter Peran */}
          <div className="relative min-w-45">
            <Filter className="w-4 h-4 text-rakta-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm rounded-xl bg-rakta-card border border-rakta-subtle text-rakta-navy focus:outline-none focus:border-rakta-primary focus:ring-2 focus:ring-rakta-primary/20 transition-all appearance-none cursor-pointer"
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
        <div className="inline-flex p-1 bg-rakta-surface border border-rakta-subtle/80 rounded-full shrink-0">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
              statusFilter === "all"
                ? "bg-rakta-card text-rakta-navy shadow-xs"
                : "text-rakta-muted hover:text-rakta-navy"
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setStatusFilter("approved")}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
              statusFilter === "approved"
                ? "bg-emerald-50 text-emerald-700 shadow-xs border border-emerald-200"
                : "text-rakta-muted hover:text-rakta-navy"
            }`}
          >
            Aktif
          </button>
          <button
            onClick={() => setStatusFilter("pending")}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
              statusFilter === "pending"
                ? "bg-amber-50 text-amber-700 shadow-xs border border-amber-200"
                : "text-rakta-muted hover:text-rakta-navy"
            }`}
          >
            Menunggu
          </button>
          <button
            onClick={() => setStatusFilter("rejected")}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
              statusFilter === "rejected"
                ? "bg-rose-50 text-rose-700 shadow-xs border border-rose-200"
                : "text-rakta-muted hover:text-rakta-navy"
            }`}
          >
            Nonaktif
          </button>
        </div>
      </div>

      {/* Tabel Pengguna */}
      <div className="bg-rakta-card border border-rakta-subtle/70 rounded-2xl rakta-card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-rakta-subtle/60 bg-rakta-surface/70 text-xs font-semibold text-rakta-muted uppercase tracking-wider">
                <th className="px-5 py-3.5">Pengguna &amp; Kontak</th>
                <th className="px-5 py-3.5">Peran</th>
                <th className="px-5 py-3.5">Organisasi / Perusahaan</th>
                <th className="px-5 py-3.5 text-center">Status Akun</th>
                <th className="px-5 py-3.5">Terdaftar Sejak</th>
                <th className="px-5 py-3.5 text-right">Aksi Administrator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rakta-subtle/40">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-rakta-muted">
                    <Users className="w-10 h-10 mx-auto mb-2 text-rakta-muted/50" />
                    <p className="font-semibold text-rakta-navy text-base">Tidak ada pengguna ditemukan</p>
                    <p className="text-xs text-rakta-muted mt-1 max-w-sm mx-auto">
                      Sesuaikan kata kunci pencarian atau filter status dan peran di atas.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const roleConfig = roleMeta[u.role] || { label: u.role, badge: "bg-rakta-surface text-rakta-navy" };
                  const statusConfig = statusMeta[u.status] || { label: u.status, badge: "bg-rakta-surface text-rakta-navy" };
                  const isCurrent = u.id === currentUserId;
                  const isPendingUpdating = isUpdating && updatingId === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-rakta-surface/40 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-rakta-bg text-rakta-primary font-bold flex items-center justify-center shrink-0 text-sm">
                            {u.nama?.charAt(0).toUpperCase() || "U"}
                          </div>
                          <div>
                            <div className="font-semibold text-rakta-navy flex items-center gap-1.5">
                              <span>{u.nama}</span>
                              {isCurrent && (
                                <span className="text-[10px] bg-rakta-bg text-rakta-navy px-1.5 py-0.2 rounded font-mono">
                                  Akun Anda
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-rakta-muted flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-rakta-muted/70" />
                              <span>{u.email}</span>
                            </div>
                            {u.kontak && (
                              <div className="text-xs text-rakta-muted flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-rakta-muted/70" />
                                <span>{u.kontak}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border ${roleConfig.badge}`}>
                          {roleConfig.label}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-xs text-rakta-navy">
                        {u.nama_perusahaan ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-rakta-muted shrink-0" />
                            <span className="font-medium">{u.nama_perusahaan}</span>
                          </div>
                        ) : (
                          <span className="text-rakta-muted italic">Internal RAKTA</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full border ${statusConfig.badge}`}>
                          {statusConfig.label}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-xs text-rakta-muted font-mono">
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
                                className="px-3 py-1 text-xs rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{u.status === "pending" ? "Setujui" : "Aktifkan"}</span>
                              </button>
                            )}

                            {u.status !== "rejected" && (
                              <button
                                onClick={() => handleToggleStatus(u, "rejected")}
                                className="px-3 py-1 text-xs rounded-full bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
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
    </div>
  );
}