"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { Building2, Mail, Phone } from "lucide-react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import {
  AVISO_CONTACTO,
  hayErrores,
  validarCliente,
  type ErroresCliente,
} from "@/../convex/lib/validacionCliente";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import {
  CANALES,
  ESTADOS,
  badgeDeEstado,
  type CanalOrigen,
  type EstadoCliente,
} from "@/lib/estados";
import { hoyISO } from "@/lib/fechas";
import { useSesion } from "@/lib/sesion";

/**
 * Formulario de alta y edición de cliente (LUI-10).
 * Diseño: CRM Shell.dc.html L476-496 (nuevo) y L498-513 (editar); validación y
 * guardado L1067-1106; chips de canal L1079-1087; chips de estado L1054-1065.
 *
 * Un solo componente para los dos modos. El prototipo tiene aquí un BUG que la
 * propia issue manda corregir: al editar desaparecen Canal y Nota y el email no
 * se valida. Aquí los dos modos llevan los mismos campos, el mismo orden y la
 * misma validación; la única diferencia es el selector de Estado, que solo
 * aparece al editar (al crear nace siempre como "Nuevo lead").
 *
 * En modo edición el padre solo lo monta cuando ya tiene un cliente cargado, de
 * modo que el borrador, la instantánea base y la revisión se capturan juntos y
 * una sola vez.
 */

export type ClienteEditable = {
  _id: Id<"clientes">;
  nombre: string;
  empresa?: string;
  telefono?: string;
  email?: string;
  canalOrigen?: CanalOrigen;
  nota?: string;
  estado: EstadoCliente;
  revision: number;
};

/** Valores del servidor que devuelve `actualizar` cuando detecta conflicto. */
type ValoresServidor = {
  nombre: string;
  empresa?: string;
  telefono?: string;
  email?: string;
  canalOrigen?: CanalOrigen;
  nota?: string;
  estado: EstadoCliente;
};

type Campos = {
  nombre: string;
  empresa: string;
  telefono: string;
  email: string;
  canalOrigen: CanalOrigen | null;
  nota: string;
  estado: EstadoCliente;
};

/** Los campos se guardan como cadenas para que los inputs sean controlados. */
function aCampos(c: ValoresServidor | null): Campos {
  return {
    nombre: c?.nombre ?? "",
    empresa: c?.empresa ?? "",
    telefono: c?.telefono ?? "",
    email: c?.email ?? "",
    canalOrigen: c?.canalOrigen ?? null,
    nota: c?.nota ?? "",
    estado: c?.estado ?? "info",
  };
}

/**
 * Argumentos para la mutation. Los opcionales de texto se mandan SIEMPRE, aunque
 * vayan vacíos: el servidor convierte la cadena vacía en `undefined` y eso borra
 * el campo. Así vaciar un dato lo borra de verdad en lugar de dejar el anterior.
 */
function aArgumentos(c: Campos) {
  return {
    nombre: c.nombre.trim(),
    empresa: c.empresa.trim(),
    telefono: c.telefono.trim(),
    email: c.email.trim(),
    canalOrigen: c.canalOrigen ?? undefined,
    nota: c.nota.trim(),
  };
}

/** Para enumerar en el aviso de conflicto qué cambió la otra persona. */
const NOMBRES_CAMPOS: ReadonlyArray<{ clave: keyof Campos; etiqueta: string }> = [
  { clave: "nombre", etiqueta: "Nombre" },
  { clave: "empresa", etiqueta: "Empresa" },
  { clave: "telefono", etiqueta: "Teléfono" },
  { clave: "email", etiqueta: "Email" },
  { clave: "canalOrigen", etiqueta: "Canal de origen" },
  { clave: "nota", etiqueta: "Nota" },
  { clave: "estado", etiqueta: "Estado" },
];

