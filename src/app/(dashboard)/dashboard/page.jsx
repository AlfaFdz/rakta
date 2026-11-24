import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import StockBadge from "@/components/ui/StockBadge";
import { formatRupiah, formatTanggal, hitungStatusStok } from "@/lib/format";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getSession();
  const role = session?.role;

  // ---------------------------------------------------------------------------
  // 1. DATA FETCHING UNTUK ROLE ADMIN
  // ---------------------------------------------------------------------------
  if (role === "admin") {
    const [produkRes, lowStockRes, pendingSupplierRes, totalTrxRes, assetRes, latestTrxRes] =
      await Promise.all([
        query("SELECT COUNT(*)::int AS total FROM products"),
        query("SELECT COUNT(*)::int AS total FROM products WHERE jumlah_stok <= stok_low"),
        query("SELECT COUNT(*)::int AS total FROM users WHERE role = 'supplier' AND status = 'pending'"),
        query("SELECT COUNT(*)::int AS total FROM transactions"),
        query("SELECT COALESCE(SUM(jumlah_stok * harga_beli), 0)::numeric AS total FROM products"),
        query(`
          SELECT t.id, t.nomor_transaksi, COALESCE(t.tipe, t.type) AS tipe, COALESCE(t.tanggal_transaksi, t.created_at) AS tanggal_transaksi, t.status, t.tujuan_customer,
                 u.nama AS pembuat_nama, s.nama_perusahaan AS supplier_perusahaan,
                 (SELECT COUNT(*)::int FROM transaction_items ti WHERE ti.transaction_id = t.id) AS total_item
          FROM transactions t
          LEFT JOIN users u ON COALESCE(t.dibuat_oleh, t.created_by) = u.id
          LEFT JOIN users s ON t.supplier_id = s.id
          ORDER BY COALESCE(t.tanggal_transaksi, t.created_at) DESC
          LIMIT 5
        `),
      ]);

    const totalProduk = produkRes.rows[0]?.total || 0;
    const totalStokLow = lowStockRes.rows[0]?.total || 0;
    const totalSupplierPending = pendingSupplierRes.rows[0]?.total || 0;
    const totalTransaksi = totalTrxRes.rows[0]?.total || 0;
    const totalNilaiInventori = assetRes.rows[0]?.total || 0;
    const latestTrx = latestTrxRes.rows || [];

    return (
      <div className="space-y-8">
        {/* Welcome Banner */}
        <div className="bg-white border border-rakta-border rounded-2xl p-6 rakta-card-shadow flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-rakta-navy tracking-tight">
              Ringkasan Operasional Administrator
            </h1>
            <p className="text-xs text-rakta-muted mt-1">
              Pantau seluruh aktivitas inventaris gudang, nilai inventori, verifikasi rekanan, dan log transaksi sistem.
            </p>
          </div>
          <span className="text-xs font-mono text-rakta-muted bg-rakta-surface border border-rakta-border px-3 py-1.5 rounded-xl self-start sm:self-auto">
            {formatTanggal(new Date(), true)}
          </span>
        </div>

        {/* 5 Kartu Metrik Admin */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <Card className="flex flex-col justify-between">
            <div>
              <span className="text-xs font-medium text-rakta-muted">Total Produk Aktif</span>
              <div className="text-2xl font-bold text-rakta-navy font-mono tabular-nums mt-2">
                {totalProduk} <span className="text-xs font-normal text-rakta-muted">SKU</span>
              </div>
            </div>
          </Card>

          <Card className="flex flex-col justify-between">
            <div>
              <span className="text-xs font-medium text-rakta-muted">Total Nilai Inventori</span>
              <div className="text-xl xl:text-2xl font-bold text-rakta-navy font-mono tabular-nums mt-2">
                {formatRupiah(totalNilaiInventori)}
              </div>
            </div>
          </Card>

          <Card className="flex flex-col justify-between">
            <div>
              <span className="text-xs font-medium text-rakta-muted">Stok Menipis / Kritis</span>
              <div className="text-2xl font-bold text-amber-600 font-mono tabular-nums mt-2">
                {totalStokLow} <span className="text-xs font-normal text-rakta-muted">item</span>
              </div>
            </div>
            {totalStokLow > 0 && (
              <Link
                href="/products"
                className="inline-block text-[11px] text-rakta-primary font-semibold hover:underline mt-2 pt-2 border-t border-rakta-border/40"
              >
                Tinjau produk menipis
              </Link>
            )}
          </Card>

          <Card className="flex flex-col justify-between">
            <div>
              <span className="text-xs font-medium text-rakta-muted">Verifikasi Supplier</span>
              <div className="text-2xl font-bold text-rakta-navy font-mono tabular-nums mt-2">
                {totalSupplierPending} <span className="text-xs font-normal text-rakta-muted">rekanan</span>
              </div>
            </div>
            <Link
              href="/suppliers"
              className="inline-block text-[11px] text-rakta-primary font-semibold hover:underline mt-2 pt-2 border-t border-rakta-border/40"
            >
              Tinjau permohonan
            </Link>
          </Card>

          <Card className="flex flex-col justify-between">
            <div>
              <span className="text-xs font-medium text-rakta-muted">Total Transaksi</span>
              <div className="text-2xl font-bold text-rakta-navy font-mono tabular-nums mt-2">
                {totalTransaksi} <span className="text-xs font-normal text-rakta-muted">catatan</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabel 5 Transaksi Terbaru */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>5 Transaksi Gudang Terbaru</CardTitle>
              <CardDescription>Catatan pergerakan logistik barang masuk dan keluar</CardDescription>
            </div>
            <Link href="/transactions" className="text-xs text-rakta-primary font-semibold hover:underline">
              Lihat semua transaksi
            </Link>
          </CardHeader>
          <CardContent>
            {latestTrx.length === 0 ? (
              <div className="text-center py-8 text-xs text-rakta-muted">
                Belum ada transaksi logistik yang tercatat di database.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-rakta-border text-rakta-muted font-medium">
                      <th className="pb-2.5">No. transaksi</th>
                      <th className="pb-2.5">Tipe</th>
                      <th className="pb-2.5">Tanggal</th>
                      <th className="pb-2.5">Keterangan / rekanan</th>
                      <th className="pb-2.5">Status</th>
                      <th className="pb-2.5">Dicatat oleh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rakta-border/40 text-rakta-navy">
                    {latestTrx.map((trx) => (
                      <tr key={trx.id} className="hover:bg-rakta-surface/60 transition-colors">
                        <td className="py-3 font-mono font-medium tabular-nums">{trx.nomor_transaksi}</td>
                        <td className="py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-medium border ${
                              trx.tipe === "masuk"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-sky-50 text-sky-700 border-sky-200"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                trx.tipe === "masuk" ? "bg-emerald-500" : "bg-sky-500"
                              }`}
                            />
                            Barang {trx.tipe === "masuk" ? "Masuk" : "Keluar"}
                          </span>
                        </td>
                        <td className="py-3 font-mono text-rakta-muted tabular-nums">
                          {formatTanggal(trx.tanggal_transaksi)}
                        </td>
                        <td className="py-3">
                          {trx.supplier_perusahaan || trx.tujuan_customer || ":"}
                        </td>
                        <td className="py-3">
                          <span className="capitalize px-2 py-0.5 rounded-lg text-[10px] bg-rakta-surface font-mono font-medium text-rakta-navy border border-rakta-border">
                            {trx.status}
                          </span>
                        </td>
                        <td className="py-3 text-rakta-muted">{trx.pembuat_nama || ":"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. DATA FETCHING UNTUK ROLE WAREHOUSE MANAGER
  // ---------------------------------------------------------------------------
  if (role === "warehouse_manager") {
    const [produkRes, lowStockRes, activeRestockRes, assetRes, urgentProductsRes] =
      await Promise.all([
        query("SELECT COUNT(*)::int AS total FROM products"),
        query("SELECT COUNT(*)::int AS total FROM products WHERE jumlah_stok <= stok_low"),
        query("SELECT COUNT(*)::int AS total FROM restock_orders WHERE status IN ('pending', 'confirmed', 'in_transit')"),
        query("SELECT COALESCE(SUM(jumlah_stok * harga_beli), 0)::numeric AS total FROM products"),
        query(`
          SELECT p.id, p.sku, p.nama, p.jumlah_stok, p.stok_minimum, p.stok_low, p.unit, p.lokasi_rak, c.nama AS kategori_nama
          FROM products p
          JOIN categories c ON p.category_id = c.id
          WHERE p.jumlah_stok <= p.stok_low
          ORDER BY p.jumlah_stok ASC
          LIMIT 5
        `),
      ]);

    const totalProduk = produkRes.rows[0]?.total || 0;
    const totalStokLow = lowStockRes.rows[0]?.total || 0;
    const activeRestock = activeRestockRes.rows[0]?.total || 0;
    const totalNilaiAset = assetRes.rows[0]?.total || 0;
    const urgentProducts = urgentProductsRes.rows || [];

    return (
      <div className="space-y-8">
        {/* Welcome Banner */}
        <div className="bg-white border border-rakta-border rounded-2xl p-6 rakta-card-shadow flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-rakta-navy tracking-tight">
              Panel Kendali Warehouse Manager
            </h1>
            <p className="text-xs text-rakta-muted mt-1">
              Pantau ketersediaan stok, nilai valuasi aset gudang, dan kelola alur pengadaan barang restock.
            </p>
          </div>
          <span className="text-xs font-mono text-rakta-muted bg-rakta-surface border border-rakta-border px-3 py-1.5 rounded-xl self-start sm:self-auto">
            {formatTanggal(new Date(), true)}
          </span>
        </div>

        {/* 4 Kartu Metrik Manager */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="flex flex-col justify-between">
            <div>
              <span className="text-xs font-medium text-rakta-muted">Total Master Produk</span>
              <div className="text-2xl font-bold text-rakta-navy font-mono tabular-nums mt-2">
                {totalProduk} <span className="text-xs font-normal text-rakta-muted">SKU</span>
              </div>
            </div>
          </Card>

          <Card className="flex flex-col justify-between">
            <div>
              <span className="text-xs font-medium text-rakta-muted">Perlu Restock Segera</span>
              <div className="text-2xl font-bold text-amber-600 font-mono tabular-nums mt-2">
                {totalStokLow} <span className="text-xs font-normal text-rakta-muted">SKU</span>
              </div>
            </div>
            {totalStokLow > 0 && (
              <Link
                href="/products"
                className="inline-block text-[11px] text-rakta-primary font-semibold hover:underline mt-2 pt-2 border-t border-rakta-border/40"
              >
                Tinjau stok menipis
              </Link>
            )}
          </Card>

          <Card className="flex flex-col justify-between">
            <div>
              <span className="text-xs font-medium text-rakta-muted">Pesanan Restock Aktif</span>
              <div className="text-2xl font-bold text-rakta-navy font-mono tabular-nums mt-2">
                {activeRestock} <span className="text-xs font-normal text-rakta-muted">PO</span>
              </div>
            </div>
            <Link
              href="/restock"
              className="inline-block text-[11px] text-rakta-primary font-semibold hover:underline mt-2 pt-2 border-t border-rakta-border/40"
            >
              Lihat pesanan restock
            </Link>
          </Card>

          <Card className="flex flex-col justify-between">
            <div>
              <span className="text-xs font-medium text-rakta-muted">Estimasi Nilai Aset</span>
              <div className="text-xl xl:text-2xl font-bold text-rakta-navy font-mono tabular-nums mt-2">
                {formatRupiah(totalNilaiAset)}
              </div>
            </div>
          </Card>
        </div>

        {/* Tabel Produk yang Wajib Di-Restock */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Daftar Produk Wajib Segera Di-Restock</CardTitle>
              <CardDescription>Produk dengan sisa stok di bawah batas aman gudang</CardDescription>
            </div>
            <Link href="/products" className="text-xs text-rakta-primary font-semibold hover:underline">
              Kelola produk
            </Link>
          </CardHeader>
          <CardContent>
            {urgentProducts.length === 0 ? (
              <div className="text-center py-8 text-xs text-emerald-600 font-medium">
                Kondisi stok prima. Tidak ada produk dengan stok menipis saat ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-rakta-border text-rakta-muted font-medium">
                      <th className="pb-2.5">Kode SKU</th>
                      <th className="pb-2.5">Nama produk</th>
                      <th className="pb-2.5">Kategori</th>
                      <th className="pb-2.5">Sisa stok</th>
                      <th className="pb-2.5">Batas minimum</th>
                      <th className="pb-2.5">Lokasi rak</th>
                      <th className="pb-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rakta-border/40 text-rakta-navy">
                    {urgentProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-rakta-surface/60 transition-colors">
                        <td className="py-3 font-mono font-semibold tabular-nums">{p.sku}</td>
                        <td className="py-3 font-medium">{p.nama}</td>
                        <td className="py-3 text-rakta-muted">{p.kategori_nama}</td>
                        <td className="py-3 font-mono font-bold text-amber-600 tabular-nums">
                          {p.jumlah_stok} {p.unit}
                        </td>
                        <td className="py-3 font-mono text-rakta-muted tabular-nums">
                          {p.stok_minimum} {p.unit}
                        </td>
                        <td className="py-3 font-mono text-rakta-muted">{p.lokasi_rak || ":"}</td>
                        <td className="py-3">
                          <StockBadge status={hitungStatusStok(p.jumlah_stok, p.stok_minimum, p.stok_low)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 3. DATA FETCHING UNTUK ROLE STAFF GUDANG
  // ---------------------------------------------------------------------------
  if (role === "staff_gudang") {
    const [produkRes, criticalStockRes, todayTrxRes, inTransitRestockRes, inTransitListRes] =
      await Promise.all([
        query("SELECT COUNT(*)::int AS total FROM products"),
        query("SELECT COUNT(*)::int AS total FROM products WHERE jumlah_stok <= stok_minimum"),
        query("SELECT COUNT(*)::int AS total FROM transactions WHERE DATE(COALESCE(tanggal_transaksi, created_at)) = CURRENT_DATE"),
        query("SELECT COUNT(*)::int AS total FROM restock_orders WHERE status = 'in_transit'"),
        query(`
          SELECT r.id, r.nomor_po, r.tanggal_order, r.estimasi_tiba, r.status,
                 s.nama AS supplier_nama, s.nama_perusahaan, s.kontak,
                 (SELECT COUNT(*)::int FROM restock_items ri WHERE ri.restock_order_id = r.id) AS total_item,
                 (SELECT COALESCE(SUM(ri.qty), 0)::int FROM restock_items ri WHERE ri.restock_order_id = r.id) AS total_qty
          FROM restock_orders r
          JOIN users s ON r.supplier_id = s.id
          WHERE r.status = 'in_transit'
          ORDER BY r.estimasi_tiba ASC
          LIMIT 5
        `),
      ]);

    const totalJenisBarang = produkRes.rows[0]?.total || 0;
    const totalStokKritis = criticalStockRes.rows[0]?.total || 0;
    const trxHariIni = todayTrxRes.rows[0]?.total || 0;
    const totalInTransit = inTransitRestockRes.rows[0]?.total || 0;
    const inTransitList = inTransitListRes.rows || [];

    return (
      <div className="space-y-8">
        {/* Welcome Banner */}
        <div className="bg-white border border-rakta-border rounded-2xl p-6 rakta-card-shadow flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-rakta-navy tracking-tight">
              Dasbor Operasional Staff Gudang
            </h1>
            <p className="text-xs text-rakta-muted mt-1">
              Catat mutasi barang masuk/keluar harian dan verifikasi penerimaan fisik barang dari Supplier.
            </p>
          </div>
          <span className="text-xs font-mono text-rakta-muted bg-rakta-surface border border-rakta-border px-3 py-1.5 rounded-xl self-start sm:self-auto">
            {formatTanggal(new Date(), true)}
          </span>
        </div>

        {/* 4 Kartu Metrik Staff */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="flex flex-col justify-between">
            <div>
              <span className="text-xs font-medium text-rakta-muted">Total Jenis Barang</span>
              <div className="text-2xl font-bold text-rakta-navy font-mono tabular-nums mt-2">
                {totalJenisBarang} <span className="text-xs font-normal text-rakta-muted">SKU</span>
              </div>
            </div>
          </Card>

          <Card className="flex flex-col justify-between">
            <div>
              <span className="text-xs font-medium text-rakta-muted">Barang Stok Kritis</span>
              <div className="text-2xl font-bold text-rose-600 font-mono tabular-nums mt-2">
                {totalStokKritis} <span className="text-xs font-normal text-rakta-muted">SKU</span>
              </div>
            </div>
          </Card>

          <Card className="flex flex-col justify-between">
            <div>
              <span className="text-xs font-medium text-rakta-muted">Transaksi Hari Ini</span>
              <div className="text-2xl font-bold text-rakta-navy font-mono tabular-nums mt-2">
                {trxHariIni} <span className="text-xs font-normal text-rakta-muted">transaksi</span>
              </div>
            </div>
            <Link
              href="/transactions"
              className="inline-block text-[11px] text-rakta-primary font-semibold hover:underline mt-2 pt-2 border-t border-rakta-border/40"
            >
              Catat transaksi baru
            </Link>
          </Card>

          <Card className="flex flex-col justify-between">
            <div>
              <span className="text-xs font-medium text-rakta-muted">Barang Dalam Perjalanan</span>
              <div className="text-2xl font-bold text-sky-600 font-mono tabular-nums mt-2">
                {totalInTransit} <span className="text-xs font-normal text-rakta-muted">kiriman</span>
              </div>
            </div>
            <Link
              href="/transactions"
              className="inline-block text-[11px] text-rakta-primary font-semibold hover:underline mt-2 pt-2 border-t border-rakta-border/40"
            >
              Penerimaan fisik barang
            </Link>
          </Card>
        </div>

        {/* Tabel Tugas Penerimaan Barang Masuk dari Supplier */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Tugas Penerimaan Barang Masuk</CardTitle>
              <CardDescription>
                Daftar pengiriman Supplier yang sedang dalam perjalanan menuju gudang
              </CardDescription>
            </div>
            <Link href="/transactions" className="text-xs text-rakta-primary font-semibold hover:underline">
              Buka menu transaksi
            </Link>
          </CardHeader>
          <CardContent>
            {inTransitList.length === 0 ? (
              <div className="text-center py-8 text-xs text-rakta-muted">
                Tidak ada kiriman Supplier yang sedang dalam perjalanan saat ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-rakta-border text-rakta-muted font-medium">
                      <th className="pb-2.5">No. PO</th>
                      <th className="pb-2.5">Supplier / rekanan</th>
                      <th className="pb-2.5">Kontak</th>
                      <th className="pb-2.5">Estimasi tiba</th>
                      <th className="pb-2.5">Item &amp; total qty</th>
                      <th className="pb-2.5">Status pengiriman</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rakta-border/40 text-rakta-navy">
                    {inTransitList.map((po) => (
                      <tr key={po.id} className="hover:bg-rakta-surface/60 transition-colors">
                        <td className="py-3 font-mono font-semibold tabular-nums">{po.nomor_po}</td>
                        <td className="py-3 font-medium">
                          {po.nama_perusahaan || po.supplier_nama}
                        </td>
                        <td className="py-3 font-mono text-rakta-muted">{po.kontak || ":"}</td>
                        <td className="py-3 font-mono text-rakta-navy tabular-nums">
                          {formatTanggal(po.estimasi_tiba)}
                        </td>
                        <td className="py-3 font-mono tabular-nums">
                          {po.total_item} jenis ({po.total_qty} unit)
                        </td>
                        <td className="py-3">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" /> Sedang dikirim
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 4. DATA FETCHING UNTUK ROLE SUPPLIER
  // ---------------------------------------------------------------------------
  if (role === "supplier") {
    const supplierId = session.id;

    const [pendingRes, activeRes, finishedRes, myOrdersRes] = await Promise.all([
      query("SELECT COUNT(*)::int AS total FROM restock_orders WHERE supplier_id = $1 AND status = 'pending'", [supplierId]),
      query("SELECT COUNT(*)::int AS total FROM restock_orders WHERE supplier_id = $1 AND status IN ('confirmed', 'in_transit')", [supplierId]),
      query("SELECT COUNT(*)::int AS total FROM restock_orders WHERE supplier_id = $1 AND status = 'received'", [supplierId]),
      query(`
        SELECT r.id, r.nomor_po, r.tanggal_order, r.estimasi_tiba, r.status, r.catatan,
               (SELECT COUNT(*)::int FROM restock_items ri WHERE ri.restock_order_id = r.id) AS total_item,
               (SELECT COALESCE(SUM(ri.qty), 0)::int FROM restock_items ri WHERE ri.restock_order_id = r.id) AS total_qty
        FROM restock_orders r
        WHERE r.supplier_id = $1
        ORDER BY r.tanggal_order DESC
        LIMIT 5
      `, [supplierId]),
    ]);

    const totalPending = pendingRes.rows[0]?.total || 0;
    const totalActive = activeRes.rows[0]?.total || 0;
    const totalFinished = finishedRes.rows[0]?.total || 0;
    const myOrders = myOrdersRes.rows || [];

    const statusLabels = {
      pending: { label: "Menunggu Konfirmasi", style: "bg-amber-50 text-amber-800 border-amber-200" },
      confirmed: { label: "Sedang Diproses", style: "bg-rakta-bg/70 text-rakta-navy border-rakta-border" },
      in_transit: { label: "Dalam Pengiriman", style: "bg-sky-50 text-sky-700 border-sky-200" },
      received: { label: "Selesai Diterima", style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
      rejected: { label: "Ditolak", style: "bg-rose-50 text-rose-700 border-rose-200" },
    };

    return (
      <div className="space-y-8">
        {/* Welcome Banner */}
        <div className="bg-white border border-rakta-border rounded-2xl p-6 rakta-card-shadow flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-rakta-navy tracking-tight">
                Portal Rekanan Supplier: {session.nama_perusahaan || session.nama}
              </h1>
              <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
                Terverifikasi
              </span>
            </div>
            <p className="text-xs text-rakta-muted mt-1">
              Kelola pesanan pengadaan dari gudang RAKTA, perbarui status pengiriman, dan tinjau riwayat transaksi.
            </p>
          </div>
          <span className="text-xs font-mono text-rakta-muted bg-rakta-surface border border-rakta-border px-3 py-1.5 rounded-xl self-start sm:self-auto">
            {formatTanggal(new Date(), true)}
          </span>
        </div>

        {/* 3 Kartu Metrik Supplier */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="flex flex-col justify-between">
            <div>
              <span className="text-xs font-medium text-rakta-muted">Pesanan Baru (Menunggu Konfirmasi)</span>
              <div className="text-2xl font-bold text-amber-600 font-mono tabular-nums mt-2">
                {totalPending} <span className="text-xs font-normal text-rakta-muted">PO</span>
              </div>
            </div>
            <Link
              href="/restock"
              className="inline-block text-[11px] text-rakta-primary font-semibold hover:underline mt-2 pt-2 border-t border-rakta-border/40"
            >
              Konfirmasi pesanan
            </Link>
          </Card>

          <Card className="flex flex-col justify-between">
            <div>
              <span className="text-xs font-medium text-rakta-muted">Pengiriman Berjalan</span>
              <div className="text-2xl font-bold text-sky-600 font-mono tabular-nums mt-2">
                {totalActive} <span className="text-xs font-normal text-rakta-muted">PO aktif</span>
              </div>
            </div>
            <Link
              href="/restock"
              className="inline-block text-[11px] text-rakta-primary font-semibold hover:underline mt-2 pt-2 border-t border-rakta-border/40"
            >
              Input nomor resi
            </Link>
          </Card>

          <Card className="flex flex-col justify-between">
            <div>
              <span className="text-xs font-medium text-rakta-muted">Pengiriman Selesai</span>
              <div className="text-2xl font-bold text-emerald-600 font-mono tabular-nums mt-2">
                {totalFinished} <span className="text-xs font-normal text-rakta-muted">PO diterima</span>
              </div>
            </div>
            <Link
              href="/restock"
              className="inline-block text-[11px] text-rakta-primary font-semibold hover:underline mt-2 pt-2 border-t border-rakta-border/40"
            >
              Lihat riwayat pengiriman
            </Link>
          </Card>
        </div>

        {/* Tabel Pesanan Terbaru Khusus Supplier Terkait */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Daftar Pesanan Restock Terbaru</CardTitle>
              <CardDescription>Daftar purchase order resmi yang ditujukan ke perusahaan Anda</CardDescription>
            </div>
            <Link href="/restock" className="text-xs text-rakta-primary font-semibold hover:underline">
              Kelola pengiriman
            </Link>
          </CardHeader>
          <CardContent>
            {myOrders.length === 0 ? (
              <div className="text-center py-8 text-xs text-rakta-muted">
                Belum ada pesanan pengadaan barang yang diterbitkan untuk akun Anda.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-rakta-border text-rakta-muted font-medium">
                      <th className="pb-2.5">No. PO</th>
                      <th className="pb-2.5">Tanggal order</th>
                      <th className="pb-2.5">Estimasi tiba</th>
                      <th className="pb-2.5">Total barang</th>
                      <th className="pb-2.5">Status</th>
                      <th className="pb-2.5">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rakta-border/40 text-rakta-navy">
                    {myOrders.map((order) => {
                      const st = statusLabels[order.status] || {
                        label: order.status,
                        style: "bg-rakta-surface text-rakta-navy border-rakta-border",
                      };
                      return (
                        <tr key={order.id} className="hover:bg-rakta-surface/60 transition-colors">
                          <td className="py-3 font-mono font-semibold tabular-nums">{order.nomor_po}</td>
                          <td className="py-3 font-mono text-rakta-muted tabular-nums">
                            {formatTanggal(order.tanggal_order)}
                          </td>
                          <td className="py-3 font-mono text-rakta-navy tabular-nums">
                            {order.estimasi_tiba ? formatTanggal(order.estimasi_tiba) : ":"}
                          </td>
                          <td className="py-3 font-mono font-medium tabular-nums">
                            {order.total_item} jenis ({order.total_qty} unit)
                          </td>
                          <td className="py-3">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-medium border ${st.style}`}
                            >
                              {st.label}
                            </span>
                          </td>
                          <td className="py-3 text-rakta-muted italic">
                            {order.catatan || ":"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fallback default jika role tidak terdefinisi
  return (
    <div className="text-center py-12">
      <h2 className="text-lg font-bold text-rakta-navy">Sesi Tidak Dikenali</h2>
      <p className="text-xs text-rakta-muted mt-1">Peran akun Anda belum terkonfigurasi pada sistem RAKTA.</p>
    </div>
  );
}