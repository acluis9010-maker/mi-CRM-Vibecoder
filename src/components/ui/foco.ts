/**
 * Anillo de foco verde del design system (design-2.md §6: "foco siempre
 * visible"). El bundle del handoff no lo implementa, así que se añade aquí y se
 * reutiliza en todo lo interactivo.
 *
 * `--focus-ring` vive en :root, no en @theme, así que NO genera utilidad propia:
 * hay que envolverlo en var() dentro de los corchetes. Puesto a pelo, el CSS
 * resultante sería inválido.
 */
export const ANILLO_FOCO =
  "outline-none focus-visible:shadow-[var(--focus-ring)]";
