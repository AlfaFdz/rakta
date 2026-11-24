import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { redirect } from "next/navigation";
import SupplierTable from "@/components/suppliers/SupplierTable";

export const metadata = {
  title: "Verifikasi & Manajemen Supplier | RAKTA",
  description: "Kelola izin kemitraan dan persetujuan akun rekanan pemasok barang gudang RAKTA.",
};

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
      <div className="bg-white border border-rakta-border rounded-2xl p-6 rakta-card-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-rakta-primary tracking-wider uppercase">
            Administrasi Rekanan
          </span>
          <h1 className="text-2xl font-bold text-rakta-navy tracking-tight mt-0.5">
            Verifikasi &amp; Manajemen Supplier
          </h1>
          <p className="text-sm text-rakta-muted mt-1">
            Kelola izin kemitraan, verifikasi akun pendaftaran baru, dan persetujuan akses pengadaan barang.
          </p>
        </div>
      </div>

      {/* 4 Kartu Metrik Ringkasan Status Supplier */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-rakta-border rounded-2xl p-5 rakta-card-shadow flex flex-col justify-between">
          <p className="text-xs font-semibold text-rakta-muted">Total Rekanan</p>
          <div className="mt-2">
            <h3 className="text-2xl font-bold font-mono tabular-nums text-rakta-navy">
              {counts.all}
            </h3>
            <p className="text-xs text-rakta-muted mt-1">Akun supplier terdaftar</p>
          </div>
        </div>

        <div className="bg-white border border-rakta-border rounded-2xl p-5 rakta-card-shadow flex flex-col justify-between">
          <p className="text-xs font-semibold text-rakta-muted">Menunggu Verifikasi</p>
          <div className="mt-2">
            <h3 className="text-2xl font-bold font-mono tabular-nums text-amber-700">
              {counts.pending}
            </h3>
            <p className="text-xs text-rakta-muted mt-1">Perlu ditinjau administrator</p>
          </div>
        </div>

        <div className="bg-white border border-rakta-border rounded-2xl p-5 rakta-card-shadow flex flex-col justify-between">
          <p className="text-xs font-semibold text-rakta-muted">Disetujui</p>
          <div className="mt-2">
            <h3 className="text-2xl font-bold font-mono tabular-nums text-emerald-700">
              {counts.approved}
            </h3>
            <p className="text-xs text-rakta-muted mt-1">Kemitraan pengadaan aktif</p>
          </div>
        </div>

        <div className="bg-white border border-rakta-border rounded-2xl p-5 rakta-card-shadow flex flex-col justify-between">
          <p className="text-xs font-semibold text-rakta-muted">Ditolak</p>
          <div className="mt-2">
            <h3 className="text-2xl font-bold font-mono tabular-nums text-rose-700">
              {counts.rejected}
            </h3>
            <p className="text-xs text-rakta-muted mt-1">Akses sistem dibekukan</p>
          </div>
        </div>
      </div>

      {/* Tabel & Filter Interaktif Supplier */}
      <SupplierTable suppliers={suppliers} counts={counts} />
    </div>
  );
}