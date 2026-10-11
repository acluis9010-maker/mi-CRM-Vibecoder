import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { hashearPassword } from "./lib/password";

/**
 * Siembra datos de desarrollo/arranque. Determinista e idempotente.
 *
 * Es `internalMutation` a propósito: no añade superficie pública. Se ejecuta con
 * credenciales de admin —`npx convex run seed:poblar`— o desde el function
 * runner del dashboard. NO convertir en `mutation` pública.
 *
 * Los emails coinciden con los que hay que invitar en Clerk (ver LUI-7): sin un
 * registro en `usuarios` nadie entra, aunque Clerk lo autentique.
 */

const DIA_MS = 86_400_000;

/** Fecha ISO (YYYY-MM-DD) desplazada N días respecto a hoy. */
function iso(offsetDias: number): string {
  return new Date(Date.now() + offsetDias * DIA_MS).toISOString().slice(0, 10);
}

export const poblar = internalMutation({
  args: {},
  handler: async (ctx) => {
    const yaExiste = await ctx.db
      .query("usuarios")
      .withIndex("by_email", (q) => q.eq("email", "marta@acme.es"))
      .unique();

    if (yaExiste !== null) {
      return { sembrado: false, motivo: "ya había datos" as const };
    }

    // ── Usuarios ──────────────────────────────────────────────────────────
    // `authTokenIdentifier` se deja vacío: lo reclama el primer login real.
    const marta = await ctx.db.insert("usuarios", {
      nombre: "Marta López",
      email: "marta@acme.es",
      rol: "propietaria",
    });
    const carlos = await ctx.db.insert("usuarios", {
      nombre: "Carlos Ruiz",
      email: "carlos@betadigital.com",
      rol: "comercial",
    });

    // ── Clientes (cubren los 5 valores de `estado`) ───────────────────────
    const clientes = await Promise.all(
      [
        {
          nombre: "Laura Beltrán",
          empresa: "Estudio Beltrán",
          telefono: "600 112 233",
          email: "laura@estudiobeltran.es",
          canalOrigen: "web" as const,
          estado: "info" as const,
          ultimoContacto: iso(-1),
        },
        {
          nombre: "Javier Serrano",
          empresa: "Serrano Consultores",
          telefono: "600 445 566",
          email: "javier@serranoconsultores.es",
          canalOrigen: "redes" as const,
          estado: "primary" as const,
          ultimoContacto: iso(-3),
        },
        {
          nombre: "Nuria Cano",
          empresa: "Cano Diseño",
          telefono: "600 778 899",
          email: "nuria@canodiseno.es",
          canalOrigen: "whatsapp" as const,
          estado: "warning" as const,
          ultimoContacto: iso(-9),
        },
        {
          nombre: "Diego Ferrer",
          empresa: "Ferrer & Hijos",
          telefono: "600 221 334",
          email: "diego@ferrerehijos.es",
          canalOrigen: "email" as const,
          estado: "success" as const,
          ultimoContacto: iso(-16),
        },
        {
          nombre: "Patricia Gil",
          empresa: "Gil Interiores",
          telefono: "600 556 677",
          email: "patricia@gilinteriores.es",
          canalOrigen: "web" as const,
          estado: "error" as const,
          ultimoContacto: iso(-25),
        },
        {
          nombre: "Óscar Méndez",
          empresa: "Méndez Logística",
          telefono: "600 889 900",
          email: "oscar@mendezlogistica.es",
          canalOrigen: "redes" as const,
          estado: "info" as const,
          nota: "Pidió presupuesto para dos almacenes.",
          ultimoContacto: iso(0),
        },
      ].map((c) => ctx.db.insert("clientes", c))
    );

    // ── Seguimientos ──────────────────────────────────────────────────────
    // Atrasados (vence < hoy), para hoy (vence === hoy) y uno FUTURO, que
    // sirve para comprobar que `listarPendientes` no lo devuelve.
    await Promise.all(
      [
        { clienteId: clientes[2], responsableId: marta, accion: "Llamar para cerrar la propuesta", vence: iso(-4) },
        { clienteId: clientes[1], responsableId: carlos, accion: "Enviar presupuesto revisado", vence: iso(-1) },
        { clienteId: clientes[0], responsableId: marta, accion: "Confirmar reunión del jueves", vence: iso(0) },
        { clienteId: clientes[5], responsableId: carlos, accion: "Preparar comparativa de almacenes", vence: iso(0) },
        { clienteId: clientes[3], responsableId: marta, accion: "Seguimiento post-venta", vence: iso(7) },
      ].map((s) => ctx.db.insert("seguimientos", { ...s, hecho: false }))
    );

    // ── Interacciones y ventas (dan cuerpo al historial de la ficha) ──────
    await Promise.all(
      [
        { clienteId: clientes[1], autorId: carlos, tipo: "llamada" as const, texto: "Le interesa el plan anual. Pide descuento por volumen.", fecha: iso(-3) },
        { clienteId: clientes[2], autorId: marta, tipo: "whatsapp" as const, texto: "Pregunta por los plazos de entrega.", fecha: iso(-9) },
        { clienteId: clientes[0], autorId: marta, tipo: "email" as const, texto: "Enviada presentación inicial.", fecha: iso(-1) },
      ].map((i) => ctx.db.insert("interacciones", i))
    );

    await Promise.all(
      [
        { clienteId: clientes[3], autorId: marta, concepto: "Rediseño de marca", importe: 12400, estado: "ganada" as const, fecha: iso(-16) },
        { clienteId: clientes[1], autorId: carlos, concepto: "Plan anual de soporte", importe: 8600, estado: "abierta" as const, fecha: iso(-3) },
        { clienteId: clientes[4], autorId: carlos, concepto: "Campaña de lanzamiento", importe: 5200, estado: "perdida" as const, fecha: iso(-25) },
      ].map((v) => ctx.db.insert("ventas", v))
    );

    return {
      sembrado: true,
      usuarios: 2,
      clientes: clientes.length,
      seguimientos: 5,
    };
  },
});

/**
 * Solo los usuarios del equipo, sin datos de ejemplo. Es lo que hay que correr
 * en PRODUCCIÓN: sin un registro en `usuarios` nadie entra aunque Clerk lo
 * autentique, pero los clientes de muestra serían morralla en la base real.
 *
 * Los emails deben coincidir con los invitados en Clerk.
 *
 * Idempotente: no toca a quien ya exista, y no pisa `authTokenIdentifier`.
 */
export const poblarUsuarios = internalMutation({
  args: {
    passwordMarta: v.string(),
    passwordCarlos: v.string(),
  },
  handler: async (ctx, { passwordMarta, passwordCarlos }) => {
    const equipo = [
      { nombre: "Marta López", email: "marta@acme.es", rol: "propietaria" as const, password: passwordMarta },
      { nombre: "Carlos Ruiz", email: "carlos@betadigital.com", rol: "comercial" as const, password: passwordCarlos },
    ];

    const creados: string[] = [];
    const actualizados: string[] = [];

    for (const { password, ...datos } of equipo) {
      const passwordHash = await hashearPassword(password);
      const existe = await ctx.db
        .query("usuarios")
        .withIndex("by_email", (q) => q.eq("email", datos.email))
        .unique();

      if (existe === null) {
        await ctx.db.insert("usuarios", { ...datos, passwordHash });
        creados.push(datos.email);
      } else {
        // Solo se asigna la contraseña; no se toca nombre ni rol, que pueden
        // haberse editado desde la pantalla de Equipo.
        await ctx.db.patch(existe._id, { passwordHash });
        actualizados.push(datos.email);
      }
    }

    return { creados, actualizados };
  },
});
