"use client";

import { Loader2, Pause, Play } from "lucide-react";
import { useEffect } from "react";
import { useUI } from "@/lib/ui";

/** Every surface in Svara sits in a Panel. */
export function Panel({ className = "", children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-2xl bg-panel ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function IconButton({
  label,
  onClick,
  children,
  active,
  className = "",
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={`grid size-8 shrink-0 place-items-center rounded-[10px] transition-colors hover:bg-hover active:scale-95 ${
        active ? "text-green" : "text-muted hover:text-ink"
      } ${className}`}
    >
      {children}
    </button>
  );
}

/** Round play/pause. `green` for collection play, `white` for the player. */
export function PlayDisc({
  playing,
  loading,
  onClick,
  tone = "green",
  size = "md",
  disabled,
  label,
}: {
  playing?: boolean;
  loading?: boolean;
  onClick: (e: React.MouseEvent) => void;
  tone?: "green" | "white";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  label?: string;
}) {
  const box = size === "lg" ? "size-12" : size === "md" ? "size-10" : "size-8";
  const icon = size === "lg" ? "size-5" : size === "md" ? "size-4" : "size-3.5";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label ?? (playing ? "Pause" : "Play")}
      className={`${box} grid shrink-0 place-items-center rounded-full text-app transition-transform hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-40 ${
        tone === "green" ? "bg-green" : "bg-ink"
      }`}
    >
      {loading ? (
        <Loader2 className={`${icon} animate-spin`} />
      ) : playing ? (
        <Pause className={icon} fill="currentColor" strokeWidth={0} />
      ) : (
        <Play className={`${icon} translate-x-px`} fill="currentColor" strokeWidth={0} />
      )}
    </button>
  );
}

export function SectionHead({ title, action, onAction, children }: { title: string; action?: string; onAction?: () => void; children?: React.ReactNode }) {
  return (
    <div className="mb-3.5 flex items-center justify-between gap-4">
      <h2 className="text-[17px] font-bold tracking-[-0.01em]">{title}</h2>
      <div className="flex items-center gap-1">
        {children}
        {action && (
          <button onClick={onAction} className="rounded-lg px-2 py-1 text-[12px] font-semibold text-muted transition-colors hover:text-ink">
            {action}
          </button>
        )}
      </div>
    </div>
  );
}

export function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-[10.5px] font-semibold uppercase tracking-[0.14em] text-faint ${className}`}>{children}</p>;
}

/** Pages set the breadcrumb shown in the top bar. */
export function useCrumbs(crumbs: string[]) {
  const set = useUI((s) => s.setCrumbs);
  const key = crumbs.join("\u0000");
  useEffect(() => {
    set(key.split("\u0000").filter(Boolean));
  }, [key, set]);
}
