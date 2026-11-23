// Utilitas untuk mengekspor data array of objects menjadi file CSV berformat UTF-8 BOM.
// Karakter BOM (\uFEFF) di awal data menjamin Microsoft Excel dapat langsung
// membaca simbol mata uang, aksen, dan karakter UTF-8 tanpa distorsi encoding.
export function exportToCsv(filename, columns = [], rows = []) {
  if (!rows || rows.length === 0) {
    alert("Tidak ada data untuk diekspor.");
    return;
  }

  // 1. Baris Judul Kolom (Header)
  const headerRow = columns.map((col) => escapeCsvValue(col.label)).join(",");

  // 2. Baris Data (Rows)
  const dataRows = rows.map((row) =>
    columns
      .map((col) => {
        let val;
        if (typeof col.key === "function") {
          val = col.key(row);
        } else {
          val = row[col.key];
        }
        return escapeCsvValue(val);
      })
      .join(",")
  );

  // 3. Gabungkan header dan data dengan CRLF (\r\n) standar Windows/Excel
  const csvBody = [headerRow, ...dataRows].join("\r\n");
  const csvWithBom = "\uFEFF" + csvBody;

  // 4. Unduh file melalui Blob URL
  const blob = new Blob([csvWithBom], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const finalFilename = filename.endsWith(".csv") ? filename : `${filename}.csv`;

  anchor.setAttribute("href", url);
  anchor.setAttribute("download", finalFilename);
  anchor.style.visibility = "hidden";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

// Helper untuk melakukan sanitasi nilai sel CSV:
// - Menangani nilai null / undefined
// - Mengapit teks dengan tanda kutip ganda jika mengandung koma, tanda kutip, atau newline
// - Menggandakan karakter kutip ganda (escaping RFC 4180)
function escapeCsvValue(val) {
  if (val === null || val === undefined) {
    return '""';
  }

  const str = String(val).trim();

  // Cek apakah string mengandung karakter pembatas atau pemisah
  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r") ||
    str.includes(";")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return `"${str}"`;
}