import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import CategoryManager from "@/components/categories/CategoryManager";
import { Layers, Package, FolderCheck, FolderPlus } from "lucide-react";

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
      <div className="bg-rakta-card border border-rakta-subtle/70 rounded-2xl p-6 rakta-card-shadow flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-rakta-navy">Kategori Produk Pergudangan</h1>
            <span className="text-xs bg-rakta-bg text-rakta-navy font-semibold px-2.5 py-0.5 rounded-full border border-rakta-subtle">
              Inventaris
            </span>
          </div>
          <p className="text-xs text-rakta-muted mt-1">
            Struktur pengelompokan barang untuk mempermudah penataan lokasi rak dan pencatatan master data.
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-rakta-bg flex items-center justify-center text-rakta-primary shrink-0">
          <Layers className="w-5 h-5" />
        </div>
      </div>

      {/* 4 Kartu Metrik Ringkasan Kategori */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-rakta-muted">
            <span>Total Kategori</span>
            <Layers className="w-3.5 h-3.5 text-rakta-primary" />
          </div>
          <div className="text-2xl font-bold text-rakta-navy font-mono mt-1">
            {totalKategori}
          </div>
          <span className="text-[10px] text-rakta-muted">Kelompok barang</span>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-emerald-700">
            <span>Kategori Terisi</span>
            <FolderCheck className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 font-mono mt-1">
            {kategoriTerisi}
          </div>
          <span className="text-[10px] text-rakta-muted">Memiliki produk aktif</span>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-amber-700">
            <span>Kategori Kosong</span>
            <FolderPlus className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-600 font-mono mt-1">
            {kategoriKosong}
          </div>
          <span className="text-[10px] text-rakta-muted">Dapat dihapus aman</span>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-xs text-rakta-muted">
            <span>Total Master Produk</span>
            <Package className="w-3.5 h-3.5 text-rakta-primary" />
          </div>
          <div className="text-2xl font-bold text-rakta-navy font-mono mt-1">
            {totalProdukGudang}
          </div>
          <span className="text-[10px] text-rakta-muted">SKU terklasifikasi</span>
        </Card>
      </div>

      {/* Manajemen & Tabel Interaktif Kategori */}
      <CategoryManager categories={categories} />
    </div>
  );
}