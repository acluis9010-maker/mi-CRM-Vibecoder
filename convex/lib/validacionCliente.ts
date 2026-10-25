/**
 * Reglas de validación del cliente (LUI-10). Fuente ÚNICA, compartida por el
 * servidor y por el formulario: `convex/clientes.ts` las aplica como barrera
 * real, y `src/components/clientes/FormularioCliente.tsx` las usa para pintar
 * los errores antes de llamar.
 *
 * Reglas tomadas del prototipo (CRM Shell.dc.html L1067-1078), con los mensajes
 * literales del diseño. Los límites de longitud son añadidos: el diseño no los
 * contempla, pero sin ellos la mutation acepta cadenas de cualquier tamaño.
 *
 * IMPORTANTE: este fichero entra en el bundle del navegador, así que NO puede
 * importar `convex/values`, `./authz` ni nada del servidor. Solo TypeScript puro.
 */

export const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LIMITES = {
  nombre: 80,
  empresa: 80,
  telefono: 30,
  email: 120,
  nota: 500,
} as const;

/** Visible siempre bajo los campos de contacto, en gris o en rojo (L482). */
export const AVISO_CONTACTO = "Indica al menos un teléfono o un email";

export type EntradaCliente = {
  nombre: string;
  empresa?: string;
  telefono?: string;
  email?: string;
  nota?: string;
};

export type ErroresCliente = {
  nombre?: string;
  empresa?: string;
  telefono?: string;
  email?: string;
  nota?: string;
  /** Falta teléfono Y email. No cuelga de un campo concreto. */
  contacto?: string;
};

/**
 * Normaliza un opcional de texto: recorta, y convierte el vacío en `undefined`.
 *
 * Lo segundo es lo que hace que vaciar un campo lo BORRE en lugar de guardar
 * una cadena vacía: `ctx.db.patch` elimina el campo cuando recibe `undefined`.
 */
export function limpiar(valor: string | undefined): string | undefined {
  if (valor === undefined) return undefined;
  const recortado = valor.trim();
  return recortado === "" ? undefined : recortado;
}

/** Deja solo dígitos, para comparar teléfonos escritos de cualquier manera. */
export function normalizarTelefono(valor: string | undefined): string {
  return (valor ?? "").replace(/[^0-9]/g, "");
}

function demasiadoLargo(maximo: number): string {
  return `Máximo ${maximo} caracteres`;
}

/**
 * Devuelve los errores encontrados. Un objeto vacío significa válido.
 *
 * Las tres reglas del diseño: nombre obligatorio, al menos uno de
 * {teléfono, email}, y email con formato válido si se rellena.
 */
export function validarCliente(entrada: EntradaCliente): ErroresCliente {
  const errores: ErroresCliente = {};

  const nombre = (entrada.nombre ?? "").trim();
  const empresa = (entrada.empresa ?? "").trim();
  const telefono = (entrada.telefono ?? "").trim();
  const email = (entrada.email ?? "").trim();
  const nota = (entrada.nota ?? "").trim();

  if (nombre.length === 0) {
    errores.nombre = "Añade un nombre";
  } else if (nombre.length > LIMITES.nombre) {
    errores.nombre = demasiadoLargo(LIMITES.nombre);
  }

  // El formato manda sobre la longitud: un email mal escrito y además larguísimo
  // se explica mejor como "no válido".
  if (email.length > 0 && !FORMATO_EMAIL.test(email)) {
    errores.email = "Email no válido";
  } else if (email.length > LIMITES.email) {
    errores.email = demasiadoLargo(LIMITES.email);
  }

  if (empresa.length > LIMITES.empresa) {
    errores.empresa = demasiadoLargo(LIMITES.empresa);
  }
  if (telefono.length > LIMITES.telefono) {
    errores.telefono = demasiadoLargo(LIMITES.telefono);
  }
  if (nota.length > LIMITES.nota) {
    errores.nota = demasiadoLargo(LIMITES.nota);
  }

  if (telefono.length === 0 && email.length === 0) {
    errores.contacto = AVISO_CONTACTO;
  }

  return errores;
}

export function hayErrores(errores: ErroresCliente): boolean {
  return Object.keys(errores).length > 0;
}

/**
 * Comprueba que una cadena es una fecha ISO corta REAL, no solo que tenga la
 * forma. Rechaza cosas como "2026-02-31".
 *
 * Las fechas llegan del navegador para resolver la zona horaria (ver la cabecera
 * de convex/seguimientos.ts), pero eso no las hace fiables: el cliente puede
 * mandar lo que quiera, así que el servidor las valida.
 */
export function esFechaISO(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00Z`);
  if (Number.isNaN(fecha.getTime())) return false;
  // Si el día no existía, Date lo desborda al mes siguiente y ya no coincide.
  return fecha.toISOString().slice(0, 10) === valor;
}
