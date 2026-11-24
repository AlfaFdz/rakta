"use client";

import { useActionState } from "react";
import Link from "next/link";
import Image from "next/image";
import { loginAction } from "@/app/actions/auth";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md space-y-6">
        
        {/* Header Identitas Brand & Logo Mandiri */}
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
            Warehouse Management System
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-rakta-navy">
            RAKTA
          </h1>
          <p className="text-xs text-rakta-muted">
            Sistem Manajemen Pergudangan &amp; Logistik Terpadu
          </p>
        </div>

        {/* Card Login */}
        <Card className="rounded-2xl border-rakta-border rakta-card-shadow">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-rakta-navy">
              Masuk ke Akun
            </CardTitle>
            <CardDescription className="text-xs text-rakta-muted mt-1">
              Gunakan email terdaftar dan kata sandi Anda untuk mengakses sistem.
            </CardDescription>
          </CardHeader>

          <form action={formAction}>
            <CardContent className="space-y-4">
              {/* Notifikasi Error jika login gagal */}
              {state?.error && (
                <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{state.error}</span>
                </div>
              )}

              <Input
                label="Alamat Email"
                id="email"
                name="email"
                type="email"
                placeholder="nama@email.com"
                required
                autoComplete="email"
              />

              <Input
                label="Kata Sandi"
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </CardContent>

            <CardFooter className="flex-col gap-3 pt-4">
              <Button
                type="submit"
                variant="primary"
                className="w-full rounded-xl bg-rakta-primary hover:bg-rakta-primary-hover text-white font-semibold py-2.5 text-sm cursor-pointer shadow-xs"
                isLoading={isPending}
              >
                Masuk Sekarang
              </Button>

              <div className="text-center text-xs text-rakta-muted pt-2">
                Pemasok / Rekanan baru?{" "}
                <Link
                  href="/register"
                  className="text-rakta-primary font-semibold hover:text-rakta-navy transition-colors"
                >
                  Daftar sebagai Supplier
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

      </div>
    </div>
  );
}