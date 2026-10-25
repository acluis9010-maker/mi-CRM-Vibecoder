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

/**
 * Los 5 estados en el orden del selector del formulario de edición
 * (CRM Shell.dc.html L1054), que va de más frío a más cerrado.
 */
export const ESTADOS: ReadonlyArray<{
  valor: EstadoCliente;
  etiqueta: string;
}> = [
  { valor: "info", etiqueta: ETIQUETAS.info },
  { valor: "primary", etiqueta: ETIQUETAS.primary },
  { valor: "warning", etiqueta: ETIQUETAS.warning },
  { valor: "success", etiqueta: ETIQUETAS.success },
  { valor: "error", etiqueta: ETIQUETAS.error },
];

/** Canal por el que entró el cliente. Valores del esquema de Convex. */
export type CanalOrigen = "web" | "redes" | "email" | "whatsapp";

const ETIQUETAS_CANAL: Record<CanalOrigen, string> = {
  web: "Web",
  redes: "Redes",
  email: "Email",
  whatsapp: "WhatsApp",
};

/** Los 4 canales, en el orden de los chips del diseño (L1079). */
export const CANALES: ReadonlyArray<{ valor: CanalOrigen; etiqueta: string }> = [
  { valor: "web", etiqueta: ETIQUETAS_CANAL.web },
  { valor: "redes", etiqueta: ETIQUETAS_CANAL.redes },
  { valor: "email", etiqueta: ETIQUETAS_CANAL.email },
  { valor: "whatsapp", etiqueta: ETIQUETAS_CANAL.whatsapp },
];

export function etiquetaCanal(canal: CanalOrigen): string {
  return ETIQUETAS_CANAL[canal] ?? canal;
}
