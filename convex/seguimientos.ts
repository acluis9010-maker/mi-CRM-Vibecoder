import { ConvexError } from "convex/values";
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

/**
 * Marca un seguimiento como hecho. `fechaHecho` la calcula el cliente (ver arriba).
 *
 * Rechaza marcar uno que YA está hecho en vez de sobrescribirlo. Importa porque
 * esto es un endpoint de escritura alcanzable sin pasar por la interfaz: con un
 * `id` conocido, cualquier usuario dado de alta puede llamarlo directamente.
 * Sin esta comprobación, una llamada repetida pisaría la `fechaHecho` original
 * —y con ella el token que usa `desmarcar` para detectar conflictos—.
 *
 * Devuelve un resultado discriminado en vez de lanzar: un reintento benigno o
 * una carrera no deberían convertirse en un error.
 *
 * Lo que esta mutation NO comprueba es a quién pertenece el seguimiento: el
 * scoping por usuario es deuda aceptada (R13, Fase 2) — en el MVP todos ven y
 * gestionan la misma lista, por decisión de producto.
 */
export const marcarHecho = mutation({
  args: { id: v.id("seguimientos"), fechaHecho: v.string() },
  handler: async (ctx, { id, fechaHecho }) => {
    await requireUsuario(ctx);

    const seg = await ctx.db.get(id);
    if (seg === null) {
      throw new ConvexError("Ese seguimiento ya no existe.");
    }
    if (seg.hecho) {
      return { marcado: false, motivo: "ya estaba hecho" as const };
    }

    await ctx.db.patch(id, { hecho: true, fechaHecho });
    return { marcado: true, motivo: null };
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
    // `hecho` antes que `fechaHecho`: un documento con hecho=false y la misma
    // fechaHecho es imposible por el flujo, pero no por el esquema. Sin esta
    // guarda se devolvería `revertido: true` sin revertir nada, y el contrato
    // de retorno mentiría ante un estado corrupto.
    if (!seg.hecho) {
      return { revertido: false, motivo: "cambiado" as const };
    }
    if (seg.fechaHecho !== fechaHechoEsperada) {
      return { revertido: false, motivo: "cambiado" as const };
    }

    await ctx.db.patch(id, { hecho: false, fechaHecho: undefined });
    return { revertido: true, motivo: null };
  },
});
