import type { ReactNode } from "react";

/**
 * Estado vacío. Portado de _ds_bundle.js L543.
 * Icono en cuadro surface-2 + título + UNA línea de ayuda + CTA (design-2.md §5).
 */
export function EmptyState({
  icon,
  title,
  help,
  action,
  className = "",
}: {
  icon?: ReactNode;
  title?: string;
  help?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-3 px-6 py-10 text-center ${className}`}
    >
      {icon && (
        <span
          aria-hidden
          className="inline-flex size-12 items-center justify-center rounded-xl bg-surface-2 text-text-muted"
        >
          {icon}
        </span>
      )}
      {title && (
        <h4 className="m-0 text-[15px] font-semibold text-text">{title}</h4>
      )}
      {help && (
        <p className="m-0 max-w-[280px] text-[13px] text-text-muted">{help}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
