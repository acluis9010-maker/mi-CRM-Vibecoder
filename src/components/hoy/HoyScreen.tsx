"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Check, Pencil, Plus, TrendingUp, Users } from "lucide-react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Overlay } from "@/components/ui/Overlay";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ANILLO_FOCO } from "@/components/ui/foco";
import { badgeDeEstado, etiquetaEstado } from "@/lib/estados";
import { diasDeRetraso, etiquetaFechaLarga, etiquetaVence, hoyISO } from "@/lib/fechas";
import { useSesion } from "@/lib/sesion";

/**
 * P2/Hoy — pantalla de inicio (LUI-21) + flujo de completar (LUI-16).
 * Diseño: CRM Shell.dc.html L119-174; lógica L838-854, L897-926, L989-1002, L1271-1281.
 *
 * NO lleva métricas de negocio: esta pantalla sustituyó al Dashboard de 4 KPIs,
 * que se pospuso a Fase 2 (R9). Tampoco hay sección "Próximas" — el servidor no
 * devuelve los seguimientos de fecha futura (R11, Fase 2).
 */
type Seguimiento = FunctionReturnType<
  typeof api.seguimientos.listarPendientes
>[number];

/**
 * Accesos rápidos. Los que llevan `href` navegan a un formulario que YA existe;
 * los que no, abren un overlay con el cuerpo por construir (el chrome del
 * overlay ya es el definitivo).
 */
const ACCIONES = [
  { clave: "tarea", label: "Nueva tarea", Icon: Plus, destacada: true, issue: "LUI-14", href: undefined },
  { clave: "interaccion", label: "Anotar interacción", Icon: Pencil, destacada: false, issue: "LUI-12", href: undefined },
  { clave: "venta", label: "Registrar venta", Icon: TrendingUp, destacada: false, issue: "LUI-19", href: undefined },
  // El alta de cliente ya está construida (LUI-10), así que este tile lleva al
  // formulario real. Dejarlo como "por construir" haría parecer que crear
  // clientes no está disponible desde la pantalla de inicio.
  { clave: "cliente", label: "Nuevo cliente", Icon: Users, destacada: false, issue: "LUI-10", href: "/clientes?nuevo=1" },
] as const;

type ClaveAccion = (typeof ACCIONES)[number]["clave"];

/** La fecha de hoy no cambia mientras la pantalla está abierta. */
const SIN_CAMBIOS = () => () => {};

