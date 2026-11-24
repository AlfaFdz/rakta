export default function StockBadge({ status, label, qty, unit = "Unit", className = "" }) {
  // Dukungan input berupa string kode atau objek { kode, label } dari hitungStatusStok
  const statusCode =
    typeof status === "object" && status !== null
      ? status.kode || status.status || ""
      : typeof status === "string"
      ? status
      : "";

  const customLabel =
    label || (typeof status === "object" && status !== null ? status.label : null);

  // 4 Level status stok otomatis
  const configs = {
    // 1. Out of Stock (Abu-abu)
    out_of_stock: {
      label: "Out of Stock",
      bg: "bg-slate-100 text-slate-700 border-slate-200",
      dot: "bg-slate-400",
    },
    habis: {
      label: "Out of Stock",
      bg: "bg-slate-100 text-slate-700 border-slate-200",
      dot: "bg-slate-400",
    },

    // 2. Severe (Merah)
    severe: {
      label: "Severe",
      bg: "bg-rose-50 text-rose-700 border-rose-200",
      dot: "bg-rose-500",
    },
    critical: {
      label: "Severe",
      bg: "bg-rose-50 text-rose-700 border-rose-200",
      dot: "bg-rose-500",
    },
    kritis: {
      label: "Severe",
      bg: "bg-rose-50 text-rose-700 border-rose-200",
      dot: "bg-rose-500",
    },

    // 3. Low (Kuning)
    low: {
      label: "Low",
      bg: "bg-amber-50 text-amber-700 border-amber-200",
      dot: "bg-amber-500",
    },
    menipis: {
      label: "Low",
      bg: "bg-amber-50 text-amber-700 border-amber-200",
      dot: "bg-amber-500",
    },

    // 4. Normal (Hijau)
    normal: {
      label: "Normal",
      bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dot: "bg-emerald-500",
    },
    aman: {
      label: "Normal",
      bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dot: "bg-emerald-500",
    },
  };

  const current = configs[statusCode?.toLowerCase()] || configs.normal;
  const displayLabel = customLabel || current.label;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border tabular-nums ${current.bg} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot} shrink-0`} />
      <span>{displayLabel}</span>
      {qty !== undefined && (
        <span className="text-[10px] opacity-80 font-mono">
          ({qty} {unit})
        </span>
      )}
    </span>
  );
}