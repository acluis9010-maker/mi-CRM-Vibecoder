import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { argsSesion, requireUsuario } from "./lib/authz";
import {
  esFechaISO,
  hayErrores,
  limpiar,
  validarCliente,
  type EntradaCliente,
} from "./lib/validacionCliente";

/**
 * Clientes: la lista (LUI-9), el alta y la edición (LUI-10) y la ficha (LUI-11).
 *
 * Las cuatro funciones abren con `requireUsuario`: son públicas y alcanzables
 * sin pasar por la interfaz, así que la autorización vive aquí, no en la UI.
 *
 * La validación se repite en el servidor aunque el formulario ya valide. La del
 * formulario es comodidad; esta es la barrera.
 *
 * Sobre las FECHAS: llegan como argumento desde el navegador porque Convex corre
 * en UTC (ver la cabecera de convex/seguimientos.ts). Que resuelvan la zona
 * horaria no las hace fiables, así que se comprueban con `esFechaISO`.
 */

const canalOrigen = v.optional(
  v.union(
    v.literal("web"),
    v.literal("redes"),
    v.literal("email"),
    v.literal("whatsapp")
  )
);

const estadoCliente = v.union(
  v.literal("info"), // Nuevo lead
  v.literal("primary"), // En negociación
  v.literal("warning"), // Pendiente
  v.literal("success"), // Ganado
  v.literal("error") // Perdido
);

/** Campos que el usuario edita. Idénticos en el alta y en la edición (LUI-10). */
const argsCampos = {
  nombre: v.string(),
  empresa: v.optional(v.string()),
  telefono: v.optional(v.string()),
  email: v.optional(v.string()),
  canalOrigen,
  nota: v.optional(v.string()),
} as const;

/**
 * Lanza si los datos no cumplen las reglas, con los errores por campo dentro del
 * payload para que el formulario pueda pintarlos donde corresponde.
 *
 * Se usa `ConvexError` y no un `Error` normal porque Convex sustituye el mensaje
 * de los errores corrientes por "Server Error" antes de que lleguen al cliente.
 */
function exigirValido(entrada: EntradaCliente): void {
  const errores = validarCliente(entrada);
  if (hayErrores(errores)) {
    throw new ConvexError({
      codigo: "validacion",
      mensaje: "Revisa los datos del cliente.",
      errores,
    });
  }
}

/**
 * Lista completa de clientes, ordenada por contacto más reciente.
 *
 * Devuelve `telefono` y `email` porque el buscador de LUI-9 filtra por ellos EN
 * EL CLIENTE. Se hace así por dos razones: la regla del diseño compara teléfonos
 * normalizados a dígitos, que un `searchIndex` de Convex no puede expresar; y
 * consultar al servidor en cada pulsación abriría una suscripción nueva por letra.
 *
 * TODO(LUI-9): esto trae la tabla entera. Para un CRM de pequeño negocio está
 * muy por debajo del límite de lectura de Convex, pero si crece hace falta
 * paginar con `by_ultimo_contacto` y mover la búsqueda al servidor.
 */
export const listar = query({
  args: { ...argsSesion },
  handler: async (ctx, { token }) => {
    await requireUsuario(ctx, token);

    const clientes = await ctx.db
      .query("clientes")
      .withIndex("by_ultimo_contacto")
      .order("desc")
      .collect();

    return clientes.map((c) => ({
      _id: c._id,
      nombre: c.nombre,
      empresa: c.empresa,
      telefono: c.telefono,
      email: c.email,
      estado: c.estado,
      ultimoContacto: c.ultimoContacto,
    }));
  },
});

/**
 * Un cliente por id, para la ficha y para precargar la edición.
 *
 * El `id` se recibe como `v.string()` y se valida con `normalizeId` en vez de
 * declararlo `v.id("clientes")`: el id viene de la URL, así que un enlace mal
 * escrito es un caso normal. Con `v.id` la función lanzaría; así devuelve `null`
 * y la pantalla puede mostrar "Cliente no encontrado".
 *
 * `revision` se normaliza a 0 para los clientes creados antes de que el campo
 * existiera, de modo que el formulario siempre maneje un número.
 */
export const obtener = query({
  args: { ...argsSesion, id: v.string() },
  handler: async (ctx, { token, id }) => {
    await requireUsuario(ctx, token);

    const clienteId = ctx.db.normalizeId("clientes", id);
    if (clienteId === null) return null;

    const c = await ctx.db.get(clienteId);
    if (c === null) return null;

    return {
      _id: c._id,
      nombre: c.nombre,
      empresa: c.empresa,
      telefono: c.telefono,
      email: c.email,
      canalOrigen: c.canalOrigen,
      nota: c.nota,
      estado: c.estado,
      ultimoContacto: c.ultimoContacto,
      revision: c.revision ?? 0,
    };
  },
});

