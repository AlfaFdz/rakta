import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatRupiah } from "@/lib/format";
import ProductManager from "@/components/products/ProductManager";

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
      {/* Header */}
      <div className="bg-white border border-rakta-border rounded-2xl p-6 rakta-card-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-rakta-primary tracking-wider uppercase">
            Inventaris Gudang
          </span>
          <h1 className="text-2xl font-bold text-rakta-navy tracking-tight mt-0.5">
            Katalog Master Produk &amp; Stok
          </h1>
          <p className="text-sm text-rakta-muted mt-1">
            Pantau informasi SKU, harga per unit, stok minimum, stok low, dan alokasi rak gudang.
          </p>
        </div>
      </div>

      {/* 4 Kartu Metrik Analitik Inventaris (Anti-Slop: Zero Icon Bubbles, Full Valuation Display) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metrik 1: Total SKU */}
        <div className="bg-white border border-rakta-border rounded-2xl p-5 rakta-card-shadow flex flex-col justify-between">
          <p className="text-xs font-semibold text-rakta-muted">Total SKU Produk</p>
          <div className="mt-2">
            <h3 className="text-2xl font-bold font-mono tabular-nums text-rakta-navy">
              {totalSku}
            </h3>
            <p className="text-xs text-rakta-muted mt-1">Item terdaftar di katalog master</p>
          </div>
        </div>

        {/* Metrik 2: Stok Aman */}
        <div className="bg-white border border-rakta-border rounded-2xl p-5 rakta-card-shadow flex flex-col justify-between">
          <p className="text-xs font-semibold text-rakta-muted">Stok Aman</p>
          <div className="mt-2">
            <h3 className="text-2xl font-bold font-mono tabular-nums text-emerald-700">
              {stokAman}
            </h3>
            <p className="text-xs text-rakta-muted mt-1">Kuantitas di atas ambang batas low</p>
          </div>
        </div>

        {/* Metrik 3: Menipis & Kritis */}
        <div className="bg-white border border-rakta-border rounded-2xl p-5 rakta-card-shadow flex flex-col justify-between">
          <p className="text-xs font-semibold text-rakta-muted">Menipis / Kritis</p>
          <div className="mt-2">
            <h3 className="text-2xl font-bold font-mono tabular-nums text-rose-700">
              {stokKritis}
            </h3>
            <p className="text-xs text-rakta-muted mt-1">Perlu pengajuan restock segera</p>
          </div>
        </div>

        {/* Metrik 4: Estimasi Nilai Inventaris (Utuh Tanpa Truncate) */}
        <div className="bg-white border border-rakta-border rounded-2xl p-5 rakta-card-shadow flex flex-col justify-between">
          <p className="text-xs font-semibold text-rakta-muted">Estimasi Nilai Inventaris</p>
          <div className="mt-2">
            <h3 className="text-xl xl:text-2xl font-bold font-mono tabular-nums text-rakta-navy">
              {formatRupiah(totalValuasi)}
            </h3>
            <p className="text-xs text-rakta-muted mt-1">Total valuasi harga beli fisik</p>
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