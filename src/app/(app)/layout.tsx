import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/nav/AppShell";

/**
 * Aquí vive la protección de rutas de LUI-7 ("cualquier ruta sin sesión activa
 * redirige a /login"), y cubre todo el grupo `(app)` de una vez.
 *
 * NO está en proxy.ts a propósito: `clerkMiddleware()` sin argumentos no
 * protege nada y `createRouteMatcher()` está deprecado. La guía de Clerk dice
 * comprobar "as close to the resource as possible".
 *
 * Y esto sigue siendo UX, no seguridad: la barrera real son las funciones de
 * Convex (convex/lib/authz.ts), porque la URL del deployment viaja en el bundle
 * del navegador y cualquiera puede llamarlas sin pasar por esta interfaz.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (userId === null) redirect("/login");

  return <AppShell>{children}</AppShell>;
}
