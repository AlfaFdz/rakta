export default function Input({
  label,
  id,
  name,
  type = "text",
  placeholder = "",
  defaultValue,
  value,
  onChange,
  required = false,
  disabled = false,
  error,
  className = "",
  ...props
}) {
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id || name}
          className="text-xs font-medium text-rakta-navy"
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <input
        id={id || name}
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={`w-full px-3.5 py-2 text-xs bg-rakta-card border border-rakta-border rounded-xl text-rakta-navy placeholder:text-rakta-muted/60 focus:outline-none focus:border-rakta-primary focus:ring-1 focus:ring-rakta-primary/20 transition-all disabled:opacity-50 disabled:bg-rakta-surface ${
          error ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20" : ""
        } ${className}`}
        {...props}
      />
      {error && <span className="text-[11px] text-rose-500 font-medium">{error}</span>}
    </div>
  );
}