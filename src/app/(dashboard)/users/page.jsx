import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import UserManager from "@/components/users/UserManager";
import { Users, Shield, UserCheck, Clock, UserX } from "lucide-react";

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
      <div className="bg-rakta-card border border-rakta-subtle/70 rounded-2xl p-6 rakta-card-shadow flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-rakta-navy">Kelola Pengguna Sistem</h1>
            <span className="text-xs bg-rakta-bg text-rakta-navy font-semibold px-2.5 py-0.5 rounded-full border border-rakta-subtle">
              Admin Area
            </span>
          </div>
          <p className="text-xs text-rakta-muted mt-1">
            Pantau akun seluruh peran (Admin, Warehouse Manager, Staff Gudang, dan Mitra Supplier) serta kelola status aktif/nonaktif akun.
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-rakta-bg flex items-center justify-center text-rakta-primary shrink-0">
          <Users className="w-5 h-5" />
        </div>
      </div>

      {/* 4 Kartu Metrik Akun */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-rakta-muted">
            <span>Total Pengguna</span>
            <Users className="w-3.5 h-3.5 text-rakta-primary" />
          </div>
          <div className="text-2xl font-bold text-rakta-navy font-mono mt-1">
            {totalPengguna}
          </div>
          <span className="text-[10px] text-rakta-muted">Seluruh akun terdaftar</span>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-emerald-600">
            <span>Akun Aktif</span>
            <UserCheck className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 font-mono mt-1">
            {totalAktif}
          </div>
          <span className="text-[10px] text-rakta-muted">Izin akses aktif</span>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-amber-600">
            <span>Menunggu</span>
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-bold text-amber-600 font-mono mt-1">
            {totalPending}
          </div>
          <span className="text-[10px] text-rakta-muted">Pendaftaran supplier baru</span>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-rose-500">
            <span>Nonaktif / Ditolak</span>
            <UserX className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-bold text-rose-600 font-mono mt-1">
            {totalNonaktif}
          </div>
          <span className="text-[10px] text-rakta-muted">Akses dibekukan</span>
        </Card>
      </div>

      {/* Konten Utama Tabel Pengguna */}
      <UserManager users={users} currentUserId={session.id} />
    </div>
  );
}