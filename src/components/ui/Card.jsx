export function Card({ children, className = "", ...props }) {
  return (
    <div
      className={`bg-rakta-card border border-rakta-subtle/70 rounded-2xl rakta-card-shadow p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "", ...props }) {
  return (
    <div className={`border-b border-rakta-subtle/40 pb-3 mb-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "", ...props }) {
  return (
    <h3
      className={`text-base font-bold text-rakta-navy tracking-tight ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = "", ...props }) {
  return (
    <p className={`text-xs text-rakta-muted mt-1 ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = "", ...props }) {
  return (
    <div className={`space-y-3 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = "", ...props }) {
  return (
    <div
      className={`border-t border-rakta-subtle/40 pt-3 mt-4 flex items-center justify-end gap-2 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;