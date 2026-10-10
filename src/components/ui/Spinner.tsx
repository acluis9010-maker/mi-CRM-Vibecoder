/** Spinner fino del design system (_ds_bundle.js, dentro de Button). */
export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block size-4 rounded-full border-2 border-white/40 border-t-white [animation:vibe-spin_0.7s_linear_infinite] ${className}`}
    />
  );
}
