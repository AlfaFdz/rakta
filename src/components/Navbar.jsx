"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import Button from "@/components/ui/Button";
import {
  LayoutDashboard,
  Users,
  Package,
  Layers,
  ArrowLeftRight,
  Truck,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";

export default function Navbar({ session }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const role = session?.role;

  // Navigation Bar
  const menuConfig = {
    admin: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Verifikasi Supplier", href: "/suppliers", icon: Users },
      { label: "Produk", href: "/products", icon: Package },
      { label: "Kategori", href: "/categories", icon: Layers },
      { label: "Transaksi", href: "/transactions", icon: ArrowLeftRight },
    ],
    warehouse_manager: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Pantau Stok", href: "/products", icon: Package },
      { label: "Kategori", href: "/categories", icon: Layers },
      { label: "Kelola Transaksi", href: "/transactions", icon: ArrowLeftRight },
      { label: "Permintaan Restock", href: "/restock", icon: Truck },
    ],
    staff_gudang: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Stok Produk", href: "/products", icon: Package },
      { label: "Barang Masuk & Keluar", href: "/transactions", icon: ArrowLeftRight },
    ],
    supplier: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Pesanan & Pengiriman", href: "/restock", icon: Truck },
      { label: "Riwayat Transaksi", href: "/transactions", icon: ArrowLeftRight },
    ],
  };

  const navItems = menuConfig[role] || [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  ];

  const roleLabels = {
    admin: "Administrator",
    warehouse_manager: "Manager Gudang",
    staff_gudang: "Staff Gudang",
    supplier: "Mitra Supplier",
  };

  return (
    <header className="sticky top-0 z-50 bg-rakta-card/90 backdrop-blur-md border-b border-rakta-subtle/70 rakta-card-shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand & Logo */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-full bg-rakta-primary text-white flex items-center justify-center font-bold text-sm shadow-xs transition-transform group-hover:scale-105">
              R
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-rakta-navy">
                RAKTA
              </span>
              <span className="hidden sm:inline-block ml-1.5 text-[10px] bg-rakta-bg text-rakta-navy px-2 py-0.5 rounded-full font-mono font-semibold border border-rakta-subtle/60">
                Gudang
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs transition-colors duration-150 ${
                    isActive
                      ? "bg-rakta-subtle/60 text-rakta-navy font-semibold shadow-2xs"
                      : "text-rakta-muted hover:bg-rakta-subtle/30 hover:text-rakta-navy font-medium"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Info: User & Logout */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-semibold text-rakta-navy leading-tight">
              {session?.nama || "Pengguna"}
            </div>
            <div className="text-[10px] font-mono text-rakta-muted capitalize">
              {roleLabels[role] || role}
            </div>
          </div>

          <span className="h-6 w-px bg-rakta-subtle/60" />

          <form action={logoutAction}>
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              className="text-xs px-3 py-1.5"
            >
              <LogOut className="w-3.5 h-3.5 mr-1" /> Keluar
            </Button>
          </form>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-2">
          <form action={logoutAction} className="sm:hidden">
            <Button type="submit" variant="ghost" size="sm" className="px-2">
              <LogOut className="w-4 h-4 text-rakta-muted" />
            </Button>
          </form>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-rakta-navy hover:bg-rakta-subtle/30 focus:outline-none"
            aria-label="Buka Menu"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-rakta-subtle/60 bg-rakta-card px-4 pt-3 pb-5 space-y-3">
          <div className="pb-2 border-b border-rakta-subtle/40 flex items-center justify-between text-xs">
            <span className="font-semibold text-rakta-navy">{session?.nama}</span>
            <span className="text-[10px] bg-rakta-bg text-rakta-navy px-2 py-0.5 rounded-full font-mono font-medium">
              {roleLabels[role] || role}
            </span>
          </div>

          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs transition-colors ${
                    isActive
                      ? "bg-rakta-subtle/60 text-rakta-navy font-semibold"
                      : "text-rakta-muted hover:bg-rakta-subtle/20 hover:text-rakta-navy font-medium"
                  }`}
                >
                  <Icon className="w-4 h-4 text-rakta-primary" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}