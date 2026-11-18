"use client";

import { BarChart3, Compass, Heart, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Explore", icon: Compass },
  { href: "/search", label: "Browse", icon: Search },
  { href: "/charts", label: "Charts", icon: BarChart3 },
  { href: "/liked", label: "Library", icon: Heart },
];

export default function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="relative z-10 mx-2 mb-2 flex rounded-2xl bg-panel md:hidden">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition ${
              active ? "text-green" : "text-muted"
            }`}
          >
            <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
