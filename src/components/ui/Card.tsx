import type { ReactNode } from "react";

/**
 * Tarjeta. Portado de _ds_bundle.js L145.
 * Superficie blanca + borde 1px + shadow-xs + padding 20px: la base de toda
 * composición del design system.
 */
export function Card({
  title,
  action,
  onAction,
  children,
  padding = "p-5",
  className = "",
}: {
  title?: string;
  action?: string;
  onAction?: () => void;
  children?: ReactNode;
  /** Clase de padding; `p-0` para listas que llevan su propio espaciado. */
  padding?: string;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-border bg-surface shadow-xs ${padding} ${className}`}
    >
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          {title && (
            <h3 className="m-0 text-[15px] font-semibold tracking-[-0.011em] text-text">
              {title}
            </h3>
          )}
          {action && (
            <button
              type="button"
              onClick={onAction}
              className="cursor-pointer border-none bg-transparent p-0 text-sm font-medium text-primary"
            >
              {action}
            </button>
          )}
        </header>
      )}
      {children}
    </section>
  );
}