/**
 * Da de alta un cliente. Nace siempre como "Nuevo lead" (`info`) y con el último
 * contacto en hoy, igual que el prototipo (L1101).
 *
 * Devuelve el id porque el flujo de LUI-10 navega a la ficha del cliente recién
 * creado, así que hay que esperar la escritura de todas formas.
 */
export const crear = mutation({
  args: { ...argsSesion, ...argsCampos, hoyISO: v.string() },
  handler: async (ctx, args) => {
    await requireUsuario(ctx, args.token);
    exigirValido(args);

    if (!esFechaISO(args.hoyISO)) {
      throw new ConvexError({
        codigo: "validacion",
        mensaje: "La fecha recibida no es válida.",
        errores: {},
      });
    }

    const clienteId = await ctx.db.insert("clientes", {
      nombre: args.nombre.trim(),
      empresa: limpiar(args.empresa),
      telefono: limpiar(args.telefono),
      email: limpiar(args.email),
      canalOrigen: args.canalOrigen,
      nota: limpiar(args.nota),
      estado: "info",
      ultimoContacto: args.hoyISO,
      revision: 1,
    });

    return { clienteId };
  },
});

/**
 * Actualiza un cliente existente.
 *
 * ── ES UNA ACTUALIZACIÓN COMPLETA ───────────────────────────────────────────
 * `undefined` no viaja como propiedad en los argumentos serializados de Convex,
 * así que quien llama no puede "mandar un campo vacío": lo que llega es la
 * AUSENCIA del argumento. Por eso el contrato es que **la ausencia de un
 * opcional significa borrarlo**, y quien llame debe enviar todos los campos que
 * quiera conservar.
 *
 * El objeto del `patch` se construye explícitamente campo a campo para que eso
 * ocurra: una clave presente con valor `undefined` elimina el campo, mientras
 * que una clave que no aparece conservaría el valor anterior.
 *
 * ── CONTROL DE CONCURRENCIA ─────────────────────────────────────────────────
 * Marta y Carlos ven la misma lista (R13), y el formulario manda todos los
 * campos. Sin esto, si Marta cambia el teléfono y Carlos guarda después una nota
 * desde su formulario antiguo, el teléfono anterior volvería en silencio.
 *
 * `revision` es un entero que se incrementa aquí, en la misma mutation que hace
 * la comprobación —atómica en Convex, así que no hay ventana entre leer y
 * escribir—. No se usa `Date.now()` porque no garantiza cambiar entre dos
 * escrituras seguidas.
 *
 * No toca `ultimoContacto`: editar la ficha no es haber contactado al cliente.
 */
export const actualizar = mutation({
  args: {
    ...argsSesion,
    ...argsCampos,
    id: v.string(),
    estado: estadoCliente,
    revisionEsperada: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireUsuario(ctx, args.token);
    exigirValido(args);

    const clienteId = ctx.db.normalizeId("clientes", args.id);
    if (clienteId === null) {
      return { actualizado: false as const, motivo: "no-encontrado" as const };
    }

    const actual = await ctx.db.get(clienteId);
    if (actual === null) {
      return { actualizado: false as const, motivo: "no-encontrado" as const };
    }

    const revisionActual = actual.revision ?? 0;
    if ((args.revisionEsperada ?? 0) !== revisionActual) {
      // Se devuelven los valores del servidor para que el formulario pueda
      // explicar QUÉ cambió sin tener que pisar lo que el usuario escribió.
      return {
        actualizado: false as const,
        motivo: "conflicto" as const,
        revision: revisionActual,
        servidor: {
          nombre: actual.nombre,
          empresa: actual.empresa,
          telefono: actual.telefono,
          email: actual.email,
          canalOrigen: actual.canalOrigen,
          nota: actual.nota,
          estado: actual.estado,
        },
      };
    }

    const revisionNueva = revisionActual + 1;
    await ctx.db.patch(clienteId, {
      nombre: args.nombre.trim(),
      empresa: limpiar(args.empresa),
      telefono: limpiar(args.telefono),
      email: limpiar(args.email),
      canalOrigen: args.canalOrigen,
      nota: limpiar(args.nota),
      estado: args.estado,
      revision: revisionNueva,
    });

    return { actualizado: true as const, revision: revisionNueva };
  },
});