export function HoyScreen() {
  const { showToast } = useToast();
  const { token } = useSesion();

  /**
   * La fecha depende del reloj del navegador, así que calcularla en el servidor
   * desalinearía el HTML con el cliente. `useSyncExternalStore` es la API de
   * React para exactamente eso: `null` en el servidor y durante la hidratación,
   * la fecha local después. Sin efecto ni setState, así que no hay render en
   * cascada ni desajuste de hidratación.
   *
   * El snapshot no cambia durante la sesión, de ahí el subscribe vacío.
   */
  const hoy = useSyncExternalStore(SIN_CAMBIOS, hoyISO, () => null);

  const router = useRouter();
  const [overlay, setOverlay] = useState<ClaveAccion | null>(null);

  /**
   * Args de la query. Se mantienen en una sola expresión porque los handlers
   * optimistas de abajo tienen que usar EXACTAMENTE los mismos —token incluido—
   * o `getQuery`/`setQuery` apuntarían a otra entrada de la caché y el
   * Deshacer no surtiría efecto.
   */
  const listos = hoy !== null && token !== null && token !== "";
  const args = listos ? { token: token as string, hoyISO: hoy as string } : "skip";
  const pendientes = useQuery(api.seguimientos.listarPendientes, args);

  /**
   * Caché de lo recién completado. Hace falta porque, una vez marcado, el
   * seguimiento desaparece de `listarPendientes`: el handler optimista de
   * `desmarcar` no podría reconstruir la fila (le faltarían cliente, estado,
   * responsable...). Se rellena ANTES de mutar.
   */
  // Se usa `useState` con inicializador y no `useRef`: el handler optimista de
  // abajo se crea durante el render, y leer un ref ahí es justo lo que prohíbe
  // react-hooks/refs. El Map es estable entre renders igualmente.
  const [recienCompletados] = useState(
    () => new Map<Id<"seguimientos">, { seg: Seguimiento; ts: number }>()
  );

  const marcarHecho = useMutation(
    api.seguimientos.marcarHecho
  ).withOptimisticUpdate((localStore, { id }) => {
    if (args === "skip") return;
    const actuales = localStore.getQuery(
      api.seguimientos.listarPendientes,
      args
    );
    if (actuales === undefined) return;
    localStore.setQuery(
      api.seguimientos.listarPendientes,
      args,
      actuales.filter((s) => s._id !== id)
    );
  });

  const desmarcar = useMutation(
    api.seguimientos.desmarcar
  ).withOptimisticUpdate((localStore, { id }) => {
    if (args === "skip") return;
    const guardado = recienCompletados.get(id);
    if (guardado === undefined) return; // p. ej. tras un remontaje: se verá al confirmar
    const actuales = localStore.getQuery(
      api.seguimientos.listarPendientes,
      args
    );
    if (actuales === undefined) return;
    // Reinsertado en su posición por `vence`, para que vuelva a su sección sin salto.
    const siguiente = [...actuales, guardado.seg].sort((a, b) =>
      a.vence < b.vence ? -1 : a.vence > b.vence ? 1 : 0
    );
    localStore.setQuery(api.seguimientos.listarPendientes, args, siguiente);
  });

  function completar(seg: Seguimiento) {
    if (args === "skip") return;
    const fechaHecho = args.hoyISO;
    const tk = args.token;

    const cache = recienCompletados;
    // Poda de entradas viejas: la ventana de Deshacer es de ~3.8s.
    const limite = Date.now() - 30_000;
    for (const [k, v] of cache) if (v.ts < limite) cache.delete(k);
    cache.set(seg._id, { seg, ts: Date.now() });

    void marcarHecho({ token: tk, id: seg._id, fechaHecho }).then((r) => {
      // Solo alcanzable si algo lo completó entre el render y el click: la UI
      // retira la fila al instante, así que no se puede pulsar dos veces.
      // Convex descarta la capa optimista al resolverse, así que la fila vuelve
      // a su sitio sola; aquí basta con no mentir en el toast.
      if (!r.marcado) {
        cache.delete(seg._id);
        showToast("Ese seguimiento ya estaba completado");
      }
    });

    showToast("Seguimiento completado", {
      onUndo: () => {
        void desmarcar({
          token: tk,
          id: seg._id,
          fechaHechoEsperada: fechaHecho,
        }).then((r) => {
          cache.delete(seg._id);
          if (!r.revertido) {
            showToast("Ese seguimiento cambió mientras tanto");
          }
        });
      },
    });
  }

  // ── Reparto en secciones ────────────────────────────────────────────────
  // El servidor ya excluyó los futuros; aquí solo se separa atrasado de hoy.
  const atrasados: Seguimiento[] = [];
  const paraHoy: Seguimiento[] = [];
  if (pendientes !== undefined && hoy !== null) {
    for (const s of pendientes) {
      if (diasDeRetraso(s.vence, hoy) > 0) atrasados.push(s);
      else paraHoy.push(s);
    }
  }
  const total = atrasados.length + paraHoy.length;
  const cargando = pendientes === undefined || hoy === null;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-[5px]">
        {hoy === null ? (
          <Skeleton width={160} height={12} />
        ) : (
          <span className="text-xs font-semibold tracking-[0.06em] text-text-subtle uppercase">
            {etiquetaFechaLarga()}
          </span>
        )}
        <h1 className="m-0 text-2xl font-semibold tracking-[-0.011em] text-text">
          {cargando ? (
            <Skeleton width={180} height={26} />
          ) : total === 0 ? (
            "Todo al día"
          ) : (
            `${total} ${total === 1 ? "seguimiento" : "seguimientos"}`
          )}
        </h1>
      </header>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {ACCIONES.map(({ clave, label, Icon, destacada, href }) => (
          <button
            key={clave}
            type="button"
            onClick={() =>
              href !== undefined
                ? router.push(href, { scroll: false })
                : setOverlay(clave)
            }
            className={`flex min-h-[60px] w-full cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3.5 text-left shadow-xs transition-[background-color,border-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:border-border-strong hover:bg-surface-2 ${ANILLO_FOCO}`}
          >
            <span
              className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full ${
                destacada
                  ? "bg-primary text-on-primary"
                  : "bg-primary-subtle text-primary"
              }`}
            >
              <Icon size={18} strokeWidth={1.5} aria-hidden />
            </span>
            <span className="text-[15px] leading-[1.25] font-medium text-text">
              {label}
            </span>
          </button>
        ))}
      </div>

      {cargando ? (
        <SeccionesCargando />
      ) : (
        <>
          {atrasados.length > 0 && (
            <Seccion
              titulo="Atrasados"
              items={atrasados}
              hoy={hoy}
              tono="atrasado"
              onCompletar={completar}
            />
          )}
          {paraHoy.length > 0 && (
            <Seccion
              titulo="Para hoy"
              items={paraHoy}
              hoy={hoy}
              tono="hoy"
              onCompletar={completar}
            />
          )}
          {total === 0 && (
            <Card padding="p-0">
              <EmptyState
                icon={<Check size={24} strokeWidth={1.5} />}
                title="No hay seguimientos para hoy"
                help="Estás al día. Disfruta del día o añade un nuevo seguimiento."
                action={
                  <Button onClick={() => setOverlay("tarea")}>Nueva tarea</Button>
                }
              />
            </Card>
          )}
        </>
      )}

      {/* Los que navegan no tienen overlay que montar. */}
      {ACCIONES.filter(({ href }) => href === undefined).map(({ clave, label, issue }) => (
        <Overlay
          key={clave}
          open={overlay === clave}
          onClose={() => setOverlay(null)}
          title={label}
        >
          <EmptyState
            icon={<Pencil size={24} strokeWidth={1.5} />}
            title="Formulario por construir"
            help={`Esta pantalla llega en ${issue}.`}
          />
        </Overlay>
      ))}
    </div>
  );
}

/** Cabecera + filas de una sección. Estilos exactos de L984-988. */
function Seccion({
  titulo,
  items,
  hoy,
  tono,
  onCompletar,
}: {
  titulo: string;
  items: Seguimiento[];
  hoy: string;
  tono: "atrasado" | "hoy";
  onCompletar: (seg: Seguimiento) => void;
}) {
  const esAtrasado = tono === "atrasado";
  return (
    <section
      className={`overflow-hidden rounded-xl border border-border bg-surface shadow-xs ${
        esAtrasado ? "border-t-[3px] border-t-error" : ""
      }`}
    >
      <div
        className={`flex items-center gap-2 px-[18px] py-[13px] ${
          esAtrasado ? "bg-error-bg" : ""
        }`}
      >
        <span
          aria-hidden
          className={`size-2 shrink-0 rounded-full ${
            esAtrasado ? "bg-error" : "bg-text-subtle"
          }`}
        />
        <span
          className={`flex-1 text-[13px] font-semibold tracking-[0.04em] uppercase ${
            esAtrasado ? "text-error-text" : "text-text-muted"
          }`}
        >
          {titulo}
        </span>
        <span
          className={`font-mono text-[13px] font-semibold tabular-nums ${
            esAtrasado ? "text-error-text" : "text-text-subtle"
          }`}
        >
          {items.length}
        </span>
      </div>

      <div className="px-[18px] pt-0.5 pb-2">
        {items.map((seg) => (
          <Fila key={seg._id} seg={seg} hoy={hoy} onCompletar={onCompletar} />
        ))}
      </div>
    </section>
  );
}

/** Fila de seguimiento. Diseño L136-166. */
function Fila({
  seg,
  hoy,
  onCompletar,
}: {
  seg: Seguimiento;
  hoy: string;
  onCompletar: (seg: Seguimiento) => void;
}) {
  const dias = diasDeRetraso(seg.vence, hoy);
  const atrasado = dias > 0;

  return (
    <div className="flex items-center gap-1.5 border-t border-border py-2">
      {/* 44x44 de objetivo táctil con un círculo visible de 24px dentro. */}
      <button
        type="button"
        aria-label={`Marcar como hecho: ${seg.accion}`}
        onClick={() => onCompletar(seg)}
        className={`group -ml-2.5 inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-transparent p-0 ${ANILLO_FOCO}`}
      >
        <span className="size-6 rounded-full border-[1.5px] border-border-strong transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] group-hover:border-primary" />
      </button>

      <Link
        href={`/clientes/${seg.clienteId}`}
        className={`flex min-w-0 flex-1 items-center gap-3 py-0.5 ${ANILLO_FOCO}`}
      >
        <Avatar name={seg.clienteNombre} size={40} />

        <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[15px] font-semibold text-text">
              {seg.clienteNombre}
            </span>
            <span className="shrink-0">
              <Badge status={badgeDeEstado(seg.clienteEstado)}>
                {etiquetaEstado(seg.clienteEstado)}
              </Badge>
            </span>
          </span>
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="min-w-0 flex-1 truncate text-sm text-text-muted">
              {seg.accion}
            </span>
            <span className="shrink-0" title={seg.responsableNombre}>
              <Avatar
                name={seg.responsableNombre}
                variant="neutral"
                size={20}
              />
            </span>
          </span>
        </span>

        <span className="flex shrink-0 flex-col items-end gap-1">
          <Badge status={atrasado ? "error" : "neutral"}>
            {atrasado ? "Atrasado" : "Hoy"}
          </Badge>
          {atrasado && (
            <span className="text-xs whitespace-nowrap text-error-text">
              {etiquetaVence(dias)}
            </span>
          )}
        </span>
      </Link>
    </div>
  );
}

/** Skeletons con la altura real de fila, para que no salte el layout. */
function SeccionesCargando() {
  return (
    <div className="flex flex-col gap-5">
      {[0, 1].map((i) => (
        <section
          key={i}
          className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs"
        >
          <div className="flex items-center gap-2 px-[18px] py-[13px]">
            <Skeleton width={8} height={8} radius="rounded-full" />
            <Skeleton width={90} height={13} />
          </div>
          <div className="px-[18px] pt-0.5 pb-2">
            {[0, 1].map((j) => (
              <div
                key={j}
                className="flex items-center gap-3 border-t border-border py-2"
              >
                <Skeleton width={24} height={24} radius="rounded-full" />
                <Skeleton width={40} height={40} radius="rounded-full" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton width="45%" height={15} />
                  <Skeleton width="65%" height={14} />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
