"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * Toast global con acción Deshacer (LUI-65).
 * Portado del prototipo: `showToast`/`undoDone`/`hideToast`, CRM Shell.dc.html
 * L838-854, estilos L1483-1484.
 *
 * Duraciones del diseño: 3800ms cuando hay Deshacer, 2600ms cuando no.
 */
const MS_CON_DESHACER = 3800;
const MS_SIN_DESHACER = 2600;

type Toast = {
  /** Identifica esta aparición concreta; ver la nota del guard más abajo. */
  token: number;
  mensaje: string;
  onUndo?: () => void;
};

type Api = {
  showToast: (mensaje: string, opts?: { onUndo?: () => void }) => void;
  hideToast: () => void;
};

const Ctx = createContext<Api | null>(null);

export function useToast(): Api {
  const api = useContext(Ctx);
  if (api === null) {
    throw new Error("useToast necesita un <ToastProvider> por encima.");
  }
  return api;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const siguienteToken = useRef(0);

  const limpiar = useCallback(() => {
    if (temporizador.current !== null) {
      clearTimeout(temporizador.current);
      temporizador.current = null;
    }
  }, []);

  const hideToast = useCallback(() => {
    limpiar();
    setToast(null);
  }, [limpiar]);

  const showToast = useCallback(
    (mensaje: string, opts?: { onUndo?: () => void }) => {
      limpiar();
      const token = ++siguienteToken.current;
      setToast({ token, mensaje, onUndo: opts?.onUndo });

      temporizador.current = setTimeout(
        () => {
          // GUARD IMPORTANTE (prototipo L845-848): solo cierra si el toast que
          // sigue en pantalla es el que armó ESTE temporizador. Sin esto, dos
          // toasts seguidos hacen que el temporizador del primero cierre al
          // segundo antes de tiempo.
          setToast((actual) => (actual?.token === token ? null : actual));
        },
        opts?.onUndo ? MS_CON_DESHACER : MS_SIN_DESHACER
      );
    },
    [limpiar]
  );

  useEffect(() => limpiar, [limpiar]);

  const api = useMemo(() => ({ showToast, hideToast }), [showToast, hideToast]);

  return (
    <Ctx.Provider value={api}>
      {children}
      {toast !== null && (
        <div
          // El 84px del diseño sale de la tab bar (56px) + margen.
          className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--tabbar-h)+28px)] z-[1100] flex justify-center px-4 md:bottom-6"
        >
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-auto flex w-full max-w-[440px] items-center gap-3 rounded-[10px] bg-text py-3 pr-2.5 pl-4 shadow-lg [animation:vibe-slide-up_200ms_var(--ease-standard)] md:w-auto"
          >
            <span aria-hidden className="inline-flex shrink-0 text-primary">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <span className="flex-1 text-sm text-white">{toast.mensaje}</span>
            {toast.onUndo && (
              <button
                type="button"
                onClick={() => {
                  const undo = toast.onUndo;
                  hideToast();
                  undo?.();
                }}
                className="cursor-pointer border-none bg-transparent px-2 py-1.5 text-sm font-semibold whitespace-nowrap text-primary"
              >
                Deshacer
              </button>
            )}
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
