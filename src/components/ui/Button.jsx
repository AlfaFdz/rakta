export default function Button({
  children,
  type = "button",
  variant = "primary",
  size = "md",
  disabled = false,
  isLoading = false,
  className = "",
  onClick,
  ...props
}) {
  const baseStyles = "inline-flex items-center justify-center font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none rounded-full";

  const variants = {
    primary: "bg-rakta-primary hover:bg-rakta-navy text-white shadow-sm focus:ring-rakta-primary/40",
    secondary: "bg-rakta-card border border-rakta-subtle text-rakta-navy hover:bg-rakta-surface focus:ring-rakta-primary/30",
    danger: "bg-red-500 hover:bg-red-600 text-white focus:ring-red-400",
    ghost: "bg-transparent text-rakta-muted hover:bg-rakta-bg/60 hover:text-rakta-navy focus:ring-rakta-subtle",
  };

  const sizes = {
    sm: "text-xs px-3 py-1.5 gap-1.5",
    md: "text-sm px-5 py-2 gap-2",
    lg: "text-base px-6 py-2.5 gap-2.5",
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin h-4 w-4 mr-1 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}