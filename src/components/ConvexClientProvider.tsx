"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/nextjs";
import type { ReactNode } from "react";

/**
 * Puente Convex ↔ Clerk. Sin él, `ctx.auth.getUserIdentity()` devolvería null
 * siempre y toda la autorización de `convex/lib/authz.ts` rechazaría incluso a
 * los usuarios con sesión.
 *
 * Debe ir DENTRO de un <ClerkProvider> (ver src/app/layout.tsx).
 */
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  // Se lanza en lugar de degradar en silencio: antes esto devolvía los children
  // sin provider, con lo que el build y el SSR pasaban y la app solo fallaba al
  // primer `useQuery`, en el navegador y sin rastro en los logs del servidor.
  // En producción la URL la inyecta `convex deploy --cmd-url-env-var-name`.
  throw new Error(
    "Falta NEXT_PUBLIC_CONVEX_URL. En local lo escribe `npx convex dev`; " +
      "en Railway lo inyecta el buildCommand con `convex deploy --cmd-url-env-var-name`."
  );
}

const convex = new ConvexReactClient(convexUrl);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
