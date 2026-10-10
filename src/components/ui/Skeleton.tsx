/** Placeholder de carga con pulse. Portado de _ds_bundle.js L600. */
export function Skeleton({
  width = "100%",
  height = 16,
  radius = "rounded-md",
  className = "",
}: {
  width?: number | string;
  height?: number | string;
  radius?: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`block bg-surface-2 [animation:vibe-pulse_1.4s_ease-in-out_infinite] ${radius} ${className}`}
      style={{ width, height }}
    />
  );
}
