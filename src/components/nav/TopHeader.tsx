"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { ANILLO_FOCO } from "@/components/ui/foco";
import { useSesion } from "@/lib/sesion";
import { accionDeRuta, llevaBotonAtras, tituloDeRuta } from "./navegacion";

/**
 * Header superior (LUI-8). Diseño: CRM Shell.dc.html L97-114.
 *
 * El icono de campana del prototipo NO se incluye: ahí es decorativo (nunca
 * recibe onClick, L1303) y en el MVP no hay pantalla de notificaciones — eso es
 * R10, Fase 2. Mejor no prometer funcionalidad que no existe.
 */
export function TopHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { usuario } = useSesion();

  const atras = llevaBotonAtras(pathname);
  const accion = accionDeRuta(pathname);

  return (
    <header className="z-10 flex h-[60px] shrink-0 items-center gap-2 border-b border-border bg-surface px-3">
      {atras && (
        <IconButton aria-label="Atrás" onClick={() => router.back()}>
          <ChevronLeft size={20} strokeWidth={1.5} />
        </IconButton>
      )}
      <h2 className="m-0 flex-1 truncate pl-1 text-[17px] font-semibold tracking-[-0.011em] text-text">
        {tituloDeRuta(pathname)}
      </h2>
      {usuario !== null && pathname !== "/cuenta" && (
        <Link
          href="/cuenta"
          aria-label="Mi cuenta"
          className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full md:hidden ${ANILLO_FOCO}`}
        >
          <Avatar name={usuario.nombre} variant="neutral" size={32} />
        </Link>
      )}
      {accion !== null && (
        <Button
          variant={accion.variante}
          size="compact"
          iconLeft={
            accion.Icon ? <accion.Icon size={18} strokeWidth={1.75} /> : undefined
          }
          // `scroll: false` para no saltar al principio de la lista al abrir el
          // formulario: el overlay se monta encima, la pantalla no cambia.
          onClick={() => router.push(accion.href, { scroll: false })}
          className={accion.soloEscritorio ? "hidden md:inline-flex" : ""}
        >
          {accion.label}
        </Button>
      )}
    </header>
  );
}
