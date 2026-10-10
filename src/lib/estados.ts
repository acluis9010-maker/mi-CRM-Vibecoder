import type { BadgeStatus } from "@/components/ui/Badge";

/**
 * El campo `estado` del cliente ES directamente el status del Badge — así lo
 * decidió el diseño entregado (ver la cabecera de convex/schema.ts): no es
 * Activo/Inactivo, sino un badge de 5 valores.
 *
 * Etiquetas tomadas de `labelFor` del prototipo (CRM Shell.dc.html L837).
 */
export type EstadoCliente = "info" | "primary" | "warning" | "success" | "error";

const ETIQUETAS: Record<EstadoCliente, string> = {
  info: "Nuevo lead",
  primary: "En negociación",
  warning: "Pendiente",
  success: "Ganado",
  error: "Perdido",
};

export function etiquetaEstado(estado: EstadoCliente): string {
  return ETIQUETAS[estado] ?? ETIQUETAS.info;
}

/** El estado y el status del badge coinciden, pero se tipa el puente explícito. */
export function badgeDeEstado(estado: EstadoCliente): BadgeStatus {
  return estado;
}
