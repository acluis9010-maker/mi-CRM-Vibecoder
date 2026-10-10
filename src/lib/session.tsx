"use client";

import { useEffect, useRef } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Doc } from "@/../convex/_generated/dataModel";

/**
 * Usuario de la sesión actual, resolviendo la identidad de Clerk contra la tabla
 * `usuarios` de Convex.
 *
 * El ROL sale de aquí (de la base de datos), no de los claims del token, para
 * que no se pueda forjar manipulando el JWT. Y ojo: esto es para PRESENTACIÓN
 * —mostrar el nombre, decidir si se pinta la pestaña "Equipo"—. La autorización
 * de verdad vive en las funciones de Convex (convex/lib/authz.ts).
 */
export type EstadoSesion =
  | { estado: "cargando" }
  | { estado: "ok"; usuario: Doc<"usuarios"> }
  | { estado: "sin-sesion" }
  | { estado: "sin-alta" }
  | { estado: "ya-vinculado" };

export function useUsuario(): EstadoSesion {
  const { isAuthenticated, isLoading } = useConvexAuth();

  // "skip" evita lanzar la query antes de que Convex tenga el token de Clerk:
  // sin esto el primer render pediría datos como anónimo.
  const resultado = useQuery(api.usuarios.actual, isAuthenticated ? {} : "skip");
  const reclamar = useMutation(api.usuarios.reclamarActual);
  const yaReclamado = useRef(false);

  // Primer login: persiste el enlace identidad→usuario. No es requisito para
  // entrar (el fallback por email sigue resolviendo), solo hace el enlace
  // robusto frente a un cambio de email en Clerk.
  useEffect(() => {
    if (yaReclamado.current) return;
    if (resultado === undefined) return;
    if (resultado.estado !== "ok") return;
    if (resultado.usuario.authTokenIdentifier !== undefined) return;

    yaReclamado.current = true;
    // Si falla no se degrada la sesión: el acceso ya está concedido.
    void reclamar({}).catch(() => {
      yaReclamado.current = false;
    });
  }, [resultado, reclamar]);

  if (isLoading) return { estado: "cargando" };
  if (!isAuthenticated) return { estado: "sin-sesion" };
  if (resultado === undefined) return { estado: "cargando" };
  return resultado;
}

/** Etiquetas de rol tal y como las usa el handoff. */
export const ROL_LARGO = {
  propietaria: "Dueña",
  comercial: "Atiende y vende",
} as const;

export const ROL_CORTO = {
  propietaria: "Propietaria",
  comercial: "Comercial",
} as const;
