import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import RestockManager from "@/components/restock/RestockManager";
import { Truck, Clock, CheckCircle2, AlertCircle, PackageCheck } from "lucide-react";

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

  // Ambil data referensi supplier yang sudah disetujui
  const suppliersRes = await query(
    "SELECT id, nama, nama_perusahaan FROM users WHERE role = 'supplier' AND status = 'approved' ORDER BY COALESCE(nama_perusahaan, nama) ASC"
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
      <div className="bg-rakta-card border border-rakta-subtle/70 rounded-2xl p-6 rakta-card-shadow flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-rakta-navy">
            Pesanan Pengadaan Restock (Purchase Order)
          </h1>
          <p className="text-xs text-rakta-muted mt-1">
            Pengajuan PO ke supplier, pelacakan status pengiriman, dan konfirmasi barang tiba.
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-rakta-bg flex items-center justify-center text-rakta-primary">
          <Truck className="w-5 h-5" />
        </div>
      </div>

      {/* 4 Kartu Metrik Analitik PO Restock */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metrik 1: Total Pengajuan PO */}
        <div className="bg-rakta-card border border-rakta-subtle/70 rounded-2xl p-5 rakta-card-shadow flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-rakta-muted">Total Pengajuan PO</p>
            <h3 className="text-2xl font-bold text-rakta-navy mt-1">{totalOrders}</h3>
            <p className="text-[11px] text-rakta-muted mt-0.5">
              {isSupplier ? "Pesanan ke perusahaan Anda" : "Seluruh riwayat PO pengadaan"}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rakta-surface border border-rakta-subtle flex items-center justify-center text-rakta-primary shrink-0">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        {/* Metrik 2: Menunggu Konfirmasi */}
        <div className="bg-rakta-card border border-rakta-subtle/70 rounded-2xl p-5 rakta-card-shadow flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-rakta-muted">Menunggu Konfirmasi</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{pendingOrders}</h3>
            <p className="text-[11px] text-rakta-muted mt-0.5">
              {isSupplier ? "Perlu ditinjau & disetujui" : "Menunggu respon supplier"}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Metrik 3: Dalam Pengiriman */}
        <div className="bg-rakta-card border border-rakta-subtle/70 rounded-2xl p-5 rakta-card-shadow flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-rakta-muted">Dalam Pengiriman</p>
            <h3 className="text-2xl font-bold text-purple-600 mt-1">{inTransitOrders}</h3>
            <p className="text-[11px] text-rakta-muted mt-0.5">Sedang menuju ke gudang</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-200/80 flex items-center justify-center text-purple-600 shrink-0">
            <PackageCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Metrik 4: Selesai Diterima */}
        <div className="bg-rakta-card border border-rakta-subtle/70 rounded-2xl p-5 rakta-card-shadow flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-rakta-muted">Selesai Diterima</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{receivedOrders}</h3>
            <p className="text-[11px] text-rakta-muted mt-0.5">Stok telah masuk fisik gudang</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
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