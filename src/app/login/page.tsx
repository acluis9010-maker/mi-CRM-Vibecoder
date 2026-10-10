"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { Eye, EyeOff, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ANILLO_FOCO } from "@/components/ui/foco";

/**
 * P1 — Inicio de sesión (LUI-7).
 * Diseño: CRM Shell.dc.html L32-65. Validación: L1306-1320.
 *
 * Se usa el flujo "headless" de Clerk y no el componente <SignIn /> prefabricado
 * porque LUI-7 pide reproducir este diseño exacto.
 *
 * API de @clerk/nextjs 7.x: `useSignIn()` devuelve un `SignInSignalValue`
 * —{ errors, fetchStatus, signIn }— donde `signIn` es un `SignInFutureResource`,
 * documentado como "new APIs designed specifically for custom flows". De ahí
 * `signIn.password()` + `signIn.finalize()`, y no el `create()`/`setActive()`
 * del recurso antiguo.
 *
 * OJO: estos métodos NO lanzan, devuelven `{ error }`. Un try/catch no vería
 * nada y el login fallaría en silencio.
 *
 * `finalize()` es lo que convierte el intento en sesión activa; sin él se
 * validarían las credenciales sin dejar al usuario dentro.
 *
 * No hay enlace "¿Olvidaste tu contraseña?": LUI-7 permite retirarlo si no hay
 * flujo real, y el flujo es LUI-63, fuera de esta tanda. Mientras tanto se
 * resetea desde el dashboard de Clerk.
 */
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const { signIn, fetchStatus } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [intentado, setIntentado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // `fetchStatus` lo expone el propio hook; es más fiable que un flag propio.
  const cargando = fetchStatus === "fetching";

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

    const { error: errorCredenciales } = await signIn.password({
      identifier: email.trim(),
      password,
    });

    if (errorCredenciales !== null) {
      // Mensaje genérico a propósito: LUI-7 exige no revelar si el email existe.
      // El error de Clerk sí distingue ambos casos, así que no se propaga.
      setError("Email o contraseña incorrectos.");
      return;
    }

    if (signIn.status !== "complete") {
      // Sin MFA configurada no debería haber estados intermedios
      // (needs_second_factor, needs_client_trust...). Si aparece uno, es mejor
      // decirlo que dejar la pantalla muda.
      setError("No se pudo completar el inicio de sesión. Inténtalo de nuevo.");
      return;
    }

    const { error: errorSesion } = await signIn.finalize();
    if (errorSesion !== null) {
      setError("No se pudo iniciar la sesión. Inténtalo de nuevo.");
      return;
    }

    router.push("/hoy");
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
