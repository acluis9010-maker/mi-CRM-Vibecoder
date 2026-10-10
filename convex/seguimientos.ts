import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUsuario } from "./lib/authz";

/**
 * Seguimientos: la pantalla "Hoy" (LUI-21) y el flujo de completar (LUI-16).
 *
 * Sobre las FECHAS: llegan como argumento desde el cliente en vez de calcularse
 * aquí, a propósito. Convex corre en UTC; si el servidor calculara "hoy", un
 * usuario en Madrid a las 00:30 registraría el día anterior y vería la sección
 * "Atrasados" equivocada. La fecha local la sabe el navegador.
 */

/**
 * Pendientes con vencimiento <= `hoyISO`, enriquecidos con cliente y
 * responsable, ordenados por fecha de vencimiento.
 *
 * Cubierto por completo por el índice `by_hecho_vence`: los seguimientos con
 * fecha futura NO salen del servidor. El cliente solo reparte lo recibido entre
 * "Atrasados" (vence < hoy) y "Para hoy" (vence === hoy).
 */
export const listarPendientes = query({
  args: { hoyISO: v.string() },
  handler: async (ctx, { hoyISO }) => {
    await requireUsuario(ctx);

    const pendientes = await ctx.db
      .query("seguimientos")
      .withIndex("by_hecho_vence", (q) =>
        q.eq("hecho", false).lte("vence", hoyISO)
      )
      .collect();

    return await Promise.all(
      pendientes.map(async (seg) => {
        const [cliente, responsable] = await Promise.all([
          ctx.db.get(seg.clienteId),
          ctx.db.get(seg.responsableId),
        ]);
        return {
          _id: seg._id,
          accion: seg.accion,
          vence: seg.vence,
          clienteId: seg.clienteId,
          clienteNombre: cliente?.nombre ?? "(cliente eliminado)",
          clienteEstado: cliente?.estado ?? ("info" as const),
          responsableNombre: responsable?.nombre ?? "",
        };
      })
    );
  },
});

/** Marca un seguimiento como hecho. `fechaHecho` la calcula el cliente (ver arriba). */
export const marcarHecho = mutation({
  args: { id: v.id("seguimientos"), fechaHecho: v.string() },
  handler: async (ctx, { id, fechaHecho }) => {
    await requireUsuario(ctx);

    const seg = await ctx.db.get(id);
    if (seg === null) throw new Error("Ese seguimiento ya no existe.");

    await ctx.db.patch(id, { hecho: true, fechaHecho });
  },
});

/**
 * Deshace un "marcar hecho" (el botón Deshacer del toast).
 *
 * PROTECCIÓN DE CONFLICTO PARCIAL — leer antes de confiar en ella:
 * solo revierte si `fechaHecho` sigue siendo la que el cliente vio. Como
 * `fechaHecho` es una fecha de calendario (YYYY-MM-DD) y no un token único,
 * esto cubre que otra persona lo completara OTRO día, pero NO que lo volviera a
 * completar el MISMO día: en ese caso los valores coinciden y el Deshacer tardío
 * sí revierte el cambio ajeno.
 *
 * TODO(LUI-16): el arreglo real es `completadoPor: Id<"usuarios">`, que ahora que
 * hay identidad es además dato de producto (la ficha del cliente quiere mostrar
 * "Responsable: <nombre>"). Distingue dos completados del mismo día.
 */
export const desmarcar = mutation({
  args: { id: v.id("seguimientos"), fechaHechoEsperada: v.string() },
  handler: async (ctx, { id, fechaHechoEsperada }) => {
    await requireUsuario(ctx);

    const seg = await ctx.db.get(id);
    if (seg === null) {
      return { revertido: false, motivo: "no existe" as const };
    }
    if (seg.fechaHecho !== fechaHechoEsperada) {
      return { revertido: false, motivo: "cambiado" as const };
    }

    await ctx.db.patch(id, { hecho: false, fechaHecho: undefined });
    return { revertido: true, motivo: null };
  },
});
