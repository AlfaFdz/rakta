"use server";

import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// Server action untuk mengubah status aktif/nonaktif atau persetujuan akun pengguna
// Khusus role: admin
export async function updateUserStatusAction(userId, newStatus, rejectionReason = null) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return {
      success: false,
      error: "Akses ditolak. Hanya Administrator yang dapat mengubah status pengguna.",
    };
  }

  const id = parseInt(userId, 10);
  if (isNaN(id)) {
    return { success: false, error: "ID pengguna tidak valid." };
  }

  if (id === session.id) {
    return {
      success: false,
      error: "Anda tidak dapat menonaktifkan akun Administrator Anda sendiri.",
    };
  }

  if (newStatus !== "approved" && newStatus !== "rejected") {
    return { success: false, error: "Status baru yang diajukan tidak valid." };
  }

  const reason = rejectionReason ? rejectionReason.toString().trim() : null;
  if (newStatus === "rejected" && !reason) {
    return {
      success: false,
      error: "Alasan penolakan / penonaktifan akun wajib diisi.",
    };
  }

  try {
    const res = await query(
      `UPDATE users 
       SET status = $1, 
           rejection_reason = $2 
       WHERE id = $3 
       RETURNING id, nama, role, status, nama_perusahaan`,
      [newStatus, newStatus === "rejected" ? reason : null, id]
    );

    if (res.rows.length === 0) {
      return { success: false, error: "Pengguna tidak ditemukan dalam sistem." };
    }

    const targetUser = res.rows[0];
    const statusLabel = newStatus === "approved" ? "diaktifkan / disetujui" : `dinonaktifkan / ditolak (${reason})`;

    revalidatePath("/users");
    revalidatePath("/suppliers");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: `Akun "${targetUser.nama_perusahaan || targetUser.nama}" (${targetUser.role}) berhasil ${statusLabel}.`,
    };
  } catch (err) {
    console.error("Kesalahan updateUserStatusAction:", err);
    return { success: false, error: "Gagal memperbarui status pengguna di database." };
  }
}