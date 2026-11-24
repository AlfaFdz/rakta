import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import TransactionManager from "@/components/transactions/TransactionManager";

export const metadata = {
  title: "Transaksi Mutasi Barang Masuk dan Keluar | RAKTA",
  description:
    "Pencatatan pergerakan logistik barang, alur masuk 2 tahap (penerimaan dan persetujuan), dan alur keluar 2 tahap (persetujuan dan pengiriman).",
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
      <div className="bg-white border border-rakta-border rounded-2xl p-6 rakta-card-shadow flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-rakta-navy tracking-tight">
            Transaksi Mutasi Barang Masuk dan Keluar
          </h1>
          <p className="text-xs text-rakta-muted mt-1">
            Alur logistik 2 tahap: penerimaan PO dan persetujuan masuk, serta pengajuan dan eksekusi pengiriman barang keluar.
          </p>
        </div>
        <span className="text-xs font-mono font-medium text-rakta-navy bg-rakta-bg/70 border border-rakta-border px-3 py-1.5 rounded-xl self-start sm:self-auto">
          Mutasi Fisik
        </span>
      </div>

      {/* 4 Kartu Metrik Analitik Transaksi */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 flex flex-col justify-between">
          <span className="text-xs font-medium text-rakta-muted">Total Transaksi</span>
          <div className="text-2xl font-bold text-rakta-navy font-mono tabular-nums mt-2">
            {totalMutasi}
          </div>
        </Card>

        <Card className="p-5 flex flex-col justify-between">
          <span className="text-xs font-medium text-rakta-muted">Barang Masuk</span>
          <div className="text-2xl font-bold text-emerald-700 font-mono tabular-nums mt-2">
            {totalMasuk}
          </div>
        </Card>

        <Card className="p-5 flex flex-col justify-between">
          <span className="text-xs font-medium text-rakta-muted">Barang Keluar</span>
          <div className="text-2xl font-bold text-rakta-navy font-mono tabular-nums mt-2">
            {totalKeluar}
          </div>
        </Card>

        <Card className="p-5 flex flex-col justify-between">
          <span className="text-xs font-medium text-rakta-muted">Menunggu Persetujuan</span>
          <div className="text-2xl font-bold text-amber-600 font-mono tabular-nums mt-2">
            {totalPending}
          </div>
        </Card>
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