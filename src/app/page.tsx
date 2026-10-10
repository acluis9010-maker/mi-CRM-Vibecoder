import { redirect } from "next/navigation";

/**
 * La app abre en "Hoy" (así lo define el árbol de rutas del handoff).
 * Si no hay sesión, el layout de `(app)` redirige a /login.
 */
export default function RootPage() {
  redirect("/hoy");
}
