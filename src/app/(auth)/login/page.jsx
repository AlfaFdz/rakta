"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/app/actions/auth";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { LogIn, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rakta-primary text-white font-bold text-xl shadow-sm mb-1">
            R
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-rakta-navy">
            RAKTA
          </h1>
          <p className="text-xs text-rakta-muted">
            Sistem Manajemen Pergudangan &amp; Logistik Terpadu
          </p>
        </div>

        {/* Card Login */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Masuk ke Akun</CardTitle>
              <LogIn className="w-5 h-5 text-rakta-primary" />
            </div>
            <CardDescription>
              Gunakan email terdaftar dan kata sandi Anda untuk mengakses sistem.
            </CardDescription>
          </CardHeader>

          <form action={formAction}>
            <CardContent>
              {/* Notifikasi Error jika login gagal */}
              {state?.error && (
                <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
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
                className="w-full"
                isLoading={isPending}
              >
                Masuk Sekarang <ArrowRight className="w-4 h-4 ml-1" />
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