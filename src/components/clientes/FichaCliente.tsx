"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import {
  Calendar,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
  TrendingUp,
  UserX,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { api } from "@/../convex/_generated/api";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Overlay } from "@/components/ui/Overlay";
import { Skeleton } from "@/components/ui/Skeleton";
import { ANILLO_FOCO } from "@/components/ui/foco";
import { badgeDeEstado, etiquetaCanal, etiquetaEstado } from "@/lib/estados";
import { useSesion } from "@/lib/sesion";
import { FormularioCliente, type ClienteEditable } from "./FormularioCliente";

/**
 * P4 — Ficha del cliente (LUI-11).
 * Diseño: CRM Shell.dc.html L226-262; `detailVals` L1040-1049; estilos de los
 * accesos rápidos L1416-1417.
 *
 * Los tres accesos rápidos abren su overlay con el chrome definitivo y el cuerpo
 * por construir, igual que los tiles de la pantalla Hoy, para que LUI-12, LUI-72
 * y LUI-19 solo tengan que rellenarlo.
 *
 * El historial (LUI-13) y los seguimientos pendientes (LUI-17) son de M3 y M4:
 * aquí quedan como secciones vacías con su referencia.
 */

/** Formularios aún por construir; el chrome del overlay ya es el definitivo. */
const ACCIONES: ReadonlyArray<{
  clave: string;
  label: string;
  Icon: LucideIcon;
  issue: string;
}> = [
  { clave: "interaccion", label: "Registrar interacción", Icon: Pencil, issue: "LUI-12" },
  { clave: "seguimiento", label: "Programar seguimiento", Icon: Calendar, issue: "LUI-72" },
  { clave: "venta", label: "Registrar venta", Icon: TrendingUp, issue: "LUI-19" },
];

