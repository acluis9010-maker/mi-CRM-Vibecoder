"use client";

import type { ReactNode } from "react";
import { useClerk } from "@clerk/nextjs";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ToastProvider } from "@/components/ui/Toast";
import { useUsuario } from "@/lib/session";
import { Sidebar } from "./Sidebar";
import { TabBarNav } from "./TabBarNav";
import { TopHeader } from "./TopHeader";

/**
 * Shell autenticado (LUI-8): sidebar en escritorio, tab bar en móvil.
 *
 * Además resuelve el caso de una cuenta de Clerk válida que NO está dada de alta
 * en la tabla `usuarios`. Pasa de verdad: en Clerk se invita por email, pero el
 * acceso lo concede el registro en Convex. Sin esto el usuario vería una app
 * vacía y sin explicación.
 */
function AccesoDenegado({ titulo, ayuda }: { titulo: string; ayuda: string }) {
  const { signOut } = useClerk();
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-6">
      <Card padding="p-0" className="w-full max-w-[420px]">
        <EmptyState
          icon={<ShieldAlert size={24} strokeWidth={1.5} />}
          title={titulo}
          help={ayuda}
          action={
            <Button
              variant="secondary"
              onClick={() => void signOut({ redirectUrl: "/login" })}
            >
              Cerrar sesión
            </Button>
          }
        />
      </Card>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const sesion = useUsuario();

  if (sesion.estado === "sin-alta") {
    return (
      <AccesoDenegado
        titulo="Tu cuenta no está dada de alta"
        ayuda="Pide a la propietaria que te añada al equipo para poder entrar."
      />
    );
  }

  if (sesion.estado === "ya-vinculado") {
    return (
      <AccesoDenegado
        titulo="Este usuario ya está vinculado a otra cuenta"
        ayuda="Contacta con la propietaria para revisar el acceso."
      />
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
