import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import RestockManager from "@/components/restock/RestockManager";

export const metadata = {
  title: "Pesanan Pengadaan Restock (Purchase Order) | RAKTA",
  description: "Pengajuan PO ke supplier, pelacakan status pengiriman, dan konfirmasi barang tiba.",
};

export default async function RestockPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Jika akun supplier belum disetujui, arahkan ke pending
  if (session.role === "supplier" && session.status !== "approved") {
    redirect("/pending");
  }

  // Query pesanan restock (Supplier hanya melihat pesanannya sendiri)
  const isSupplier = session.role === "supplier";
  const ordersQuery = `
    SELECT 
      ro.id,
      ro.nomor_po,
      ro.supplier_id,
      u_sup.nama AS supplier_nama,
      u_sup.nama_perusahaan AS supplier_perusahaan,
      ro.tanggal_order,
      ro.estimasi_tiba,
      ro.status,
      ro.nomor_resi,
      ro.tracking_number,
      ro.rejection_reason,
      ro.catatan,
      ro.catatan_status,
      ro.foto_bukti_url,
      ro.laporan_pemeriksaan,
      ro.refund_status,
      ro.refund_note,
      COALESCE(ro.rating, ro.rating_supplier) AS rating,
      COALESCE(ro.review_note, ro.ulasan_supplier) AS review_note,
      EXISTS (
        SELECT 1 FROM transactions t 
        WHERE t.restock_order_id = ro.id 
          AND t.status IN ('approved', 'completed', 'shipped')
      ) AS incoming_approved,
      u_creator.nama AS dibuat_oleh_nama,
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
    JOIN users u_creator ON ro.dibuat_oleh = u_creator.id
    LEFT JOIN restock_items ri ON ro.id = ri.restock_order_id
    LEFT JOIN products p ON ri.product_id = p.id
    ${isSupplier ? "WHERE ro.supplier_id = $1" : ""}
    GROUP BY ro.id, u_sup.nama, u_sup.nama_perusahaan, u_creator.nama
    ORDER BY ro.tanggal_order DESC
  `;

  const ordersParams = isSupplier ? [session.id] : [];
  const ordersRes = await query(ordersQuery, ordersParams);

  // Ambil data referensi supplier yang sudah disetujui beserta rata-rata rating
  const suppliersRes = await query(
    `SELECT 
       u.id, 
       u.nama, 
       u.nama_perusahaan,
       ROUND(AVG(COALESCE(ro.rating, ro.rating_supplier))::numeric, 1) AS avg_rating,
       COUNT(COALESCE(ro.rating, ro.rating_supplier))::int AS total_reviews
     FROM users u
     LEFT JOIN restock_orders ro ON u.id = ro.supplier_id AND COALESCE(ro.rating, ro.rating_supplier) IS NOT NULL
     WHERE u.role = 'supplier' AND u.status = 'approved'
     GROUP BY u.id
     ORDER BY COALESCE(u.nama_perusahaan, u.nama) ASC`
  );

  // Ambil daftar produk untuk formulir pengajuan PO
  const productsRes = await query(
    "SELECT id, nama, sku, unit, jumlah_stok FROM products ORDER BY nama ASC"
  );

  const orders = ordersRes.rows;
  const suppliers = suppliersRes.rows;
  const products = productsRes.rows;

  // Kalkulasi 4 kartu metrik PO
  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const inTransitOrders = orders.filter((o) => o.status === "in_transit").length;
  const receivedOrders = orders.filter((o) => o.status === "received").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-rakta-border rounded-2xl p-6 rakta-card-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-rakta-primary tracking-wider uppercase">
            Pengadaan Barang
          </span>
          <h1 className="text-2xl font-bold text-rakta-navy tracking-tight mt-0.5">
            Pesanan Pengadaan Restock
          </h1>
          <p className="text-sm text-rakta-muted mt-1">
            Pengajuan Purchase Order ke supplier, pemantauan pengiriman ekspedisi, dan verifikasi barang tiba.
          </p>
        </div>
      </div>

      {/* 4 Kartu Metrik Analitik PO Restock */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metrik 1: Total Pengajuan PO */}
        <div className="bg-white border border-rakta-border rounded-2xl p-5 rakta-card-shadow flex flex-col justify-between">
          <p className="text-xs font-semibold text-rakta-muted">Total Pengajuan PO</p>
          <div className="mt-2">
            <h3 className="text-2xl font-bold font-mono tabular-nums text-rakta-navy">
              {totalOrders}
            </h3>
            <p className="text-xs text-rakta-muted mt-1">
              {isSupplier ? "Pesanan ke perusahaan Anda" : "Seluruh riwayat PO pengadaan"}
            </p>
          </div>
        </div>

        {/* Metrik 2: Menunggu Konfirmasi */}
        <div className="bg-white border border-rakta-border rounded-2xl p-5 rakta-card-shadow flex flex-col justify-between">
          <p className="text-xs font-semibold text-rakta-muted">Menunggu Konfirmasi</p>
          <div className="mt-2">
            <h3 className="text-2xl font-bold font-mono tabular-nums text-amber-700">
              {pendingOrders}
            </h3>
            <p className="text-xs text-rakta-muted mt-1">
              {isSupplier ? "Perlu ditinjau & disetujui" : "Menunggu respon supplier"}
            </p>
          </div>
        </div>

        {/* Metrik 3: Dalam Pengiriman */}
        <div className="bg-white border border-rakta-border rounded-2xl p-5 rakta-card-shadow flex flex-col justify-between">
          <p className="text-xs font-semibold text-rakta-muted">Dalam Pengiriman</p>
          <div className="mt-2">
            <h3 className="text-2xl font-bold font-mono tabular-nums text-purple-700">
              {inTransitOrders}
            </h3>
            <p className="text-xs text-rakta-muted mt-1">
              Sedang menuju lokasi gudang
            </p>
          </div>
        </div>

        {/* Metrik 4: Selesai Diterima */}
        <div className="bg-white border border-rakta-border rounded-2xl p-5 rakta-card-shadow flex flex-col justify-between">
          <p className="text-xs font-semibold text-rakta-muted">Selesai Diterima</p>
          <div className="mt-2">
            <h3 className="text-2xl font-bold font-mono tabular-nums text-emerald-700">
              {receivedOrders}
            </h3>
            <p className="text-xs text-rakta-muted mt-1">
              Stok telah masuk fisik gudang
            </p>
          </div>
        </div>
      </div>

      {/* Komponen Manajer Restock Multi-Peran */}
      <RestockManager
        orders={orders}
        suppliers={suppliers}
        products={products}
        userRole={session.role}
        userId={session.id}
      />
    </div>
  );
}