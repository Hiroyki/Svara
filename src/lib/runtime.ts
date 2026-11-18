/**
 * Build target, fixed at build time (see next.config.ts):
 *   web     — Next.js server, data via /api routes
 *   desktop — same server, bundled inside Electron (Windows)
 *   android — static export inside Capacitor; data fetched in-app over native HTTP
 */
export const TARGET = (process.env.NEXT_PUBLIC_SVARA_TARGET ?? "web") as "web" | "desktop" | "android";

/** True when there is no Svara server and the app must talk to YouTube Music itself. */
export const IN_APP_DATA = TARGET === "android";
