import { ScreenPlaceholder } from "@/components/ScreenPlaceholder";

// Nota: "Perfil / Mi cuenta" no tiene issue propio en Linear todavía —
// el flujo de editar datos/cambiar contraseña vive como punto de
// integración dentro de LUI-7 (authProvider.updateProfile/changePassword).
// Falta abrir un issue dedicado para esta pantalla antes de construirla.
export default function CuentaPage() {
  return <ScreenPlaceholder title="Mi cuenta" linearRef="LUI-7 (pendiente issue propio)" />;
}
