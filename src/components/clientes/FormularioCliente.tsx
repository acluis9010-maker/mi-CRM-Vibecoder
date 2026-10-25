"use client";

import { useMemo, useState, type FormEvent } from "react";
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
}: {
  /** `null` = alta. Un objeto = edición de ese cliente ya cargado. */
  cliente: ClienteEditable | null;
  onCerrar: () => void;
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

    setGuardando(true);
    try {
      if (cliente === null) {
        const r = await crear({
          token,
          ...aArgumentos(campos),
          hoyISO: hoyISO(),
        });
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
      describirError(err);
    } finally {
      setGuardando(false);
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
            versión actual primero.
          </span>
          <Button
            type="button"
            variant="secondary"
            size="compact"
            onClick={cargarVersionActual}
            className="self-start"
          >
            Cargar la versión actual (sustituye lo escrito)
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
      />
      <Input
        label="Empresa"
        name="empresa"
        placeholder="Acme S.L."
        icon={<Building2 size={16} strokeWidth={1.5} />}
        value={campos.empresa}
        error={errorDe("empresa")}
        onChange={(e) => escribir("empresa", e.target.value)}
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
      />

      {editando && <SelectorEstado valor={campos.estado} onCambiar={(v) => escribir("estado", v)} />}

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
}: {
  valor: EstadoCliente;
  onCambiar: (nuevo: EstadoCliente) => void;
}) {
  return (
    <fieldset className="m-0 flex flex-col gap-2 border-none p-0">
      <legend className="mb-2 p-0 text-sm font-medium tracking-[-0.011em] text-text">
        Estado
      </legend>
      <div className="flex flex-wrap gap-2">
        {ESTADOS.map(({ valor: opcion, etiqueta }) => (
          <label key={opcion} className="cursor-pointer">
            <input
              type="radio"
              name="estado"
              value={opcion}
              checked={valor === opcion}
              onChange={() => onCambiar(opcion)}
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
