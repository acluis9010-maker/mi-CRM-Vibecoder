"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConvexError } from "convex/values";
import { Eye, EyeOff, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ANILLO_FOCO } from "@/components/ui/foco";
import { useSesion } from "@/lib/sesion";

/**
 * P1 — Inicio de sesión (LUI-7), versión simple de email + contraseña.
 * Diseño: CRM Shell.dc.html L32-65. Validación: L1306-1320.
 *
 * Sin segundo factor: así lo pidió el usuario para poder avanzar con el diseño,
 * y coincide con lo que especifica el handoff ("Sin MFA").
 *
 * No hay enlace "¿Olvidaste tu contraseña?": LUI-7 permite retirarlo si no hay
 * flujo real, y el flujo es LUI-63. Hoy la cambia la propietaria desde el
 * dashboard de Convex.
 */
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const { iniciar } = useSesion();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [intentado, setIntentado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Los errores de campo solo se muestran tras el primer envío (diseño L1306).
  const errorEmail =
    intentado && !FORMATO_EMAIL.test(email.trim())
      ? "Introduce un email válido"
      : null;
  const errorPassword =
    intentado && password.trim() === "" ? "Introduce tu contraseña" : null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIntentado(true);
    setError(null);

    if (!FORMATO_EMAIL.test(email.trim()) || password.trim() === "") return;
    if (cargando) return;

    setCargando(true);
    try {
      await iniciar(email, password);
      router.push("/hoy");
    } catch (e) {
      // El servidor ya devuelve un mensaje genérico a propósito: no distingue
      // "email no existe" de "contraseña incorrecta" (LUI-7).
      const mensaje =
        e instanceof ConvexError && typeof e.data === "object" && e.data !== null
          ? ((e.data as { mensaje?: string }).mensaje ?? null)
          : null;
      setError(mensaje ?? "No se pudo iniciar sesión. Inténtalo de nuevo.");
      setCargando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center overflow-auto bg-bg p-6">
      <div className="flex w-full max-w-[400px] flex-col gap-[22px]">
        <div className="flex items-center justify-center gap-2.5">
          <span className="inline-flex size-[34px] items-center justify-center rounded-[9px] bg-primary text-[19px] font-semibold text-on-primary">
            V
          </span>
          <span className="text-xl font-semibold tracking-[-0.011em] text-text">
            Vibe CRM
          </span>
        </div>

        <div className="flex flex-col gap-[18px] rounded-xl border border-border bg-surface px-6 py-7 shadow-sm">
          <div className="flex flex-col gap-1">
            <h1 className="m-0 text-xl font-semibold tracking-[-0.011em] text-text">
              Inicia sesión
            </h1>
            <p className="m-0 text-sm text-text-muted">
              Accede a tu CRM para gestionar clientes y seguimientos.
            </p>
          </div>

          {error !== null && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-md border border-error bg-error-bg px-3 py-[11px] text-[13px] font-medium text-error-text"
            >
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <Input
              label="Email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoFocus
              placeholder="tu@empresa.com"
              icon={<Mail size={18} strokeWidth={1.5} />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errorEmail}
            />

            <div className="relative">
              <Input
                label="Contraseña"
                name="password"
                type={verPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errorPassword}
              />
              <button
                type="button"
                onClick={() => setVerPassword((v) => !v)}
                aria-label={
                  verPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                aria-pressed={verPassword}
                className={`absolute top-[30px] right-1.5 inline-flex size-9 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-text-subtle hover:bg-surface-2 ${ANILLO_FOCO}`}
              >
                {verPassword ? (
                  <EyeOff size={18} strokeWidth={1.5} />
                ) : (
                  <Eye size={18} strokeWidth={1.5} />
                )}
              </button>
            </div>

            <Button type="submit" loading={cargando} className="w-full">
              Entrar
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
