"use client";

import { BarChart3, ChevronRight, Clock3, Heart, Keyboard, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFetch } from "@/lib/fetcher";
import { hrefFor } from "@/lib/format";
import { usePlayer } from "@/lib/player";
import type { Suggestion } from "@/lib/types";
import { useUI } from "@/lib/ui";
import Logo from "./Logo";
import Surprise from "./Surprise";

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

function Crumbs() {
  const crumbs = useUI((s) => s.crumbs);
  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 rounded-2xl bg-panel px-5 text-[13px] lg:flex">
      {crumbs.map((c, i) => (
        <span key={i} className="flex min-w-0 items-center gap-1.5">
          {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-faint" />}
          <span className={`truncate ${i === crumbs.length - 1 ? "font-semibold text-ink" : "text-muted"}`}>{c}</span>
        </span>
      ))}
    </nav>
  );
}

function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const debounced = useDebounced(q.trim(), 160);
  const { data } = useFetch<Suggestion[]>(open && debounced ? `/api/suggest?q=${encodeURIComponent(debounced)}` : null);
  const suggestions = data ?? [];
  const playTrack = usePlayer((s) => s.playTrack);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (term: string) => {
    const t = term.trim();
    if (!t) return;
    setQ(t);
    setOpen(false);
    input.current?.blur();
    router.push(`/search?q=${encodeURIComponent(t)}`);
  };

  const pick = (s: Suggestion) => {
    if (s.kind === "query") return go(s.text);
    setOpen(false);
    input.current?.blur();
    const href = hrefFor(s.card);
    if (href) router.push(href);
    else if (s.card.track) playTrack(s.card.track);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && suggestions[active]) pick(suggestions[active]);
      else go(q);
    } else if (e.key === "Escape") {
      setOpen(false);
      input.current?.blur();
    }
  };

  const showList = open && !!debounced && suggestions.length > 0;

  return (
    <div className="relative min-w-0 flex-1">
      <label className="flex h-full items-center gap-3 rounded-2xl bg-panel px-4 text-muted shadow-[inset_0_0_0_1px_transparent] transition-[background-color,box-shadow,color] duration-200 focus-within:bg-raised focus-within:text-green focus-within:shadow-[inset_0_0_0_1px_rgb(61_220_107/0.45)] hover:bg-raised">
        <Search className="size-4 shrink-0" />
        <input
          ref={input}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          placeholder="What do you want to listen to?"
          className="h-full min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-faint focus-visible:outline-none"
          aria-label="Search"
          role="combobox"
          aria-expanded={showList}
          aria-controls="search-suggestions"
        />
        {q ? (
          <button onClick={() => setQ("")} className="text-faint hover:text-ink" aria-label="Clear search">
            <X className="size-4" />
          </button>
        ) : (
          <kbd className="hidden rounded-md border border-white/12 px-1.5 py-0.5 text-[11px] font-semibold text-faint sm:block">/</kbd>
        )}
      </label>

      {showList && (
        <ul
          id="search-suggestions"
          role="listbox"
          className="animate-pop absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-line bg-raised p-1.5 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.7)]"
        >
          {suggestions.map((s, i) => (
            <li key={i} role="option" aria-selected={i === active}>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13.5px] ${i === active ? "bg-hover" : ""}`}
              >
                {s.kind === "query" ? (
                  <>
                    <Search className="size-4 shrink-0 text-faint" />
                    <span className="truncate">{s.text}</span>
                  </>
                ) : (
                  <>
                    <img src={s.card.thumb} alt="" className={`size-8 shrink-0 object-cover ${s.card.kind === "artist" ? "rounded-full" : "rounded-md"}`} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{s.card.title}</span>
                      <span className="block truncate text-[12px] text-muted">{s.card.subtitle}</span>
                    </span>
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const tools = [
  { href: "/charts", label: "Charts", icon: BarChart3 },
  { href: "/recent", label: "Recently played", icon: Clock3 },
  { href: "/liked", label: "Favorite songs", icon: Heart },
];

export default function TopBar() {
  return (
    <header className="animate-in z-30 flex min-w-0 gap-2 [animation-delay:calc(var(--intro-delay,0ms)+60ms)] md:col-start-2 md:row-start-1 xl:col-span-2 lg:grid lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)_auto]">
      <Link href="/" className="flex items-center rounded-2xl bg-panel px-4 md:hidden" aria-label="Svara home">
        <Logo compact />
      </Link>
      <Crumbs />
      <SearchBox />
      <div className="hidden items-center gap-1 rounded-2xl bg-panel px-2 sm:flex">
        <Surprise />
        <span className="mx-0.5 h-4 w-px bg-line" />
        {tools.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} aria-label={label} title={label} className="grid size-8 place-items-center rounded-[10px] text-muted transition-colors hover:bg-hover hover:text-ink">
            <Icon className="size-4" />
          </Link>
        ))}
        <button
          onClick={() => useUI.getState().setHelp(true)}
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts (?)"
          className="grid size-8 place-items-center rounded-[10px] text-muted transition-colors hover:bg-hover hover:text-ink"
        >
          <Keyboard className="size-4" />
        </button>
      </div>
    </header>
  );
}
