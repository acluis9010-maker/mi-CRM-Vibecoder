/**
 * Fechas en formato ISO corto (YYYY-MM-DD), que es como las guarda el esquema.
 *
 * Todo se calcula en HORA LOCAL del navegador, a propósito: el backend de Convex
 * corre en UTC, así que si el servidor decidiera qué es "hoy", alguien en Madrid
 * a las 00:30 registraría el día anterior y vería mal la sección "Atrasados".
 * Por eso las funciones de Convex reciben la fecha como argumento.
 */

const DIA_MS = 86_400_000;

/** Fecha de hoy en local, no en UTC (`toISOString()` daría UTC). */
export function hoyISO(): string {
  const d = new Date();
  const dosDigitos = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`;
}

/**
 * Días de retraso: > 0 atrasado, 0 vence hoy, < 0 futuro.
 * Equivalente a `daysOverdue` del prototipo (CRM Shell.dc.html L895).
 */
export function diasDeRetraso(vence: string, hoy: string): number {
  const a = new Date(`${hoy}T00:00:00`).getTime();
  const b = new Date(`${vence}T00:00:00`).getTime();
  return Math.round((a - b) / DIA_MS);
}

/** "Venció ayer" / "Venció hace N días". Vacío si no está atrasado (L910). */
export function etiquetaVence(dias: number): string {
  if (dias <= 0) return "";
  return dias === 1 ? "Venció ayer" : `Venció hace ${dias} días`;
}

/**
 * Subtítulo de la fila de cliente: "Hoy" / "Ayer" / "Hace N días" /
 * "Hace N semanas". Equivale a `ultimoLabel` del prototipo (L928).
 *
 * Umbrales exactos del diseño: de 2 a 6 días va en días (siempre en plural, no
 * hay "Hace 1 día" porque ese caso es "Ayer"), y a partir de 7 en semanas
 * redondeadas, así que 7-10 días se muestran como "Hace 1 semana".
 */
export function etiquetaUltimoContacto(iso: string, hoy: string): string {
  const dias = diasDeRetraso(iso, hoy);
  if (dias <= 0) return "Hoy";
  if (dias === 1) return "Ayer";
  if (dias < 7) return `Hace ${dias} días`;
  const semanas = Math.round(dias / 7);
  return `Hace ${semanas} ${semanas === 1 ? "semana" : "semanas"}`;
}

/**
 * Eyebrow de la pantalla Hoy: "MARTES, 23 DE JUNIO".
 * El prototipo la trae hardcodeada (L1371); aquí es la fecha real.
 */
export function etiquetaFechaLarga(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
    .format(d)
    .toUpperCase();
}
