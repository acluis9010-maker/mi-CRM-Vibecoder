"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";

/**
 * Sesión del login propio. El token vive en localStorage y se pasa como
 * argumento a cada llamada de Convex (ver convex/lib/authz.ts).
 *
 * El ROL que se expone aquí viene del servidor, no del cliente, así que sirve
 * para decidir qué pintar. Pero NO es control de acceso: la barrera real son
 * `requireUsuario`/`requireDuena` en las funciones de Convex.
 *
 * PROVISIONAL: localStorage es accesible a JS de la propia página, así que un
 * XSS podría leer el token. Una cookie httpOnly no lo permitiría. Es parte del
 * endurecimiento pendiente, junto con la caducidad corta y la renovación.
 */
const CLAVE = "vibecrm_sesion";

export type UsuarioSesion = {
  _id: Id<"usuarios">;
  nombre: string;
  email: string;
  rol: "propietaria" | "comercial";
};

/**
 * localStorage se trata como el store externo que es, con
 * `useSyncExternalStore`. Así el token se lee en el cliente sin efectos ni
 * setState —que provocarían renders en cascada— y el servidor devuelve `null`
 * en su snapshot, evitando el desajuste de hidratación.
 */
const oyentes = new Set<() => void>();

function suscribir(cb: () => void): () => void {
  oyentes.add(cb);
  return () => oyentes.delete(cb);
}

function notificar(): void {
  for (const cb of oyentes) cb();
}

function leerToken(): string {
  try {
    return window.localStorage.getItem(CLAVE) ?? "";
  } catch {
    // Modo privado o almacenamiento bloqueado: se trata como sin sesión.
    return "";
  }
}

function escribirToken(token: string | null): void {
  try {
    if (token === null) window.localStorage.removeItem(CLAVE);
    else window.localStorage.setItem(CLAVE, token);
  } catch {
    // Si no se puede persistir, la sesión dura lo que la pestaña.
  }
  notificar();
}

/** En el servidor no hay localStorage: `null` significa "todavía no se sabe". */
const sinTokenEnServidor = () => null;

type Api = {
  /** `null` mientras se resuelve; `""` si no hay sesión. */
  token: string | null;
  usuario: UsuarioSesion | null;
  cargando: boolean;
  iniciar: (email: string, password: string) => Promise<void>;
  cerrar: () => Promise<void>;
};

const Ctx = createContext<Api | null>(null);

export function useSesion(): Api {
  const api = useContext(Ctx);
  if (api === null) {
    throw new Error("useSesion necesita un <SesionProvider> por encima.");
  }
  return api;
}

export function SesionProvider({ children }: { children: ReactNode }) {
  const token = useSyncExternalStore(
    suscribir,
    leerToken,
    sinTokenEnServidor
  );

  // El servidor valida el token: que exista en localStorage no significa que
  // siga siendo válido (puede haber caducado o haberse cerrado la sesión).
  const resultado = useQuery(
    api.autenticacion.sesionActual,
    token === null || token === "" ? "skip" : { token }
  );

  const iniciarSesion = useMutation(api.autenticacion.iniciarSesion);
  const cerrarSesion = useMutation(api.autenticacion.cerrarSesion);

  const iniciar = useCallback(
    async (email: string, password: string) => {
      const { token: nuevo } = await iniciarSesion({ email, password });
      escribirToken(nuevo);
    },
    [iniciarSesion]
  );

  const cerrar = useCallback(async () => {
    const actual = token;
    escribirToken(null);
    // Se borra también en el servidor para que el token no siga siendo válido.
    if (actual) await cerrarSesion({ token: actual });
  }, [token, cerrarSesion]);

  // Un token que el servidor rechaza se retira del almacenamiento para no
  // arrastrarlo. No es un setState: se actualiza el store externo, que es donde
  // vive de verdad.
  useEffect(() => {
    if (resultado?.estado === "sin-sesion" && token) escribirToken(null);
  }, [resultado, token]);

  const valor = useMemo<Api>(() => {
    const sinSesion = token === "";
    const cargando = token === null || (!sinSesion && resultado === undefined);
    const usuario =
      resultado !== undefined && resultado.estado === "ok"
        ? resultado.usuario
        : null;
    return { token, usuario, cargando, iniciar, cerrar };
  }, [token, resultado, iniciar, cerrar]);

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

/** Etiquetas de rol tal y como las usa el handoff. */
export const ROL_CORTO = {
  propietaria: "Propietaria",
  comercial: "Comercial",
} as const;
