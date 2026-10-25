import { execFileSync } from "node:child_process";
import type { Page } from "@playwright/test";

/**
 * Utilidades compartidas por las pruebas de extremo a extremo.
 *
 * Tres reglas que estas pruebas respetan, y conviene no relajar:
 *
 *  1. **Nunca contra producción.** Escriben y borran datos. `exigirEntornoLocal`
 *     aborta si la URL no es local o si el deployment de Convex no es de
 *     desarrollo.
 *  2. **Sin credenciales en el repo.** Salen de `E2E_EMAIL` y `E2E_PASSWORD`.
 *  3. **Limpian solo lo suyo.** Cada prueba apunta los ids que crea y los borra
 *     al terminar, por id explícito. No hay borrado masivo.
 */

/** Aborta si la prueba apunta a algo que no sea un entorno local de desarrollo. */
export function exigirEntornoLocal(baseURL: string | undefined): void {
  const url = baseURL ?? "";
  const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(url);
  if (!local) {
    throw new Error(
      `Las pruebas e2e escriben y borran datos: solo se ejecutan contra localhost. Recibido: "${url}"`
    );
  }
  const deployment = process.env.CONVEX_DEPLOYMENT ?? "";
  if (deployment !== "" && !deployment.startsWith("dev:")) {
    throw new Error(
      `CONVEX_DEPLOYMENT debe ser de desarrollo (dev:...). Recibido: "${deployment}"`
    );
  }
}

export function credenciales(): { email: string; password: string } {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "Faltan E2E_EMAIL y E2E_PASSWORD. Son las de un usuario de la base de desarrollo; no se guardan en el repo."
    );
  }
  return { email, password };
}

/**
 * Inyecta latencia conmutable en las respuestas del servidor de Convex.
 *
 * Las mutations de Convex viajan por WebSocket, no por HTTP, así que no sirve
 * interceptar peticiones: hay que retrasar los mensajes del socket. Devuelve una
 * función para encender y apagar el retraso en mitad de la prueba.
 */
export async function conLatenciaConmutable(
  page: Page,
  ms = 6000
): Promise<(lento: boolean) => void> {
  const estado = { lento: false };
  await page.routeWebSocket(/convex\.cloud/, (ws) => {
    const servidor = ws.connectToServer();
    ws.onMessage((m) => servidor.send(m));
    servidor.onMessage(async (m) => {
      if (estado.lento) await new Promise((r) => setTimeout(r, ms));
      ws.send(m);
    });
  });
  return (lento: boolean) => {
    estado.lento = lento;
  };
}

export async function iniciarSesion(page: Page): Promise<void> {
  const { email, password } = credenciales();
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await esperarUrl(page, /\/hoy$/);
}

/**
 * Las navegaciones del router de Next no disparan `load`, así que `waitForURL`
 * con su espera por defecto se queda colgado. Se sondea la URL.
 */
export async function esperarUrl(
  page: Page,
  patron: RegExp,
  ms = 25_000
): Promise<boolean> {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    if (patron.test(page.url())) return true;
    await page.waitForTimeout(200);
  }
  return false;
}

/**
 * Borra por id los clientes que la prueba creó.
 *
 * Se apoya en `pruebas:borrarClientes`, que es una `internalMutation`: no es
 * alcanzable desde el navegador ni desde el cliente de Convex, solo con las
 * credenciales de administrador que usa el CLI. Si falla, no se hace fallar la
 * prueba: se avisa, porque dejar un registro de más no invalida el resultado.
 */
export function borrarClientes(ids: string[]): void {
  if (ids.length === 0) return;
  try {
    execFileSync(
      "npx",
      ["convex", "run", "pruebas:borrarClientes", JSON.stringify({ ids })],
      { stdio: "pipe" }
    );
  } catch (err) {
    console.warn(
      `No se pudieron borrar los clientes de prueba (${ids.join(", ")}): ${String(err)}`
    );
  }
}
