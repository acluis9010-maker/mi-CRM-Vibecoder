/**
 * Hash y verificación de contraseñas con PBKDF2-SHA256 sobre Web Crypto, que
 * está disponible en el runtime de Convex (comprobado: `crypto.subtle`,
 * `deriveBits` y `getRandomValues`).
 *
 * No se usa bcrypt/argon2 porque son módulos nativos y no cargan aquí.
 *
 * PROVISIONAL — ver convex/lib/authz.ts: este login es el "simple" pedido para
 * avanzar con el diseño. Las iteraciones están al mínimo razonable para no
 * penalizar el login en el plan gratuito; subirlas (o migrar a un proveedor de
 * identidad) es parte del endurecimiento pendiente.
 */

const ITERACIONES = 100_000;
const LONGITUD_BITS = 256;
const BYTES_SAL = 16;

function aHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function desdeHex(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(new ArrayBuffer(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function derivar(
  password: string,
  sal: Uint8Array<ArrayBuffer>
): Promise<string> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: sal, iterations: ITERACIONES, hash: "SHA-256" },
    material,
    LONGITUD_BITS
  );
  return aHex(bits);
}

/** Devuelve `pbkdf2$<iteraciones>$<sal hex>$<hash hex>`, todo en un campo. */
export async function hashearPassword(password: string): Promise<string> {
  const sal = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(BYTES_SAL)));
  const hash = await derivar(password, sal);
  return `pbkdf2$${ITERACIONES}$${aHex(sal)}$${hash}`;
}

/**
 * Comparación en tiempo constante: un `===` sobre strings puede cortocircuitar
 * al primer byte distinto y filtrar información por el tiempo de respuesta.
 */
function igualesEnTiempoConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) {
    diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diferencia === 0;
}

export async function verificarPassword(
  password: string,
  almacenado: string
): Promise<boolean> {
  const partes = almacenado.split("$");
  if (partes.length !== 4 || partes[0] !== "pbkdf2") return false;

  const iteraciones = Number(partes[1]);
  if (!Number.isFinite(iteraciones) || iteraciones <= 0) return false;

  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: desdeHex(partes[2]),
      iterations: iteraciones,
      hash: "SHA-256",
    },
    material,
    LONGITUD_BITS
  );

  return igualesEnTiempoConstante(aHex(bits), partes[3]);
}

/** Token de sesión de 256 bits. */
export function nuevoToken(): string {
  return aHex(crypto.getRandomValues(new Uint8Array(new ArrayBuffer(32))));
}
