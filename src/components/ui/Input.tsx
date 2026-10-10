import type { InputHTMLAttributes, ReactNode } from "react";

/**
 * Campo de texto. Portado de _ds_bundle.js L629.
 * 48px de alto, label encima, anillo de foco propio y bloque de error con icono.
 *
 * Dos desvíos deliberados respecto al bundle:
 *  - El foco se resuelve con `focus:` de CSS en vez de `useState`, así no hace
 *    falta que sea client component.
 *  - Se añaden `aria-invalid` y `aria-describedby` ligando el mensaje de error,
 *    que el bundle no trae (design-2.md §6 pide error con texto + icono).
 */
export function Input({
  label,
  icon,
  error,
  helper,
  id,
  className = "",
  disabled,
  ...rest
}: {
  label?: string;
  icon?: ReactNode;
  error?: string | null;
  helper?: string | null;
} & InputHTMLAttributes<HTMLInputElement>) {
  const generado = `in-${rest.name ?? label ?? "campo"}`.replace(/\s+/g, "-");
  const inputId = id ?? generado;
  const errorId = `${inputId}-error`;

  const borde = error
    ? "border-error shadow-[0_0_0_3px_var(--color-error-bg)]"
    : "border-border-strong focus:border-primary focus:shadow-[0_0_0_3px_var(--color-primary-subtle)]";

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium tracking-[-0.011em] text-text"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <span
            aria-hidden
            className="pointer-events-none absolute left-3.5 inline-flex text-text-subtle"
          >
            {icon}
          </span>
        )}
        <input
          {...rest}
          id={inputId}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`h-[var(--control-h)] w-full rounded-md border text-[15px] tracking-[-0.011em] text-text outline-none transition-[border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-standard)] ${
            icon ? "pr-3.5 pl-10" : "px-3.5"
          } ${
            disabled
              ? "cursor-not-allowed bg-surface-2"
              : "cursor-text bg-surface"
          } ${borde}`}
        />
      </div>
      {error ? (
        <span
          id={errorId}
          className="flex items-center gap-1.5 text-[13px] text-error-text"
        >
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
          {error}
        </span>
      ) : (
        helper && <span className="text-[13px] text-text-muted">{helper}</span>
      )}
    </div>
  );
}
