export default function Input({
  label,
  id,
  name,
  type = "text",
  placeholder,
  value,
  defaultValue,
  onChange,
  error,
  helperText,
  disabled = false,
  required = false,
  className = "",
  ...props
}) {
  const inputId = id || name;

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-rakta-navy flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </span>
        </label>
      )}
      <input
        id={inputId}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={`w-full px-3.5 py-2 text-sm bg-rakta-card border rounded-xl text-rakta-navy placeholder:text-rakta-muted/60 transition-colors focus:outline-none focus:ring-2 disabled:bg-rakta-surface disabled:text-rakta-muted/60 disabled:cursor-not-allowed ${
          error
            ? "border-red-400 focus:border-red-500 focus:ring-red-200"
            : "border-rakta-subtle focus:border-rakta-primary focus:ring-rakta-primary/20"
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {helperText && !error && (
        <p className="text-xs text-rakta-muted">{helperText}</p>
      )}
    </div>
  );
}