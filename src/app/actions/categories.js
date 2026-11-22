"use server";

import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// Server Action untuk menambah kategori baru
// Hak akses: admin & warehouse_manager
export async function createCategoryAction(prevState, formData) {
  const session = await getSession();

  if (!session || (session.role !== "admin" && session.role !== "warehouse_manager")) {
    return { error: "Akses ditolak. Anda tidak memiliki izin mengelola kategori." };
  }

  const nama = formData.get("nama")?.toString().trim();
  const deskripsi = formData.get("deskripsi")?.toString().trim() || null;

  if (!nama) {
    return { error: "Nama kategori wajib diisi." };
  }

  try {
    // Cek duplikasi nama kategori (case-insensitive)
    const existing = await query(
      "SELECT id FROM categories WHERE LOWER(nama) = LOWER($1)",
      [nama]
    );

    if (existing.rows.length > 0) {
      return { error: "Kategori dengan nama tersebut sudah ada. Silakan gunakan nama lain." };
    }

    await query(
      "INSERT INTO categories (nama, deskripsi) VALUES ($1, $2)",
      [nama, deskripsi]
    );

    revalidatePath("/categories");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("Kesalahan createCategoryAction:", err);
    return { error: "Gagal menyimpan kategori baru. Silakan periksa kembali data Anda." };
  }
}

// Server Action untuk memperbarui kategori yang sudah ada
// Hak akses: admin & warehouse_manager
export async function updateCategoryAction(prevState, formData) {
  const session = await getSession();

  if (!session || (session.role !== "admin" && session.role !== "warehouse_manager")) {
    return { error: "Akses ditolak. Anda tidak memiliki izin mengelola kategori." };
  }

  const id = formData.get("id");
  const nama = formData.get("nama")?.toString().trim();
  const deskripsi = formData.get("deskripsi")?.toString().trim() || null;

  if (!id || !nama) {
    return { error: "ID dan nama kategori wajib diisi." };
  }

  try {
    // Cek duplikasi nama kategori pada ID lain
    const existing = await query(
      "SELECT id FROM categories WHERE LOWER(nama) = LOWER($1) AND id != $2",
      [nama, id]
    );

    if (existing.rows.length > 0) {
      return { error: "Nama kategori tersebut sudah digunakan oleh kategori lain." };
    }

    const result = await query(
      "UPDATE categories SET nama = $1, deskripsi = $2 WHERE id = $3 RETURNING id",
      [nama, deskripsi, id]
    );

    if (result.rows.length === 0) {
      return { error: "Kategori tidak ditemukan." };
    }

    revalidatePath("/categories");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("Kesalahan updateCategoryAction:", err);
    return { error: "Gagal memperbarui kategori. Silakan coba lagi." };
  }
}

// Server Action untuk menghapus kategori secara aman
// Hanya boleh dihapus jika jumlah produk di dalamnya 0
export async function deleteCategoryAction(categoryId) {
  const session = await getSession();

  if (!session || (session.role !== "admin" && session.role !== "warehouse_manager")) {
    return { success: false, error: "Akses ditolak. Anda tidak memiliki izin menghapus kategori." };
  }

  if (!categoryId) {
    return { success: false, error: "ID kategori tidak valid." };
  }

  try {
    // Pengecekan keamanan relasi foreign key ke tabel products
    const productCheck = await query(
      "SELECT COUNT(*)::int AS total FROM products WHERE category_id = $1",
      [categoryId]
    );

    const totalProduk = productCheck.rows[0]?.total || 0;

    if (totalProduk > 0) {
      return {
        success: false,
        error: `Kategori tidak dapat dihapus karena masih digunakan oleh ${totalProduk} produk di gudang. Silakan pindahkan atau hapus produk terkait terlebih dahulu.`,
      };
    }

    const deleteRes = await query(
      "DELETE FROM categories WHERE id = $1 RETURNING id, nama",
      [categoryId]
    );

    if (deleteRes.rows.length === 0) {
      return { success: false, error: "Kategori tidak ditemukan atau sudah terhapus." };
    }

    revalidatePath("/categories");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: `Kategori "${deleteRes.rows[0].nama}" berhasil dihapus.`,
    };
  } catch (err) {
    console.error("Kesalahan deleteCategoryAction:", err);
    return {
      success: false,
      error: "Gagal menghapus kategori. Terjadi kendala pada database.",
    };
  }
}