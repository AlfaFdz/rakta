"use server";

import { pool, query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ALUR BARANG MASUK

// 1. Staff Gudang membuat dokumen Incoming Transaction berdasarkan PO berstatus 'received'
// Hak akses: staff_gudang & admin
// CATATAN: Status awal 'pending', stok fisik BELUM bertambah
export async function createIncomingFromRestockAction(orderId, catatanInput) {
  const session = await getSession();

  if (!session || (session.role !== "staff_gudang" && session.role !== "admin")) {
    return {
      success: false,
      error: "Akses ditolak. Hanya Staff Gudang dan Administrator yang dapat membuat dokumen barang masuk.",
    };
  }

  const id = parseInt(orderId, 10);
  if (isNaN(id)) {
    return { success: false, error: "ID pesanan restock tidak valid." };
  }

  try {
    // Periksa status pesanan restock
    const orderRes = await query(
      `SELECT ro.id, ro.nomor_po, ro.supplier_id, ro.status,
              ri.product_id, ri.qty, p.nama AS product_nama, p.unit
       FROM restock_orders ro
       JOIN restock_items ri ON ro.id = ri.restock_order_id
       JOIN products p ON ri.product_id = p.id
       WHERE ro.id = $1`,
      [id]
    );

    if (orderRes.rows.length === 0) {
      return { success: false, error: "Pesanan restock tidak ditemukan atau rincian item kosong." };
    }

    const order = orderRes.rows[0];

    if (order.status !== "received") {
      return {
        success: false,
        error: `Pesanan ${order.nomor_po} belum ditandai tiba di gudang (status saat ini: ${order.status}). Tunggu Warehouse Manager menandai barang tiba terlebih dahulu.`,
      };
    }

    // Cek apakah sudah pernah dibuatkan transaksi masuk untuk PO ini yang berstatus pending/approved/completed
    const existingTrx = await query(
      `SELECT id, nomor_transaksi, status FROM transactions 
       WHERE restock_order_id = $1 AND status IN ('pending', 'approved', 'completed')`,
      [id]
    );

    if (existingTrx.rows.length > 0) {
      return {
        success: false,
        error: `Dokumen penerimaan untuk pesanan ${order.nomor_po} sudah pernah dibuat (${existingTrx.rows[0].nomor_transaksi}, status: ${existingTrx.rows[0].status}).`,
      };
    }

    const kodeUnik = Date.now().toString().slice(-6);
    const nomorTrx = `TRX-IN-${kodeUnik}`;
    const catatanLengkap = `Penerimaan PO: ${order.nomor_po}${catatanInput ? ` | ${catatanInput}` : ""}`;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Catat ke tabel transactions (status: pending)
      const trxRes = await client.query(
        `INSERT INTO transactions (
          nomor_transaksi, product_id, restock_order_id, supplier_id,
          tipe, type, quantity, status, catatan, notes, dibuat_oleh, created_by
        ) VALUES ($1, $2, $3, $4, 'masuk', 'incoming', $5, 'pending', $6, $6, $7, $7)
        RETURNING id`,
        [nomorTrx, order.product_id, order.id, order.supplier_id, order.qty, catatanLengkap, session.id]
      );

      const trxId = trxRes.rows[0].id;

      // Masukkan ke transaction_items untuk kompatibilitas
      await client.query(
        "INSERT INTO transaction_items (transaction_id, product_id, qty) VALUES ($1, $2, $3)",
        [trxId, order.product_id, order.qty]
      );

      await client.query("COMMIT");

      revalidatePath("/transactions");
      revalidatePath("/restock");
      revalidatePath("/dashboard");

      return {
        success: true,
        message: `Dokumen barang masuk ${nomorTrx} untuk PO ${order.nomor_po} (${order.qty} ${order.unit} ${order.product_nama}) berhasil diajukan dengan status Pending. Menunggu persetujuan Warehouse Manager.`,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Kesalahan createIncomingFromRestockAction:", err);
    return { success: false, error: "Gagal membuat dokumen transaksi penerimaan barang masuk." };
  }
}

// 2. Warehouse Manager menyetujui Incoming Transaction
// Hak akses: warehouse_manager & admin
// TRANSAKSI SQL ATOMIK: Stok produk bertambah (stock = stock + qty) tepat saat Approve
export async function approveIncomingTransactionAction(transactionId) {
  const session = await getSession();

  if (!session || (session.role !== "warehouse_manager" && session.role !== "admin")) {
    return {
      success: false,
      error: "Akses ditolak. Hanya Warehouse Manager dan Administrator yang dapat menyetujui transaksi barang masuk.",
    };
  }

  const id = parseInt(transactionId, 10);
  if (isNaN(id)) {
    return { success: false, error: "ID transaksi tidak valid." };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Kunci baris transaksi dan verifikasi status
    const trxCheck = await client.query(
      `SELECT t.id, t.nomor_transaksi, t.product_id, t.quantity, t.status, t.type, t.tipe,
              p.nama AS product_nama, p.unit
       FROM transactions t
       JOIN products p ON t.product_id = p.id
       WHERE t.id = $1 FOR UPDATE`,
      [id]
    );

    if (trxCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return { success: false, error: "Transaksi tidak ditemukan." };
    }

    const trx = trxCheck.rows[0];

    if (trx.status !== "pending") {
      await client.query("ROLLBACK");
      return {
        success: false,
        error: `Transaksi ${trx.nomor_transaksi} tidak dapat disetujui karena status saat ini adalah ${trx.status}.`,
      };
    }

    if (trx.type !== "incoming" && trx.tipe !== "masuk") {
      await client.query("ROLLBACK");
      return { success: false, error: "Jenis transaksi ini bukan barang masuk." };
    }

    // 2. Kunci baris produk
    const prodCheck = await client.query(
      "SELECT id, jumlah_stok FROM products WHERE id = $1 FOR UPDATE",
      [trx.product_id]
    );

    if (prodCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return { success: false, error: "Data produk tidak ditemukan dalam katalog." };
    }

    // 3. Tambah jumlah_stok produk secara atomik
    await client.query(
      "UPDATE products SET jumlah_stok = jumlah_stok + $1, updated_at = NOW() WHERE id = $2",
      [trx.quantity, trx.product_id]
    );

    // 4. Perbarui status transaksi menjadi 'approved'
    await client.query(
      `UPDATE transactions 
       SET status = 'approved',
           approved_by = $1,
           disetujui_oleh = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [session.id, id]
    );

    await client.query("COMMIT");

    revalidatePath("/transactions");
    revalidatePath("/products");
    revalidatePath("/restock");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: `Transaksi masuk ${trx.nomor_transaksi} disetujui. Stok "${trx.product_nama}" otomatis bertambah +${trx.quantity} ${trx.unit}.`,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Kesalahan approveIncomingTransactionAction:", err);
    return { success: false, error: "Gagal memproses persetujuan barang masuk." };
  } finally {
    client.release();
  }
}

// 3. Warehouse Manager menolak Incoming Transaction
// Hak akses: warehouse_manager & admin
export async function rejectIncomingTransactionAction(transactionId, reason) {
  const session = await getSession();

  if (!session || (session.role !== "warehouse_manager" && session.role !== "admin")) {
    return {
      success: false,
      error: "Akses ditolak. Hanya Warehouse Manager dan Administrator yang dapat menolak transaksi.",
    };
  }

  const id = parseInt(transactionId, 10);
  const alasan = reason?.toString().trim();

  if (isNaN(id) || !alasan) {
    return { success: false, error: "Alasan penolakan transaksi barang masuk wajib diisi." };
  }

  try {
    const res = await query(
      `UPDATE transactions
       SET status = 'rejected',
           rejection_reason = $1,
           alasan_penolakan = $1,
           approved_by = $2,
           disetujui_oleh = $2,
           updated_at = NOW()
       WHERE id = $3 AND status = 'pending' AND (type = 'incoming' OR tipe = 'masuk')
       RETURNING nomor_transaksi`,
      [alasan, session.id, id]
    );

    if (res.rows.length === 0) {
      return { success: false, error: "Transaksi tidak ditemukan atau statusnya sudah berubah." };
    }

    revalidatePath("/transactions");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: `Transaksi masuk ${res.rows[0].nomor_transaksi} berhasil ditolak dengan alasan: "${alasan}".`,
    };
  } catch (err) {
    console.error("Kesalahan rejectIncomingTransactionAction:", err);
    return { success: false, error: "Gagal menolak transaksi barang masuk." };
  }
}

// ALUR BARANG KELUAR

// 1. Staff Gudang menginput pengajuan Outgoing Transaction (status: pending)
// Hak akses: staff_gudang & admin
// Validasi ketat: qty <= jumlah_stok saat ini. Stok BELUM berkurang.
export async function createOutgoingTransactionAction(prevState, formData) {
  const session = await getSession();

  if (!session || (session.role !== "staff_gudang" && session.role !== "admin")) {
    return {
      error: "Akses ditolak. Hanya Staff Gudang dan Administrator yang dapat mengajukan barang keluar.",
    };
  }

  const productId = parseInt(formData.get("product_id"), 10);
  const qty = parseInt(formData.get("qty"), 10);
  const tujuanCustomer = formData.get("tujuan_customer")?.toString().trim();
  const catatan = formData.get("catatan")?.toString().trim() || null;

  if (isNaN(productId) || isNaN(qty) || qty <= 0 || !tujuanCustomer) {
    return {
      error: "Produk, kuantitas pengeluaran (minimal 1), dan nama tujuan customer wajib diisi.",
    };
  }

  try {
    // Validasi produk dan ketersediaan stok
    const prodRes = await query(
      "SELECT id, nama, jumlah_stok, unit FROM products WHERE id = $1",
      [productId]
    );

    if (prodRes.rows.length === 0) {
      return { error: "Produk yang dipilih tidak ditemukan dalam katalog." };
    }

    const product = prodRes.rows[0];
    const stokTersedia = parseInt(product.jumlah_stok, 10);

    if (qty > stokTersedia) {
      return {
        error: `Stok gudang tidak mencukupi. Anda mengajukan ${qty} ${product.unit}, sedangkan stok yang tersedia saat ini hanya ${stokTersedia} ${product.unit}.`,
      };
    }

    const kodeUnik = Date.now().toString().slice(-6);
    const nomorTrx = `TRX-OUT-${kodeUnik}`;
    const catatanLengkap = `Pengeluaran Barang ke ${tujuanCustomer}${catatan ? ` | Catatan: ${catatan}` : ""}`;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Catat ke transactions (status: pending)
      const trxRes = await client.query(
        `INSERT INTO transactions (
          nomor_transaksi, product_id, tipe, type, quantity, tujuan_customer,
          status, catatan, notes, dibuat_oleh, created_by
        ) VALUES ($1, $2, 'keluar', 'outgoing', $3, $4, 'pending', $5, $5, $6, $6)
        RETURNING id`,
        [nomorTrx, productId, qty, tujuanCustomer, catatanLengkap, session.id]
      );

      const trxId = trxRes.rows[0].id;

      // Masukkan ke transaction_items untuk kompatibilitas
      await client.query(
        "INSERT INTO transaction_items (transaction_id, product_id, qty) VALUES ($1, $2, $3)",
        [trxId, productId, qty]
      );

      await client.query("COMMIT");

      revalidatePath("/transactions");
      revalidatePath("/dashboard");

      return {
        success: true,
        message: `Pengajuan barang keluar ${nomorTrx} (${qty} ${product.unit} "${product.nama}" ke "${tujuanCustomer}") berhasil dibuat dengan status Pending. Menunggu persetujuan Warehouse Manager.`,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Kesalahan createOutgoingTransactionAction:", err);
    return { error: "Gagal memproses pengajuan transaksi barang keluar." };
  }
}

// 2. Warehouse Manager menyetujui Outgoing Transaction (pending -> approved)
// Hak akses: warehouse_manager & admin
// CATATAN: Saat Manager approve, STOK BELUM BERKURANG (barang masuk tahap packing)
export async function approveOutgoingTransactionAction(transactionId) {
  const session = await getSession();

  if (!session || (session.role !== "warehouse_manager" && session.role !== "admin")) {
    return {
      success: false,
      error: "Akses ditolak. Hanya Warehouse Manager dan Administrator yang dapat menyetujui pengajuan barang keluar.",
    };
  }

  const id = parseInt(transactionId, 10);
  if (isNaN(id)) {
    return { success: false, error: "ID transaksi tidak valid." };
  }

  try {
    const res = await query(
      `UPDATE transactions
       SET status = 'approved',
           approved_by = $1,
           disetujui_oleh = $1,
           updated_at = NOW()
       WHERE id = $2 AND status = 'pending' AND (type = 'outgoing' OR tipe = 'keluar')
       RETURNING nomor_transaksi`,
      [session.id, id]
    );

    if (res.rows.length === 0) {
      return { success: false, error: "Transaksi tidak ditemukan atau statusnya sudah berubah." };
    }

    revalidatePath("/transactions");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: `Transaksi keluar ${res.rows[0].nomor_transaksi} disetujui. Barang masuk tahap pengemasan (packing) oleh Staff Gudang sebelum pengiriman.`,
    };
  } catch (err) {
    console.error("Kesalahan approveOutgoingTransactionAction:", err);
    return { success: false, error: "Gagal menyetujui transaksi barang keluar." };
  }
}

// 3. Warehouse Manager menolak Outgoing Transaction (pending -> rejected)
// Hak akses: warehouse_manager & admin
export async function rejectOutgoingTransactionAction(transactionId, reason) {
  const session = await getSession();

  if (!session || (session.role !== "warehouse_manager" && session.role !== "admin")) {
    return {
      success: false,
      error: "Akses ditolak. Hanya Warehouse Manager dan Administrator yang dapat menolak transaksi.",
    };
  }

  const id = parseInt(transactionId, 10);
  const alasan = reason?.toString().trim();

  if (isNaN(id) || !alasan) {
    return { success: false, error: "Alasan penolakan barang keluar wajib diisi." };
  }

  try {
    const res = await query(
      `UPDATE transactions
       SET status = 'rejected',
           rejection_reason = $1,
           alasan_penolakan = $1,
           approved_by = $2,
           disetujui_oleh = $2,
           updated_at = NOW()
       WHERE id = $3 AND status = 'pending' AND (type = 'outgoing' OR tipe = 'keluar')
       RETURNING nomor_transaksi`,
      [alasan, session.id, id]
    );

    if (res.rows.length === 0) {
      return { success: false, error: "Transaksi tidak ditemukan atau statusnya sudah berubah." };
    }

    revalidatePath("/transactions");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: `Transaksi keluar ${res.rows[0].nomor_transaksi} ditolak dengan alasan: "${alasan}".`,
    };
  } catch (err) {
    console.error("Kesalahan rejectOutgoingTransactionAction:", err);
    return { success: false, error: "Gagal menolak transaksi barang keluar." };
  }
}

// 4. Staff Gudang mengeksekusi pengiriman barang (approved -> completed)
// Hak akses: staff_gudang & admin
// TRANSAKSI SQL ATOMIK: Stok berkurang (stock = stock - qty) tepat saat tombol Kirim Barang ditekan
export async function dispatchOutgoingTransactionAction(transactionId) {
  const session = await getSession();

  if (!session || (session.role !== "staff_gudang" && session.role !== "admin")) {
    return {
      success: false,
      error: "Akses ditolak. Hanya Staff Gudang dan Administrator yang dapat mengeksekusi pengiriman barang.",
    };
  }

  const id = parseInt(transactionId, 10);
  if (isNaN(id)) {
    return { success: false, error: "ID transaksi tidak valid." };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Kunci baris transaksi dan verifikasi status approved
    const trxCheck = await client.query(
      `SELECT t.id, t.nomor_transaksi, t.product_id, t.quantity, t.status, t.type, t.tipe,
              p.nama AS product_nama, p.unit
       FROM transactions t
       JOIN products p ON t.product_id = p.id
       WHERE t.id = $1 FOR UPDATE`,
      [id]
    );

    if (trxCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return { success: false, error: "Transaksi tidak ditemukan." };
    }

    const trx = trxCheck.rows[0];

    if (trx.status !== "approved") {
      await client.query("ROLLBACK");
      return {
        success: false,
        error: `Transaksi ${trx.nomor_transaksi} belum disetujui untuk dikirim (status saat ini: ${trx.status}).`,
      };
    }

    if (trx.type !== "outgoing" && trx.tipe !== "keluar") {
      await client.query("ROLLBACK");
      return { success: false, error: "Jenis transaksi ini bukan barang keluar." };
    }

    // 2. Kunci baris produk dan verifikasi ketersediaan stok fisik terkini
    const prodCheck = await client.query(
      "SELECT id, jumlah_stok FROM products WHERE id = $1 FOR UPDATE",
      [trx.product_id]
    );

    if (prodCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return { success: false, error: "Produk tidak ditemukan dalam katalog." };
    }

    const currentStock = parseInt(prodCheck.rows[0].jumlah_stok, 10);
    if (currentStock < trx.quantity) {
      await client.query("ROLLBACK");
      return {
        success: false,
        error: `Gagal mengirim barang. Stok fisik di gudang saat ini (${currentStock} ${trx.unit}) tidak mencukupi kuantitas pengiriman (${trx.quantity} ${trx.unit}).`,
      };
    }

    // 3. Kurangi jumlah_stok produk secara atomik
    await client.query(
      "UPDATE products SET jumlah_stok = jumlah_stok - $1, updated_at = NOW() WHERE id = $2",
      [trx.quantity, trx.product_id]
    );

    // 4. Ubah status transaksi menjadi 'completed'
    await client.query(
      "UPDATE transactions SET status = 'completed', updated_at = NOW() WHERE id = $1",
      [id]
    );

    await client.query("COMMIT");

    revalidatePath("/transactions");
    revalidatePath("/products");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: `Barang untuk transaksi ${trx.nomor_transaksi} berhasil dikirim (status: Completed). Stok "${trx.product_nama}" otomatis berkurang -${trx.quantity} ${trx.unit}.`,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Kesalahan dispatchOutgoingTransactionAction:", err);
    return { success: false, error: "Gagal memproses pengiriman barang keluar." };
  } finally {
    client.release();
  }
}