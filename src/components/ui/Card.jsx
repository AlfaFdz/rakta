export function Card({ children, className = "", ...props }) {
  return (
    <div
      className={`bg-rakta-card border border-rakta-border rounded-2xl p-5 md:p-6 rakta-card-shadow transition-all ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "", ...props }) {
  return (
    <div className={`space-y-1 mb-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "", ...props }) {
  return (
    <h3
      className={`text-base font-semibold text-rakta-navy tracking-tight ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = "", ...props }) {
  return (
    <p className={`text-xs text-rakta-muted mt-0.5 ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = "", ...props }) {
  return (
    <div className={`space-y-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = "", ...props }) {
  return (
    <div
      className={`flex items-center justify-end gap-2 pt-4 border-t border-rakta-border/60 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
