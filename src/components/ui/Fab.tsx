import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ANILLO_FOCO } from "./foco";

/**
 * Botón de acción flotante, solo en móvil (CRM Shell.dc.html L442-444).
 * 56x56, sombra lg, esquina inferior derecha.
 *
 * El `bottom` deja libre la tab bar: 56px de barra (`--tabbar-h`) + 20px de aire,
 * el mismo criterio que usa el Toast.
 *
 * Desvío respecto al prototipo: aquí es `fixed` y allí `absolute`. Con
 * `absolute` el botón pertenecería al contenedor con scroll y se desplazaría al
 * bajar por la lista; `fixed` lo mantiene donde el diseño lo dibuja.
 *
 * `aria-label` es obligatorio en el tipo, como en IconButton: el botón solo
 * contiene un icono.
 */
export function Fab({
  children,
  className = "",
  ...rest
}: {
  children: ReactNode;
  "aria-label": string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type">) {
  return (
    <button
      {...rest}
      type="button"
      className={`fixed right-4 bottom-[calc(var(--tabbar-h)+20px)] z-50 inline-flex size-14 cursor-pointer items-center justify-center rounded-full border-none bg-primary text-white shadow-lg transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-primary-hover md:hidden ${ANILLO_FOCO} ${className}`}
    >
      {children}
    </button>
  );
}
