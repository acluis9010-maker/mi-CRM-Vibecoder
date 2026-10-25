import type { ReactNode, TextareaHTMLAttributes } from "react";

/**
 * Área de texto multilínea. El design system del handoff NO la trae: el
 * prototipo usa un textarea crudo con estilos propios (CRM Shell.dc.html L493).
 *
 * Espeja a propósito la API y el aspecto de Input.tsx — label encima, mismo
 * borde, mismo anillo de foco, mismo bloque de error con icono — para que los
 * dos campos del mismo formulario se comporten igual.
 *
 * Como Input, es server component: el foco se resuelve con `focus:` de CSS.
 */
export function Textarea({
  label,
  error,
  helper,
  id,
  className = "",
  disabled,
  rows = 3,
  ...rest
}: {
  label?: string;
  error?: string | null;
  helper?: string | null;
} & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const generado = `ta-${rest.name ?? label ?? "campo"}`.replace(/\s+/g, "-");
  const campoId = id ?? generado;
  const errorId = `${campoId}-error`;

  const borde = error
    ? "border-error shadow-[0_0_0_3px_var(--color-error-bg)]"
    : "border-border-strong focus:border-primary focus:shadow-[0_0_0_3px_var(--color-primary-subtle)]";

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <label
          htmlFor={campoId}
          className="text-sm font-medium tracking-[-0.011em] text-text"
        >
          {label}
        </label>
      )}
      <textarea
        {...rest}
        id={campoId}
        rows={rows}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`min-h-[84px] w-full resize-y rounded-md border px-3.5 py-3 text-[15px] leading-normal tracking-[-0.011em] text-text outline-none transition-[border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-standard)] ${
          disabled ? "cursor-not-allowed bg-surface-2" : "cursor-text bg-surface"
        } ${borde}`}
      />
      {error ? (
        <span
          id={errorId}
          className="flex items-center gap-1.5 text-[13px] text-error-text"
        >
          <IconoError />
          {error}
        </span>
      ) : (
        helper && <span className="text-[13px] text-text-muted">{helper}</span>
      )}
    </div>
  );
}

/** Mismo círculo de exclamación que usa Input.tsx. */
function IconoError(): ReactNode {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
