"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/Skeleton";
import { ToastProvider } from "@/components/ui/Toast";
import { useSesion } from "@/lib/sesion";
import { Sidebar } from "./Sidebar";
import { TabBarNav } from "./TabBarNav";
import { TopHeader } from "./TopHeader";

/**
 * Shell autenticado (LUI-8): sidebar en escritorio, tab bar en móvil.
 * Además redirige a /login si no hay sesión válida.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { usuario, cargando } = useSesion();

  const sinSesion = !cargando && usuario === null;

  useEffect(() => {
    if (sinSesion) router.replace("/login");
  }, [sinSesion, router]);

  // Mientras se resuelve la sesión (o se está redirigiendo) se pinta el
  // esqueleto del shell, no la pantalla: así no parpadea contenido ajeno.
  if (cargando || usuario === null) {
    return (
      <div className="flex h-screen w-full overflow-hidden bg-bg">
        <div className="hidden w-60 shrink-0 flex-col gap-3 border-r border-border bg-surface p-5 md:flex">
          <Skeleton width={120} height={26} />
          <div className="mt-4 flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={40} radius="rounded-lg" />
            ))}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="h-[60px] shrink-0 border-b border-border bg-surface" />
          <div className="flex flex-1 flex-col gap-5 p-4 md:mx-auto md:w-full md:max-w-[860px] md:p-8">
            <Skeleton width={180} height={26} />
            <Skeleton height={60} radius="rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="flex h-screen w-full overflow-hidden bg-bg">
        <Sidebar />
        <div className="relative flex min-w-0 flex-1 flex-col bg-bg">
          <TopHeader />
          <div className="flex-1 overflow-auto">
            {/* 860px es lo que usa el handoff, no los 1200px de design-2.md §4. */}
            <div className="w-full px-4 pt-4 pb-8 md:mx-auto md:max-w-[860px] md:px-8 md:pt-7 md:pb-14">
              {children}
            </div>
          </div>
          <TabBarNav />
        </div>
      </div>
    </ToastProvider>
  );
}
