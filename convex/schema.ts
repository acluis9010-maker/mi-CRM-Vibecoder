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
    // Autenticación: punto de integración pendiente (ver LUI-7) — no se
    // guarda contraseña aquí, la resuelve el proveedor de auth elegido.
  }).index("by_email", ["email"]),

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
  }).index("by_estado", ["estado"]),

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
    .index("by_vence", ["vence"]),

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
