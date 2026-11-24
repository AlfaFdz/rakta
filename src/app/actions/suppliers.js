"use server";

import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// Server Action untuk menyetujui atau menolak akun Supplier
// Khusus role: admin
export async function updateSupplierStatusAction(supplierId, newStatus, rejectionReason = null) {
  const session = await getSession();

  // Validasi keamanan: hanya admin yang berhak memverifikasi supplier
  if (!session || session.role !== "admin") {
    return {
      success: false,
      error: "Akses ditolak. Hanya Administrator yang dapat memverifikasi akun supplier.",
    };
  }

  // Validasi nilai status
  if (newStatus !== "approved" && newStatus !== "rejected") {
    return {
      success: false,
      error: "Status yang diajukan tidak valid.",
    };
  }

  const reason = rejectionReason ? rejectionReason.toString().trim() : null;
  if (newStatus === "rejected" && !reason) {
    return {
      success: false,
      error: "Alasan penolakan akun supplier wajib diisi.",
    };
  }

  try {
    const result = await query(
      `UPDATE users 
       SET status = $1, 
           rejection_reason = $2 
       WHERE id = $3 AND role = 'supplier' 
       RETURNING id, nama, nama_perusahaan, status`,
      [newStatus, newStatus === "rejected" ? reason : null, supplierId]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        error: "Data supplier tidak ditemukan dalam sistem.",
      };
    }

    // Segarkan data pada halaman suppliers, users, dan dashboard
    revalidatePath("/suppliers");
    revalidatePath("/users");
    revalidatePath("/dashboard");

    const supplier = result.rows[0];
    const statusLabel = newStatus === "approved" ? "disetujui" : `ditolak (${reason})`;

    return {
      success: true,
      message: `Akun supplier ${supplier.nama_perusahaan || supplier.nama} berhasil ${statusLabel}.`,
    };
  } catch (err) {
    console.error("Kesalahan updateSupplierStatusAction:", err);
    return {
      success: false,
      error: "Gagal memperbarui status supplier. Silakan coba beberapa saat lagi.",
    };
  }
}