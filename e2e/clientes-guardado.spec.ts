import { expect, test, type Page } from "@playwright/test";
import {
  borrarClientes,
  conLatenciaConmutable,
  esperarUrl,
  exigirEntornoLocal,
  iniciarSesion,
} from "./apoyo";

/**
 * Comportamiento del formulario de cliente mientras una escritura está EN VUELO
 * (LUI-10).
 *
 * Todo lo que se comprueba aquí fue un fallo real: con una respuesta lenta se
 * podía seguir escribiendo tras enviar y perder esos cambios, cerrar con Esc un
 * alta que el servidor iba a completar igual, y quedarse con el cierre bloqueado
 * al reabrir el formulario. Nada de eso se ve con una respuesta rápida, de ahí
 * la latencia inyectada.
 */

const creados: string[] = [];

/**
 * Apunta para borrar el cliente cuya fila lleva ese nombre, leyendo su href.
 * Espera a que la fila aparezca: la lista llega por suscripción y sin la espera
 * el id se perdería y el registro quedaría para siempre en la base de dev.
 */
async function apuntarIdDeFila(page: Page, nombre: string): Promise<void> {
  const fila = page.getByRole("link").filter({ hasText: nombre }).first();
  await fila.waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
  const href = await fila.getAttribute("href").catch(() => null);
  const id = href?.split("/").pop();
  if (id) creados.push(id);
}

test.afterAll(() => {
  borrarClientes(creados);
});

test.describe("formulario de cliente con una escritura en vuelo", () => {
  test("queda inerte y no se puede cerrar", async ({ page, baseURL }) => {
    exigirEntornoLocal(baseURL);
    const retrasar = await conLatenciaConmutable(page);
    await iniciarSesion(page);

    const dialogo = page.locator("dialog");
    await page.goto("/clientes?nuevo=1");
    await expect(dialogo).toBeVisible();
    await dialogo.locator('input[name="nombre"]').fill("E2E Inerte");
    await dialogo.locator('input[name="telefono"]').fill("600 00 11 22");

    retrasar(true);
    await dialogo.getByRole("button", { name: "Guardar" }).click();
    await page.waitForTimeout(800);

    // Sin esto se podría escribir después de enviar y perder lo escrito.
    for (const selector of [
      'input[name="nombre"]',
      'input[name="telefono"]',
      'input[name="email"]',
      'input[name="empresa"]',
      'textarea[name="nota"]',
    ]) {
      await expect(dialogo.locator(selector)).toBeDisabled();
    }
    await expect(dialogo.getByRole("button", { name: "Web" })).toBeDisabled();
    await expect(dialogo.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    await expect(dialogo.getByRole("button", { name: "Cerrar" })).toBeDisabled();

    // Las tres vías de cierre NO pasan por los botones del formulario.
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await expect(dialogo).toBeVisible();

    await page.mouse.click(20, 20); // scrim
    await page.waitForTimeout(300);
    await expect(dialogo).toBeVisible();

    retrasar(false);
    expect(await esperarUrl(page, /\/clientes\/[a-z0-9]{20,}$/)).toBe(true);
    const id = page.url().split("/").pop();
    if (id) creados.push(id);
  });

  test("irse por el menú no arrastra a la ficha al llegar la respuesta", async ({
    page,
    baseURL,
  }) => {
    exigirEntornoLocal(baseURL);
    const retrasar = await conLatenciaConmutable(page);
    await iniciarSesion(page);

    const dialogo = page.locator("dialog");
    await page.goto("/clientes?nuevo=1");
    await expect(dialogo).toBeVisible();
    await dialogo.locator('input[name="nombre"]').fill("E2E Abandono");
    await dialogo.locator('input[name="telefono"]').fill("600 33 44 55");

    retrasar(true);
    await dialogo.getByRole("button", { name: "Guardar" }).click();
    await page.waitForTimeout(800);

    // El overlay está bloqueado, pero la navegación del shell sí puede sacarte,
    // y desmontar el componente no cancela una mutation ya enviada.
    await page.goto("/hoy");
    retrasar(false);
    await page.waitForTimeout(8000);

    expect(page.url()).toMatch(/\/hoy$/);

    // El cliente sí quedó creado: se apunta para borrarlo al terminar. Se lee el
    // href de la fila en vez de navegar, y se ESPERA a que aparezca: sin la
    // espera la lista aún no ha cargado y el id se perdería.
    await page.goto("/clientes");
    await apuntarIdDeFila(page, "E2E Abandono");
  });

  test("el bloqueo del cierre no sobrevive al formulario que lo pidió", async ({
    page,
    baseURL,
  }) => {
    exigirEntornoLocal(baseURL);
    const retrasar = await conLatenciaConmutable(page);
    await iniciarSesion(page);

    const dialogo = page.locator("dialog");
    // La reapertura tiene que ser navegación de CLIENTE: con `page.goto` hay
    // carga completa, la pantalla se remonta y su estado se reinicia solo, así
    // que la fuga no se reproduciría y esta prueba pasaría en vacío.
    await page.goto("/clientes");
    const botonNuevo = page.getByRole("button", { name: "Nuevo cliente" });
    await botonNuevo.click();
    await expect(dialogo).toBeVisible();
    await dialogo.locator('input[name="nombre"]').fill("E2E Reapertura");
    await dialogo.locator('input[name="telefono"]').fill("600 66 77 88");

    retrasar(true);
    await dialogo.getByRole("button", { name: "Guardar" }).click();
    await page.waitForTimeout(800);

    await page.goBack(); // se abandona el formulario guardando
    await page.waitForTimeout(400);
    await expect(dialogo).toBeHidden();
    retrasar(false);
    await page.waitForTimeout(8000);

    // La pantalla NO se ha desmontado: si el bloqueo hubiese vivido en ella,
    // seguiría puesto y la X y Esc no funcionarían.
    await botonNuevo.click();
    await expect(dialogo).toBeVisible();
    await expect(dialogo.locator('input[name="nombre"]')).toBeEnabled();
    await expect(dialogo.getByRole("button", { name: "Cerrar" })).toBeEnabled();
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    await expect(dialogo).toBeHidden();

    // Apuntar el cliente creado durante el abandono para borrarlo.
    await apuntarIdDeFila(page, "E2E Reapertura");
  });

  test("sin escritura en vuelo el cierre funciona con normalidad", async ({
    page,
    baseURL,
  }) => {
    exigirEntornoLocal(baseURL);
    await iniciarSesion(page);

    const dialogo = page.locator("dialog");
    await page.goto("/clientes?nuevo=1");
    await expect(dialogo).toBeVisible();
    await expect(dialogo.getByRole("button", { name: "Cerrar" })).toBeEnabled();

    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    await expect(dialogo).toBeHidden();
    expect(page.url()).toMatch(/\/clientes$/);
  });
});
