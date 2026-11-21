import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "RAKTA — Sistem Manajemen Gudang",
  description: "Sistem Manajemen Gudang RAKTA modern, minimalis, dan terstruktur.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="id"
      className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col font-sans bg-gradient-to-b from-[#DCEBFA] to-[#F2F8FF] text-[#102E50] antialiased selection:bg-[#D4E7FA]">
        {children}
      </body>
    </html>
  );
}
