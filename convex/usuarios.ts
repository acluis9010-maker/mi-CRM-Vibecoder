import { query } from "./_generated/server";
import { argsSesion, requireUsuario } from "./lib/authz";

/**
 * Usuarios del equipo, para resolver nombres de responsable y selectores.
 *
 * `passwordHash` se excluye explícitamente: aunque sea un hash, no tiene por
 * qué salir al cliente, y devolver el documento entero haría que cualquier
 * campo que se añada mañana se filtre sin querer.
 *
 * El usuario de la sesión actual NO está aquí: es `autenticacion.sesionActual`.
 */
export const listar = query({
  args: argsSesion,
  handler: async (ctx, { token }) => {
    await requireUsuario(ctx, token);
    const usuarios = await ctx.db.query("usuarios").collect();
    return usuarios.map((u) => ({
      _id: u._id,
      nombre: u.nombre,
      email: u.email,
      rol: u.rol,
    }));
  },
});