export function FichaCliente({ id }: { id: string }) {
  const router = useRouter();
  const parametros = useSearchParams();
  const { token } = useSesion();
  const [accion, setAccion] = useState<string | null>(null);

  const args = token !== null && token !== "" ? { token, id } : "skip";
  const cliente = useQuery(api.clientes.obtener, args);

  const edicionAbierta = parametros.get("editar") === "1";
  const cerrarEdicion = () =>
    router.replace(`/clientes/${id}`, { scroll: false });

  if (cliente === undefined) return <FichaCargando />;

  if (cliente === null) {
    return (
      <Card padding="p-0">
        <EmptyState
          icon={<UserX size={24} strokeWidth={1.5} />}
          title="Cliente no encontrado"
          help="Puede que se haya eliminado o que el enlace no sea correcto."
          action={
            <Button onClick={() => router.replace("/clientes")}>
              Volver a Clientes
            </Button>
          }
        />
      </Card>
    );
  }

  const telefono = cliente.telefono ?? "";
  const email = cliente.email ?? "";

  return (
    <div className="flex flex-col gap-4 [animation:vibe-slide-left_150ms_var(--ease-standard)]">
      <Card>
        <div className="flex flex-col gap-3.5">
          <div className="flex items-start gap-3.5">
            <Avatar name={cliente.nombre} size={56} />
            <div className="flex min-w-0 flex-1 flex-col gap-[7px]">
              <span className="text-[19px] font-semibold tracking-[-0.011em] break-words text-text">
                {cliente.nombre}
              </span>
              {/* Sin empresa no se pinta la línea, en vez de un guion de relleno. */}
              {cliente.empresa !== undefined && (
                <span className="text-sm break-words text-text-muted">
                  {cliente.empresa}
                </span>
              )}
            </div>
            <div className="shrink-0">
              <Badge status={badgeDeEstado(cliente.estado)}>
                {etiquetaEstado(cliente.estado)}
              </Badge>
            </div>
          </div>

          {cliente.canalOrigen !== undefined && (
            <div className="inline-flex">
              <Badge status="neutral" dot={false}>
                Origen: {etiquetaCanal(cliente.canalOrigen)}
              </Badge>
            </div>
          )}

          {/*
            Teléfono y email son opcionales en el esquema, así que la fila solo
            existe si hay dato: un enlace tel: vacío no lleva a ninguna parte.
          */}
          {(telefono !== "" || email !== "") && (
            <div className="flex flex-col border-t border-border">
              {telefono !== "" && (
                <FilaContacto
                  Icon={Phone}
                  etiqueta="Teléfono"
                  valor={telefono}
                  href={`tel:${telefono.replace(/\s/g, "")}`}
                  conBorde={email !== ""}
                />
              )}
              {email !== "" && (
                <FilaContacto
                  Icon={Mail}
                  etiqueta="Email"
                  valor={email}
                  href={`mailto:${email}`}
                  conBorde={false}
                />
              )}
            </div>
          )}
        </div>
      </Card>

      <div className="flex flex-col gap-2.5 md:flex-row">
        {ACCIONES.map(({ clave, label, Icon }) => (
          <button
            key={clave}
            type="button"
            onClick={() => setAccion(clave)}
            className={`flex min-h-[52px] w-full cursor-pointer items-center justify-start gap-3 rounded-xl border border-border bg-surface px-4 py-3.5 text-[15px] font-medium text-text shadow-xs transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-surface-2 md:w-auto md:flex-1 md:flex-col md:justify-center md:gap-2 md:px-2.5 md:py-4 md:text-[13px] ${ANILLO_FOCO}`}
          >
            <span className="inline-flex text-primary">
              <Icon size={20} strokeWidth={1.5} />
            </span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      <Card title="Seguimientos pendientes">
        <EmptyState
          icon={<Calendar size={24} strokeWidth={1.5} />}
          title="Sin seguimientos todavía"
          help="Esta sección llega con LUI-17."
        />
      </Card>

      <Card title="Historial">
        <EmptyState
          icon={<MessageSquare size={24} strokeWidth={1.5} />}
          title="Sin interacciones todavía"
          help="El historial llega con LUI-13."
        />
      </Card>

      {/*
        El formulario de edición solo se monta con un cliente ya cargado, para
        que capture juntos el borrador, la instantánea base y la revisión.
      */}
      {edicionAbierta && (
        <EdicionCliente cliente={cliente} onCerrar={cerrarEdicion} />
      )}

      {ACCIONES.filter(({ clave }) => clave === accion).map(({ clave, label, issue }) => (
        <Overlay key={clave} open onClose={() => setAccion(null)} title={label}>
          <EmptyState
            icon={<Pencil size={24} strokeWidth={1.5} />}
            title="Formulario por construir"
            help={`Esta pantalla llega con ${issue}.`}
          />
        </Overlay>
      ))}
    </div>
  );
}

/**
 * Overlay de edición. Igual que el de alta en ClientesScreen: el bloqueo del
 * cierre vive aquí, no en `FichaCliente`, para que muera con el formulario.
 * Si viviera en la ficha —que sobrevive al cierre del overlay— quedaría pegado
 * a `true` al desmontarse el formulario en medio de un guardado, y al reabrir
 * seguirían bloqueados Esc, el scrim y la X sin estar guardando nada.
 */
function EdicionCliente({
  cliente,
  onCerrar,
}: {
  cliente: ClienteEditable;
  onCerrar: () => void;
}) {
  const [guardando, setGuardando] = useState(false);

  return (
    <Overlay
      open
      onClose={onCerrar}
      title="Editar cliente"
      puedeCerrar={!guardando}
    >
      <FormularioCliente
        cliente={cliente}
        onCerrar={onCerrar}
        onGuardandoCambia={setGuardando}
      />
    </Overlay>
  );
}

function FilaContacto({
  Icon,
  etiqueta,
  valor,
  href,
  conBorde,
}: {
  Icon: LucideIcon;
  etiqueta: string;
  valor: string;
  href: string;
  conBorde: boolean;
}) {
  return (
    <a
      href={href}
      className={`flex items-center gap-3 px-0.5 py-3 text-inherit no-underline ${
        conBorde ? "border-b border-border" : ""
      } ${ANILLO_FOCO}`}
    >
      <span className="inline-flex shrink-0 text-text-subtle">
        <Icon size={16} strokeWidth={1.5} />
      </span>
      <span className="w-[72px] shrink-0 text-[13px] text-text-subtle">
        {etiqueta}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-text">{valor}</span>
    </a>
  );
}

function FichaCargando() {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-col gap-3.5">
          <div className="flex items-start gap-3.5">
            <Skeleton width={56} height={56} radius="rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton width="45%" height={19} />
              <Skeleton width="30%" height={14} />
            </div>
          </div>
          <Skeleton width="100%" height={44} />
        </div>
      </Card>
      <div className="flex flex-col gap-2.5 md:flex-row">
        {[1, 2, 3].map((n) => (
          <Skeleton key={n} width="100%" height={52} radius="rounded-xl" />
        ))}
      </div>
    </div>
  );
}
