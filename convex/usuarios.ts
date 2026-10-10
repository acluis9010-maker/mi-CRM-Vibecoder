import { ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUsuario, resolverUsuario } from "./lib/authz";

/**
 * Estado de la sesión actual. Devuelve un resultado discriminado en vez de
 * lanzar, porque la UI necesita distinguir "cargando" de cada motivo de
 * denegación para poder explicarlo en pantalla:
 *
 *   { estado: "ok", usuario }  | "sin-sesion" | "sin-alta" | "ya-vinculado"
 */
export const actual = query({
  args: {},
  handler: async (ctx) => await resolverUsuario(ctx),
});

/**
 * Persiste el enlace identidad→usuario en el primer login. Es la ÚNICA función
 * que escribe `authTokenIdentifier`: una query no puede escribir, así que esto
 * no puede vivir en `actual`.
 *
 * NO llama a `requireUsuario` —y no es un olvido—: es precisamente la función
 * que establece el enlace que `requireUsuario` consulta. Aplica la misma regla
 * estricta en línea (identidad válida → token libre → email dado de alta) para
 * no depender de que el cliente llame en el orden correcto. Nunca sobrescribe
 * un token existente: lanza.
 *
 * DEPENDENCIA A NO PERDER DE VISTA: que esto sea seguro para un registro aún
 * sin reclamar se apoya en que el REGISTRO PÚBLICO ESTÉ DESHABILITADO en Clerk
 * (invitación únicamente, ver LUI-7). Con registro abierto, cualquiera que
 * controlase un email dado de alta podría reclamar ese usuario.
 */
export const reclamarActual = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) throw new ConvexError("No hay sesión activa.");

    // Ya reclamado por esta misma identidad: no hay nada que hacer.
    const porToken = await ctx.db
      .query("usuarios")
      .withIndex("by_auth_token", (q) =>
        q.eq("authTokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
    if (porToken !== null) return { reclamado: false, motivo: "ya estaba" as const };

    const email = identity.email?.trim().toLowerCase();
    if (!email) throw new ConvexError("La identidad no trae email.");

    const porEmail = await ctx.db
      .query("usuarios")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (porEmail === null) {
      throw new ConvexError("Tu cuenta no está dada de alta en este CRM.");
    }
    if (porEmail.authTokenIdentifier !== undefined) {
      // Otra identidad de Clerk ya reclamó este registro. No se reasigna.
      throw new ConvexError("Este usuario ya está vinculado a otra cuenta.");
    }

    await ctx.db.patch(porEmail._id, {
      authTokenIdentifier: identity.tokenIdentifier,
    });
    return { reclamado: true };
  },
});

/** Usuarios del equipo. Para resolver nombres de responsable y selectores. */
export const listar = query({
  args: {},
  handler: async (ctx) => {
    await requireUsuario(ctx);
    return await ctx.db.query("usuarios").collect();
  },
});
