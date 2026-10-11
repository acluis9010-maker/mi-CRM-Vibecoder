"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";
import { SesionProvider } from "@/lib/sesion";

/**
 * Cliente de Convex + sesión propia.
 *
 * No se usa `ConvexProviderWithAuth` porque la identidad no viaja en un JWT:
 * el login es propio y el token de sesión se pasa como argumento en cada
 * llamada (ver convex/lib/authz.ts). De ahí el `ConvexProvider` plano.
 */
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  // Se lanza en lugar de degradar en silencio: antes esto devolvía los children
  // sin provider, con lo que el build y el SSR pasaban y la app solo fallaba al
  // primer `useQuery`, en el navegador y sin rastro en los logs del servidor.
  throw new Error(
    "Falta NEXT_PUBLIC_CONVEX_URL. En local lo escribe `npx convex dev`; " +
      "en Railway lo inyecta el buildCommand con `convex deploy --cmd-url-env-var-name`."
  );
}

const convex = new ConvexReactClient(convexUrl);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <SesionProvider>{children}</SesionProvider>
    </ConvexProvider>
  );
}
