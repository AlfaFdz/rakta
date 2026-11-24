import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { logoutAction } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Clock, ShieldAlert, LogOut, Building2, Mail, UserCheck, AlertTriangle } from "lucide-react";

export default async function PendingPage() {
  const session = await getSession();

  // Jika belum ada sesi aktif, arahkan ke halaman login
  if (!session) {
    redirect("/login");
  }

  // Jika akun sudah approved, arahkan ke dashboard
  if (session.status === "approved") {
    redirect("/dashboard");
  }

  // Ambil alasan penolakan terkini dari database jika akun ditolak
  let rejectionReason = null;
  if (session.status === "rejected") {
    try {
      const res = await query("SELECT rejection_reason FROM users WHERE id = $1", [session.id]);
      rejectionReason = res.rows[0]?.rejection_reason || null;
    } catch (err) {
      console.error("Gagal mengambil rejection_reason:", err);
    }
  }

  const isRejected = session.status === "rejected";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rakta-primary text-white font-bold text-xl shadow-sm mb-1">
            R
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-rakta-navy">
            RAKTA
          </h1>
          <p className="text-xs text-rakta-muted">
            Status Akun Rekanan Supplier
          </p>
        </div>

        {/* Card Status */}
        <Card className="text-center">
          <div className="pt-2 pb-4 flex justify-center">
            {isRejected ? (
              <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center shadow-xs">
                <ShieldAlert className="w-7 h-7" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shadow-xs">
                <Clock className="w-7 h-7" />
              </div>
            )}
          </div>

          <CardTitle className="text-lg">
            {isRejected ? "Pendaftaran Tidak Disetujui" : "Menunggu Persetujuan Admin"}
          </CardTitle>

          <CardDescription className="mt-2 text-xs leading-relaxed px-2">
            {isRejected ? (
              <>
                Mohon maaf, pengajuan akun supplier untuk{" "}
                <span className="font-semibold text-rakta-navy">{session.nama_perusahaan || session.nama}</span>{" "}
                belum dapat kami setujui saat ini. Silakan hubungi tim logistik RAKTA untuk informasi lebih lanjut.
              </>
            ) : (
              <>
                Halo <span className="font-semibold text-rakta-navy">{session.nama}</span>, pendaftaran perusahaan Anda (
                <span className="font-semibold text-rakta-navy">{session.nama_perusahaan}</span>) telah kami terima dan saat ini sedang ditinjau oleh Administrator Gudang.
              </>
            )}
          </CardDescription>

          <div className="my-6 p-4 bg-rakta-surface border border-rakta-subtle/60 rounded-xl text-left text-xs space-y-2">
            <div className="flex items-center justify-between text-rakta-muted">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-rakta-primary" />
                Email Akun:
              </span>
              <span className="font-mono text-rakta-navy font-medium">{session.email}</span>
            </div>
            <div className="flex items-center justify-between text-rakta-muted">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-rakta-primary" />
                Perusahaan:
              </span>
              <span className="text-rakta-navy font-medium">{session.nama_perusahaan || "-"}</span>
            </div>
            <div className="flex items-center justify-between text-rakta-muted">
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-rakta-primary" />
                Status Akun:
              </span>
              <span
                className={`font-semibold capitalize px-2 py-0.5 rounded-full text-[11px] ${
                  isRejected
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : "bg-amber-50 text-amber-800 border border-amber-200"
                }`}
              >
                {session.status}
              </span>
            </div>

            {isRejected && rejectionReason && (
              <div className="pt-2 mt-2 border-t border-rakta-subtle/50 text-xs">
                <span className="font-semibold text-rose-700 block mb-0.5">Alasan Penolakan:</span>
                <p className="text-rakta-navy bg-rose-50/60 p-2.5 rounded-lg border border-rose-200/80 italic">
                  &ldquo;{rejectionReason}&rdquo;
                </p>
              </div>
            )}
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