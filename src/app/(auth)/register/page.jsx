"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerSupplierAction } from "@/app/actions/auth";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { UserPlus, ArrowRight, Building2, AlertCircle } from "lucide-react";

export default function RegisterSupplierPage() {
  const [state, formAction, isPending] = useActionState(registerSupplierAction, null);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-lg space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#2583E8] text-white font-bold text-xl shadow-sm mb-1">
            R
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#102E50]">
            Pendaftaran Rekanan Supplier
          </h1>
          <p className="text-xs text-[#55718D]">
            Bergabung sebagai mitra logistik dan pemasok barang resmi RAKTA
          </p>
        </div>

        {/* Card Formulir Registrasi */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Informasi Perusahaan &amp; Kontak</CardTitle>
              <Building2 className="w-5 h-5 text-[#2583E8]" />
            </div>
            <CardDescription>
              Isi data perusahaan dengan lengkap. Akun akan ditinjau oleh tim kami sebelum aktif.
            </CardDescription>
          </CardHeader>

          <form action={formAction}>
            <CardContent className="space-y-3.5">
              {/* Notifikasi Error */}
              {state?.error && (
                <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <span>{state.error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Input
                  label="Nama Penanggung Jawab"
                  id="nama"
                  name="nama"
                  placeholder="Contoh: Ilham Kurniawan"
                  required
                />
                <Input
                  label="Nama Perusahaan / Supplier"
                  id="nama_perusahaan"
                  name="nama_perusahaan"
                  placeholder="Contoh: PT Mencari Cinta Sejati"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Input
                  label="Nomor Telepon / WhatsApp"
                  id="kontak"
                  name="kontak"
                  placeholder="Contoh: 081234567890"
                  required
                />
                <Input
                  label="Alamat Email Bisnis"
                  id="email"
                  name="email"
                  type="email"
                  placeholder="bocilkematian@perusahaan.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Input
                  label="Kata Sandi"
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Minimal 6 karakter"
                  required
                  autoComplete="new-password"
                />
                <Input
                  label="Konfirmasi Kata Sandi"
                  id="konfirmasiPassword"
                  name="konfirmasiPassword"
                  type="password"
                  placeholder="Ulangi kata sandi"
                  required
                  autoComplete="new-password"
                />
              </div>
            </CardContent>

            <CardFooter className="flex-col gap-3 pt-4">
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isPending}
              >
                Ajukan Pendaftaran <UserPlus className="w-4 h-4 ml-1" />
              </Button>

              <div className="text-center text-xs text-[#55718D] pt-2">
                Sudah memiliki akun?{" "}
                <Link
                  href="/login"
                  className="text-[#2583E8] font-semibold hover:text-[#102E50] transition-colors"
                >
                  Masuk di sini
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

      </div>
    </div>
  );
}