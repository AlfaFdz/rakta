import { getSession } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import StockBadge from "@/components/ui/StockBadge";
import { LogOut, UserCheck, Shield, Building, Mail, CheckCircle2 } from "lucide-react";

export default async function DashboardPage() {
  const session = await getSession();

  // Jika belum login, alihkan ke halaman login
  if (!session) {
    redirect("/login");
  }

  // Jika supplier dengan status pending atau rejected, arahkan ke /pending
  if (session.role === "supplier" && session.status !== "approved") {
    redirect("/pending");
  }

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header Bar */}
        <div className="bg-white/90 backdrop-blur-xs border border-[#B9D8F5]/70 rounded-2xl p-5 rakta-card-shadow flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#2583E8] text-white flex items-center justify-center font-bold text-lg shadow-sm">
              R
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#102E50]">
                RAKTA Dashboard
              </h1>
              <p className="text-xs text-[#55718D]">
                Sistem Manajemen Pergudangan &amp; Logistik
              </p>
            </div>
          </div>

          <form action={logoutAction}>
            <Button type="submit" variant="secondary" size="sm">
              <LogOut className="w-3.5 h-3.5 mr-1" /> Keluar
            </Button>
          </form>
        </div>

        {/* Card Sambutan & Info Sesi */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Selamat Datang, {session.nama}!</CardTitle>
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Sesi Terautentikasi</span>
              </div>
            </div>
            <CardDescription>
              Login berhasil. Berikut rincian profil sesi aktif Anda pada sistem RAKTA:
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-[#F2F8FF] border border-[#B9D8F5]/60 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[#55718D]">
                  <Mail className="w-3.5 h-3.5 text-[#2583E8]" />
                  <span>Email Akun</span>
                </div>
                <div className="text-sm font-semibold text-[#102E50] font-mono">
                  {session.email}
                </div>
              </div>

              <div className="p-4 bg-[#F2F8FF] border border-[#B9D8F5]/60 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[#55718D]">
                  <Shield className="w-3.5 h-3.5 text-[#2583E8]" />
                  <span>Peran Pengguna (Role)</span>
                </div>
                <div className="text-sm font-semibold text-[#102E50] uppercase font-mono">
                  {session.role}
                </div>
              </div>

              <div className="p-4 bg-[#F2F8FF] border border-[#B9D8F5]/60 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[#55718D]">
                  <Building className="w-3.5 h-3.5 text-[#2583E8]" />
                  <span>Perusahaan / Afiliasi</span>
                </div>
                <div className="text-sm font-semibold text-[#102E50]">
                  {session.nama_perusahaan || "PT Rakta Logistik Utama"}
                </div>
              </div>

              <div className="p-4 bg-[#F2F8FF] border border-[#B9D8F5]/60 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[#55718D]">
                  <UserCheck className="w-3.5 h-3.5 text-[#2583E8]" />
                  <span>Status Akun</span>
                </div>
                <div className="text-sm font-semibold text-emerald-700 capitalize">
                  {session.status}
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border border-[#B9D8F5]/50 rounded-xl text-xs text-[#55718D] leading-relaxed">
              Modul lengkap dashboard analitik, ringkasan inventaris gudang, serta manajemen transaksi akan diaktifkan secara komprehensif pada tahap pengembangan berikutnya.
            </div>
          </CardContent>

          <CardFooter className="justify-between">
            <span className="text-xs text-[#55718D]">ID Pengguna: #{session.id}</span>
            <form action={logoutAction}>
              <Button type="submit" variant="primary">
                Keluar dari Sistem
              </Button>
            </form>
          </CardFooter>
        </Card>

      </div>
    </div>
  );
}