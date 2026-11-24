import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { redirect } from "next/navigation";
import CategoryManager from "@/components/categories/CategoryManager";

export const metadata = {
  title: "Kategori Produk Pergudangan | RAKTA",
  description: "Struktur pengelompokan master barang untuk penataan lokasi rak dan katalog gudang.",
};

export default async function CategoriesPage() {
  const session = await getSession();

  // Validasi keamanan: hanya Admin dan Warehouse Manager yang boleh mengelola kategori
  if (!session || (session.role !== "admin" && session.role !== "warehouse_manager")) {
    redirect("/dashboard");
  }

  // Mengambil seluruh kategori beserta jumlah produk yang terhubung
  const result = await query(
    `SELECT c.id, c.nama, c.deskripsi, c.created_at,
            COUNT(p.id)::int AS total_produk
     FROM categories c
     LEFT JOIN products p ON c.id = p.category_id
     GROUP BY c.id, c.nama, c.deskripsi, c.created_at
     ORDER BY c.nama ASC`
  );

  const categories = result.rows || [];

  const totalKategori = categories.length;
  const kategoriTerisi = categories.filter((c) => c.total_produk > 0).length;
  const kategoriKosong = categories.filter((c) => c.total_produk === 0).length;
  const totalProdukGudang = categories.reduce((sum, c) => sum + c.total_produk, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-rakta-border rounded-2xl p-6 rakta-card-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-rakta-primary tracking-wider uppercase">
            Klasifikasi Inventaris
          </span>
          <h1 className="text-2xl font-bold text-rakta-navy tracking-tight mt-0.5">
            Kategori Produk Pergudangan
          </h1>
          <p className="text-sm text-rakta-muted mt-1">
            Struktur pengelompokan master barang untuk mempermudah penataan lokasi rak dan pencatatan inventaris.
          </p>
        </div>
      </div>

      {/* 4 Kartu Metrik Ringkasan Kategori */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-rakta-border rounded-2xl p-5 rakta-card-shadow flex flex-col justify-between">
          <p className="text-xs font-semibold text-rakta-muted">Total Kategori</p>
          <div className="mt-2">
            <h3 className="text-2xl font-bold font-mono tabular-nums text-rakta-navy">
              {totalKategori}
            </h3>
            <p className="text-xs text-rakta-muted mt-1">Kelompok master barang</p>
          </div>
        </div>

        <div className="bg-white border border-rakta-border rounded-2xl p-5 rakta-card-shadow flex flex-col justify-between">
          <p className="text-xs font-semibold text-rakta-muted">Kategori Terisi</p>
          <div className="mt-2">
            <h3 className="text-2xl font-bold font-mono tabular-nums text-emerald-700">
              {kategoriTerisi}
            </h3>
            <p className="text-xs text-rakta-muted mt-1">Memiliki produk aktif</p>
          </div>
        </div>

        <div className="bg-white border border-rakta-border rounded-2xl p-5 rakta-card-shadow flex flex-col justify-between">
          <p className="text-xs font-semibold text-rakta-muted">Kategori Kosong</p>
          <div className="mt-2">
            <h3 className="text-2xl font-bold font-mono tabular-nums text-amber-700">
              {kategoriKosong}
            </h3>
            <p className="text-xs text-rakta-muted mt-1">Dapat dihapus dengan aman</p>
          </div>
        </div>

        <div className="bg-white border border-rakta-border rounded-2xl p-5 rakta-card-shadow flex flex-col justify-between">
          <p className="text-xs font-semibold text-rakta-muted">Total Master Produk</p>
          <div className="mt-2">
            <h3 className="text-2xl font-bold font-mono tabular-nums text-rakta-navy">
              {totalProdukGudang}
            </h3>
            <p className="text-xs text-rakta-muted mt-1">SKU yang terklasifikasi</p>
          </div>
        </div>
      </div>

      {/* Manajemen & Tabel Interaktif Kategori */}
      <CategoryManager categories={categories} />
    </div>
  );
}