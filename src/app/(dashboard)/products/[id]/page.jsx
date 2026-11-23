import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatRupiah, formatTanggal, hitungStatusStok } from "@/lib/format";
import ProductQrCard from "@/components/products/ProductQrCard";
import {
  Package,
  ArrowLeft,
  MapPin,
  Building2,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Clock,
  PackageX,
  Mail,
  Phone,
  ArrowDownLeft,
  ArrowUpRight,
  SlidersHorizontal,
  History,
  Tag,
  Coins,
} from "lucide-react";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const productId = parseInt(id, 10);
  if (isNaN(productId)) {
    return { title: "Detail Produk | RAKTA" };
  }

  const res = await query("SELECT nama, sku FROM products WHERE id = $1", [productId]);
  if (res.rows.length === 0) {
    return { title: "Produk Tidak Ditemukan | RAKTA" };
  }

  const item = res.rows[0];
  return {
    title: `${item.nama} (${item.sku}) | Detail Produk RAKTA`,
    description: `Rincian spesifikasi, level stok, riwayat mutasi, dan QR Code SKU untuk produk ${item.nama}.`,
  };
}

export default async function ProductDetailPage({ params }) {
  const session = await getSession();

  // Pengamanan hak akses halaman detail produk (Admin, Warehouse Manager, Staff Gudang)
  if (!session || !["admin", "warehouse_manager", "staff_gudang"].includes(session.role)) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const productId = parseInt(id, 10);

  // Jika parameter id bukan angka valid
  if (isNaN(productId)) {
    return (
      <EmptyProductView pesan="ID produk tidak valid atau format URL salah." />
    );
  }

  // 1. Mengambil detail produk lengkap (Raw SQL pg)
  const productRes = await query(
    `SELECT 
      p.id,
      p.sku,
      p.nama,
      p.category_id,
      c.nama AS category_nama,
      c.deskripsi AS category_deskripsi,
      p.supplier_id,
      u.nama AS supplier_nama,
      u.nama_perusahaan AS supplier_perusahaan,
      u.kontak AS supplier_kontak,
      u.email AS supplier_email,
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
    WHERE p.id = $1`,
    [productId]
  );

  // Jika produk tidak ditemukan di database
  if (productRes.rows.length === 0) {
    return (
      <EmptyProductView pesan="Data produk tidak ditemukan di sistem gudang atau telah dihapus." />
    );
  }

  const product = productRes.rows[0];

  // 2. Mengambil riwayat mutasi produk (Raw SQL pg)
  // Mengambil transaksi logistik berstatus 'approved', 'completed', atau 'adjustment'
  const mutationsRes = await query(
    `SELECT 
      t.id,
      t.nomor_transaksi,
      COALESCE(t.tipe, t.type) AS tipe,
      COALESCE(t.type, t.tipe) AS type,
      t.status,
      COALESCE(ti.qty, t.quantity, 1) AS qty,
      COALESCE(t.tanggal_transaksi, t.created_at) AS waktu_mutasi,
      COALESCE(t.catatan, t.notes) AS catatan,
      COALESCE(u_app.nama, u_op.nama, 'Petugas Gudang') AS petugas_nama
    FROM transactions t
    LEFT JOIN transaction_items ti ON t.id = ti.transaction_id AND ti.product_id = $1
    LEFT JOIN users u_op ON COALESCE(t.dibuat_oleh, t.created_by) = u_op.id
    LEFT JOIN users u_app ON COALESCE(t.disetujui_oleh, t.approved_by) = u_app.id
    WHERE (t.product_id = $1 OR ti.product_id = $1)
      AND (
        t.status IN ('approved', 'completed')
        OR t.type = 'adjustment'
        OR t.tipe = 'penyesuaian'
      )
    ORDER BY waktu_mutasi DESC`,
    [productId]
  );

  const mutations = mutationsRes.rows;
  const statusStok = hitungStatusStok(product.jumlah_stok, product.stok_minimum, product.stok_low);

  return (
    <div className="space-y-6">
      {/* Bilah Navigasi Atas & Tombol Kembali */}
      <div className="bg-rakta-card border border-rakta-subtle/70 rounded-2xl p-5 md:p-6 rakta-card-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-rakta-muted mb-1.5">
            <Link
              href="/products"
              className="hover:text-rakta-primary transition-colors flex items-center gap-1"
            >
              <Package className="w-3.5 h-3.5" />
              <span>Katalog Master Produk</span>
            </Link>
            <span>/</span>
            <span className="font-mono font-semibold text-rakta-navy">{product.sku}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-bold text-rakta-navy">{product.nama}</h1>
            <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-rakta-surface text-rakta-navy border border-rakta-subtle">
              {product.sku}
            </span>
          </div>
        </div>

        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rakta-surface hover:bg-rakta-card border border-rakta-subtle text-rakta-navy text-xs font-semibold shadow-xs transition-all self-start sm:self-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Katalog</span>
        </Link>
      </div>

      {/* Grid Informasi Utama: Data Produk & Generator QR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri & Tengah: Rincian Produk, Level Stok, dan Supplier (2 Kolom di Desktop) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Kartu Status Ketersediaan & Level Stok */}
          <div className="bg-rakta-card border border-rakta-subtle/70 rounded-2xl p-6 rakta-card-shadow space-y-5">
            <div className="flex items-center justify-between pb-3.5 border-b border-rakta-subtle/60">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-rakta-primary" />
                <h3 className="text-sm font-bold text-rakta-navy">Status Ketersediaan &amp; Level Stok</h3>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${
                  statusStok.kode === "normal"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : statusStok.kode === "menipis"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}
              >
                {statusStok.kode === "normal" ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5" />
                )}
                {statusStok.kode === "normal"
                  ? "Stok Aman"
                  : statusStok.kode === "menipis"
                  ? "Stok Menipis"
                  : statusStok.kode === "habis"
                  ? "Stok Habis"
                  : "Stok Kritis"}
              </span>
            </div>

            {/* 3 Metrik Stok Kunci */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-rakta-surface/70 border border-rakta-subtle/70">
                <p className="text-xs text-rakta-muted font-medium">Stok Fisik Saat Ini</p>
                <div className="text-2xl font-bold text-rakta-navy mt-1">
                  {product.jumlah_stok}{" "}
                  <span className="text-xs font-normal text-rakta-muted">{product.unit}</span>
                </div>
                <p className="text-[11px] text-rakta-muted mt-0.5">Tersedia di gudang</p>
              </div>

              <div className="p-4 rounded-xl bg-rakta-surface/70 border border-rakta-subtle/70">
                <p className="text-xs text-rakta-muted font-medium">Batas Stok Minimum</p>
                <div className="text-2xl font-bold text-rose-600 mt-1">
                  {product.stok_minimum}{" "}
                  <span className="text-xs font-normal text-rakta-muted">{product.unit}</span>
                </div>
                <p className="text-[11px] text-rakta-muted mt-0.5">Batas status darurat/kritis</p>
              </div>

              <div className="p-4 rounded-xl bg-rakta-surface/70 border border-rakta-subtle/70">
                <p className="text-xs text-rakta-muted font-medium">Ambang Stok Low</p>
                <div className="text-2xl font-bold text-amber-600 mt-1">
                  {product.stok_low}{" "}
                  <span className="text-xs font-normal text-rakta-muted">{product.unit}</span>
                </div>
                <p className="text-[11px] text-rakta-muted mt-0.5">Pemicu pengajuan restock</p>
              </div>
            </div>
          </div>

          {/* Kartu Informasi Spesifikasi & Penempatan */}
          <div className="bg-rakta-card border border-rakta-subtle/70 rounded-2xl p-6 rakta-card-shadow space-y-5">
            <div className="flex items-center gap-2 pb-3.5 border-b border-rakta-subtle/60">
              <Tag className="w-4 h-4 text-rakta-primary" />
              <h3 className="text-sm font-bold text-rakta-navy">Rincian Informasi &amp; Spesifikasi</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <p className="text-rakta-muted">Kategori Produk</p>
                <div className="font-semibold text-rakta-navy text-sm flex items-center gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-rakta-surface text-rakta-navy border border-rakta-subtle/70">
                    {product.category_nama}
                  </span>
                </div>
                {product.category_deskripsi && (
                  <p className="text-[11px] text-rakta-muted mt-0.5">{product.category_deskripsi}</p>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-rakta-muted">Lokasi Rak Gudang</p>
                <div className="font-semibold text-rakta-navy text-sm flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rakta-primary shrink-0" />
                  <span>{product.lokasi_rak || "Belum Ditentukan"}</span>
                </div>
                <p className="text-[11px] text-rakta-muted mt-0.5">Posisi penyimpanan fisik</p>
              </div>

              <div className="space-y-1">
                <p className="text-rakta-muted">Harga Beli Gudang</p>
                <div className="font-bold text-rakta-navy text-base">
                  {formatRupiah(product.harga_beli)}
                </div>
                <p className="text-[11px] text-rakta-muted mt-0.5">Biaya pengadaan per {product.unit}</p>
              </div>

              <div className="space-y-1">
                <p className="text-rakta-muted">Harga Jual Rekomendasi</p>
                <div className="font-bold text-rakta-navy text-base">
                  {formatRupiah(product.harga_jual)}
                </div>
                <p className="text-[11px] text-rakta-muted mt-0.5">Nilai keluar barang per {product.unit}</p>
              </div>
            </div>

            {/* Deskripsi Tambahan */}
            {product.deskripsi && (
              <div className="pt-3 border-t border-rakta-subtle/50 text-xs">
                <p className="text-rakta-muted font-medium mb-1">Deskripsi &amp; Instruksi Khusus</p>
                <p className="text-rakta-navy bg-rakta-surface/50 p-3 rounded-xl border border-rakta-subtle/50 leading-relaxed">
                  {product.deskripsi}
                </p>
              </div>
            )}
          </div>

          {/* Kartu Pemasok Utama (Supplier Rekanan) */}
          <div className="bg-rakta-card border border-rakta-subtle/70 rounded-2xl p-6 rakta-card-shadow space-y-4">
            <div className="flex items-center gap-2 pb-3.5 border-b border-rakta-subtle/60">
              <Building2 className="w-4 h-4 text-rakta-primary" />
              <h3 className="text-sm font-bold text-rakta-navy">Pemasok Utama (Supplier Rekanan)</h3>
            </div>

            {product.supplier_nama || product.supplier_perusahaan ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-rakta-muted">Nama Perusahaan / Kontak</p>
                  <p className="font-semibold text-rakta-navy text-sm mt-0.5">
                    {product.supplier_perusahaan || product.supplier_nama}
                  </p>
                  {product.supplier_perusahaan && product.supplier_nama && (
                    <p className="text-[11px] text-rakta-muted mt-0.5">PIC: {product.supplier_nama}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  {product.supplier_kontak && (
                    <div className="flex items-center gap-2 text-rakta-navy">
                      <Phone className="w-3.5 h-3.5 text-rakta-muted shrink-0" />
                      <span>{product.supplier_kontak}</span>
                    </div>
                  )}
                  {product.supplier_email && (
                    <div className="flex items-center gap-2 text-rakta-navy">
                      <Mail className="w-3.5 h-3.5 text-rakta-muted shrink-0" />
                      <span>{product.supplier_email}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-rakta-muted italic">
                Produk ini belum dikaitkan dengan supplier rekanan utama.
              </p>
            )}
          </div>
        </div>

        {/* Kolom Kanan: Generator QR Code SKU */}
        <div className="space-y-6">
          <ProductQrCard product={product} />

          {/* Kartu Ringkasan Valuasi Barang */}
          <div className="bg-rakta-card border border-rakta-subtle/70 rounded-2xl p-5 rakta-card-shadow text-xs space-y-2.5">
            <div className="flex items-center gap-2 text-rakta-navy font-bold">
              <Coins className="w-4 h-4 text-rakta-primary" />
              <span>Estimasi Nilai Stok Fisik</span>
            </div>
            <div className="p-3 bg-rakta-surface/70 rounded-xl border border-rakta-subtle/70">
              <p className="text-rakta-muted text-[11px]">Total Valuasi Berdasarkan Harga Beli:</p>
              <p className="text-base font-bold text-rakta-navy mt-0.5">
                {formatRupiah(Number(product.jumlah_stok) * Number(product.harga_beli))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bagian Bawah: Riwayat Mutasi Produk */}
      <div className="bg-rakta-card border border-rakta-subtle/70 rounded-2xl rakta-card-shadow overflow-hidden">
        <div className="p-5 border-b border-rakta-subtle/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rakta-surface border border-rakta-subtle/80 flex items-center justify-center text-rakta-primary shrink-0">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-rakta-navy">Riwayat Mutasi Produk</h3>
              <p className="text-xs text-rakta-muted">
                Daftar pergerakan barang masuk, barang keluar, dan penyesuaian stok fisik terverifikasi
              </p>
            </div>
          </div>

          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-rakta-surface text-rakta-navy border border-rakta-subtle/70 self-start sm:self-auto">
            {mutations.length} Transaksi Terverifikasi
          </span>
        </div>

        {/* Tabel Mutasi */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-rakta-subtle/60 bg-rakta-surface/70 text-xs font-semibold text-rakta-muted uppercase tracking-wider">
                <th className="px-5 py-3.5">Nomor Transaksi</th>
                <th className="px-5 py-3.5">Jenis Mutasi</th>
                <th className="px-5 py-3.5 text-center">Jumlah Perubahan</th>
                <th className="px-5 py-3.5">Petugas Verifikator</th>
                <th className="px-5 py-3.5">Waktu Transaksi</th>
                <th className="px-5 py-3.5">Keterangan / Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rakta-subtle/40">
              {mutations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-rakta-muted">
                    <Clock className="w-9 h-9 mx-auto mb-2 text-rakta-muted/50" />
                    <p className="font-semibold text-rakta-navy text-sm">
                      Belum ada riwayat mutasi untuk produk ini
                    </p>
                    <p className="text-xs text-rakta-muted mt-1 max-w-sm mx-auto">
                      Seluruh transaksi penerimaan, pengiriman, dan stock opname yang telah berstatus disetujui akan tercatat otomatis di sini.
                    </p>
                  </td>
                </tr>
              ) : (
                mutations.map((m) => {
                  const isMasuk = m.tipe === "masuk" || m.type === "incoming";
                  const isKeluar = m.tipe === "keluar" || m.type === "outgoing";
                  const isPenyesuaian = m.type === "adjustment" || m.tipe === "penyesuaian";

                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-rakta-surface/40 transition-colors text-rakta-navy text-xs"
                    >
                      {/* Nomor Transaksi */}
                      <td className="px-5 py-3.5 font-mono font-bold text-rakta-navy">
                        {m.nomor_transaksi}
                      </td>

                      {/* Jenis Mutasi */}
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold border ${
                            isMasuk
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : isKeluar
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {isMasuk ? (
                            <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                          ) : isKeluar ? (
                            <ArrowUpRight className="w-3 h-3 text-rose-600" />
                          ) : (
                            <SlidersHorizontal className="w-3 h-3 text-blue-600" />
                          )}
                          <span>
                            {isMasuk
                              ? "Barang Masuk"
                              : isKeluar
                              ? "Barang Keluar"
                              : "Stock Opname"}
                          </span>
                        </span>
                      </td>

                      {/* Jumlah Perubahan */}
                      <td className="px-5 py-3.5 text-center font-bold">
                        <span
                          className={`text-sm ${
                            isMasuk
                              ? "text-emerald-700"
                              : isKeluar
                              ? "text-rose-700"
                              : "text-blue-700"
                          }`}
                        >
                          {isMasuk ? `+${m.qty}` : isKeluar ? `-${m.qty}` : `${m.qty}`}
                        </span>{" "}
                        <span className="text-[11px] font-normal text-rakta-muted">
                          {product.unit}
                        </span>
                      </td>

                      {/* Petugas Verifikator */}
                      <td className="px-5 py-3.5 font-medium text-rakta-navy">
                        {m.petugas_nama}
                      </td>

                      {/* Waktu Transaksi */}
                      <td className="px-5 py-3.5 text-rakta-muted whitespace-nowrap">
                        {formatTanggal(m.waktu_mutasi, true)}
                      </td>

                      {/* Catatan / Keterangan */}
                      <td className="px-5 py-3.5 text-rakta-muted max-w-xs truncate" title={m.catatan || "-"}>
                        {m.catatan || "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Tampilan Kosong Ramah Jika ID Produk Tidak Ditemukan
function EmptyProductView({ pesan }) {
  return (
    <div className="bg-rakta-card border border-rakta-subtle/70 rounded-2xl p-10 md:p-14 rakta-card-shadow text-center max-w-lg mx-auto my-12">
      <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500 mx-auto mb-4">
        <PackageX className="w-8 h-8" />
      </div>
      <h2 className="text-lg md:text-xl font-bold text-rakta-navy">Produk Tidak Ditemukan</h2>
      <p className="text-xs md:text-sm text-rakta-muted mt-2 max-w-sm mx-auto leading-relaxed">
        {pesan}
      </p>
      <div className="mt-6">
        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-rakta-primary hover:bg-rakta-navy text-white text-xs md:text-sm font-semibold shadow-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Katalog Produk</span>
        </Link>
      </div>
    </div>
  );
}