export function FormularioCliente({
  cliente,
  onCerrar,
  onGuardandoCambia,
}: {
  /** `null` = alta. Un objeto = edición de ese cliente ya cargado. */
  cliente: ClienteEditable | null;
  onCerrar: () => void;
  /**
   * Avisa al padre de que hay una escritura en vuelo, para que bloquee las vías
   * de cierre del overlay (Esc, scrim y X), que no pasan por este formulario.
   */
  onGuardandoCambia?: (guardando: boolean) => void;
}) {
  const router = useRouter();
  const { token } = useSesion();
  const { showToast } = useToast();
  const crear = useMutation(api.clientes.crear);
  const actualizar = useMutation(api.clientes.actualizar);

  const editando = cliente !== null;

  // Los tres se capturan UNA vez al montar. `revisionBase` no la avanza la query
  // reactiva mientras se edita: si lo hiciera, un guardado posterior pasaría la
  // comprobación con un borrador viejo y volvería a pisar el cambio ajeno.
  const [campos, setCampos] = useState<Campos>(() => aCampos(cliente));
  const [base, setBase] = useState<Campos>(() => aCampos(cliente));
  const [revisionBase, setRevisionBase] = useState(() => cliente?.revision ?? 0);

  const [intentado, setIntentado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [avisoServidor, setAvisoServidor] = useState<string | null>(null);
  const [erroresServidor, setErroresServidor] = useState<ErroresCliente>({});
  const [conflicto, setConflicto] = useState<{
    campos: Campos;
    revision: number;
  } | null>(null);

  /**
   * Mientras guarda, el formulario queda INERTE: campos, chips, estado y los dos
   * botones deshabilitados, y el padre bloquea Esc, scrim y X. Así no hay forma
   * de escribir cambios que el cierre perdería, ni de abandonar un alta que el
   * servidor va a completar de todos modos.
   */
  function marcarGuardando(valor: boolean): void {
    setGuardando(valor);
    onGuardandoCambia?.(valor);
  }

  /**
   * Aun bloqueando el overlay, el usuario puede irse por la navegación del
   * shell (sidebar o tab bar), y eso desmonta este componente sin cancelar la
   * mutation. Esta guarda evita que la respuesta tardía navegue o toque estado
   * de un formulario que ya no existe.
   */
  const vivo = useRef(true);
  useEffect(() => {
    // Se reafirma en el cuerpo, no solo en la limpieza: en modo estricto React
    // ejecuta efecto -> limpieza -> efecto, así que sin esta línea el segundo
    // montaje arrancaría con `vivo` ya en false y se descartaría la respuesta
    // de un guardado perfectamente válido.
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  const errores = useMemo(
    () =>
      validarCliente({
        nombre: campos.nombre,
        empresa: campos.empresa,
        telefono: campos.telefono,
        email: campos.email,
        nota: campos.nota,
      }),
    [campos]
  );

  // Los errores solo se muestran tras el primer intento de guardar, como en la
  // pantalla de login y como en el prototipo (`triedSave`).
  const errorDe = (clave: keyof ErroresCliente): string | null =>
    intentado ? (errores[clave] ?? erroresServidor[clave] ?? null) : null;

  const faltaContacto = intentado && errores.contacto !== undefined;

  /** Qué campos cambió la otra persona respecto a lo que teníamos al abrir. */
  const cambiadosPorOtro = useMemo(() => {
    if (conflicto === null) return [];
    return NOMBRES_CAMPOS.filter(
      ({ clave }) => conflicto.campos[clave] !== base[clave]
    ).map(({ etiqueta }) => etiqueta);
  }, [conflicto, base]);

  function escribir<K extends keyof Campos>(clave: K, valor: Campos[K]): void {
    setCampos((previos) => ({ ...previos, [clave]: valor }));
  }

  /**
   * Única vía por la que el borrador se sustituye por los datos del servidor.
   * Actualiza los tres estados juntos y limpia el conflicto anterior.
   */
  function cargarVersionActual(): void {
    if (conflicto === null) return;
    setCampos(conflicto.campos);
    setBase(conflicto.campos);
    setRevisionBase(conflicto.revision);
    setConflicto(null);
    setIntentado(false);
    setErroresServidor({});
    setAvisoServidor(null);
  }

  function describirError(err: unknown): void {
    if (err instanceof ConvexError) {
      const datos = err.data as
        | { codigo?: string; mensaje?: string; errores?: ErroresCliente }
        | undefined;
      if (datos?.codigo === "validacion") {
        setErroresServidor(datos.errores ?? {});
        setAvisoServidor(datos.mensaje ?? "Revisa los datos del cliente.");
        return;
      }
      setAvisoServidor(datos?.mensaje ?? "No se pudo guardar. Inténtalo de nuevo.");
      return;
    }
    setAvisoServidor("No se pudo guardar. Inténtalo de nuevo.");
  }

  async function guardar(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();
    if (guardando) return;

    setIntentado(true);
    setErroresServidor({});
    setAvisoServidor(null);

    if (hayErrores(errores)) return;
    if (token === null || token === "") {
      setAvisoServidor("Tu sesión ha caducado. Vuelve a entrar.");
      return;
    }

    marcarGuardando(true);
    try {
      if (cliente === null) {
        const r = await crear({
          token,
          ...aArgumentos(campos),
          hoyISO: hoyISO(),
        });
        // Si el usuario se fue del formulario mientras se creaba, el cliente ya
        // está guardado, pero arrastrarle a una ficha que no pidió sería peor
        // que no decir nada: se deja donde esté.
        if (!vivo.current) return;
        showToast("Cliente añadido");
        // Navegar desmonta este overlay, así que no hace falta cerrarlo.
        router.replace(`/clientes/${r.clienteId}`, { scroll: false });
        return;
      }

      const r = await actualizar({
        token,
        id: cliente._id,
        ...aArgumentos(campos),
        estado: campos.estado,
        revisionEsperada: revisionBase,
      });

      if (!vivo.current) return;

      // Una promesa resuelta no es un éxito: hay que mirar el resultado.
      if (!r.actualizado) {
        if (r.motivo === "conflicto") {
          setConflicto({ campos: aCampos(r.servidor), revision: r.revision });
        } else {
          setAvisoServidor("Este cliente ya no existe.");
        }
        return; // No se cierra y no se toca lo que el usuario escribió.
      }

      onCerrar();
    } catch (err) {
      if (!vivo.current) return;
      describirError(err);
    } finally {
      if (vivo.current) marcarGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} noValidate className="flex flex-col gap-3.5">
      {conflicto !== null && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-md border border-warning bg-warning-bg px-3.5 py-3 text-[13px] text-warning-text"
        >
          <span className="font-semibold">
            Otra persona cambió este cliente mientras lo editabas
          </span>
          {cambiadosPorOtro.length > 0 && (
            <span>Ha cambiado: {cambiadosPorOtro.join(", ")}.</span>
          )}
          <span>
            Lo que has escrito sigue aquí. Para guardarlo tendrás que revisar la
            versión actual primero, y eso sustituirá lo que llevas escrito.
          </span>
          {/* `whitespace-normal` anula el nowrap de Button: en movil la
              etiqueta no cabe en una linea. */}
          {/*
            También se deshabilita al guardar: el aviso de conflicto sigue en
            pantalla durante un reintento, y pulsarlo con una escritura en vuelo
            cambiaría el borrador y la revisión base bajo los pies de esa
            escritura.
          */}
          <Button
            type="button"
            variant="secondary"
            size="compact"
            onClick={cargarVersionActual}
            disabled={guardando}
            className="h-auto self-start py-2 text-left whitespace-normal"
          >
            Cargar la versión actual
          </Button>
        </div>
      )}

      {avisoServidor !== null && (
        <div
          role="alert"
          className="rounded-md border border-error bg-error-bg px-3.5 py-3 text-[13px] text-error-text"
        >
          {avisoServidor}
        </div>
      )}

      <Input
        label="Nombre"
        name="nombre"
        placeholder="Marta López"
        autoCapitalize="words"
        value={campos.nombre}
        error={errorDe("nombre")}
        onChange={(e) => escribir("nombre", e.target.value)}
        disabled={guardando}
      />
      <Input
        label="Empresa"
        name="empresa"
        placeholder="Acme S.L."
        icon={<Building2 size={16} strokeWidth={1.5} />}
        value={campos.empresa}
        error={errorDe("empresa")}
        onChange={(e) => escribir("empresa", e.target.value)}
        disabled={guardando}
      />
      <Input
        label="Teléfono"
        name="telefono"
        type="tel"
        inputMode="tel"
        placeholder="+34 600 000 000"
        icon={<Phone size={16} strokeWidth={1.5} />}
        value={campos.telefono}
        error={errorDe("telefono")}
        onChange={(e) => escribir("telefono", e.target.value)}
        disabled={guardando}
      />
      <Input
        label="Email"
        name="email"
        type="email"
        inputMode="email"
        autoCapitalize="none"
        placeholder="nombre@empresa.es"
        icon={<Mail size={16} strokeWidth={1.5} />}
        value={campos.email}
        error={errorDe("email")}
        onChange={(e) => escribir("email", e.target.value)}
        disabled={guardando}
      />

      {/*
        El aviso de contacto está siempre visible y solo cambia de color cuando
        falla, igual que en el diseño: es una instrucción, no solo un error.
      */}
      <span
        className={`text-[13px] ${faltaContacto ? "text-error-text" : "text-text-muted"}`}
      >
        {AVISO_CONTACTO}
      </span>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium tracking-[-0.011em] text-text">
          Canal de origen
        </span>
        <div className="flex flex-wrap gap-2">
          {CANALES.map(({ valor, etiqueta }) => (
            <Chip
              key={valor}
              activo={campos.canalOrigen === valor}
              // Volver a pulsar el activo lo deselecciona (L1082).
              onClick={() =>
                escribir(
                  "canalOrigen",
                  campos.canalOrigen === valor ? null : valor
                )
              }
              disabled={guardando}
            >
              {etiqueta}
            </Chip>
          ))}
        </div>
      </div>

      <Textarea
        label="Nota"
        name="nota"
        placeholder="Detalle del primer contacto, necesidades…"
        value={campos.nota}
        error={errorDe("nota")}
        onChange={(e) => escribir("nota", e.target.value)}
        disabled={guardando}
      />

      {editando && (
        <SelectorEstado
          valor={campos.estado}
          onCambiar={(v) => escribir("estado", v)}
          deshabilitado={guardando}
        />
      )}

      <div className="flex gap-2.5 pt-1">
        {/*
          `type` explícito: Button no lo fija, así que dentro de un form el
          valor por omisión sería submit y Cancelar enviaría el formulario.
        */}
        <Button
          type="button"
          variant="secondary"
          onClick={onCerrar}
          disabled={guardando}
        >
          Cancelar
        </Button>
        <Button type="submit" variant="primary" loading={guardando} className="flex-1">
          Guardar
        </Button>
      </div>
    </form>
  );
}

/**
 * Selector de estado del cliente.
 *
 * Son radios NATIVOS ocultos con el badge como etiqueta, no botones con
 * `role="radiogroup"`: así la semántica, el recorrido con flechas y el foco los
 * da el navegador. Unos <button> habrían necesitado además `role="radio"`,
 * `aria-checked` y gestión de teclado a mano.
 *
 * El borde transparente del estado no seleccionado reserva el hueco de los 2px,
 * así que marcar una opción no desplaza las demás (L1063).
 */
function SelectorEstado({
  valor,
  onCambiar,
  deshabilitado,
}: {
  valor: EstadoCliente;
  onCambiar: (nuevo: EstadoCliente) => void;
  deshabilitado: boolean;
}) {
  return (
    <fieldset className="m-0 flex flex-col gap-2 border-none p-0">
      <legend className="mb-2 p-0 text-sm font-medium tracking-[-0.011em] text-text">
        Estado
      </legend>
      <div className="flex flex-wrap gap-2">
        {ESTADOS.map(({ valor: opcion, etiqueta }) => (
          <label
            key={opcion}
            className={
              deshabilitado ? "cursor-not-allowed opacity-60" : "cursor-pointer"
            }
          >
            <input
              type="radio"
              name="estado"
              value={opcion}
              checked={valor === opcion}
              onChange={() => onCambiar(opcion)}
              disabled={deshabilitado}
              className="peer sr-only"
            />
            <span className="inline-flex rounded-full border-2 border-transparent p-[3px] peer-checked:border-primary peer-checked:shadow-[0_0_0_1px_var(--color-primary)] peer-focus-visible:shadow-[var(--focus-ring)]">
              <Badge status={badgeDeEstado(opcion)}>{etiqueta}</Badge>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
