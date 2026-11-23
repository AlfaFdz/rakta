"use server";

import { pool, query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// Server Action untuk membuat master produk baru
// Hak akses: admin & warehouse_manager
export async function createProductAction(prevState, formData) {
  const session = await getSession();

  if (!session || (session.role !== "admin" && session.role !== "warehouse_manager")) {
    return { error: "Akses ditolak. Hanya Administrator dan Warehouse Manager yang dapat menambah produk baru." };
  }

  const sku = formData.get("sku")?.toString().trim().toUpperCase();
  const nama = formData.get("nama")?.toString().trim();
  const categoryId = parseInt(formData.get("category_id"), 10);
  const supplierIdRaw = formData.get("supplier_id");
  const supplierId = supplierIdRaw && supplierIdRaw !== "" ? parseInt(supplierIdRaw, 10) : null;
  const deskripsi = formData.get("deskripsi")?.toString().trim() || null;
  const hargaBeli = parseFloat(formData.get("harga_beli")) || 0;
  const hargaJual = parseFloat(formData.get("harga_jual")) || 0;
  const stokMinimum = parseInt(formData.get("stok_minimum"), 10) || 0;
  const stokLow = parseInt(formData.get("stok_low"), 10) || (stokMinimum + 10);
  const jumlahStok = parseInt(formData.get("jumlah_stok"), 10) || 0;
  const unit = formData.get("unit")?.toString().trim() || "pcs";
  const lokasiRak = formData.get("lokasi_rak")?.toString().trim() || null;

  if (!sku || !nama || isNaN(categoryId)) {
    return { error: "SKU, nama produk, dan kategori wajib diisi." };
  }

  if (stokLow <= stokMinimum) {
    return { error: "Ambang stok menipis (Stok Low) harus lebih besar dari stok minimum." };
  }

  if (hargaBeli < 0 || hargaJual < 0) {
    return { error: "Harga beli dan harga jual tidak boleh bernilai negatif." };
  }

  if (stokMinimum < 0 || jumlahStok < 0) {
    return { error: "Jumlah stok dan stok minimum tidak boleh bernilai negatif." };
  }

  try {
    // Validasi keunikan SKU (case-insensitive)
    const existing = await query("SELECT id FROM products WHERE UPPER(sku) = $1", [sku]);
    if (existing.rows.length > 0) {
      return { error: `SKU "${sku}" sudah terdaftar pada sistem. Gunakan kode SKU lain yang unik.` };
    }

    await query(
      `INSERT INTO products (
        sku, nama, category_id, supplier_id, deskripsi,
        harga_beli, harga_jual, stok_minimum, stok_low, jumlah_stok,
        unit, lokasi_rak
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        sku,
        nama,
        categoryId,
        supplierId,
        deskripsi,
        hargaBeli,
        hargaJual,
        stokMinimum,
        stokLow,
        jumlahStok,
        unit,
        lokasiRak,
      ]
    );

    revalidatePath("/products");
    revalidatePath("/dashboard");
    return { success: true, message: `Produk "${nama}" (${sku}) berhasil ditambahkan ke katalog gudang.` };
  } catch (err) {
    console.error("Kesalahan createProductAction:", err);
    return { error: "Gagal menyimpan data produk. Pastikan seluruh format data sudah sesuai." };
  }
}

// Server Action untuk memperbarui informasi master produk
// Hak akses: admin & warehouse_manager
export async function updateProductAction(prevState, formData) {
  const session = await getSession();

  if (!session || (session.role !== "admin" && session.role !== "warehouse_manager")) {
    return { error: "Akses ditolak. Hanya Administrator dan Warehouse Manager yang dapat mengubah data produk." };
  }

  const id = parseInt(formData.get("id"), 10);
  const sku = formData.get("sku")?.toString().trim().toUpperCase();
  const nama = formData.get("nama")?.toString().trim();
  const categoryId = parseInt(formData.get("category_id"), 10);
  const supplierIdRaw = formData.get("supplier_id");
  const supplierId = supplierIdRaw && supplierIdRaw !== "" ? parseInt(supplierIdRaw, 10) : null;
  const deskripsi = formData.get("deskripsi")?.toString().trim() || null;
  const hargaBeli = parseFloat(formData.get("harga_beli")) || 0;
  const hargaJual = parseFloat(formData.get("harga_jual")) || 0;
  const stokMinimum = parseInt(formData.get("stok_minimum"), 10) || 0;
  const stokLow = parseInt(formData.get("stok_low"), 10) || (stokMinimum + 10);
  const unit = formData.get("unit")?.toString().trim() || "pcs";
  const lokasiRak = formData.get("lokasi_rak")?.toString().trim() || null;

  if (isNaN(id) || !sku || !nama || isNaN(categoryId)) {
    return { error: "Data produk tidak lengkap. SKU, nama, dan kategori wajib diisi." };
  }

  if (stokLow <= stokMinimum) {
    return { error: "Ambang stok menipis (Stok Low) harus lebih besar dari stok minimum." };
  }

  if (hargaBeli < 0 || hargaJual < 0) {
    return { error: "Harga beli dan harga jual tidak boleh bernilai negatif." };
  }

  try {
    // Validasi keunikan SKU pada produk lain
    const existing = await query(
      "SELECT id FROM products WHERE UPPER(sku) = $1 AND id != $2",
      [sku, id]
    );
    if (existing.rows.length > 0) {
      return { error: `SKU "${sku}" sudah digunakan oleh produk lain. Silakan pilih kode SKU yang unik.` };
    }

    const result = await query(
      `UPDATE products SET
        sku = $1,
        nama = $2,
        category_id = $3,
        supplier_id = $4,
        deskripsi = $5,
        harga_beli = $6,
        harga_jual = $7,
        stok_minimum = $8,
        stok_low = $9,
        unit = $10,
        lokasi_rak = $11,
        updated_at = NOW()
      WHERE id = $12
      RETURNING id, nama`,
      [
        sku,
        nama,
        categoryId,
        supplierId,
        deskripsi,
        hargaBeli,
        hargaJual,
        stokMinimum,
        stokLow,
        unit,
        lokasiRak,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return { error: "Data produk tidak ditemukan dalam sistem." };
    }

    revalidatePath("/products");
    revalidatePath("/dashboard");
    return { success: true, message: `Data produk "${nama}" berhasil diperbarui.` };
  } catch (err) {
    console.error("Kesalahan updateProductAction:", err);
    return { error: "Gagal memperbarui data produk. Silakan coba beberapa saat lagi." };
  }
}

// Server Action untuk menghapus produk dari katalog dengan proteksi Foreign Key
// Hak akses: admin & warehouse_manager
export async function deleteProductAction(productId) {
  const session = await getSession();

  if (!session || (session.role !== "admin" && session.role !== "warehouse_manager")) {
    return { success: false, error: "Akses ditolak. Hanya Administrator dan Warehouse Manager yang dapat menghapus produk." };
  }

  const id = parseInt(productId, 10);
  if (isNaN(id)) {
    return { success: false, error: "ID produk tidak valid." };
  }

  try {
    // 1. Cek riwayat di transaction_items
    const trxCheck = await query(
      "SELECT COUNT(*) as count FROM transaction_items WHERE product_id = $1",
      [id]
    );
    const trxCount = parseInt(trxCheck.rows[0]?.count, 10) || 0;

    // 2. Cek riwayat di restock_items
    const restockCheck = await query(
      "SELECT COUNT(*) as count FROM restock_items WHERE product_id = $1",
      [id]
    );
    const restockCount = parseInt(restockCheck.rows[0]?.count, 10) || 0;

    if (trxCount > 0 || restockCount > 0) {
      const detailRiwayat = [];
      if (trxCount > 0) detailRiwayat.push(`${trxCount} transaksi barang`);
      if (restockCount > 0) detailRiwayat.push(`${restockCount} pesanan restock`);

      return {
        success: false,
        error: `Produk tidak dapat dihapus karena sudah memiliki riwayat operasional (${detailRiwayat.join(" dan ")}). Untuk menjaga integritas data logistik, Anda dapat menyesuaikan jumlah stok menjadi 0 jika produk sudah tidak aktif.`,
      };
    }

    const deleteRes = await query("DELETE FROM products WHERE id = $1 RETURNING nama, sku", [id]);
    if (deleteRes.rows.length === 0) {
      return { success: false, error: "Produk tidak ditemukan." };
    }

    const deleted = deleteRes.rows[0];
    revalidatePath("/products");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: `Produk "${deleted.nama}" (${deleted.sku}) berhasil dihapus dari katalog gudang.`,
    };
  } catch (err) {
    console.error("Kesalahan deleteProductAction:", err);
    return { success: false, error: "Gagal menghapus produk karena kendala relasi database." };
  }
}

// Server Action untuk penyesuaian stok fisik (Stock Opname)
// Hak akses: staff_gudang dan admin
// Menggunakan transaksi database murni (BEGIN ... COMMIT)
export async function adjustStockAction(prevState, formData) {
  const session = await getSession();

  if (!session || (session.role !== "staff_gudang" && session.role !== "admin")) {
    return { error: "Akses ditolak. Hanya Staff Gudang dan Admin yang dapat menyesuaikan stok fisik." };
  }

  const productId = parseInt(formData.get("product_id"), 10);
  const stokFisik = parseInt(formData.get("stok_fisik"), 10);
  const alasan = formData.get("alasan")?.toString().trim() || "Pengecekan Fisik Rutin";
  const catatan = formData.get("catatan")?.toString().trim() || null;

  if (isNaN(productId) || isNaN(stokFisik)) {
    return { error: "ID produk dan jumlah stok fisik baru wajib diisi." };
  }

  if (stokFisik < 0) {
    return { error: "Jumlah stok fisik tidak boleh bernilai negatif." };
  }

  const client = await pool.connect();
  try {
    // Memulai transaksi SQL
    await client.query("BEGIN");

    // Ambil data produk saat ini dengan row locking untuk integritas concurrency
    const productRes = await client.query(
      "SELECT id, sku, nama, jumlah_stok, unit FROM products WHERE id = $1 FOR UPDATE",
      [productId]
    );

    if (productRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return { error: "Produk tidak ditemukan di dalam sistem gudang." };
    }

    const product = productRes.rows[0];
    const stokLama = parseInt(product.jumlah_stok, 10);
    const selisih = stokFisik - stokLama;

    if (selisih === 0) {
      await client.query("ROLLBACK");
      return {
        success: true,
        message: `Stok fisik ${product.nama} sudah sesuai (${stokFisik} ${product.unit}). Tidak ada mutasi yang dicatat.`,
      };
    }

    // 1. Perbarui jumlah_stok produk
    await client.query(
      "UPDATE products SET jumlah_stok = $1, updated_at = NOW() WHERE id = $2",
      [stokFisik, productId]
    );

    // 2. Catat histori penyesuaian sebagai transaksi logistik
    const tipe = selisih > 0 ? "masuk" : "keluar";
    const qtyMutasi = Math.abs(selisih);
    const kodeUnik = Date.now().toString().slice(-6);
    const nomorTrx = `TRX-OPN-${kodeUnik}`;
    const deskripsiCatatan = `Stock Opname: ${alasan} (Stok awal: ${stokLama} -> Stok akhir: ${stokFisik} ${product.unit})${
      catatan ? ` | Catatan: ${catatan}` : ""
    }`;

    const trxResult = await client.query(
      `INSERT INTO transactions (
        nomor_transaksi, product_id, tipe, type, quantity, status, catatan, notes, dibuat_oleh, created_by, disetujui_oleh, approved_by
      ) VALUES ($1, $2, $3, 'adjustment', $4, 'approved', $5, $5, $6, $6, $6, $6) RETURNING id`,
      [nomorTrx, productId, tipe, qtyMutasi, deskripsiCatatan, session.id]
    );

    const transactionId = trxResult.rows[0].id;

    // 3. Masukkan item transaksi
    await client.query(
      `INSERT INTO transaction_items (transaction_id, product_id, qty)
       VALUES ($1, $2, $3)`,
      [transactionId, productId, qtyMutasi]
    );

    // Komit seluruh operasi transaksi
    await client.query("COMMIT");

    revalidatePath("/products");
    revalidatePath("/dashboard");
    revalidatePath("/transactions");

    const arahPerubahan = selisih > 0 ? `bertambah +${qtyMutasi}` : `berkurang -${qtyMutasi}`;
    return {
      success: true,
      message: `Stok "${product.nama}" berhasil disesuaikan menjadi ${stokFisik} ${product.unit} (${arahPerubahan} via ${nomorTrx}).`,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Kesalahan adjustStockAction:", err);
    return { error: "Terjadi kesalahan saat memproses penyesuaian stok gudang. Perubahan dibatalkan." };
  } finally {
    client.release();
  }
}