import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "rahasia_rakta_2026";
const secretKey = new TextEncoder().encode(JWT_SECRET);
const COOKIE_NAME = "rakta_session";

// Menghasilkan hash kata sandi yang aman menggunakan bcryptjs
export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

// Memverifikasi kecocokan kata sandi plain dengan hash bcrypt
export async function verifyPassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

// Membuat sesi pengguna dan menyimpannya di HTTP-Only Cookie
export async function createSession(user) {
  const payload = {
    id: user.id,
    email: user.email,
    nama: user.nama,
    role: user.role,
    status: user.status,
    nama_perusahaan: user.nama_perusahaan || null,
  };

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 hari
  });

  return token;
}

// Mengambil dan memvalidasi sesi pengguna aktif dari cookie
export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload;
  } catch (err) {
    // Token kedaluwarsa atau tidak valid
    return null;
  }
}

// Menghapus sesi pengguna aktif dari cookie (Logout)
export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
