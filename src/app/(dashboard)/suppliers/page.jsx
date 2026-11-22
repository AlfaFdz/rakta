import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import SupplierTable from "@/components/suppliers/SupplierTable";
import { Users, Clock, CheckCircle2, XCircle } from "lucide-react";

export default async function SuppliersPage() {
  const session = await getSession();

  // Validasi keamanan: hanya Administrator yang boleh mengakses halaman ini
  if (!session || session.role !== "admin") {
    redirect("/dashboard");
  }

  // Ambil daftar seluruh akun dengan peran supplier
  const result = await query(
    `SELECT id, nama, email, role, status, nama_perusahaan, kontak, created_at
     FROM users
     WHERE role = 'supplier'
     ORDER BY created_at DESC`
  );

  const suppliers = result.rows || [];

  const counts = {
    all: suppliers.length,
    pending: suppliers.filter((s) => s.status === "pending").length,
    approved: suppliers.filter((s) => s.status === "approved").length,
    rejected: suppliers.filter((s) => s.status === "rejected").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-rakta-card border border-rakta-subtle/70 rounded-2xl p-6 rakta-card-shadow flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-rakta-navy">Verifikasi &amp; Manajemen Supplier</h1>
            <span className="text-xs bg-rakta-bg text-rakta-navy font-semibold px-2.5 py-0.5 rounded-full border border-rakta-subtle">
              Admin Area
            </span>
          </div>
          <p className="text-xs text-rakta-muted mt-1">
            Kelola izin kemitraan dan persetujuan akun rekanan pemasok barang gudang RAKTA.
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-rakta-bg flex items-center justify-center text-rakta-primary shrink-0">
          <Users className="w-5 h-5" />
        </div>
      </div>

      {/* 4 Kartu Metrik Ringkasan Status Supplier */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-rakta-muted">
            <span>Total Rekanan</span>
            <Users className="w-3.5 h-3.5 text-rakta-primary" />
          </div>
          <div className="text-2xl font-bold text-rakta-navy font-mono mt-1">
            {counts.all}
          </div>
          <span className="text-[10px] text-rakta-muted">Akun terdaftar</span>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-amber-600">
            <span>Menunggu</span>
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-bold text-amber-600 font-mono mt-1">
            {counts.pending}
          </div>
          <span className="text-[10px] text-rakta-muted">Perlu tindakan</span>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-emerald-600">
            <span>Disetujui</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 font-mono mt-1">
            {counts.approved}
          </div>
          <span className="text-[10px] text-rakta-muted">Kemitraan aktif</span>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-red-500">
            <span>Ditolak</span>
            <XCircle className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-bold text-red-600 font-mono mt-1">
            {counts.rejected}
          </div>
          <span className="text-[10px] text-rakta-muted">Akses dibekukan</span>
        </Card>
      </div>

      {/* Tabel & Filter Interaktif Supplier */}
      <SupplierTable suppliers={suppliers} counts={counts} />
    </div>
  );
}