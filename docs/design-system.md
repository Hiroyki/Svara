# Svara design system

Svara uses a dark **bento** layout: separate rounded charcoal panels on a near-black base, with an 8px gap between them. There is one accent colour, green, and it is used sparingly to mean "active" or "playing". Everything else stays neutral, so the artwork provides the colour.

The tokens live in `src/app/globals.css` under `@theme`, and Tailwind exposes them as utilities (`bg-panel`, `text-green`, …). Do not hard-code hex values in components.

## Tokens

### Colour

| Token | Value | Use |
| --- | --- | --- |
| `app` | `#0c0c0d` | Page base, visible only in the gaps between panels |
| `panel` | `#1b1b1d` | Every panel surface |
| `raised` | `#262629` | Elements that sit on a panel: tiles, inputs, date/cover squares |
| `hover` | `rgb(255 255 255 / 0.045)` | Row and button hover fill |
| `line` | `rgb(255 255 255 / 0.07)` | Dividers and table header rules |
| `ink` | `#f4f4f5` | Primary text |
| `muted` | `#a1a1aa` | Secondary text, inactive icons |
| `faint` | `#6f6f78` | Labels, column headers, timestamps |
| `green` | `#3ddc6b` | Active nav item, playing row, progress fill, primary play disc |
| `green-soft` | `rgb(61 220 107 / 0.12)` | Background of the active nav item |
| `lime` | `#c2f25c` | Wordmark only |

**Rule:** green marks state (active, playing, liked). It never decorates. One screen should show it in at most three places.

### Type: Manrope

| Role | Size / weight | Tracking |
| --- | --- | --- |
| Hero name | 56–72px / 800 | −0.035em |
| Page title | 32–44px / 800 | −0.03em |
| Section heading | 17px / 700 | −0.01em |
| Body / row title | 13.5px / 600 | 0 |
| Secondary | 12.5px / 500 | 0 |
| Label | 10.5px / 600, uppercase | 0.14em |
| Numbers (time, rank) | 12px, `tabular-nums` | 0 |

### Shape and space

| Token | Value |
| --- | --- |
| Panel radius | 16px (`rounded-2xl`) |
| Tile / input radius | 10px |
| Thumbnail radius | 6–8px |
| Gap between panels | 8px |
| Panel padding | 20px (main), 16px (side panels) |
| Space between sections | 32px |
| Row height | 48px |

There are no shadows inside the app, because panels separate by contrast alone. Only floating layers (menus, toasts) get a shadow.

### Motion

Built on `motion` (Framer Motion). The tokens live in `components/motion.tsx`: one easing curve `[0.22, 1, 0.36, 1]` and durations of fast 180ms, base 400ms and slow 700ms.

| Moment | Behaviour |
| --- | --- |
| First load | The bento panels rise in one after another, 0–240ms apart |
| Route change | The main panel content fades up 10px |
| Lists and cards | Stagger in 35ms apart the first time they scroll into view. Track rows repeat their delay every 8 rows, so long lists never lag. |
| Active indicators | The sidebar pill, search tab pill and side-panel tab underline slide between items (`layoutId`, spring) |
| Hero | Ken Burns drift (14s) and staggered text. On Explore it is a 5-slide carousel that advances every 7s, pauses on hover, and shows story-style progress segments. |
| Playback | The cover scales up while playing, the track info slides on change, long titles drift (marquee), the side-panel artwork glows and breathes, and the progress bar eases |
| Feedback | Liking a song springs the heart and fires an 8-particle burst. Toasts and menus spring in. Now Playing slides up from the bottom. |

Every animation respects `prefers-reduced-motion`: `MotionConfig reducedMotion="user"` covers `motion`, a CSS override covers the rest, and the carousel stops auto-advancing.

## Layout

```
┌──────────┬─────────────────────────────────────┬────────────┐
│          │ breadcrumb │ search          │ tools             │
│ sidebar  ├─────────────────────────────────────┼────────────┤
│ (nav,    │                                     │ right      │
│ library, │ main panel (scrolls)                │ panel:     │
│ roll up) │                                     │ now playing│
│          │                                     │ / curated  │
│          ├─────────────────────────────────────┴────────────┤
│          │ player panel                                     │
└──────────┴──────────────────────────────────────────────────┘
```

- **Below 1280px:** the right panel is hidden, and the Now Playing overlay covers its job.
- **Below 768px:** the sidebar is hidden and a bottom tab bar appears.
- **Roll up:** collapses the sidebar to a 72px icon rail. The choice is remembered per browser.

## Components

| Component | File | Notes |
| --- | --- | --- |
| Panel | `components/ui.tsx` | `rounded-2xl bg-panel`. Everything sits in one. |
| NavItem | `Sidebar.tsx` | Icon inside a 30px outlined square. Active: `green-soft` fill, green text and icon box. |
| IconButton | `components/ui.tsx` | 32px, radius 10, `hover` fill. Needs an `aria-label`. |
| PlayDisc | `components/ui.tsx` | Green disc with a dark glyph for collection play. White disc for the player. |
| Hero | `components/Hero.tsx` | Full-width image card in grayscale. Bottom-left gradient for text, with label, huge name, and one meta line. |
| ReleaseTile | `components/Cards.tsx` | 56px cover square plus three text lines (title, artist, meta). Laid out as a 3-column grid. |
| MediaCard | `components/Cards.tsx` | Square cover and two lines. A green play disc appears on hover. Used in carousels. |
| TrackTable | `components/TrackList.tsx` | Columns `#`, Name, Album, ♥, time. The playing row shows a green title and an equalizer in place of the number. No row fill. |
| SidePanel | `components/RightPanel.tsx` | Shows Now Playing (cover, title, up next) when a track is loaded, and a curated album from the home feed otherwise. |
| PlayerPanel | `components/PlayerBar.tsx` | Cover and title on the left, transport above the progress bar in the centre, utilities on the right. Green progress fill, with the thumb visible on hover. |

### States, applied everywhere

| State | Treatment |
| --- | --- |
| Hover | `hover` fill (rows, buttons) or a revealed play disc (cards) |
| Active / playing | Green text or icon. Never a full green row. |
| Focus | 2px green outline, `focus-visible` only |
| Disabled | 40% opacity, no pointer events |
| Loading | `raised` skeleton blocks with the real layout's shape |

## Do / Don't

| Do | Don't |
| --- | --- |
| Let artwork carry the colour | Add gradients, glows or blobs to panels |
| Use green to say "this is on" | Use green for headings or decoration |
| Keep copy short and factual | Write taglines or marketing lines in the UI |
| Show real data or nothing | Show invented numbers or badges (e.g. "verified") |
