import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { nuevoToken, verificarPassword } from "./lib/password";
import { argsSesion, resolverUsuario } from "./lib/authz";

/** 30 días: el login es simple y sin renovación, así que no conviene más corto. */
const DURACION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Inicia sesión con email y contraseña. Devuelve el token que el cliente debe
 * guardar y enviar en cada llamada posterior.
 *
 * El mensaje de error es el MISMO tanto si el email no existe como si la
 * contraseña es incorrecta: distinguirlos permitiría averiguar qué cuentas hay
 * dadas de alta.
 */
export const iniciarSesion = mutation({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, { email, password }) => {
    const credencialesInvalidas = new ConvexError({
      codigo: "credenciales",
      mensaje: "Email o contraseña incorrectos.",
    });

    const usuario = await ctx.db
      .query("usuarios")
      .withIndex("by_email", (q) => q.eq("email", email.trim().toLowerCase()))
      .unique();

    if (usuario === null) throw credencialesInvalidas;
    if (usuario.passwordHash === undefined) {
      // Dado de alta pero sin contraseña asignada todavía.
      throw credencialesInvalidas;
    }

    const correcta = await verificarPassword(password, usuario.passwordHash);
    if (!correcta) throw credencialesInvalidas;

    const token = nuevoToken();
    await ctx.db.insert("sesiones", {
      usuarioId: usuario._id,
      token,
      expira: Date.now() + DURACION_MS,
    });

    // Se devuelve solo lo que la UI necesita: nunca el passwordHash.
    return {
      token,
      usuario: {
        _id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      },
    };
  },
});

/** Cierra la sesión actual. Idempotente: un token ya borrado no es un error. */
export const cerrarSesion = mutation({
  args: argsSesion,
  handler: async (ctx, { token }) => {
    const sesion = await ctx.db
      .query("sesiones")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (sesion !== null) await ctx.db.delete(sesion._id);
    return { cerrada: true };
  },
});

/**
 * Usuario de la sesión actual, o el motivo por el que no hay. Devuelve un
 * resultado discriminado en vez de lanzar: la UI necesita distinguir "cargando"
 * de "sin sesión" para decidir si redirige a /login.
 *
 * Nunca incluye `passwordHash`.
 */
export const sesionActual = query({
  args: argsSesion,
  handler: async (ctx, { token }) => {
    const r = await resolverUsuario(ctx, token);
    if (r.estado !== "ok") return { estado: "sin-sesion" as const };
    return {
      estado: "ok" as const,
      usuario: {
        _id: r.usuario._id,
        nombre: r.usuario.nombre,
        email: r.usuario.email,
        rol: r.usuario.rol,
      },
    };
  },
});
