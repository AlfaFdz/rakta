// Memformat angka nominal menjadi mata uang Rupiah Indonesia.
// Contoh: 450000 -> "Rp 450.000"
export function formatRupiah(angka) {
  const nominal = Number(angka) || 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(nominal);
}

// Memformat tanggal ke dalam format Bahasa Indonesia yang natural.
// Contoh: "2026-11-21" -> "21 November 2026"
export function formatTanggal(tanggal, denganWaktu = false) {
  if (!tanggal) return "-";
  const dateObj = new Date(tanggal);
  if (isNaN(dateObj.getTime())) return "-";

  const opsi = {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(denganWaktu && {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };

  return new Intl.DateTimeFormat("id-ID", opsi).format(dateObj);
}

// Menghitung status stok barang berdasarkan 4 level stok gudang:
// - Out of Stock (Abu-abu): Stok = 0
// - Severe (Merah): 0 < Stok <= Stok Minimum
// - Low (Kuning): Stok Minimum < Stok <= Stok Low (validasi form: Stok Low > Stok Minimum)
// - Normal (Hijau): Stok > Stok Low
export function hitungStatusStok(jumlahStok, stokMinimum = 10, stokLow = 20) {
  const stok = Number(jumlahStok) || 0;
  const min = Number(stokMinimum) || 0;
  const low = Number(stokLow) || 0;

  if (stok <= 0) {
    return { kode: "habis", label: "Out of Stock" };
  }
  if (stok <= min) {
    return { kode: "kritis", label: "Severe" };
  }
  if (stok <= low) {
    return { kode: "menipis", label: "Low" };
  }
  return { kode: "normal", label: "Normal" };
}