import { ScreenPlaceholder } from "@/components/ScreenPlaceholder";

export default async function FichaClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <ScreenPlaceholder
      title={`Ficha de cliente (${id})`}
      linearRef="LUI-11 / LUI-12 / LUI-13 / LUI-17"
    />
  );
}
