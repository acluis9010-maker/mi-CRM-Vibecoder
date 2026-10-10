import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Autorización de las funciones de Convex. Esta es la ÚNICA barrera real de
 * datos de la aplicación.
 *
 * Por qué no basta con proteger las rutas de Next: `NEXT_PUBLIC_CONVEX_URL` se
 * inlinea en el bundle del navegador, así que cualquiera con la URL de la app
 * conoce la dirección del deployment y puede llamar a estas funciones
 * directamente, saltándose por completo la interfaz. La redirección del layout
 * de `(app)` es solo UX.
 *
 * El ROL se lee de la tabla `usuarios`, nunca de los claims del token, para que
 * un usuario no pueda forjárselo manipulando su JWT.
 *
 * Se usa `ConvexError` y no `Error` porque Convex NO propaga el mensaje de un
 * `Error` normal al cliente (lo sustituye por "Server Error"), y la UI necesita
 * poder explicar por qué se deniega el acceso.
 */

export type CodigoDenegado = "sin-sesion" | "sin-alta" | "ya-vinculado";

export type ResultadoUsuario =
  | { estado: "ok"; usuario: Doc<"usuarios"> }
  | { estado: CodigoDenegado };

/**
 * Resuelve el `usuarios` de quien llama, SIN lanzar y SIN escribir — por eso
 * vale igual en queries y en mutations. Es la única implementación de la regla;
 * `requireUsuario` y `usuarios.actual` se apoyan en ella.
 *
 * El enlace de identidad lo escribe `usuarios.reclamarActual`, que es una
 * mutation aparte: una query no puede escribir.
 *
 * Regla de resolución, estricta a propósito:
 *
 *   1. Por `authTokenIdentifier` → si existe, ése es el usuario. Fin.
 *   2. Si no, por email:
 *      a. no existe                     → "sin-alta"
 *      b. existe y su token está vacío  → OK (primer login, sin reclamar)
 *      c. existe y tiene OTRO token     → "ya-vinculado"
 *
 * El caso (c) es el que importa: sin él, una identidad de Clerk distinta con el
 * mismo email podría entrar a un registro ya reclamado por otra persona. Una vez
 * reclamado, el registro solo se resuelve por la vía 1.
 */
export async function resolverUsuario(
  ctx: QueryCtx | MutationCtx
): Promise<ResultadoUsuario> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) return { estado: "sin-sesion" };

  const porToken = await ctx.db
    .query("usuarios")
    .withIndex("by_auth_token", (q) =>
      q.eq("authTokenIdentifier", identity.tokenIdentifier)
    )
    .unique();
  if (porToken !== null) return { estado: "ok", usuario: porToken };

  const email = identity.email?.trim().toLowerCase();
  if (!email) return { estado: "sin-alta" };

  const porEmail = await ctx.db
    .query("usuarios")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique();

  if (porEmail === null) return { estado: "sin-alta" };
  if (porEmail.authTokenIdentifier !== undefined) {
    return { estado: "ya-vinculado" };
  }
  return { estado: "ok", usuario: porEmail };
}

/** Mensajes de cara al usuario. No distinguen si un email existe o no. */
const MENSAJE: Record<CodigoDenegado, string> = {
  "sin-sesion": "No hay sesión activa.",
  "sin-alta":
    "Tu cuenta no está dada de alta en este CRM. Pide a la propietaria que te añada.",
  "ya-vinculado":
    "Este usuario ya está vinculado a otra cuenta. Contacta con la propietaria.",
};

/** Como `resolverUsuario`, pero lanza si no hay acceso. Para el resto de funciones. */
export async function requireUsuario(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"usuarios">> {
  const r = await resolverUsuario(ctx);
  if (r.estado !== "ok") {
    throw new ConvexError({ codigo: r.estado, mensaje: MENSAJE[r.estado] });
  }
  return r.usuario;
}

/**
 * Exige rol `propietaria`. Es la parte de servidor de LUI-25: ocultar la pestaña
 * "Equipo" en el frontend no es control de acceso — cualquiera puede llamar a la
 * función directamente.
 */
export async function requireDuena(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"usuarios">> {
  const usuario = await requireUsuario(ctx);
  if (usuario.rol !== "propietaria") {
    throw new ConvexError({
      codigo: "solo-propietaria",
      mensaje: "Esta acción solo está disponible para la propietaria.",
    });
  }
  return usuario;
}
