# Vibe CRM

CRM simple para negocios pequeños (Marta, dueña · Carlos, comercial): fichas
de cliente, historial de interacciones, seguimientos y ventas. Ver el PRD y
el registro de decisiones en Notion ("CRM-PRD" y "CRM — Cambios y Mejoras")
y el backlog en Linear (proyectos `CRM MVP` y `CRM-RESTO PRD`).

## Stack

- **Next.js** (App Router, TypeScript) + **Tailwind CSS v4**
- **Convex** como base de datos y backend (funciones + esquema en `convex/`)
- Deploy: **GitHub** → **Railway**

## Estado actual

Este repo solo tiene la **estructura base**, sin pantallas construidas
todavía: rutas placeholder, tokens del design system en
`src/app/globals.css`, y el esquema de Convex listo en `convex/schema.ts`.
El siguiente paso es conectar Convex (abajo) y luego construir cada pantalla
siguiendo `Design/design_handoff_crm_pwa/CRM Shell.dc.html` y los issues de
Linear referenciados en cada página (`src/app/**/page.tsx`).

## Empezar en local

```bash
npm install

# Conecta este proyecto a tu cuenta de Convex (abre el navegador para
# iniciar sesión, crea el proyecto y escribe .env.local automáticamente):
npx convex dev

# En otra terminal, corre Next.js:
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) — redirige a `/login`.

Sin correr `npx convex dev` primero, la app igual levanta (verás un aviso en
consola), pero ninguna pantalla podrá leer/escribir datos reales.

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
    cuenta/              → LUI-7 (perfil — falta issue propio en Linear)
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
- **Railway**: conectar el repo de GitHub directamente en Railway (Nixpacks
  detecta Next.js automáticamente; `railway.json` fija `npm run build` /
  `npm run start` por si acaso). Variables de entorno a configurar en
  Railway: `NEXT_PUBLIC_CONVEX_URL` y `CONVEX_DEPLOYMENT` (las mismas que
  genera `npx convex dev` en local — usar el deployment de **producción** de
  Convex, no el de desarrollo).
