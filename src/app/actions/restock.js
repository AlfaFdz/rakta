"use server";

import { pool, query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// Server Action untuk membuat pengajuan pesanan Restock (PO) baru
// Hak akses: warehouse_manager & admin
export async function createRestockOrderAction(prevState, formData) {
  const session = await getSession();

  if (!session || (session.role !== "warehouse_manager" && session.role !== "admin")) {
    return {
      error: "Akses ditolak. Hanya Warehouse Manager dan Administrator yang dapat membuat pesanan restock.",
    };
  }

  const supplierId = parseInt(formData.get("supplier_id"), 10);
  const productId = parseInt(formData.get("product_id"), 10);
  const qty = parseInt(formData.get("qty"), 10);
  const estimasiTiba = formData.get("estimasi_tiba")?.toString().trim() || null;
  const catatan = formData.get("catatan")?.toString().trim() || null;

  if (isNaN(supplierId) || isNaN(productId) || isNaN(qty) || qty <= 0) {
    return { error: "Supplier, produk, dan jumlah pesanan (minimal 1) wajib diisi." };
  }

  // Verifikasi bahwa supplier terdaftar dan berstatus 'approved'
  const supplierCheck = await query(
    "SELECT id, nama, nama_perusahaan FROM users WHERE id = $1 AND role = 'supplier' AND status = 'approved'",
    [supplierId]
  );

  if (supplierCheck.rows.length === 0) {
    return { error: "Supplier tidak valid atau akun supplier belum disetujui." };
  }

  // Verifikasi bahwa produk terdaftar
  const productCheck = await query("SELECT id, nama, unit FROM products WHERE id = $1", [productId]);
  if (productCheck.rows.length === 0) {
    return { error: "Produk yang dipilih tidak ditemukan dalam katalog." };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Format nomor PO otomatis: PO-YYYYMMDD-XXXX
    const tgl = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const nomorPo = `PO-${tgl}-${randomDigits}`;

    const orderRes = await client.query(
      `INSERT INTO restock_orders (
        nomor_po, supplier_id, estimasi_tiba, status, catatan, dibuat_oleh
      ) VALUES ($1, $2, $3, 'pending', $4, $5) RETURNING id`,
      [nomorPo, supplierId, estimasiTiba, catatan, session.id]
    );

    const orderId = orderRes.rows[0].id;

    await client.query(
      `INSERT INTO restock_items (restock_order_id, product_id, qty)
       VALUES ($1, $2, $3)`,
      [orderId, productId, qty]
    );

    await client.query("COMMIT");

    revalidatePath("/restock");
    revalidatePath("/dashboard");
    revalidatePath("/transactions");

    return {
      success: true,
      message: `Pengajuan pesanan restock ${nomorPo} (${qty} ${productCheck.rows[0].unit} ${productCheck.rows[0].nama}) berhasil dibuat dan dikirim ke supplier.`,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Kesalahan createRestockOrderAction:", err);
    return { error: "Gagal memproses pengajuan restock. Silakan periksa kembali data Anda." };
  } finally {
    client.release();
  }
}

// Server Action untuk membatalkan pesanan restock yang masih 'pending'
// Hak akses: warehouse_manager & admin
export async function cancelRestockOrderAction(orderId) {
  const session = await getSession();

  if (!session || (session.role !== "warehouse_manager" && session.role !== "admin")) {
    return {
      success: false,
      error: "Akses ditolak. Anda tidak memiliki izin membatalkan pesanan restock.",
    };
  }

  const id = parseInt(orderId, 10);
  if (isNaN(id)) {
    return { success: false, error: "ID pesanan tidak valid." };
  }

  try {
    const res = await query(
      `UPDATE restock_orders 
       SET status = 'rejected', 
           catatan_status = 'Pesanan dibatalkan oleh ' || $1
       WHERE id = $2 AND status = 'pending'
       RETURNING nomor_po`,
      [session.nama || "Warehouse Manager", id]
    );

    if (res.rows.length === 0) {
      return {
        success: false,
        error: "Pesanan tidak dapat dibatalkan (mungkin sudah dikonfirmasi atau telah diproses).",
      };
    }

    revalidatePath("/restock");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: `Pesanan ${res.rows[0].nomor_po} berhasil dibatalkan.`,
    };
  } catch (err) {
    console.error("Kesalahan cancelRestockOrderAction:", err);
    return { success: false, error: "Gagal membatalkan pesanan restock." };
  }
}

// Server Action bagi Supplier untuk mengonfirmasi pesanan (pending -> confirmed)
// Hak akses: supplier pemilik pesanan
export async function confirmRestockOrderAction(orderId) {
  const session = await getSession();

  if (!session || session.role !== "supplier") {
    return {
      success: false,
      error: "Akses ditolak. Hanya Mitra Supplier yang dapat mengonfirmasi pesanan pengadaan.",
    };
  }

  const id = parseInt(orderId, 10);
  if (isNaN(id)) {
    return { success: false, error: "ID pesanan tidak valid." };
  }

  try {
    const res = await query(
      `UPDATE restock_orders
       SET status = 'confirmed',
           catatan_status = 'Pesanan telah disetujui & sedang disiapkan oleh supplier'
       WHERE id = $1 AND supplier_id = $2 AND status = 'pending'
       RETURNING nomor_po`,
      [id, session.id]
    );

    if (res.rows.length === 0) {
      return {
        success: false,
        error: "Pesanan tidak ditemukan atau status pesanan sudah tidak dalam tahap menunggu konfirmasi.",
      };
    }

    revalidatePath("/restock");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: `Pesanan ${res.rows[0].nomor_po} berhasil dikonfirmasi. Silakan siapkan dan proses pengiriman barang.`,
    };
  } catch (err) {
    console.error("Kesalahan confirmRestockOrderAction:", err);
    return { success: false, error: "Gagal mengonfirmasi pesanan restock." };
  }
}

