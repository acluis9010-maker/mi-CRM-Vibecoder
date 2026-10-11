import { AppShell } from "@/components/nav/AppShell";

/**
 * Shell autenticado. La comprobación de sesión vive en `AppShell` (cliente),
 * porque el token está en localStorage y el servidor no puede verlo.
 *
 * Eso la hace UX, no seguridad — igual que antes: la barrera real son
 * `requireUsuario`/`requireDuena` en las funciones de Convex, que es lo único
 * que no se puede saltar llamando a la API directamente.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
