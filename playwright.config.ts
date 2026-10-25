import { defineConfig } from "@playwright/test";

/**
 * Pruebas de extremo a extremo (LUI-9/10/11).
 *
 * Existen porque hay dos comportamientos del formulario de cliente que NINGUNA
 * revisión por inspección detectó y que estas pruebas sí cazaron: una guarda de
 * desmontaje que en modo estricto se daba por muerta y descartaba guardados
 * válidos, y un bloqueo de cierre que sobrevivía al formulario que lo pidió.
 * Ambos solo aparecen con una respuesta lenta del servidor.
 *
 * Son SECUENCIALES y de un solo worker a propósito: escriben en la base de
 * desarrollo compartida, así que en paralelo se pisarían entre ellas.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // Hay esperas de latencia inyectada de hasta 6s por guardado.
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    viewport: { width: 1280, height: 900 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    // Si ya hay un `next dev` levantado se reutiliza: Next se niega a arrancar
    // un segundo servidor de desarrollo en el mismo proyecto.
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
