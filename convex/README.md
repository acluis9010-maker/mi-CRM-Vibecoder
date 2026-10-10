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

Por eso el `buildCommand` de `railway.json` además ejecuta `npx convex codegen`
antes del deploy: así un `_generated` olvidado o desactualizado no puede romper
producción.

Para regenerarlos en local: `npx convex dev` (lo hace en caliente) o
`npx convex codegen`.

## Autorización

Toda función pública abre con `requireUsuario` o `requireDuena` de
`lib/authz.ts`. **Es la única barrera real de datos**: `NEXT_PUBLIC_CONVEX_URL`
viaja en el bundle del navegador, así que cualquiera con la URL de la app puede
llamar a estas funciones directamente, sin pasar por la interfaz. La redirección
del layout de `(app)` es solo UX.

El **rol** se lee de la tabla `usuarios`, nunca de los claims del token.

## Sembrar datos

```bash
npx convex run seed:poblar          # dev
npx convex run seed:poblar --prod   # producción
```

Es una `internalMutation` (no añade superficie pública) y es idempotente.
Los emails que crea deben coincidir con los invitados en Clerk: sin registro en
`usuarios`, nadie entra aunque Clerk lo autentique.
