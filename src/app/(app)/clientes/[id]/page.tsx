import { Suspense } from "react";
import { FichaCliente } from "@/components/clientes/FichaCliente";

/**
 * Ficha de cliente (LUI-11). En Next 16 `params` es una promesa.
 *
 * El <Suspense> es obligatorio: `FichaCliente` usa `useSearchParams()` para
 * saber si el formulario de edición está abierto, y sin una frontera de suspense
 * el build falla al prerenderizar.
 */
export default async function FichaClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense fallback={null}>
      <FichaCliente id={id} />
    </Suspense>
  );
}
