import { Suspense } from "react";
import { ClientesScreen } from "@/components/clientes/ClientesScreen";

/**
 * El <Suspense> es obligatorio, no decorativo: `ClientesScreen` usa
 * `useSearchParams()` para saber si el formulario de alta está abierto, y sin
 * una frontera de suspense `npm run build` falla al prerenderizar la ruta.
 */
export default function ClientesPage() {
  return (
    <Suspense fallback={null}>
      <ClientesScreen />
    </Suspense>
  );
}
