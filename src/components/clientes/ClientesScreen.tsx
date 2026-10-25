"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Plus, Search, Users, X } from "lucide-react";
import { api } from "@/../convex/_generated/api";
import { normalizarTelefono } from "@/../convex/lib/validacionCliente";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Fab } from "@/components/ui/Fab";
import { Input } from "@/components/ui/Input";
import { Overlay } from "@/components/ui/Overlay";
import { Skeleton } from "@/components/ui/Skeleton";
import { ANILLO_FOCO } from "@/components/ui/foco";
import { badgeDeEstado, etiquetaEstado } from "@/lib/estados";
import { etiquetaUltimoContacto, hoyISO } from "@/lib/fechas";
import { useSesion } from "@/lib/sesion";
import { FormularioCliente } from "./FormularioCliente";

/**
 * P3 — Lista de clientes con buscador (LUI-9).
 * Diseño: CRM Shell.dc.html L176-224; búsqueda L961-975; estados L1399-1407.
 *
 * El alta (LUI-10) se abre desde la URL (`?nuevo=1`), no desde estado local: el
 * botón "Nuevo cliente" de escritorio vive en la barra superior, que es parte
 * del shell y no puede hablarse con esta pantalla. Ver `accionDeRuta` en
 * src/components/nav/navegacion.ts.
 */

type Cliente = FunctionReturnType<typeof api.clientes.listar>[number];

/** La fecha de hoy no cambia mientras la pantalla está abierta. */
const SIN_CAMBIOS = () => () => {};

export function ClientesScreen() {
  const router = useRouter();
  const parametros = useSearchParams();
  const { token } = useSesion();

  // En servidor no hay fecha local, así que se resuelve tras montar en vez de
  // con un efecto, que provocaría desajuste de hidratación.
  const hoy = useSyncExternalStore(SIN_CAMBIOS, hoyISO, () => null);

  const args = token !== null && token !== "" ? { token } : "skip";
  const clientes = useQuery(api.clientes.listar, args);

  const [consulta, setConsulta] = useState("");
  const q = consulta.trim().toLowerCase();

  const filtrados = useMemo(() => {
    if (clientes === undefined) return [];
    if (q === "") return clientes;
    const qTelefono = normalizarTelefono(q);
    return clientes.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        // Con un solo dígito escrito casi todo coincidiría, así que el diseño
        // exige dos. Y no se busca por empresa, también por diseño.
        (qTelefono.length > 1 &&
          normalizarTelefono(c.telefono).includes(qTelefono))
    );
  }, [clientes, q]);

  const cargando = clientes === undefined || hoy === null;
  const sinClientes = !cargando && clientes.length === 0;
  const sinResultados = !cargando && clientes.length > 0 && filtrados.length === 0;
  const conLista = !cargando && filtrados.length > 0;

  // El prototipo nunca pone "1 cliente" en singular: solo los resultados de
  // búsqueda tienen esa forma (L1395).
  const eyebrow =
    q !== ""
      ? `${filtrados.length} ${filtrados.length === 1 ? "resultado" : "resultados"}`
      : `${clientes?.length ?? 0} clientes`;

  const altaAbierta = parametros.get("nuevo") === "1";
  const abrirAlta = () => router.push("/clientes?nuevo=1", { scroll: false });
  // `replace` y no `back()`: si alguien entró directamente a ?nuevo=1, un back
  // saldría de la aplicación. Y `scroll: false` para no volver al principio.
  const cerrarAlta = () => router.replace("/clientes", { scroll: false });

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Input
          name="buscar"
          type="search"
          placeholder="Buscar por nombre, teléfono o email"
          aria-label="Buscar clientes"
          icon={<Search size={16} strokeWidth={1.5} />}
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          className={consulta !== "" ? "[&_input]:pr-12" : ""}
        />
        {consulta !== "" && (
          <button
            type="button"
            aria-label="Limpiar búsqueda"
            onClick={() => setConsulta("")}
            className={`absolute top-1.5 right-1.5 inline-flex size-9 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-text-subtle hover:bg-surface-2 ${ANILLO_FOCO}`}
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {cargando ? (
        <Skeleton width={90} height={12} />
      ) : (
        <span className="text-xs font-semibold tracking-[0.06em] text-text-subtle uppercase">
          {eyebrow}
        </span>
      )}

      {cargando && <FilasCargando />}

      {sinClientes && (
        <Card padding="p-0">
          <EmptyState
            icon={<Users size={24} strokeWidth={1.5} />}
            title="Sin clientes todavía"
            help="Añade tu primer cliente para empezar a vender."
            action={<Button onClick={abrirAlta}>Añadir cliente</Button>}
          />
        </Card>
      )}

      {sinResultados && (
        <Card padding="p-0">
          <EmptyState
            icon={<Search size={24} strokeWidth={1.5} />}
            title="Sin resultados"
            help="No hay clientes que coincidan con tu búsqueda."
            action={
              <Button variant="secondary" onClick={() => setConsulta("")}>
                Limpiar búsqueda
              </Button>
            }
          />
        </Card>
      )}

      {conLista && (
        // `overflow-hidden` lo añade la pantalla: Card no lo trae y las filas
        // se saldrían de la esquina redondeada.
        <Card padding="p-0" className="overflow-hidden">
          <div className="flex flex-col">
            {filtrados.map((cliente) => (
              <FilaCliente
                key={cliente._id}
                cliente={cliente}
                hoy={hoy as string}
              />
            ))}
          </div>
        </Card>
      )}

      <Fab aria-label="Nuevo cliente" onClick={abrirAlta}>
        <Plus size={26} strokeWidth={1.75} />
      </Fab>

      {/* Solo se monta el abierto: Overlay usa un id de título fijo. */}
      {altaAbierta && (
        <Overlay open onClose={cerrarAlta} title="Nuevo cliente">
          <FormularioCliente cliente={null} onCerrar={cerrarAlta} />
        </Overlay>
      )}
    </div>
  );
}

function FilaCliente({ cliente, hoy }: { cliente: Cliente; hoy: string }) {
  return (
    <Link
      href={`/clientes/${cliente._id}`}
      className={`flex items-center gap-3 border-b border-border px-[18px] py-3.5 no-underline transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-surface-2 ${ANILLO_FOCO}`}
    >
      <Avatar name={cliente.nombre} size={40} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[15px] font-medium tracking-[-0.011em] text-text">
          {cliente.nombre}
        </span>
        <span className="truncate text-[13px] text-text-muted">
          Último contacto: {etiquetaUltimoContacto(cliente.ultimoContacto, hoy)}
        </span>
      </div>
      <Badge status={badgeDeEstado(cliente.estado)}>
        {etiquetaEstado(cliente.estado)}
      </Badge>
    </Link>
  );
}

/** 6 filas con la altura real de la fila, para que no salte el layout (L186). */
function FilasCargando() {
  return (
    <Card padding="p-0" className="overflow-hidden">
      <div className="flex flex-col">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <div
            key={n}
            className="flex items-center gap-3 border-b border-border px-[18px] py-3.5"
          >
            <Skeleton width={40} height={40} radius="rounded-full" />
            <div className="flex flex-1 flex-col gap-[7px]">
              <Skeleton width="38%" height={13} />
              <Skeleton width="60%" height={11} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