// Server Action bagi Supplier untuk menolak pesanan (pending -> rejected)
// Hak akses: supplier pemilik pesanan
export async function rejectRestockOrderAction(prevState, formData) {
  const session = await getSession();

  if (!session || session.role !== "supplier") {
    return {
      error: "Akses ditolak. Hanya Mitra Supplier yang dapat menolak pesanan.",
    };
  }

  const orderId = parseInt(formData.get("order_id"), 10);
  const alasan = formData.get("alasan")?.toString().trim();

  if (isNaN(orderId) || !alasan) {
    return { error: "Alasan penolakan pesanan wajib diisi." };
  }

  try {
    const res = await query(
      `UPDATE restock_orders
       SET status = 'rejected',
           catatan_status = 'Ditolak Supplier: ' || $1
       WHERE id = $2 AND supplier_id = $3 AND status = 'pending'
       RETURNING nomor_po`,
      [alasan, orderId, session.id]
    );

    if (res.rows.length === 0) {
      return {
        error: "Pesanan tidak dapat ditolak karena bukan ditujukan ke akun Anda atau status sudah berubah.",
      };
    }

    revalidatePath("/restock");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: `Pesanan ${res.rows[0].nomor_po} berhasil ditolak dengan alasan: "${alasan}".`,
    };
  } catch (err) {
    console.error("Kesalahan rejectRestockOrderAction:", err);
    return { error: "Gagal menolak pesanan restock." };
  }
}

// Server Action bagi Supplier untuk memproses & mengirim barang (confirmed -> in_transit)
// Hak akses: supplier pemilik pesanan
export async function shipRestockOrderAction(prevState, formData) {
  const session = await getSession();

  if (!session || session.role !== "supplier") {
    return {
      error: "Akses ditolak. Hanya Mitra Supplier yang dapat memproses pengiriman.",
    };
  }

  const orderId = parseInt(formData.get("order_id"), 10);
  const nomorResi = formData.get("nomor_resi")?.toString().trim() || null;
  const catatanPengiriman = formData.get("catatan_pengiriman")?.toString().trim() || null;

  if (isNaN(orderId)) {
    return { error: "ID pesanan tidak valid." };
  }

  try {
    const statusNote = `Barang sedang dikirim${nomorResi ? ` (Resi: ${nomorResi})` : ""}${
      catatanPengiriman ? ` - ${catatanPengiriman}` : ""
    }`;

    const res = await query(
      `UPDATE restock_orders
       SET status = 'in_transit',
           nomor_resi = $1,
           catatan_status = $2
       WHERE id = $3 AND supplier_id = $4 AND status = 'confirmed'
       RETURNING nomor_po`,
      [nomorResi, statusNote, orderId, session.id]
    );

    if (res.rows.length === 0) {
      return {
        error: "Pesanan belum dikonfirmasi atau bukan ditujukan kepada akun Anda.",
      };
    }

    revalidatePath("/restock");
    revalidatePath("/transactions");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: `Pesanan ${res.rows[0].nomor_po} kini dalam proses pengiriman (In Transit). Staff gudang telah menerima pemberitahuan untuk penerimaan barang.`,
    };
  } catch (err) {
    console.error("Kesalahan shipRestockOrderAction:", err);
    return { error: "Gagal memperbarui status pengiriman barang." };
  }
}
