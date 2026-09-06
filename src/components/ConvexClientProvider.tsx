"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

// null hasta que se corra `npx convex dev` y exista NEXT_PUBLIC_CONVEX_URL
// (así el scaffold arranca en local sin romperse antes de conectar Convex).
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex) {
    if (typeof window !== "undefined") {
      console.warn(
        "[Convex] NEXT_PUBLIC_CONVEX_URL no está definida todavía. " +
          "Corre `npx convex dev` para crear/enlazar el proyecto de Convex."
      );
    }
    return <>{children}</>;
  }
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
