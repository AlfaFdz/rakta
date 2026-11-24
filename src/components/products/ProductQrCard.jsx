"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import Button from "@/components/ui/Button";
import { Download, Printer, Check, Copy } from "lucide-react";

export default function ProductQrCard({ product }) {
  const canvasRef = useRef(null);
  const printCanvasRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [qrReady, setQrReady] = useState(false);

  useEffect(() => {
    if (!product?.sku || !canvasRef.current) return;

    // Render QR Code pada canvas preview
    QRCode.toCanvas(
      canvasRef.current,
      product.sku,
      {
        width: 220,
        margin: 2,
        color: {
          dark: "#102E50",
          light: "#FFFFFF",
        },
      },
      (error) => {
        if (error) {
          console.error("Gagal membuat QR Code:", error);
        } else {
          setQrReady(true);
        }
      }
    );

    // Render QR Code pada canvas cetak label rak
    if (printCanvasRef.current) {
      QRCode.toCanvas(
        printCanvasRef.current,
        product.sku,
        {
          width: 200,
          margin: 1,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        },
        (error) => {
          if (error) console.error("Gagal membuat QR Cetak:", error);
        }
      );
    }
  }, [product?.sku]);

  // Handler: Mengunduh citra QR Code lengkap dengan label SKU dan nama produk
  const handleDownloadPng = () => {
    if (!canvasRef.current || !product) return;

    const sourceCanvas = canvasRef.current;
    const downloadCanvas = document.createElement("canvas");
    const ctx = downloadCanvas.getContext("2d");

    const width = 420;
    const height = 500;
    downloadCanvas.width = width;
    downloadCanvas.height = height;

    // Latar belakang putih bersih
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);

    // Bingkai luar halus
    ctx.strokeStyle = "#D5E6F7";
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, width - 16, height - 16);

    // Header label gudang
    ctx.fillStyle = "#2583E8";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("RAKTA GUDANG - LABEL SKU RESMI", width / 2, 38);

    // Gambar QR Code di bagian tengah
    const qrSize = 250;
    const qrX = (width - qrSize) / 2;
    const qrY = 55;
    ctx.drawImage(sourceCanvas, qrX, qrY, qrSize, qrSize);

    // Label Kode SKU (Tebal & Dominan)
    ctx.fillStyle = "#102E50";
    ctx.font = "bold 24px monospace";
    ctx.fillText(product.sku, width / 2, 345);

    // Nama Produk
    ctx.fillStyle = "#55718D";
    ctx.font = "600 14px sans-serif";
    const namaProduk =
      product.nama.length > 36 ? product.nama.slice(0, 33) + "..." : product.nama;
    ctx.fillText(namaProduk, width / 2, 378);

    // Lokasi Rak & Kategori
    ctx.fillStyle = "#102E50";
    ctx.font = "bold 13px sans-serif";
    const infoLokasi = `RAK: ${product.lokasi_rak || "UMUM"} | ${product.category_nama || "Katalog"}`;
    ctx.fillText(infoLokasi, width / 2, 412);

    // Footer info unit
    ctx.fillStyle = "#55718D";
    ctx.font = "12px sans-serif";
    ctx.fillText(`Satuan: ${product.unit || "pcs"}`, width / 2, 438);

    // Trigger unduhan file PNG
    const link = document.createElement("a");
    link.download = `QR-${product.sku}.png`;
    link.href = downloadCanvas.toDataURL("image/png");
    link.click();
  };

  // Handler: Mencetak label rak gudang via dialog cetak browser
  const handlePrintLabel = () => {
    window.print();
  };

  // Handler: Menyalin kode SKU ke papan klip
  const handleCopySku = () => {
    if (!product?.sku) return;
    navigator.clipboard.writeText(product.sku);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Tampilan Kartu di Layar */}
      <div className="bg-white border border-rakta-border rounded-2xl p-5 rakta-card-shadow flex flex-col items-center text-center">
        {/* Header Kartu */}
        <div className="w-full flex items-center justify-between pb-3.5 border-b border-rakta-border">
          <h3 className="text-sm font-bold text-rakta-navy">QR Code SKU Produk</h3>
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-rakta-surface text-rakta-navy border border-rakta-border">
            Format Standar
          </span>
        </div>

        {/* Area Tampilan Canvas QR Code */}
        <div className="my-5 p-4 bg-rakta-surface border border-rakta-border rounded-2xl flex flex-col items-center">
          <canvas
            ref={canvasRef}
            className="w-44 h-44 rounded-xl bg-white shadow-xs p-1"
          />
          <div className="mt-3 flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-rakta-navy bg-white px-2.5 py-1 rounded-md border border-rakta-border">
              {product.sku}
            </span>
            <button
              onClick={handleCopySku}
              className="p-1 text-rakta-muted hover:text-rakta-navy rounded-md hover:bg-white transition-colors cursor-pointer"
              title="Salin SKU"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <p className="text-[11px] text-rakta-muted mt-1.5 max-w-xs">
            Pindai kode QR untuk identifikasi cepat saat proses stock opname dan logistik.
          </p>
        </div>

        {/* Dua Tombol Aksi (rounded-xl) */}
        <div className="w-full flex flex-col sm:flex-row items-center gap-2.5">
          <Button
            onClick={handleDownloadPng}
            disabled={!qrReady}
            className="w-full sm:flex-1 rounded-xl bg-rakta-primary hover:bg-rakta-primary-hover text-white text-xs font-semibold py-2 px-4 flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh PNG</span>
          </Button>

          <Button
            onClick={handlePrintLabel}
            variant="outline"
            disabled={!qrReady}
            className="w-full sm:flex-1 rounded-xl bg-white hover:bg-rakta-surface border border-rakta-border text-rakta-navy text-xs font-semibold py-2 px-4 flex items-center justify-center gap-1.5 transition-all shadow-none cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Label</span>
          </Button>
        </div>
      </div>

      {/* Area Label Rak Khusus Media Cetak */}
      <div id="printable-sku-label" className="hidden">
        <div className="label-container">
          <div className="label-header">RAKTA WAREHOUSE LABEL</div>
          <div className="label-qr-wrap">
            <canvas ref={printCanvasRef} className="label-qr-canvas" />
          </div>
          <div className="label-sku">{product.sku}</div>
          <div className="label-nama">{product.nama}</div>
          <div className="label-details">
            <span><strong>RAK:</strong> {product.lokasi_rak || "UMUM"}</span>
            <span><strong>KAT:</strong> {product.category_nama || "-"}</span>
            <span><strong>UNIT:</strong> {product.unit}</span>
          </div>
        </div>
      </div>

      {/* Aturan CSS Cetak Khusus (@media print) */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }

          #printable-sku-label,
          #printable-sku-label * {
            visibility: visible !important;
          }

          #printable-sku-label {
            display: block !important;
            position: fixed !important;
            left: 50% !important;
            top: 20mm !important;
            transform: translateX(-50%) !important;
            width: 80mm !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: system-ui, -apple-system, sans-serif !important;
          }

          .label-container {
            border: 2px solid #000000 !important;
            border-radius: 4px !important;
            padding: 4mm !important;
            text-align: center !important;
            background: #ffffff !important;
          }

          .label-header {
            font-size: 10px !important;
            font-weight: 800 !important;
            letter-spacing: 0.5px !important;
            border-bottom: 1.5px solid #000000 !important;
            padding-bottom: 2mm !important;
            margin-bottom: 3mm !important;
          }

          .label-qr-wrap {
            display: flex !important;
            justify-content: center !important;
            margin-bottom: 2mm !important;
          }

          .label-qr-canvas {
            width: 38mm !important;
            height: 38mm !important;
          }

          .label-sku {
            font-family: monospace !important;
            font-size: 14px !important;
            font-weight: 800 !important;
            letter-spacing: 0.5px !important;
            margin-bottom: 1.5mm !important;
          }

          .label-nama {
            font-size: 11px !important;
            font-weight: 600 !important;
            line-height: 1.2 !important;
            margin-bottom: 2.5mm !important;
            max-height: 2.4em !important;
            overflow: hidden !important;
          }

          .label-details {
            display: flex !important;
            justify-content: space-around !important;
            font-size: 9px !important;
            border-top: 1px dashed #000000 !important;
            padding-top: 2mm !important;
          }
        }
      `}</style>
    </>
  );
}