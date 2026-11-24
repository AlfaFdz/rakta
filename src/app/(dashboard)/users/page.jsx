import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { redirect } from "next/navigation";
import UserManager from "@/components/users/UserManager";

export const metadata = {
  title: "Kelola Pengguna Sistem | RAKTA",
  description: "Manajemen akun pengguna sistem RAKTA: Administrator, Warehouse Manager, Staff Gudang, dan Supplier.",
};

export default async function UsersPage() {
  const session = await getSession();

  // Hanya Administrator yang dapat mengakses halaman pengelolaan pengguna
  if (!session || session.role !== "admin") {
    redirect("/dashboard");
  }

  // Mengambil seluruh akun pengguna di sistem beserta rating untuk supplier
  const res = await query(
    `SELECT 
       u.id, 
       u.nama, 
       u.email, 
       u.role, 
       u.status, 
       u.nama_perusahaan, 
       u.kontak, 
       u.created_at,
       ROUND(AVG(COALESCE(ro.rating, ro.rating_supplier))::numeric, 1) AS avg_rating,
       COUNT(COALESCE(ro.rating, ro.rating_supplier))::int AS total_reviews
     FROM users u
     LEFT JOIN restock_orders ro ON u.id = ro.supplier_id AND COALESCE(ro.rating, ro.rating_supplier) IS NOT NULL
     GROUP BY u.id
     ORDER BY 
       CASE 
         WHEN u.role = 'admin' THEN 1
         WHEN u.role = 'warehouse_manager' THEN 2
         WHEN u.role = 'staff_gudang' THEN 3
         ELSE 4
       END,
       u.nama ASC`
  );

  const users = res.rows || [];

  // Metrik ringkasan akun
  const totalPengguna = users.length;
  const totalAktif = users.filter((u) => u.status === "approved").length;
  const totalPending = users.filter((u) => u.status === "pending").length;
  const totalNonaktif = users.filter((u) => u.status === "rejected").length;

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="bg-white border border-rakta-border rounded-2xl p-6 rakta-card-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-rakta-primary tracking-wider uppercase">
            Administrasi Hak Akses
          </span>
          <h1 className="text-2xl font-bold text-rakta-navy tracking-tight mt-0.5">
            Kelola Pengguna Sistem
          </h1>
          <p className="text-sm text-rakta-muted mt-1">
            Pantau akun seluruh peran (Admin, Warehouse Manager, Staff Gudang, dan Mitra Supplier) serta kelola status aktif/nonaktif akun.
          </p>
        </div>
      </div>

      {/* 4 Kartu Metrik Akun */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-rakta-border rounded-2xl p-5 rakta-card-shadow flex flex-col justify-between">
          <p className="text-xs font-semibold text-rakta-muted">Total Pengguna</p>
          <div className="mt-2">
            <h3 className="text-2xl font-bold font-mono tabular-nums text-rakta-navy">
              {totalPengguna}
            </h3>
            <p className="text-xs text-rakta-muted mt-1">Seluruh akun terdaftar</p>
          </div>
        </div>

        <div className="bg-white border border-rakta-border rounded-2xl p-5 rakta-card-shadow flex flex-col justify-between">
          <p className="text-xs font-semibold text-rakta-muted">Akun Aktif</p>
          <div className="mt-2">
            <h3 className="text-2xl font-bold font-mono tabular-nums text-emerald-700">
              {totalAktif}
            </h3>
            <p className="text-xs text-rakta-muted mt-1">Izin akses sistem aktif</p>
          </div>
        </div>

        <div className="bg-white border border-rakta-border rounded-2xl p-5 rakta-card-shadow flex flex-col justify-between">
          <p className="text-xs font-semibold text-rakta-muted">Menunggu Persetujuan</p>
          <div className="mt-2">
            <h3 className="text-2xl font-bold font-mono tabular-nums text-amber-700">
              {totalPending}
            </h3>
            <p className="text-xs text-rakta-muted mt-1">Pendaftaran supplier baru</p>
          </div>
        </div>

        <div className="bg-white border border-rakta-border rounded-2xl p-5 rakta-card-shadow flex flex-col justify-between">
          <p className="text-xs font-semibold text-rakta-muted">Nonaktif / Ditolak</p>
          <div className="mt-2">
            <h3 className="text-2xl font-bold font-mono tabular-nums text-rose-700">
              {totalNonaktif}
            </h3>
            <p className="text-xs text-rakta-muted mt-1">Akses sistem dibekukan</p>
          </div>
        </div>
      </div>

      {/* Konten Utama Tabel Pengguna */}
      <UserManager users={users} currentUserId={session.id} />
    </div>
  );
}