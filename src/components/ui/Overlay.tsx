"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { IconButton } from "./IconButton";
import { X } from "lucide-react";

/**
 * Chrome de los formularios en overlay (CRM Shell.dc.html L1288-1291 y la
 * sección "Interactions & Behavior" del README del handoff):
 *
 *   - Móvil: hoja desde abajo, radio superior 16px, slide-up 200ms.
 *   - Escritorio: modal centrado de 480px, radio 10px, pop-in 150ms.
 *   - Scrim rgba(16,24,32,.45). Cierra con Esc, scrim o botón.
 *   - role="dialog", aria-modal, foco inicial y foco atrapado.
 *
 * Se apoya en `<dialog>` + `showModal()` en vez de una trampa de foco a mano:
 * el navegador ya da foco atrapado, cierre con Esc, inercia del resto de la
 * página y render en la capa superior (sin peleas de z-index).
 */
export function Overlay({
  open,
  onClose,
  title,
  children,
  puedeCerrar = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /**
   * `false` bloquea TODAS las vías de cierre: Esc, clic en el scrim y botón X.
   *
   * Hace falta porque esas tres no pasan por los botones del contenido: un
   * formulario puede deshabilitar su propio "Cancelar" mientras guarda y, sin
   * esto, el usuario seguiría pudiendo cerrar con Esc dejando la escritura en
   * vuelo. Desmontar el componente no cancela una mutation ya enviada.
   */
  puedeCerrar?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="overlay-titulo"
      // `cancel` cubre la tecla Esc; `close` cualquier otra vía de cierre.
      // El preventDefault va siempre: sin él el navegador cerraría el dialog
      // por su cuenta y el estado de React se quedaría desincronizado.
      onCancel={(e) => {
        e.preventDefault();
        if (puedeCerrar) onClose();
      }}
      onClose={() => {
        if (puedeCerrar) onClose();
      }}
      // Click en el scrim: el <dialog> ocupa toda la ventana, así que un click
      // cuyo target sea el propio dialog (y no su contenido) es el scrim.
      onClick={(e) => {
        if (puedeCerrar && e.target === ref.current) onClose();
      }}
      className="m-0 max-h-none max-w-none border-none bg-transparent p-0 backdrop:bg-[rgba(16,24,32,0.45)] open:flex h-full w-full items-end justify-center md:items-center md:p-6"
    >
      <div
        className="flex max-h-[92vh] w-full flex-col overflow-auto rounded-t-2xl bg-surface shadow-lg [animation:vibe-slide-up_200ms_var(--ease-standard)] md:max-h-[90vh] md:w-[480px] md:rounded-xl md:[animation:vibe-pop-in_150ms_var(--ease-standard)]"
      >
        <div className="flex flex-col gap-4 px-5 pt-4.5 pb-6">
          {/* Agarre de la hoja: solo móvil, decorativo. */}
          <div
            aria-hidden
            className="mx-auto mb-0.5 h-1 w-9 shrink-0 rounded-full bg-border-strong md:hidden"
          />
          <header className="flex items-center justify-between gap-3">
            <h2
              id="overlay-titulo"
              className="m-0 text-[17px] font-semibold tracking-[-0.011em] text-text"
            >
              {title}
            </h2>
            <IconButton
              aria-label="Cerrar"
              size="compact"
              onClick={onClose}
              disabled={!puedeCerrar}
              className="-mr-2"
            >
              <X size={20} strokeWidth={1.5} />
            </IconButton>
          </header>
          {children}
        </div>
      </div>
    </dialog>
  );
}
