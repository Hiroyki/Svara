/*
 * Svara logo: green rounded square with a symmetric white waveform, "SVARA" set
 * underneath. Eleven bars, tallest in the middle, on a 120u grid so the mark is
 * crisp from favicon size up. The same geometry lives in app/icon.svg and public/logo.svg.
 */
const HEIGHTS = [20, 32, 46, 60, 76, 92, 76, 60, 46, 32, 20];
const BAR = 4.5;
const GAP = 3.5;
const START = (120 - (HEIGHTS.length * BAR + (HEIGHTS.length - 1) * GAP)) / 2;

export function LogoMark({ size = 34, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={`shrink-0 ${className}`} aria-hidden>
      <rect width="120" height="120" rx="22" className="fill-green" />
      {HEIGHTS.map((h, i) => (
        <rect key={i} x={START + i * (BAR + GAP)} y={(120 - h) / 2} width={BAR} height={h} rx={BAR / 2} fill="#fff" />
      ))}
    </svg>
  );
}

/** Stacked lockup: mark on top, wordmark below, both the same width. */
export default function Logo({ compact = false }: { compact?: boolean }) {
  const size = compact ? 38 : 58;
  return (
    <span className="inline-flex flex-col items-center gap-1.5" role="img" aria-label="Svara">
      <LogoMark size={size} />
      <span
        className={`font-extrabold uppercase leading-none text-ink ${compact ? "text-[10px] tracking-[0.08em]" : "text-[17px] tracking-[0.06em]"}`}
        style={{ width: size, textAlign: "center", whiteSpace: "nowrap" }}
        aria-hidden
      >
        Svara
      </span>
    </span>
  );
}
