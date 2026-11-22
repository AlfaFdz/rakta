import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import TransactionManager from "@/components/transactions/TransactionManager";
import { ArrowLeftRight, ArrowDownLeft, ArrowUpRight, Truck } from "lucide-react";

export const metadata = {
  title: "Transaksi Mutasi Barang Masuk & Keluar | RAKTA",
  description:
    "Pencatatan pergerakan logistik barang, pengeluaran ke customer, dan penerimaan fisik dari supplier.",
};

export default async function TransactionsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Jika akun supplier belum disetujui, arahkan ke pending
  if (session.role === "supplier" && session.status !== "approved") {
    redirect("/pending");
  }

  const isSupplier = session.role === "supplier";

  // Query seluruh transaksi (khusus supplier hanya transaksi yang berkaitan)
  const transactionsQuery = `
    SELECT 
      t.id,
      t.nomor_transaksi,
      t.tipe,
      t.tanggal_transaksi,
      t.restock_order_id,
      ro.nomor_po AS restock_nomor_po,
      t.supplier_id,
      u_sup.nama AS supplier_nama,
      u_sup.nama_perusahaan AS supplier_perusahaan,
      t.tujuan_customer,
      t.status,
      t.catatan,
      u_op.nama AS operator_nama,
      COALESCE(
        json_agg(
          json_build_object(
            'product_id', ti.product_id,
            'product_nama', p.nama,
            'product_sku', p.sku,
            'unit', p.unit,
            'qty', ti.qty
          )
        ) FILTER (WHERE ti.id IS NOT NULL),
        '[]'
      ) AS items
    FROM transactions t
    LEFT JOIN restock_orders ro ON t.restock_order_id = ro.id
    LEFT JOIN users u_sup ON t.supplier_id = u_sup.id
    LEFT JOIN users u_op ON t.dibuat_oleh = u_op.id
    LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
    LEFT JOIN products p ON ti.product_id = p.id
    ${isSupplier ? "WHERE t.supplier_id = $1" : ""}
    GROUP BY t.id, ro.nomor_po, u_sup.nama, u_sup.nama_perusahaan, u_op.nama
    ORDER BY t.tanggal_transaksi DESC
  `;

  const transactionsParams = isSupplier ? [session.id] : [];
  const transactionsRes = await query(transactionsQuery, transactionsParams);

  // Query pesanan restock yang berstatus 'in_transit' untuk tugas penerimaan barang staff gudang
  let inTransitOrders = [];
  if (session.role === "staff_gudang" || session.role === "admin") {
    const inTransitRes = await query(
      `SELECT 
        ro.id,
        ro.nomor_po,
        ro.supplier_id,
        u_sup.nama AS supplier_nama,
        u_sup.nama_perusahaan AS supplier_perusahaan,
        ro.nomor_resi,
        ro.catatan_status,
        ro.tanggal_order,
        COALESCE(
          json_agg(
            json_build_object(
              'product_id', ri.product_id,
              'product_nama', p.nama,
              'product_sku', p.sku,
              'unit', p.unit,
              'qty', ri.qty
            )
          ) FILTER (WHERE ri.id IS NOT NULL),
          '[]'
        ) AS items
      FROM restock_orders ro
      JOIN users u_sup ON ro.supplier_id = u_sup.id
      LEFT JOIN restock_items ri ON ro.id = ri.restock_order_id
      LEFT JOIN products p ON ri.product_id = p.id
      WHERE ro.status = 'in_transit'
      GROUP BY ro.id, u_sup.nama, u_sup.nama_perusahaan
      ORDER BY ro.tanggal_order DESC`
    );
    inTransitOrders = inTransitRes.rows;
  }

  // Ambil daftar produk untuk form input mutasi
  const productsRes = await query(
    "SELECT id, nama, sku, unit, jumlah_stok, lokasi_rak FROM products ORDER BY nama ASC"
  );

  // Ambil daftar supplier rekanan terverifikasi
  const suppliersRes = await query(
    "SELECT id, nama, nama_perusahaan FROM users WHERE role = 'supplier' AND status = 'approved' ORDER BY COALESCE(nama_perusahaan, nama) ASC"
  );

  const transactions = transactionsRes.rows;
  const products = productsRes.rows;
  const suppliers = suppliersRes.rows;

  // Kalkulasi 4 kartu metrik mutasi
  const totalMutasi = transactions.length;
  const totalMasuk = transactions.filter((t) => t.tipe === "masuk").length;
  const totalKeluar = transactions.filter((t) => t.tipe === "keluar").length;
  const totalInTransit = inTransitOrders.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-rakta-card border border-rakta-subtle/70 rounded-2xl p-6 rakta-card-shadow flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-rakta-navy">
            Transaksi Mutasi Barang Masuk &amp; Keluar
          </h1>
          <p className="text-xs text-rakta-muted mt-1">
            Pencatatan pergerakan logistik barang, pengeluaran ke customer, dan penerimaan fisik dari supplier.
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-rakta-bg flex items-center justify-center text-rakta-primary">
          <ArrowLeftRight className="w-5 h-5" />
        </div>
      </div>

      {/* 4 Kartu Metrik Analitik Transaksi */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metrik 1: Total Mutasi */}
        <div className="bg-rakta-card border border-rakta-subtle/70 rounded-2xl p-5 rakta-card-shadow flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-rakta-muted">Total Mutasi Tercatat</p>
            <h3 className="text-2xl font-bold text-rakta-navy mt-1">{totalMutasi}</h3>
            <p className="text-[11px] text-rakta-muted mt-0.5">
              {isSupplier ? "Riwayat barang terkirim" : "Log mutasi inventaris"}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rakta-surface border border-rakta-subtle flex items-center justify-center text-rakta-primary shrink-0">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
        </div>

        {/* Metrik 2: Barang Masuk */}
        <div className="bg-rakta-card border border-rakta-subtle/70 rounded-2xl p-5 rakta-card-shadow flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-rakta-muted">Barang Masuk</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{totalMasuk}</h3>
            <p className="text-[11px] text-rakta-muted mt-0.5">Penerimaan PO &amp; non-PO</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shrink-0">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        {/* Metrik 3: Barang Keluar */}
        <div className="bg-rakta-card border border-rakta-subtle/70 rounded-2xl p-5 rakta-card-shadow flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-rakta-muted">Barang Keluar</p>
            <h3 className="text-2xl font-bold text-rose-600 mt-1">{totalKeluar}</h3>
            <p className="text-[11px] text-rakta-muted mt-0.5">Distribusi ke customer</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-600 shrink-0">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        {/* Metrik 4: Menunggu Penerimaan (In Transit) */}
        <div className="bg-rakta-card border border-rakta-subtle/70 rounded-2xl p-5 rakta-card-shadow flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-rakta-muted">Menunggu Penerimaan</p>
            <h3 className="text-2xl font-bold text-purple-600 mt-1">{totalInTransit}</h3>
            <p className="text-[11px] text-rakta-muted mt-0.5">Kiriman restock di jalan</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-200/80 flex items-center justify-center text-purple-600 shrink-0">
            <Truck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Komponen Manajer Transaksi Multi-Peran */}
      <TransactionManager
        transactions={transactions}
        inTransitOrders={inTransitOrders}
        products={products}
        suppliers={suppliers}
        userRole={session.role}
      />
    </div>
  );
}