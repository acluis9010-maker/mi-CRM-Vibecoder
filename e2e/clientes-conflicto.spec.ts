import { expect, test, type Page } from "@playwright/test";
import {
  borrarClientes,
  esperarUrl,
  exigirEntornoLocal,
  iniciarSesion,
} from "./apoyo";

/**
 * Edición concurrente del mismo cliente por dos personas (LUI-10).
 *
 * El fallo que esto evita: Marta cambia el teléfono y Carlos guarda después una
 * nota desde su formulario antiguo; sin control de versión, el teléfono de Marta
 * volvía al valor anterior en silencio.
 *
 * Lo que se exige no es "el segundo guardado pasa", sino que **solo pase después
 * de resolver el conflicto sobre una versión conocida**, sin perder por el camino
 * lo que el usuario había escrito.
 *
 * La prueba crea su propio cliente en lugar de usar uno del seed, para no
 * depender de datos ajenos ni dejarlos alterados.
 */

const creados: string[] = [];

test.afterAll(() => {
  borrarClientes(creados);
});

/** Teléfono distinto en cada ejecución. */
function telefonoUnico(): string {
  const d = String(Date.now()).slice(-6);
  return `600 ${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 6)}`;
}

async function abrirEdicion(page: Page, id: string) {
  const dialogo = page.locator("dialog");
  await page.goto(`/clientes/${id}?editar=1`);
  await expect(dialogo).toBeVisible();
  await page.waitForTimeout(500); // que termine de precargar
  return dialogo;
}

test("el guardado concurrente avisa, conserva el borrador y no pisa el cambio ajeno", async ({
  browser,
  baseURL,
}) => {
  exigirEntornoLocal(baseURL);

  const ctxMarta = await browser.newContext();
  const ctxCarlos = await browser.newContext();
  const marta = await ctxMarta.newPage();
  const carlos = await ctxCarlos.newPage();
  await iniciarSesion(marta);
  await iniciarSesion(carlos);

  // Cliente propio de la prueba
  await marta.goto("/clientes?nuevo=1");
  const alta = marta.locator("dialog");
  await expect(alta).toBeVisible();
  await alta.locator('input[name="nombre"]').fill("E2E Conflicto");
  await alta.locator('input[name="telefono"]').fill("600 00 00 00");
  await alta.locator('textarea[name="nota"]').fill("Nota inicial");
  await alta.getByRole("button", { name: "Guardar" }).click();
  expect(await esperarUrl(marta, /\/clientes\/[a-z0-9]{20,}$/)).toBe(true);
  const id = marta.url().split("/").pop() as string;
  creados.push(id);

  // Los DOS abren el formulario antes de que ninguno guarde: es la condición
  // que hace que el segundo parta de una versión obsoleta.
  const dMarta = await abrirEdicion(marta, id);
  const dCarlos = await abrirEdicion(carlos, id);

  const tel = telefonoUnico();
  await dMarta.locator('input[name="telefono"]').fill(tel);
  await dMarta.getByRole("button", { name: "Guardar" }).click();
  await expect(dMarta).toBeHidden();

  await dCarlos.locator('textarea[name="nota"]').fill("NOTA DE CARLOS");
  await dCarlos.getByRole("button", { name: "Guardar" }).click();
  await carlos.waitForTimeout(2000);

  // No se cierra, avisa, dice QUÉ cambió, y no pierde lo escrito.
  await expect(dCarlos).toBeVisible();
  const aviso = dCarlos.getByRole("alert").first();
  await expect(aviso).toBeVisible();
  await expect(aviso).toContainText("Teléfono");
  await expect(dCarlos.locator('textarea[name="nota"]')).toHaveValue(
    "NOTA DE CARLOS"
  );

  // Reintentar SIN resolver debe seguir dando conflicto: no se escribe sobre
  // una versión que no se ha visto.
  await dCarlos.getByRole("button", { name: "Guardar" }).click();
  await carlos.waitForTimeout(2000);
  await expect(dCarlos).toBeVisible();
  await expect(aviso).toBeVisible();
  await expect(dCarlos.locator('textarea[name="nota"]')).toHaveValue(
    "NOTA DE CARLOS"
  );

  // Solo una acción explícita sustituye el borrador y avanza la versión base.
  await dCarlos.getByRole("button", { name: "Cargar la versión actual" }).click();
  await carlos.waitForTimeout(700);
  await expect(dCarlos.locator('input[name="telefono"]')).toHaveValue(tel);
  await expect(dCarlos.locator('textarea[name="nota"]')).not.toHaveValue(
    "NOTA DE CARLOS"
  );

  await dCarlos.locator('textarea[name="nota"]').fill("Nota de Carlos (2o)");
  await dCarlos.getByRole("button", { name: "Guardar" }).click();
  await expect(dCarlos).toBeHidden();

  // El cambio de Marta sigue ahí: es lo que el control de versión protege.
  await carlos.goto(`/clientes/${id}`);
  await expect(carlos.getByText(tel)).toBeVisible();

  await ctxMarta.close();
  await ctxCarlos.close();
});
