"use client";

import { Loader2 } from "lucide-react";

export default function Button({
  children,
  className = "",
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled = false,
  type = "button",
  ...props
}) {
  const baseStyles = "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rakta-primary/30 disabled:opacity-50 disabled:pointer-events-none cursor-pointer active:scale-[0.98]";

  const variants = {
    primary: "bg-rakta-primary hover:bg-rakta-primary-hover text-white shadow-2xs focus-visible:ring-rakta-primary",
    secondary: "bg-rakta-card hover:bg-rakta-surface text-rakta-navy border border-rakta-border shadow-2xs",
    danger: "bg-rose-600 hover:bg-rose-700 text-white shadow-2xs focus-visible:ring-rose-500",
    ghost: "text-rakta-muted hover:text-rakta-navy hover:bg-rakta-surface",
    outline: "border border-rakta-border text-rakta-navy hover:bg-rakta-surface",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-xs gap-2",
    lg: "px-5 py-2.5 text-sm gap-2.5",
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
      {children}
    </button>
  );
}