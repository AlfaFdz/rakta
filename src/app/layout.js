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
      <body className="min-h-full flex flex-col font-sans bg-linear-to-b from-rakta-bg to-rakta-surface text-rakta-navy antialiased selection:bg-rakta-subtle/50">
        {children}
      </body>
    </html>
  );
}