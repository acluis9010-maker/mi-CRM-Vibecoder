# Vibe CRM

CRM simple para negocios pequeños (Marta, dueña · Carlos, comercial): fichas
de cliente, historial de interacciones, seguimientos y ventas. Ver el PRD y
el registro de decisiones en Notion ("CRM-PRD" y "CRM — Cambios y Mejoras")
y el backlog en Linear (proyectos `CRM MVP` y `CRM-RESTO PRD`).

## Stack

- **Next.js** (App Router, TypeScript) + **Tailwind CSS v4**
- **Convex** como base de datos y backend (funciones + esquema en `convex/`)
- **Clerk** para autenticación (LUI-7) — el rol vive en la tabla `usuarios` de
  Convex, no en los claims del token
- Deploy: **GitHub** → **Railway**

## Estado actual

Construido: **autenticación** (LUI-7), **navegación principal** (LUI-8),
**pantalla Hoy** (LUI-21) con el flujo de completar seguimientos (LUI-16) y el
**toast con Deshacer** (LUI-65), más la parte de servidor del control de acceso
por rol (LUI-25). La librería de componentes del design system está en
`src/components/ui/`.

Siguen como placeholder: `/clientes`, `/clientes/[id]`, `/ventas`, `/equipo`
y `/cuenta`. Los 4 accesos rápidos de Hoy abren un overlay con el chrome
definitivo y el cuerpo por construir (LUI-10 / 12 / 14 / 19).

Cada página referencia su issue de Linear. El diseño de referencia es
`Design/design_handoff_crm_pwa/CRM Shell.dc.html`.

### Deudas conocidas

- Sin scoping de datos por usuario: Marta y Carlos ven la misma lista
  (decisión de producto, R13 Fase 2).
- El "Deshacer" de un seguimiento protege contra cambios de **otro día**, pero
  no contra dos completados el **mismo día** (ver `convex/seguimientos.ts`).
- Recuperación de contraseña fuera de alcance (LUI-63): el enlace se retiró del
  login y, de momento, se resetea desde el dashboard de Clerk.

## Empezar en local

### 1. Configurar Clerk (una vez)

En el dashboard de [Clerk](https://clerk.com):

1. Crear la aplicación y habilitar **solo email + contraseña**.
2. **Deshabilitar el registro público** y restringirlo a invitaciones — los
   usuarios solo los crea la Dueña (LUI-7). Sin esto, cualquiera con la URL
   podría crearse una cuenta.
3. Activar la **integración de Convex** (genera el JWT template `convex`).
4. Invitar a `marta@acme.es` y `carlos@betadigital.com` — los mismos emails que
   crea el seed. Clerk autentica, pero el acceso lo concede el registro en la
   tabla `usuarios` de Convex: sin él no se entra.

Copiar `.env.local.example` a `.env.local` y rellenar las claves de Clerk.

### 2. Levantar

```bash
npm install

# Crea/enlaza el proyecto de Convex y escribe .env.local. Déjalo corriendo:
# sincroniza el esquema y regenera convex/_generated en caliente.
npx convex dev

# El dominio del issuer de Clerk, para que Convex valide los tokens:
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<tu-app>.clerk.accounts.dev

# Datos de ejemplo (idempotente):
npx convex run seed:poblar

# En otra terminal:
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) — redirige a `/hoy`, y sin
sesión a `/login`.

Si faltan `NEXT_PUBLIC_CONVEX_URL` o las claves de Clerk, la app **falla de
forma ruidosa** en vez de levantar a medias: antes degradaba en silencio y solo
se notaba al primer `useQuery`, en el navegador y sin rastro en los logs.

## Estructura de carpetas

```
src/app/
  page.tsx              → redirige a /login
  login/                → P1, LUI-7
  (app)/                → shell autenticado (LUI-8)
    hoy/                 → LUI-21
    clientes/            → LUI-9, LUI-10
    clientes/[id]/       → LUI-11, LUI-12, LUI-13, LUI-17
    ventas/              → LUI-18, LUI-19, LUI-20
    equipo/              → LUI-24, LUI-25
    cuenta/              → LUI-71
src/components/
  ui/                    → design system (Button, Input, Card, Badge…)
  ConvexClientProvider.tsx
src/lib/                 → utilidades compartidas (formato, validación)
convex/
  schema.ts              → modelo de datos final del MVP (ver LUI-6)
Design/                  → handoff de diseño y design system (referencia)
```

## Deploy

- **GitHub**: repo remoto de este proyecto.
- **Railway**: conectar el repo de GitHub directamente en Railway.
  `railway.json` **despliega Convex y Next en el mismo comando**:

  ```
  npx convex codegen --typecheck disable && \
  npx convex deploy --cmd 'npm run build' --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL
  ```

  Variables a configurar **en Railway**:

  | Variable | Para qué |
  |---|---|
  | `CONVEX_DEPLOY_KEY` | Clave de deploy de **producción** de Convex |
  | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk (pública) |
  | `CLERK_SECRET_KEY` | Clerk (secreta) |
  | `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/login` |
  | `NEXT_PUBLIC_CLERK_AFTER_SIGN_OUT_URL` | `/login` |

  **No** fijar `NEXT_PUBLIC_CONVEX_URL` a mano: la inyecta el propio
  `convex deploy` con `--cmd-url-env-var-name`, apuntando al deployment de
  producción. Fijarla a mano es la forma de acabar sirviendo la app contra el
  backend de desarrollo.

  Y en el deployment de Convex de producción:

  ```bash
  npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<tu-app>.clerk.accounts.dev --prod
  npx convex run seed:poblar --prod   # crea los usuarios de Marta y Carlos
  ```

  Antes de compartir la URL, comprobar que no quedó embebido el deployment de
  desarrollo: `rg "utmost-sheep-754" .next` no debe encontrar nada.
