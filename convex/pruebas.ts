import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * Apoyo para las pruebas de extremo a extremo (ver `e2e/`).
 *
 * ── POR QUÉ EXISTE ──────────────────────────────────────────────────────────
 * Las pruebas del formulario de cliente tienen que crear clientes de verdad —es
 * justo lo que comprueban— y por tanto necesitan poder borrar después lo que
 * crearon. Sin esto, cada ejecución dejaría basura permanente en la base de
 * desarrollo.
 *
 * ── POR QUÉ ES SEGURO ───────────────────────────────────────────────────────
 * Es `internalMutation`, no `mutation`: **no es alcanzable desde el navegador ni
 * desde el cliente de Convex**, solo con las credenciales de administrador que
 * usa el CLI (`npx convex run`) o el dashboard. No amplía la superficie pública
 * de la aplicación, y por eso tampoco lleva `requireUsuario`: no hay sesión de
 * usuario en juego.
 *
 * El MVP no tiene borrado de clientes como funcionalidad, y esto NO lo
 * introduce: borra solo los ids que se le pasan explícitamente, nunca por
 * criterio ni en masa. Si algún día hace falta borrar clientes de verdad, será
 * una `mutation` con autorización y confirmación, no esto.
 */
export const borrarClientes = internalMutation({
  args: { ids: v.array(v.string()) },
  handler: async (ctx, { ids }) => {
    let borrados = 0;
    const noEncontrados: string[] = [];

    for (const id of ids) {
      const clienteId = ctx.db.normalizeId("clientes", id);
      if (clienteId === null) {
        noEncontrados.push(id);
        continue;
      }
      const existe = await ctx.db.get(clienteId);
      if (existe === null) {
        noEncontrados.push(id);
        continue;
      }
      await ctx.db.delete(clienteId);
      borrados += 1;
    }

    return { borrados, noEncontrados };
  },
});
