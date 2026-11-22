import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";

export default async function DashboardLayout({ children }) {
  const session = await getSession();

  // Proteksi lapis kedua: pastikan sesi aktif
  if (!session) {
    redirect("/login");
  }

  // Jika akun supplier belum disetujui, arahkan ke /pending
  if (session.role === "supplier" && session.status !== "approved") {
    redirect("/pending");
  }

  return (
    <div className="min-h-screen flex flex-col bg-linear-to-b from-rakta-bg to-rakta-surface text-rakta-navy">
      <Navbar session={session} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {children}
      </main>
      <footer className="border-t border-rakta-subtle/50 py-6 text-center text-xs text-rakta-muted">
        RAKTA &copy; 2026 &mdash; Sistem Manajemen Gudang &amp; Logistik Terpadu.
      </footer>
    </div>
  );
}
