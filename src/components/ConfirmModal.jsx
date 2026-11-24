"use client";

import Button from "@/components/ui/Button";
import { AlertCircle, HelpCircle, X } from "lucide-react";

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Konfirmasi Aksi",
  message = "Apakah Anda yakin ingin melanjutkan tindakan ini?",
  confirmText = "Konfirmasi",
  cancelText = "Batal",
  variant = "primary", // 'primary' | 'danger'
  isLoading = false,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-rakta-card border border-rakta-border rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-rakta-border/60">
          <div className="flex items-center gap-2">
            {variant === "danger" ? (
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-7 h-7 rounded-lg bg-rakta-surface text-rakta-primary flex items-center justify-center">
                <HelpCircle className="w-4 h-4" />
              </div>
            )}
            <h3 className="text-sm font-semibold text-rakta-navy">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-lg text-rakta-muted hover:text-rakta-navy hover:bg-rakta-surface transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 text-xs text-rakta-muted leading-relaxed whitespace-pre-line">
          {message}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-rakta-surface/50 border-t border-rakta-border/60">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            className="text-xs"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            isLoading={isLoading}
            className="text-xs"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}