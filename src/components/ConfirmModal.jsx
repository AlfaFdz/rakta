"use client";

import { useEffect } from "react";
import { AlertTriangle, HelpCircle, Loader2, X } from "lucide-react";

export default function ConfirmModal({
  isOpen = false,
  onClose,
  onConfirm,
  title = "Konfirmasi Tindakan",
  message = "Apakah Anda yakin ingin melanjutkan tindakan ini?",
  confirmText = "Konfirmasi",
  cancelText = "Batal",
  variant = "primary", // 'primary' | 'danger'
  isLoading = false,
  icon: CustomIcon,
}) {
  // Tangani penutupan modal via tombol Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !isLoading && onClose) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const isDanger = variant === "danger";

  // Ikon default berdasarkan varian
  const IconComponent = CustomIcon || (isDanger ? AlertTriangle : HelpCircle);

  return (
    <div
      onClick={() => {
        if (!isLoading && onClose) onClose();
      }}
      className="fixed inset-0 z-50 bg-rakta-navy/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-rakta-card border border-rakta-subtle/70 rounded-2xl w-full max-w-md p-6 rakta-card-shadow relative my-8 animate-in zoom-in-95 duration-150"
      >
        {/* Tombol X Tutup */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 text-rakta-muted hover:text-rakta-navy p-1 transition-colors rounded-lg disabled:opacity-40 cursor-pointer"
          title="Tutup dialog"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          {/* Ikon Varian */}
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 border ${
              isDanger
                ? "bg-rose-50 text-rose-600 border-rose-200/80"
                : "bg-rakta-bg text-rakta-primary border-rakta-subtle"
            }`}
          >
            <IconComponent className="w-5 h-5" />
          </div>

          {/* Konten Teks */}
          <div className="space-y-1 pr-6 flex-1">
            <h3 className="text-base font-bold text-rakta-navy">{title}</h3>
            <p className="text-xs text-rakta-muted leading-relaxed whitespace-pre-line">
              {message}
            </p>
          </div>
        </div>

        {/* Tombol Aksi */}
        <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-rakta-subtle/60">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-full px-4 py-2 text-xs font-semibold bg-rakta-card border border-rakta-subtle text-rakta-navy hover:bg-rakta-surface transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`rounded-full px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
              isDanger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-rakta-primary hover:bg-rakta-navy"
            }`}
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}