import { hitungStatusStok } from "@/lib/format";

export default function StockBadge({
  status,
  jumlahStok,
  stokMinimum = 10,
  stokLow = 20,
  className = "",
}) {
  // Jika diberikan jumlahStok langsung, hitung statusnya
  const info =
    status && typeof status === "object"
      ? status
      : typeof status === "string"
      ? { kode: status, label: status.toUpperCase() }
      : hitungStatusStok(jumlahStok, stokMinimum, stokLow);

  const styles = {
    habis: "bg-slate-100 text-slate-600 border-slate-200",
    kritis: "bg-red-50 text-red-700 border-red-200",
    menipis: "bg-amber-50 text-amber-800 border-amber-200",
    normal: "bg-[#E8F4FD] text-[#2583E8] border-[#B9D8F5]",
  };

  const dotStyles = {
    habis: "bg-slate-400",
    kritis: "bg-red-500",
    menipis: "bg-amber-500",
    normal: "bg-[#2583E8]",
  };

  const styleDipakai = styles[info.kode] || styles.normal;
  const dotDipakai = dotStyles[info.kode] || dotStyles.normal;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${styleDipakai} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotDipakai}`} />
      {info.label}
    </span>
  );
}