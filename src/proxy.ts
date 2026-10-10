import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * En Next 16 esto NO se llama `middleware.ts`: el fichero es `proxy.ts` y el
 * export se llama `proxy` (o default). El runtime `edge` no está soportado aquí
 * — es `nodejs` y no es configurable.
 *
 * Su ÚNICA función es dejar disponible el contexto de sesión de Clerk para que
 * `auth()` funcione en los Server Components. NO decide accesos:
 *
 *   - `clerkMiddleware()` sin argumentos no protege ninguna ruta, y
 *     `createRouteMatcher()` está deprecado.
 *   - La redirección a /login vive en src/app/(app)/layout.tsx, que es "lo más
 *     cerca del recurso" y cubre todo el grupo de una vez.
 *   - La barrera REAL de datos está en las funciones de Convex
 *     (convex/lib/authz.ts). Es la única que no se puede saltar, porque la URL
 *     del deployment viaja en el bundle del navegador.
 */
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
