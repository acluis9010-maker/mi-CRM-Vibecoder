"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/IconButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { ANILLO_FOCO } from "@/components/ui/foco";
import { ROL_CORTO, useUsuario } from "@/lib/session";
import { destinosVisibles, tabActiva } from "./navegacion";

/**
 * Sidebar de escritorio (LUI-8). Visible en >=768px; en móvil manda la TabBar.
 * Diseño: CRM Shell.dc.html L69-93, estilos de ítem L1004.
 *
 * El responsive es por breakpoints de Tailwind, no midiendo el viewport en JS
 * como el prototipo: hacerlo en JS provoca desajuste de hidratación y un
 * parpadeo de la navegación en la primera carga.
 */
export function Sidebar() {
  const pathname = usePathname();
  const sesion = useUsuario();
  const { signOut } = useClerk();

  const usuario = sesion.estado === "ok" ? sesion.usuario : null;
  const destinos = destinosVisibles(usuario?.rol === "propietaria");
  const activa = tabActiva(pathname);

  return (
    <aside className="hidden h-full w-60 shrink-0 flex-col gap-1 border-r border-border bg-surface px-3.5 py-5 md:flex">
      <div className="flex items-center gap-2.5 px-3 pt-1.5 pb-5">
        <span className="inline-flex size-[26px] items-center justify-center rounded-[7px] bg-primary text-[15px] font-semibold text-on-primary">
          V
        </span>
        <span className="text-base font-semibold tracking-[-0.011em] text-text">
          Vibe CRM
        </span>
      </div>

      <nav aria-label="Navegación principal" className="flex flex-col gap-1">
        {destinos.map(({ href, label, Icon }) => {
          const esActiva = href === activa;
          return (
            <Link
              key={href}
              href={href}
              aria-current={esActiva ? "page" : undefined}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[15px] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] ${
                esActiva
                  ? "bg-primary-subtle font-semibold text-primary"
                  : "font-medium text-text-muted hover:bg-surface-2"
              } ${ANILLO_FOCO}`}
            >
              <Icon size={20} strokeWidth={1.5} aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className="flex items-center gap-1.5 border-t border-border p-1.5">
        <Link
          href="/cuenta"
          aria-label="Mi cuenta"
          className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-md p-1.5 text-left hover:bg-surface-2 ${ANILLO_FOCO}`}
        >
          {usuario === null ? (
            <>
              <Skeleton width={32} height={32} radius="rounded-full" />
              <Skeleton width={90} height={13} />
            </>
          ) : (
            <>
              <Avatar name={usuario.nombre} variant="neutral" size={32} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13px] font-medium text-text">
                  {usuario.nombre}
                </span>
                <span className="text-xs text-text-subtle">
                  {ROL_CORTO[usuario.rol]}
                </span>
              </span>
            </>
          )}
        </Link>
        <IconButton
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          onClick={() => void signOut({ redirectUrl: "/login" })}
          size="compact"
          className="size-[34px] shrink-0"
        >
          <LogOut size={18} strokeWidth={1.5} />
        </IconButton>
      </div>
    </aside>
  );
}
