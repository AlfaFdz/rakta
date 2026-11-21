import { getSession } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Clock, ShieldAlert, LogOut } from "lucide-react";

export default async function PendingPage() {
  const session = await getSession();

  // Jika belum ada sesi, arahkan ke halaman login
  if (!session) {
    redirect("/login");
  }

  // Jika akun sudah approved, arahkan ke dashboard
  if (session.status === "approved") {
    redirect("/dashboard");
  }

  const isRejected = session.status === "rejected";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#2583E8] text-white font-bold text-xl shadow-sm mb-1">
            R
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#102E50]">
            RAKTA
          </h1>
          <p className="text-xs text-[#55718D]">
            Status Akun Rekanan Supplier
          </p>
        </div>

        {/* Card Status */}
        <Card className="text-center">
          <div className="pt-2 pb-4 flex justify-center">
            {isRejected ? (
              <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <ShieldAlert className="w-7 h-7" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                <Clock className="w-7 h-7" />
              </div>
            )}
          </div>

          <CardTitle className="text-lg">
            {isRejected ? "Pendaftaran Tidak Disetujui" : "Menunggu Persetujuan Admin"}
          </CardTitle>

          <CardDescription className="mt-2 text-xs leading-relaxed">
            {isRejected ? (
              <>
                Mohon maaf, pengajuan akun supplier untuk{" "}
                <span className="font-semibold text-[#102E50]">{session.nama_perusahaan || session.nama}</span>{" "}
                belum dapat kami setujui saat ini. Silakan hubungi tim logistik RAKTA untuk informasi lebih lanjut.
              </>
            ) : (
              <>
                Halo <span className="font-semibold text-[#102E50]">{session.nama}</span>, pendaftaran perusahaan Anda (
                <span className="font-semibold text-[#102E50]">{session.nama_perusahaan}</span>) telah kami terima dan saat ini sedang ditinjau oleh Administrator Gudang.
              </>
            )}
          </CardDescription>

          <div className="my-6 p-4 bg-[#F2F8FF] border border-[#B9D8F5]/60 rounded-xl text-left text-xs space-y-1.5">
            <div className="text-[#55718D]">
              Email Terdaftar: <span className="font-mono text-[#102E50] font-medium">{session.email}</span>
            </div>
            <div className="text-[#55718D]">
              Peran: <span className="text-[#102E50] font-medium uppercase font-mono">{session.role}</span>
            </div>
            <div className="text-[#55718D]">
              Status Akun:{" "}
              <span className={`font-semibold capitalize ${isRejected ? "text-red-600" : "text-amber-600"}`}>
                {session.status}
              </span>
            </div>
          </div>

          <form action={logoutAction}>
            <Button type="submit" variant="secondary" className="w-full">
              <LogOut className="w-4 h-4 mr-1.5" /> Keluar dari Sesi
            </Button>
          </form>
        </Card>

      </div>
    </div>
  );
}