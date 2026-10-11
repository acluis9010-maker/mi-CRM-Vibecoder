import { ConvexError } from "convex/values";
import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Autorización de las funciones de Convex. Sigue siendo la ÚNICA barrera real
 * de datos: `NEXT_PUBLIC_CONVEX_URL` viaja en el bundle del navegador, así que
 * cualquiera con la URL de la app puede llamar a estas funciones directamente
 * sin pasar por la interfaz. La redirección del layout es solo UX.
 *
 * El ROL se lee de la tabla `usuarios`, nunca de nada que mande el cliente.
 *
 * ─── LOGIN SIMPLE, PROVISIONAL ──────────────────────────────────────────────
 * Antes esto resolvía la identidad con `ctx.auth.getUserIdentity()` (JWT de un
 * proveedor externo). Ahora el login es propio y el token de sesión viaja como
 * ARGUMENTO en cada llamada, de ahí `argsSesion` más abajo.
 *
 * Lo que eso implica, explícito para quien lo revise:
 *   - No hay segundo factor ni rotación de tokens. La sesión caduca a 30 días.
 *   - El token va en localStorage, así que es accesible a JS de la propia
 *     página (riesgo de XSS). Con cookie httpOnly no lo sería.
 *   - Un proveedor de identidad daría además recuperación de contraseña,
 *     verificación de email y protección contra fuerza bruta, que aquí no hay.
 * Es la versión "simple" pedida para poder avanzar con el diseño; endurecerla
 * es trabajo pendiente y debe volver a pasar por revisión.
 */

/** Añadir a los `args` de toda función pública. */
export const argsSesion = { token: v.string() } as const;

const DENEGADO = "Tu sesión no es válida o ha caducado. Vuelve a entrar.";

export type ResultadoUsuario =
  | { estado: "ok"; usuario: Doc<"usuarios"> }
  | { estado: "sin-sesion" };

/**
 * Resuelve el usuario a partir del token, SIN lanzar y SIN escribir — por eso
 * vale igual en queries y en mutations.
 *
 * Comprueba, en este orden: que el token exista, que no haya caducado, y que el
 * usuario al que apunta siga existiendo. Un token de una sesión caducada se
 * trata igual que uno inventado.
 */
export async function resolverUsuario(
  ctx: QueryCtx | MutationCtx,
  token: string
): Promise<ResultadoUsuario> {
  if (token === "") return { estado: "sin-sesion" };

  const sesion = await ctx.db
    .query("sesiones")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();

  if (sesion === null) return { estado: "sin-sesion" };
  if (sesion.expira < Date.now()) return { estado: "sin-sesion" };

  const usuario = await ctx.db.get(sesion.usuarioId);
  if (usuario === null) return { estado: "sin-sesion" };

  return { estado: "ok", usuario };
}

/** Como `resolverUsuario`, pero lanza. Para el resto de funciones. */
export async function requireUsuario(
  ctx: QueryCtx | MutationCtx,
  token: string
): Promise<Doc<"usuarios">> {
  const r = await resolverUsuario(ctx, token);
  if (r.estado !== "ok") {
    throw new ConvexError({ codigo: "sin-sesion", mensaje: DENEGADO });
  }
  return r.usuario;
}

/**
 * Exige rol `propietaria`. Es la parte de servidor de LUI-25: ocultar la
 * pestaña "Equipo" en el frontend no es control de acceso.
 */
export async function requireDuena(
  ctx: QueryCtx | MutationCtx,
  token: string
): Promise<Doc<"usuarios">> {
  const usuario = await requireUsuario(ctx, token);
  if (usuario.rol !== "propietaria") {
    throw new ConvexError({
      codigo: "solo-propietaria",
      mensaje: "Esta acción solo está disponible para la propietaria.",
    });
  }
  return usuario;
}
