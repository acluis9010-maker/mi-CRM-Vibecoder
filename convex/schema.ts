import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Modelo de datos final del MVP (ver LUI-6 en Linear y "CRM — Cambios y
 * Mejoras" en Notion, entrada 2026-09-01). Refleja el diseño entregado
 * "Vibe CRM Shell", no el PRD original:
 * - Sin entidad Oportunidad (5 etapas) ni Notificación — pospuestas a Fase 2.
 * - `estado` del cliente es un badge de 5 valores, no Activo/Inactivo.
 * - `canalOrigen` es Web/Redes/Email/WhatsApp, no Instagram/Referido.
 * - Sin campo de responsable/asignado en Cliente (scoping por rol pospuesto).
 */
export default defineSchema({
  usuarios: defineTable({
    nombre: v.string(),
    email: v.string(),
    rol: v.union(v.literal("propietaria"), v.literal("comercial")),
    // Autenticación propia (LUI-7, versión simple). Formato del campo:
    // `pbkdf2$<iteraciones>$<sal>$<hash>` — ver convex/lib/password.ts.
    // Nunca sale de las funciones de Convex: no se devuelve al cliente.
    passwordHash: v.optional(v.string()),
  }).index("by_email", ["email"]),

  /**
   * Sesiones del login propio. El token vive en el navegador y viaja como
   * argumento en cada llamada; aquí se valida contra esta tabla.
   */
  sesiones: defineTable({
    usuarioId: v.id("usuarios"),
    token: v.string(),
    expira: v.number(), // epoch ms
  })
    .index("by_token", ["token"])
    .index("by_usuario", ["usuarioId"]),

  clientes: defineTable({
    nombre: v.string(),
    telefono: v.optional(v.string()),
    email: v.optional(v.string()),
    empresa: v.optional(v.string()),
    canalOrigen: v.optional(
      v.union(
        v.literal("web"),
        v.literal("redes"),
        v.literal("email"),
        v.literal("whatsapp")
      )
    ),
    nota: v.optional(v.string()),
    estado: v.union(
      v.literal("info"), // Nuevo lead
      v.literal("primary"), // En negociación
      v.literal("warning"), // Pendiente
      v.literal("success"), // Ganado
      v.literal("error") // Perdido
    ),
    ultimoContacto: v.string(), // fecha ISO (YYYY-MM-DD)
    /**
     * Contador de versión para detectar ediciones concurrentes (LUI-10).
     * Lo incrementa el servidor en cada `clientes.actualizar`; el formulario
     * manda la revisión con la que se abrió y la mutation rechaza el guardado
     * si no coincide, en vez de pisar el cambio ajeno en silencio.
     *
     * Es un ENTERO, no una marca de tiempo: `Date.now()` no garantiza cambiar
     * entre dos escrituras seguidas, y entonces un formulario antiguo pasaría
     * la comparación.
     *
     * Opcional porque los clientes del seed se crearon antes de que existiera;
     * se tratan como revisión 0. Toda escritura futura sobre los campos
     * editables del cliente DEBE incrementarlo, o quedará fuera de la protección.
     */
    revision: v.optional(v.number()),
  })
    .index("by_estado", ["estado"])
    // Orden de la lista de clientes (LUI-9): contacto más reciente primero, que
    // es donde aparece el cliente recién creado.
    .index("by_ultimo_contacto", ["ultimoContacto"]),

  interacciones: defineTable({
    clienteId: v.id("clientes"),
    autorId: v.id("usuarios"),
    tipo: v.union(
      v.literal("llamada"),
      v.literal("email"),
      v.literal("whatsapp"),
      v.literal("en_persona"),
      v.literal("reunion"),
      v.literal("nota")
    ),
    texto: v.string(),
    fecha: v.string(),
  }).index("by_cliente", ["clienteId"]),

  seguimientos: defineTable({
    clienteId: v.id("clientes"),
    responsableId: v.id("usuarios"),
    accion: v.string(),
    vence: v.string(), // fecha ISO — "atrasado" se calcula al vuelo, no se guarda
    hecho: v.boolean(),
    fechaHecho: v.optional(v.string()),
  })
    .index("by_cliente", ["clienteId"])
    .index("by_vence", ["vence"])
    // Cubre por completo la consulta de la pantalla Hoy: pendientes con
    // vencimiento <= hoy. Sin este índice habría que traer los futuros y
    // filtrarlos en cliente (hotpath sin cota).
    .index("by_hecho_vence", ["hecho", "vence"]),

  ventas: defineTable({
    clienteId: v.id("clientes"),
    autorId: v.id("usuarios"),
    concepto: v.string(),
    importe: v.number(),
    estado: v.union(
      v.literal("abierta"),
      v.literal("ganada"),
      v.literal("perdida")
    ),
    fecha: v.string(),
  })
    .index("by_cliente", ["clienteId"])
    .index("by_estado", ["estado"]),
});
