import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "rahasia_rakta_2026";
const secretKey = new TextEncoder().encode(JWT_SECRET);
const COOKIE_NAME = "rakta_session";

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;

  let session = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secretKey);
      session = payload;
    } catch (err) {
      // Token tidak valid atau sudah kedaluwarsa
      session = null;
    }
  }

  // Rute halaman autentikasi (login & register)
  const isAuthRoute = pathname === "/login" || pathname === "/register";

  // Rute privat yang mewajibkan pengguna terautentikasi
  const privateRoutes = [
    "/dashboard",
    "/products",
    "/categories",
    "/transactions",
    "/restock",
    "/suppliers",
    "/pending",
  ];
  const isPrivateRoute = privateRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  // 1. PENGGUNA BELUM LOGIN
  if (!session) {
    // Jika mencoba membuka rute privat apa pun, redirect ke /login
    if (isPrivateRoute) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    // Jika rute publik/auth, izinkan lewat
    return NextResponse.next();
  }

  // 2. PENGGUNA SUDAH LOGIN
  const { role, status } = session;

  // A. Akun Supplier dengan status 'pending' atau 'rejected':
  // Hanya diizinkan mengakses /pending; rute lain otomatis diredirect ke /pending
  if (role === "supplier" && (status === "pending" || status === "rejected")) {
    if (pathname !== "/pending") {
      return NextResponse.redirect(new URL("/pending", request.url));
    }
    return NextResponse.next();
  }

  // B. Pengguna berstatus 'approved' yang membuka /login atau /register:
  // Otomatis diarahkan ke /dashboard
  if (isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // C. Pengguna berstatus 'approved' yang membuka /pending:
  // Otomatis diarahkan ke /dashboard karena akun sudah tidak pending
  if (status === "approved" && pathname === "/pending") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // D. Pembatasan akses berbasis Use Case Diagram (RBAC):
  // 1) /suppliers: Hanya boleh diakses oleh 'admin'
  if (pathname === "/suppliers" || pathname.startsWith("/suppliers/")) {
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // 2) /categories: Hanya boleh diakses oleh 'admin' dan 'warehouse_manager'
  if (pathname === "/categories" || pathname.startsWith("/categories/")) {
    if (role !== "admin" && role !== "warehouse_manager") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // 3) /products: Boleh diakses oleh 'admin' (Kelola Produk), 'staff_gudang' (Kelola Stok), dan 'warehouse_manager' (Pantau Stok)
  // Supplier DILARANG mengakses modul produk
  if (pathname === "/products" || pathname.startsWith("/products/")) {
    if (role !== "admin" && role !== "warehouse_manager" && role !== "staff_gudang") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // 4) /transactions dan /restock: Boleh diakses oleh semua role approved
  if (
    pathname === "/transactions" || pathname.startsWith("/transactions/") ||
    pathname === "/restock" || pathname.startsWith("/restock/")
  ) {
    if (status !== "approved") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images).*)",
  ],
};