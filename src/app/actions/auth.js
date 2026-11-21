"use server";

import { query } from "@/lib/db";
import { hashPassword, verifyPassword, createSession, destroySession } from "@/lib/auth";
import { redirect } from "next/navigation";

// Server Action untuk proses masuk (Login)
export async function loginAction(prevState, formData) {
  const email = formData.get("email")?.toString().trim();
  const password = formData.get("password")?.toString();

  // Validasi input wajib
  if (!email || !password) {
    return { error: "Alamat email dan kata sandi wajib diisi." };
  }

  let user = null;
  let targetUrl = null;

  try {
    // Cari pengguna berdasarkan email (case-insensitive)
    const result = await query(
      "SELECT id, nama, email, password_hash, role, status, nama_perusahaan FROM users WHERE LOWER(email) = LOWER($1)",
      [email]
    );

    if (result.rows.length === 0) {
      return { error: "Email atau kata sandi tidak sesuai." };
    }

    user = result.rows[0];

    // Verifikasi kecocokan kata sandi
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      return { error: "Email atau kata sandi tidak sesuai." };
    }

    // Cek jika akun telah ditolak oleh Admin
    if (user.status === "rejected" && user.role !== "supplier") {
      return { error: "Akun Anda telah dinonaktifkan oleh Administrator Gudang." };
    }

    // Buat sesi pengguna ke dalam cookie
    await createSession(user);

    // Tentukan URL tujuan berdasarkan role & status
    if (user.role === "supplier" && (user.status === "pending" || user.status === "rejected")) {
      targetUrl = "/pending";
    } else {
      targetUrl = "/dashboard";
    }
  } catch (err) {
    console.error("Kesalahan loginAction:", err);
    return { error: "Terjadi kesalahan pada sistem. Silakan coba lagi nanti." };
  }

  // Pengalihan halaman dilakukan di luar blok try-catch agar tidak tertangkap sebagai error
  if (targetUrl) {
    redirect(targetUrl);
  }
}

// Server Action untuk pendaftaran khusus Supplier baru
export async function registerSupplierAction(prevState, formData) {
  const nama = formData.get("nama")?.toString().trim();
  const nama_perusahaan = formData.get("nama_perusahaan")?.toString().trim();
  const kontak = formData.get("kontak")?.toString().trim();
  const email = formData.get("email")?.toString().trim();
  const password = formData.get("password")?.toString();
  const konfirmasiPassword = formData.get("konfirmasiPassword")?.toString();

  // Validasi seluruh input wajib
  if (!nama || !nama_perusahaan || !kontak || !email || !password || !konfirmasiPassword) {
    return { error: "Semua kolom formulir pendaftaran wajib diisi." };
  }

  // Validasi panjang kata sandi
  if (password.length < 6) {
    return { error: "Kata sandi minimal harus terdiri dari 6 karakter." };
  }

  // Validasi kesamaan kata sandi
  if (password !== konfirmasiPassword) {
    return { error: "Konfirmasi kata sandi tidak cocok dengan kata sandi yang dimasukkan." };
  }

  let newUser = null;

  try {
    // Cek apakah email sudah terdaftar
    const existingUser = await query(
      "SELECT id FROM users WHERE LOWER(email) = LOWER($1)",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return { error: "Alamat email ini sudah terdaftar. Silakan gunakan email lain atau masuk ke akun Anda." };
    }

    // Enkripsi kata sandi dengan bcrypt
    const passwordHash = await hashPassword(password);

    // Simpan akun supplier baru dengan status awal 'pending'
    const insertResult = await query(
      `INSERT INTO users (nama, email, password_hash, role, status, nama_perusahaan, kontak)
       VALUES ($1, $2, $3, 'supplier', 'pending', $4, $5)
       RETURNING id, nama, email, role, status, nama_perusahaan`,
      [nama, email, passwordHash, nama_perusahaan, kontak]
    );

    newUser = insertResult.rows[0];

    // Otomatis buat sesi untuk supplier yang baru mendaftar
    await createSession(newUser);
  } catch (err) {
    console.error("Kesalahan registerSupplierAction:", err);
    return { error: "Gagal memproses pendaftaran. Silakan periksa kembali data Anda." };
  }

  // Alihkan langsung ke halaman status pending
  if (newUser) {
    redirect("/pending");
  }
}

// Server Action untuk keluar dari sesi (Logout)
export async function logoutAction() {
  await destroySession();
  redirect("/login");
}