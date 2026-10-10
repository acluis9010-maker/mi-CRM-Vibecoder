"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ANILLO_FOCO } from "./foco";

/**
 * Navegación inferior de móvil. Portado de _ds_bundle.js L755.
 *
 * Desvío respecto al bundle: sus ítems son `<button onChange>`; aquí son
 * `<Link>` de Next, porque la navegación es por ruta real (el prototipo usaba
 * un router por estado). Cada ítem mantiene los ≥56px de alto táctil.
 *
 * El handoff define 3–4 destinos (Hoy · Clientes · Ventas · Equipo), no los 5
 * que menciona design-2.md §4 — ese apartado está obsoleto (ver LUI-8).
 */
export type TabItem = { href: string; label: string; icon: ReactNode };

export function TabBar({
  items,
  activeHref,
  className = "",
}: {
  items: TabItem[];
  activeHref: string;
  className?: string;
}) {
  return (
    <nav
      aria-label="Navegación principal"
      className={`flex w-full shrink-0 border-t border-border bg-surface ${className}`}
    >
      {items.map((item) => {
        const activo = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={activo ? "page" : undefined}
            className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 px-1 py-2 tracking-[-0.011em] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] ${
              activo
                ? "font-semibold text-primary"
                : "font-medium text-text-subtle"
            } ${ANILLO_FOCO}`}
          >
            <span aria-hidden className="inline-flex size-[22px]">
              {item.icon}
            </span>
            <span className="text-[11px]">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
