"use server";

import { pool, query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// Server Action untuk menerima barang dari pesanan restock yang sedang in_transit
// Hak akses: staff_gudang & admin
// Menjalankan transaksi SQL atomik (BEGIN ... COMMIT)
export async function receiveRestockOrderAction(orderId) {
  const session = await getSession();

  if (!session || (session.role !== "staff_gudang" && session.role !== "admin")) {
    return {
      success: false,
      error: "Akses ditolak. Hanya Staff Gudang dan Admin yang dapat menerima barang masuk dari supplier.",
    };
  }

  const id = parseInt(orderId, 10);
  if (isNaN(id)) {
    return { success: false, error: "ID pesanan restock tidak valid." };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Kunci dan periksa baris pesanan restock
    const orderCheck = await client.query(
      "SELECT id, nomor_po, supplier_id, status FROM restock_orders WHERE id = $1 FOR UPDATE",
      [id]
    );

    if (orderCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return { success: false, error: "Pesanan restock tidak ditemukan dalam sistem." };
    }

    const order = orderCheck.rows[0];
    if (order.status !== "in_transit") {
      await client.query("ROLLBACK");
      return {
        success: false,
        error: `Pesanan ${order.nomor_po} belum dalam status pengiriman (status saat ini: ${order.status}).`,
      };
    }

    // 2. Ambil seluruh item produk dalam pesanan restock
    const itemsRes = await client.query(
      `SELECT ri.product_id, ri.qty, p.nama, p.unit
       FROM restock_items ri
       JOIN products p ON ri.product_id = p.id
       WHERE ri.restock_order_id = $1`,
      [id]
    );

    if (itemsRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return { success: false, error: "Rincian barang dalam pesanan restock tidak ditemukan." };
    }

    // 3. Catat transaksi logistik tipe 'masuk'
    const kodeUnik = Date.now().toString().slice(-6);
    const nomorTrx = `TRX-IN-PO-${kodeUnik}`;
    const catatanPenerimaan = `Penerimaan Restock PO: ${order.nomor_po}`;

    const trxRes = await client.query(
      `INSERT INTO transactions (
        nomor_transaksi, tipe, status, restock_order_id, supplier_id,
        catatan, dibuat_oleh, disetujui_oleh
      ) VALUES ($1, 'masuk', 'approved', $2, $3, $4, $5, $5)
      RETURNING id`,
      [nomorTrx, order.id, order.supplier_id, catatanPenerimaan, session.id]
    );

    const transactionId = trxRes.rows[0].id;

    // 4. Update stok pada produk dan masukkan item ke transaction_items
    for (const item of itemsRes.rows) {
      // Tambah jumlah_stok fisik
      await client.query(
        "UPDATE products SET jumlah_stok = jumlah_stok + $1, updated_at = NOW() WHERE id = $2",
        [item.qty, item.product_id]
      );

      // Catat item transaksi
      await client.query(
        "INSERT INTO transaction_items (transaction_id, product_id, qty) VALUES ($1, $2, $3)",
        [transactionId, item.product_id, item.qty]
      );
    }

    // 5. Perbarui status pesanan restock menjadi 'received'
    const penerimaNama = session.nama || "Staff Gudang";
    await client.query(
      `UPDATE restock_orders 
       SET status = 'received',
           catatan_status = 'Barang telah diterima lengkap di gudang oleh ' || $1
       WHERE id = $2`,
      [penerimaNama, id]
    );

    // Komit transaksi
    await client.query("COMMIT");

    revalidatePath("/transactions");
    revalidatePath("/restock");
    revalidatePath("/products");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: `Barang dari pesanan ${order.nomor_po} berhasil diterima. Stok barang otomatis bertambah dan tercatat dalam transaksi ${nomorTrx}.`,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Kesalahan receiveRestockOrderAction:", err);
    return {
      success: false,
      error: "Terjadi kesalahan saat memproses penerimaan barang gudang. Perubahan dibatalkan.",
    };
  } finally {
    client.release();
  }
}

// Server Action untuk mencatat barang masuk manual (non-PO / retur)
// Hak akses: staff_gudang & admin
export async function createManualIncomingTransactionAction(prevState, formData) {
  const session = await getSession();

  if (!session || (session.role !== "staff_gudang" && session.role !== "admin")) {
    return {
      error: "Akses ditolak. Hanya Staff Gudang dan Admin yang dapat mencatat barang masuk.",
    };
  }

  const productId = parseInt(formData.get("product_id"), 10);
  const qty = parseInt(formData.get("qty"), 10);
  const supplierIdRaw = formData.get("supplier_id");
  const supplierId = supplierIdRaw && supplierIdRaw !== "" ? parseInt(supplierIdRaw, 10) : null;
  const catatan = formData.get("catatan")?.toString().trim() || null;

  if (isNaN(productId) || isNaN(qty) || qty <= 0) {
    return { error: "Pilih produk dan masukkan kuantitas barang masuk minimal 1." };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Ambil dan kunci baris produk
    const productCheck = await client.query(
      "SELECT id, nama, jumlah_stok, unit FROM products WHERE id = $1 FOR UPDATE",
      [productId]
    );

    if (productCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return { error: "Produk tidak ditemukan dalam katalog." };
    }

    const product = productCheck.rows[0];

    // 1. Tambah jumlah_stok produk
    await client.query(
      "UPDATE products SET jumlah_stok = jumlah_stok + $1, updated_at = NOW() WHERE id = $2",
      [qty, productId]
    );

    // 2. Buat transaksi logistik masuk
    const kodeUnik = Date.now().toString().slice(-6);
    const nomorTrx = `TRX-IN-MAN-${kodeUnik}`;
    const catatanLengkap = `Penerimaan Manual: ${catatan || "Barang Masuk Non-PO / Retur"}`;

    const trxRes = await client.query(
      `INSERT INTO transactions (
        nomor_transaksi, tipe, status, supplier_id, catatan, dibuat_oleh, disetujui_oleh
      ) VALUES ($1, 'masuk', 'approved', $2, $3, $4, $4)
      RETURNING id`,
      [nomorTrx, supplierId, catatanLengkap, session.id]
    );

    const transactionId = trxRes.rows[0].id;

    // 3. Masukkan item transaksi
    await client.query(
      "INSERT INTO transaction_items (transaction_id, product_id, qty) VALUES ($1, $2, $3)",
      [transactionId, productId, qty]
    );

    await client.query("COMMIT");

    revalidatePath("/transactions");
    revalidatePath("/products");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: `Berhasil mencatat penerimaan ${qty} ${product.unit} "${product.nama}" (Nomor: ${nomorTrx}). Stok produk telah diperbarui.`,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Kesalahan createManualIncomingTransactionAction:", err);
    return { error: "Gagal mencatat penerimaan barang masuk manual." };
  } finally {
    client.release();
  }
}

// Server Action untuk mencatat pengeluaran barang ke customer / pemakaian
// Hak akses: staff_gudang & admin
export async function createOutgoingTransactionAction(prevState, formData) {
  const session = await getSession();

  if (!session || (session.role !== "staff_gudang" && session.role !== "admin")) {
    return {
      error: "Akses ditolak. Hanya Staff Gudang dan Admin yang dapat mencatat barang keluar.",
    };
  }

  const productId = parseInt(formData.get("product_id"), 10);
  const qty = parseInt(formData.get("qty"), 10);
  const tujuanCustomer = formData.get("tujuan_customer")?.toString().trim();
  const catatan = formData.get("catatan")?.toString().trim() || null;

  if (isNaN(productId) || isNaN(qty) || qty <= 0 || !tujuanCustomer) {
    return {
      error: "Produk, kuantitas (minimal 1), dan nama tujuan customer/pembeli wajib diisi.",
    };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Ambil dan kunci baris produk untuk pengecekan konkurensi stok
    const productCheck = await client.query(
      "SELECT id, nama, jumlah_stok, unit FROM products WHERE id = $1 FOR UPDATE",
      [productId]
    );

    if (productCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return { error: "Produk tidak ditemukan dalam katalog." };
    }

    const product = productCheck.rows[0];
    const stokSaatIni = parseInt(product.jumlah_stok, 10);

    // Validasi ketersediaan stok
    if (qty > stokSaatIni) {
      await client.query("ROLLBACK");
      return {
        error: `Stok tidak mencukupi. Anda meminta ${qty} ${product.unit}, sedangkan stok yang tersedia di gudang hanya ${stokSaatIni} ${product.unit}.`,
      };
    }

    // 1. Kurangi jumlah_stok produk
    await client.query(
      "UPDATE products SET jumlah_stok = jumlah_stok - $1, updated_at = NOW() WHERE id = $2",
      [qty, productId]
    );

    // 2. Buat transaksi logistik keluar
    const kodeUnik = Date.now().toString().slice(-6);
    const nomorTrx = `TRX-OUT-${kodeUnik}`;
    const catatanLengkap = `Pengeluaran Barang ke ${tujuanCustomer}${catatan ? ` | Catatan: ${catatan}` : ""}`;

    const trxRes = await client.query(
      `INSERT INTO transactions (
        nomor_transaksi, tipe, status, tujuan_customer, catatan, dibuat_oleh, disetujui_oleh
      ) VALUES ($1, 'keluar', 'approved', $2, $3, $4, $4)
      RETURNING id`,
      [nomorTrx, tujuanCustomer, catatanLengkap, session.id]
    );

    const transactionId = trxRes.rows[0].id;

    // 3. Masukkan item transaksi
    await client.query(
      "INSERT INTO transaction_items (transaction_id, product_id, qty) VALUES ($1, $2, $3)",
      [transactionId, productId, qty]
    );

    await client.query("COMMIT");

    revalidatePath("/transactions");
    revalidatePath("/products");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: `Berhasil mencatat pengeluaran ${qty} ${product.unit} "${product.nama}" ke "${tujuanCustomer}" (Nomor: ${nomorTrx}). Sisa stok saat ini: ${stokSaatIni - qty} ${product.unit}.`,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Kesalahan createOutgoingTransactionAction:", err);
    return { error: "Gagal mencatat transaksi barang keluar." };
  } finally {
    client.release();
  }
}
