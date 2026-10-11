# convex

Backend: esquema, queries y mutations.

## `_generated/` se versiona

Está commiteado a propósito, y por eso se retiró del `.gitignore`:

- `npm run build` lo necesita para typecheckear (`npx convex codegen --help`
  lo dice explícitamente: *"should be committed to the repo — your code won't
  typecheck without it!"*).
- En Railway, `convex deploy --cmd 'npm run build'` corre el build en su **paso
  1** y el codegen en el **paso 3**. Es decir: cuando Next se construye, el
  codegen todavía no ha pasado. Sin estos ficheros en el repo, el build falla.

No añadir `npx convex codegen` al `buildCommand` de Railway "por si acaso":
**ese comando no es local**. Pese a lo que sugiere su `--help`, se conecta al
deployment ("Uploading functions to Convex"), así que sin `CONVEX_DEPLOYMENT`
ni `CONVEX_DEPLOY_KEY` aborta con *"No CONVEX_DEPLOYMENT set"* y tumba el
build antes de llegar al deploy. Ya pasó una vez. La garantía es tener estos
ficheros versionados, no regenerarlos durante el build.

Para regenerarlos en local: `npx convex dev` (lo hace en caliente) o
`npx convex codegen`.

## Autorización

Toda función pública abre con `requireUsuario` o `requireDuena` de
`lib/authz.ts`, **pasándoles el token de sesión** (que llega como argumento,
ver `argsSesion`). **Es la única barrera real de datos**:
`NEXT_PUBLIC_CONVEX_URL` viaja en el bundle del navegador, así que cualquiera
con la URL de la app puede llamar a estas funciones directamente, sin pasar por
la interfaz. La redirección del shell es solo UX.

El **rol** se lee de la tabla `usuarios`, nunca de nada que mande el cliente.

El login es propio y **provisional**: PBKDF2 para el hash, token de 256 bits en
`sesiones`, caducidad de 30 días, sin segundo factor y sin recuperación de
contraseña. Los límites están listados en la cabecera de `lib/authz.ts` y hay
que volver a pasarlos por revisión al endurecerlos.

## Sembrar datos

```bash
npx convex run seed:poblar          # dev
npx convex run seed:poblar --prod   # producción
```

Es una `internalMutation` (no añade superficie pública) y es idempotente.
Los emails que crea deben coincidir con los invitados en Clerk: sin registro en
`usuarios`, nadie entra aunque Clerk lo autentique.
