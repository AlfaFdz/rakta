import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import TransactionManager from "@/components/transactions/TransactionManager";
import { ArrowLeftRight, ArrowDownLeft, ArrowUpRight, Clock, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "Transaksi Mutasi Barang Masuk & Keluar | RAKTA",
  description:
    "Pencatatan pergerakan logistik barang, alur masuk 2 tahap (penerimaan & persetujuan), dan alur keluar 2 tahap (persetujuan & pengiriman).",
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

  // Query seluruh transaksi dengan join produk dan pengguna
  const transactionsQuery = `
    SELECT 
      t.id,
      t.nomor_transaksi,
      COALESCE(t.tipe, t.type) AS tipe,
      COALESCE(t.type, t.tipe) AS type,
      COALESCE(t.tanggal_transaksi, t.created_at) AS tanggal_transaksi,
      t.created_at,
      t.updated_at,
      t.restock_order_id,
      ro.nomor_po AS restock_nomor_po,
      COALESCE(t.supplier_id, ro.supplier_id) AS supplier_id,
      u_sup.nama AS supplier_nama,
      u_sup.nama_perusahaan AS supplier_perusahaan,
      t.tujuan_customer,
      t.status,
      COALESCE(t.catatan, t.notes) AS catatan,
      COALESCE(t.notes, t.catatan) AS notes,
      COALESCE(t.rejection_reason, t.alasan_penolakan) AS rejection_reason,
      u_op.nama AS operator_nama,
      u_app.nama AS approver_nama,
      t.product_id,
      p.nama AS single_product_nama,
      p.sku AS single_product_sku,
      p.unit AS single_unit,
      t.quantity,
      COALESCE(
        json_agg(
          json_build_object(
            'product_id', COALESCE(ti.product_id, t.product_id),
            'product_nama', COALESCE(p_item.nama, p.nama),
            'product_sku', COALESCE(p_item.sku, p.sku),
            'unit', COALESCE(p_item.unit, p.unit),
            'qty', COALESCE(ti.qty, t.quantity)
          )
        ) FILTER (WHERE ti.id IS NOT NULL OR t.product_id IS NOT NULL),
        '[]'
      ) AS items
    FROM transactions t
    LEFT JOIN restock_orders ro ON t.restock_order_id = ro.id
    LEFT JOIN users u_sup ON COALESCE(t.supplier_id, ro.supplier_id) = u_sup.id
    LEFT JOIN users u_op ON COALESCE(t.dibuat_oleh, t.created_by) = u_op.id
    LEFT JOIN users u_app ON COALESCE(t.disetujui_oleh, t.approved_by) = u_app.id
    LEFT JOIN products p ON t.product_id = p.id
    LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
    LEFT JOIN products p_item ON ti.product_id = p_item.id
    ${isSupplier ? "WHERE (t.supplier_id = $1 OR ro.supplier_id = $1)" : ""}
    GROUP BY t.id, ro.nomor_po, u_sup.nama, u_sup.nama_perusahaan, u_op.nama, u_app.nama, p.nama, p.sku, p.unit, ro.supplier_id
    ORDER BY COALESCE(t.tanggal_transaksi, t.created_at) DESC
  `;

  const transactionsParams = isSupplier ? [session.id] : [];
  const transactionsRes = await query(transactionsQuery, transactionsParams);

  // Query pesanan restock yang berstatus 'inspecting' (atau 'received') yang siap diperiksa fisik
  // dan dibuatkan dokumen transaksi masuk oleh staff gudang
  let receivedOrders = [];
  if (session.role === "staff_gudang" || session.role === "admin" || session.role === "warehouse_manager") {
    const receivedRes = await query(
      `SELECT 
        ro.id,
        ro.nomor_po,
        ro.supplier_id,
        u_sup.nama AS supplier_nama,
        u_sup.nama_perusahaan AS supplier_perusahaan,
        ro.nomor_resi,
        ro.tracking_number,
        ro.catatan_status,
        ro.tanggal_order,
        ro.foto_bukti_url,
        ro.status,
        ri.product_id,
        ri.qty,
        p.nama AS product_nama,
        p.sku AS product_sku,
        p.unit
      FROM restock_orders ro
      JOIN users u_sup ON ro.supplier_id = u_sup.id
      JOIN restock_items ri ON ro.id = ri.restock_order_id
      JOIN products p ON ri.product_id = p.id
      WHERE (ro.status = 'inspecting' OR ro.status = 'received')
        AND NOT EXISTS (
          SELECT 1 FROM transactions t 
          WHERE t.restock_order_id = ro.id 
            AND t.status != 'rejected'
        )
      ORDER BY ro.tanggal_order DESC`
    );
    receivedOrders = receivedRes.rows;
  }

  // Ambil daftar produk untuk formulir pengajuan barang keluar
  const productsRes = await query(
    "SELECT id, nama, sku, unit, jumlah_stok, lokasi_rak FROM products ORDER BY nama ASC"
  );

  const transactions = transactionsRes.rows;
  const products = productsRes.rows;

  // Kalkulasi 4 kartu metrik transaksi
  const totalMutasi = transactions.length;
  const totalMasuk = transactions.filter((t) => t.type === "incoming" || t.tipe === "masuk").length;
  const totalKeluar = transactions.filter((t) => t.type === "outgoing" || t.tipe === "keluar").length;
  const totalPending = transactions.filter((t) => t.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-rakta-card border border-rakta-subtle/70 rounded-2xl p-6 rakta-card-shadow flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-rakta-navy">
            Transaksi Mutasi Barang Masuk &amp; Keluar
          </h1>
          <p className="text-xs text-rakta-muted mt-1">
            Alur logistik 2 tahap: penerimaan PO &amp; persetujuan masuk, serta pengajuan &amp; eksekusi pengiriman barang keluar.
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
            <p className="text-xs font-semibold text-rakta-muted">Total Transaksi</p>
            <h3 className="text-2xl font-bold text-rakta-navy mt-1">{totalMutasi}</h3>
            <p className="text-[11px] text-rakta-muted mt-0.5">
              {isSupplier ? "Riwayat barang terkirim" : "Log seluruh mutasi inventaris"}
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
            <p className="text-[11px] text-rakta-muted mt-0.5">Penerimaan restock gudang</p>
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
            <p className="text-[11px] text-rakta-muted mt-0.5">Distribusi pengiriman customer</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-600 shrink-0">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        {/* Metrik 4: Menunggu Persetujuan (Pending) */}
        <div className="bg-rakta-card border border-rakta-subtle/70 rounded-2xl p-5 rakta-card-shadow flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-rakta-muted">Menunggu Persetujuan</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{totalPending}</h3>
            <p className="text-[11px] text-rakta-muted mt-0.5">Perlu tinjauan Manager</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Komponen Manajer Transaksi Multi-Peran */}
      <TransactionManager
        transactions={transactions}
        receivedOrders={receivedOrders}
        products={products}
        userRole={session.role}
        userId={session.id}
      />
    </div>
  );
}