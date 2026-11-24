import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { logoutAction } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Mail, Building2, UserCheck, LogOut } from "lucide-react";

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
        
        {/* Brand Header & Logo Mandiri */}
        <div className="text-center space-y-1">
          <div className="flex justify-center mb-3">
            <Image
              src="/logo.svg"
              alt="Logo RAKTA"
              width={64}
              height={64}
              priority
              className="w-16 h-16 rounded-2xl shadow-xs"
            />
          </div>
          <span className="text-xs font-semibold text-rakta-primary tracking-widest uppercase">
            Status Kemitraan
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-rakta-navy">
            RAKTA
          </h1>
          <p className="text-xs text-rakta-muted">
            Status Akun Rekanan Supplier
          </p>
        </div>

        {/* Card Status */}
        <Card className="rounded-2xl border-rakta-border rakta-card-shadow text-center p-6">
          <CardTitle className="text-lg font-bold text-rakta-navy">
            {isRejected ? "Pendaftaran Tidak Disetujui" : "Menunggu Persetujuan Admin"}
          </CardTitle>

          <CardDescription className="mt-2 text-xs text-rakta-muted leading-relaxed">
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

          <div className="my-6 p-4 bg-rakta-surface border border-rakta-border rounded-xl text-left text-xs space-y-2.5">
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
              <span className="text-rakta-navy font-medium">{session.nama_perusahaan || "Tidak ditentukan"}</span>
            </div>
            <div className="flex items-center justify-between text-rakta-muted">
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-rakta-primary" />
                Status Akun:
              </span>
              <span
                className={`font-semibold capitalize px-2.5 py-0.5 rounded-full text-xs border ${
                  isRejected
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-amber-50 text-amber-800 border-amber-200"
                }`}
              >
                {session.status}
              </span>
            </div>

            {isRejected && rejectionReason && (
              <div className="pt-2 mt-2 border-t border-rakta-border text-xs">
                <span className="font-semibold text-rose-700 block mb-1">Alasan Penolakan:</span>
                <p className="text-rakta-navy bg-rakta-card p-2.5 rounded-lg border border-rose-200/80 italic">
                  &ldquo;{rejectionReason}&rdquo;
                </p>
              </div>
            )}
          </div>

          <form action={logoutAction}>
            <Button
              type="submit"
              variant="outline"
              className="w-full rounded-xl border-rakta-border text-rakta-navy hover:bg-rakta-surface font-semibold text-xs py-2.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-1.5" />
              <span>Keluar dari Sesi</span>
            </Button>
          </form>
        </Card>

      </div>
    </div>
  );
}