"use client";

import { usePathname } from "next/navigation";
import { TabBar } from "@/components/ui/TabBar";
import { useSesion } from "@/lib/sesion";
import { destinosVisibles, tabActiva } from "./navegacion";

/**
 * Tab bar inferior de móvil (LUI-8). Solo en <768px; en escritorio manda el
 * Sidebar. Misma fuente de destinos, así que ambos no pueden divergir.
 */
export function TabBarNav() {
  const pathname = usePathname();
  const { usuario } = useSesion();
  const esDuena = usuario?.rol === "propietaria";

  const items = destinosVisibles(esDuena).map(({ href, label, Icon }) => ({
    href,
    label,
    icon: <Icon size={22} strokeWidth={1.5} aria-hidden />,
  }));

  return (
    <TabBar
      items={items}
      activeHref={tabActiva(pathname)}
      className="md:hidden"
    />
  );
}
