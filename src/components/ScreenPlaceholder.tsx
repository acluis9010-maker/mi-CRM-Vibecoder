/**
 * Placeholder temporal de pantalla — reemplazar al construir cada pantalla
 * real siguiendo Design/design_handoff_crm_pwa/CRM Shell.dc.html.
 */
export function ScreenPlaceholder({
  title,
  linearRef,
}: {
  title: string;
  linearRef: string;
}) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-[#1a1d21]">{title}</h1>
      <p className="mt-2 text-sm text-[#656c75]">
        Pantalla por construir — ver {linearRef} en Linear y
        Design/design_handoff_crm_pwa/CRM Shell.dc.html.
      </p>
    </div>
  );
}
