import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatRupiah } from "@/lib/format";
import ProductManager from "@/components/products/ProductManager";
import { Package, CheckCircle2, AlertTriangle, Coins } from "lucide-react";

export const metadata = {
  title: "Katalog Master Produk & Stok | RAKTA",
  description: "Manajemen katalog master produk, kontrol level stok gudang, dan stock opname.",
};

export default async function ProductsPage() {
  const session = await getSession();

  // Pengamanan hak akses halaman produk
  if (!session || !["admin", "warehouse_manager", "staff_gudang"].includes(session.role)) {
    redirect("/dashboard");
  }

  // Mengambil master produk dengan relasi kategori dan supplier default
  const productsRes = await query(
    `SELECT 
      p.id,
      p.sku,
      p.nama,
      p.category_id,
      c.nama AS category_nama,
      p.supplier_id,
      u.nama AS supplier_nama,
      u.nama_perusahaan AS supplier_perusahaan,
      p.deskripsi,
      p.harga_beli,
      p.harga_jual,
      p.stok_minimum,
      p.stok_low,
      p.jumlah_stok,
      p.unit,
      p.lokasi_rak,
      p.gambar_url,
      p.created_at,
      p.updated_at
    FROM products p
    JOIN categories c ON p.category_id = c.id
    LEFT JOIN users u ON p.supplier_id = u.id
    ORDER BY p.nama ASC`
  );

  // Mengambil daftar referensi kategori
  const categoriesRes = await query("SELECT id, nama FROM categories ORDER BY nama ASC");

  // Mengambil daftar supplier terverifikasi
  const suppliersRes = await query(
    "SELECT id, nama, nama_perusahaan FROM users WHERE role = 'supplier' AND status = 'approved' ORDER BY COALESCE(nama_perusahaan, nama) ASC"
  );

  const products = productsRes.rows;
  const categories = categoriesRes.rows;
  const suppliers = suppliersRes.rows;

  // Kalkulasi 4 kartu metrik analitik inventaris
  const totalSku = products.length;
  const stokAman = products.filter((p) => Number(p.jumlah_stok) > Number(p.stok_low)).length;
  const stokKritis = products.filter((p) => Number(p.jumlah_stok) <= Number(p.stok_low)).length;
  const totalValuasi = products.reduce(
    (acc, p) => acc + Number(p.jumlah_stok) * Number(p.harga_beli),
    0
  );

  return (
    <div className="space-y-6">
      <div className="bg-rakta-card border border-rakta-subtle/70 rounded-2xl p-6 rakta-card-shadow flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-rakta-navy">Katalog Master Produk &amp; Stok</h1>
          <p className="text-xs text-rakta-muted mt-1">
            Pantau informasi SKU, harga, stok minimum, stok low, dan lokasi rak barang.
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-rakta-bg flex items-center justify-center text-rakta-primary">
          <Package className="w-5 h-5" />
        </div>
      </div>

      {/* 4 Kartu Metrik Analitik Inventaris */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metrik 1: Total SKU */}
        <div className="bg-rakta-card border border-rakta-subtle/70 rounded-2xl p-5 rakta-card-shadow flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-rakta-muted">Total SKU Produk</p>
            <h3 className="text-2xl font-bold text-rakta-navy mt-1">{totalSku}</h3>
            <p className="text-[11px] text-rakta-muted mt-0.5">Item terdaftar di katalog</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rakta-surface border border-rakta-subtle flex items-center justify-center text-rakta-primary shrink-0">
            <Package className="w-5 h-5" />
          </div>
        </div>

        {/* Metrik 2: Stok Aman */}
        <div className="bg-rakta-card border border-rakta-subtle/70 rounded-2xl p-5 rakta-card-shadow flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-rakta-muted">Stok Aman</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{stokAman}</h3>
            <p className="text-[11px] text-rakta-muted mt-0.5">Di atas ambang stok low</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Metrik 3: Menipis & Kritis */}
        <div className="bg-rakta-card border border-rakta-subtle/70 rounded-2xl p-5 rakta-card-shadow flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-rakta-muted">Menipis / Kritis</p>
            <h3 className="text-2xl font-bold text-rose-600 mt-1">{stokKritis}</h3>
            <p className="text-[11px] text-rakta-muted mt-0.5">Perlu pengajuan restock</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-600 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Metrik 4: Estimasi Nilai Inventaris */}
        <div className="bg-rakta-card border border-rakta-subtle/70 rounded-2xl p-5 rakta-card-shadow flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-rakta-muted">Estimasi Nilai Inventaris</p>
            <h3 className="text-lg font-bold text-rakta-navy mt-1 truncate" title={formatRupiah(totalValuasi)}>
              {formatRupiah(totalValuasi)}
            </h3>
            <p className="text-[11px] text-rakta-muted mt-0.5">Total valuasi harga beli</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rakta-surface border border-rakta-subtle flex items-center justify-center text-rakta-primary shrink-0">
            <Coins className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Komponen Manajer Produk Interaktif */}
      <ProductManager
        products={products}
        categories={categories}
        suppliers={suppliers}
        userRole={session.role}
      />
    </div>
  );
}