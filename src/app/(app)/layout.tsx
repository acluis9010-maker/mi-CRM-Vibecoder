/**
 * Shell autenticado (sidebar en escritorio / tab bar en móvil) — ver LUI-8.
 * De momento pasa los children directo; construir la navegación real aquí.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#f7f8f9]">{children}</div>;
}
