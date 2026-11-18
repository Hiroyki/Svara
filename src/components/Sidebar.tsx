"use client";

import { ArrowLeft, ArrowRight, BarChart3, Clock3, Compass, Heart, ListMusic, Plus, Search } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCurrent, usePlayer } from "@/lib/player";
import { useUI } from "@/lib/ui";
import Logo from "./Logo";

type Item = { href: string; label: string; icon: typeof Compass };

const browse: Item[] = [
  { href: "/", label: "Explore", icon: Compass },
  { href: "/search", label: "Browse", icon: Search },
  { href: "/charts", label: "Charts", icon: BarChart3 },
];

const mine: Item[] = [
  { href: "/recent", label: "Recent", icon: Clock3 },
  { href: "/liked", label: "Favorite", icon: Heart },
];

function NavItem({ href, label, icon: Icon, collapsed, dot }: Item & { collapsed: boolean; dot?: boolean }) {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const [path, q] = href.split("?");
  const active = href === "/" ? pathname === "/" : q ? pathname === path && query === q : pathname.startsWith(path);
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={`group relative flex items-center gap-3 rounded-xl p-1.5 text-[13.5px] font-semibold transition-colors ${
        active ? "text-green" : "text-muted hover:bg-hover hover:text-ink"
      } ${collapsed ? "justify-center" : "pr-3"}`}
    >
      {/* the active pill slides between items */}
      {active && (
        <motion.span layoutId="nav-active" className="absolute inset-0 rounded-xl bg-green-soft" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
      )}
      <span
        className={`relative grid size-[30px] shrink-0 place-items-center rounded-[9px] border transition-colors ${
          active ? "border-green/60" : "border-white/12 group-hover:border-white/25"
        }`}
      >
        <Icon className="size-[15px] transition-transform duration-300 group-hover:scale-110" strokeWidth={2} />
      </span>
      {!collapsed && <span className="relative truncate">{label}</span>}
      {!collapsed && dot && <span className="relative ml-auto size-1.5 shrink-0 animate-pulse rounded-full bg-green" />}
    </Link>
  );
}

export default function Sidebar() {
  const collapsed = useUI((s) => s.collapsed);
  const toggle = useUI((s) => s.toggleCollapsed);
  const playlists = usePlayer((s) => s.playlists);
  const create = usePlayer((s) => s.createPlaylist);
  const current = useCurrent();
  const playing = usePlayer((s) => s.playing);
  const router = useRouter();

  const newPlaylist = () => {
    const id = create(`Playlist ${playlists.length + 1}`);
    router.push(`/library?id=${id}`);
  };

  return (
    <aside className="animate-in hidden min-h-0 [animation-delay:var(--intro-delay,0ms)] flex-col rounded-2xl bg-panel md:col-start-1 md:row-span-3 md:row-start-1 md:flex">
      <Link href="/" aria-label="Svara home" className={`flex h-[112px] shrink-0 items-center ${collapsed ? "justify-center" : "px-6"}`}>
        <Logo compact={collapsed} />
      </Link>

      <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3">
        <nav className="space-y-1">
          {browse.map((m) => (
            <NavItem key={m.href} {...m} collapsed={collapsed} />
          ))}
        </nav>

        {!collapsed ? <p className="mb-2 mt-7 px-2 text-[15px] font-bold">My music</p> : <div className="mx-3 my-5 h-px bg-line" />}
        <nav className="space-y-1">
          {mine.map((m) => (
            <NavItem key={m.href} {...m} collapsed={collapsed} />
          ))}
          {playlists.map((p) => (
            <NavItem
              key={p.id}
              href={`/library?id=${p.id}`}
              label={p.name}
              icon={ListMusic}
              collapsed={collapsed}
              dot={playing && !!current && p.tracks.some((t) => t.id === current.id)}
            />
          ))}
          <button
            onClick={newPlaylist}
            title="New playlist"
            className={`group flex w-full items-center gap-3 rounded-xl p-1.5 text-[13.5px] font-semibold text-faint transition-colors hover:bg-hover hover:text-ink ${
              collapsed ? "justify-center" : "pr-3"
            }`}
          >
            <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px] border border-dashed border-white/15 group-hover:border-white/30">
              <Plus className="size-[15px]" />
            </span>
            {!collapsed && "New playlist"}
          </button>
        </nav>
      </div>

      <div className="shrink-0 p-3">
        <button
          onClick={toggle}
          className={`flex h-9 w-full items-center justify-center gap-2 rounded-full bg-raised text-[12px] font-semibold text-muted transition-colors hover:text-ink`}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ArrowRight className="size-3.5" /> : <ArrowLeft className="size-3.5" />}
          {!collapsed && "Roll up"}
        </button>
      </div>
    </aside>
  );
}
