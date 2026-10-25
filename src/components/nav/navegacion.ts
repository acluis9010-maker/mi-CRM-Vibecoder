import { Home, Plus, ShieldCheck, TrendingUp, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Destinos de la navegación principal (LUI-8). Fuente única para el sidebar de
 * escritorio y la tab bar de móvil.
 *
 * Son 3-4, no los 5 que menciona design-2.md §4 (Inicio · Contactos · Ventas ·
 * Informes · Más): ese apartado quedó obsoleto con el diseño entregado.
 * "Mis tareas" y "Notificaciones" no son destinos propios en el MVP.
 */
export type Destino = {
  href: string;
  label: string;
  Icon: LucideIcon;
  /** Solo visible para rol `propietaria`. */
  soloDuena?: boolean;
};

export const DESTINOS: Destino[] = [
  { href: "/hoy", label: "Hoy", Icon: Home },
  { href: "/clientes", label: "Clientes", Icon: Users },
  { href: "/ventas", label: "Ventas", Icon: TrendingUp },
  { href: "/equipo", label: "Equipo", Icon: ShieldCheck, soloDuena: true },
];

/**
 * Filtra los destinos según el rol. Ocultar "Equipo" es PRESENTACIÓN: la
 * barrera real es `requireDuena` en el servidor, porque cualquiera puede llamar
 * a las funciones de Convex directamente.
 *
 * Mientras el rol no se conoce se oculta, que es el lado seguro.
 */
export function destinosVisibles(esDuena: boolean): Destino[] {
  return DESTINOS.filter((d) => !d.soloDuena || esDuena);
}

/** Título del header por ruta activa (CRM Shell.dc.html L1300). */
export function tituloDeRuta(pathname: string): string {
  if (pathname.startsWith("/clientes/")) return "Cliente";
  const porRuta: Record<string, string> = {
    "/hoy": "Hoy",
    "/clientes": "Clientes",
    "/ventas": "Ventas",
    "/equipo": "Equipo",
    "/cuenta": "Mi cuenta",
  };
  return porRuta[pathname] ?? "Vibe CRM";
}

/** Rutas con botón "atrás" en el header: ficha de cliente y perfil. */
export function llevaBotonAtras(pathname: string): boolean {
  return pathname.startsWith("/clientes/") || pathname === "/cuenta";
}

/** Destino de tab activo; una ficha de cliente mantiene "Clientes" marcado. */
export function tabActiva(pathname: string): string {
  if (pathname.startsWith("/clientes")) return "/clientes";
  return pathname;
}

/**
 * Acción de la barra superior según la ruta (CRM Shell.dc.html L108-114):
 * "Nuevo cliente" en la lista y "Editar" en la ficha.
 *
 * Es un DESTINO, no un callback, porque el overlay que abre vive en la pantalla
 * y el header es parte del shell: no tienen forma de hablarse. Al poner el
 * overlay abierto en la URL, el header solo navega y la pantalla reacciona. De
 * paso el formulario queda enlazable y el botón atrás del navegador lo cierra.
 *
 * Se declara aquí, junto a `tituloDeRuta` y `llevaBotonAtras`, porque este
 * fichero ya es el mapa de comportamiento por ruta del shell.
 */
export type AccionHeader = {
  href: string;
  label: string;
  variante: "primary" | "ghost";
  Icon?: LucideIcon;
  /** El FAB cubre el caso móvil, así que el botón se oculta ahí (L1332). */
  soloEscritorio: boolean;
};

export function accionDeRuta(pathname: string): AccionHeader | null {
  if (pathname === "/clientes") {
    return {
      href: "/clientes?nuevo=1",
      label: "Nuevo cliente",
      variante: "primary",
      Icon: Plus,
      soloEscritorio: true,
    };
  }
  if (pathname.startsWith("/clientes/")) {
    return {
      href: `${pathname}?editar=1`,
      label: "Editar",
      variante: "ghost",
      soloEscritorio: false,
    };
  }
  return null;
}
