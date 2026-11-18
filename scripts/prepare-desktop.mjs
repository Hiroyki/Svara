// After `SVARA_TARGET=desktop next build`: complete the standalone server and
// stage the Electron app folder that electron-builder packages.
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const standalone = join(root, ".next", "standalone");
if (!existsSync(join(standalone, "server.js"))) {
  console.error("No .next/standalone/server.js — run `npm run desktop:next` first.");
  process.exit(1);
}

// Next leaves static assets and /public out of the standalone folder on purpose
cpSync(join(root, ".next", "static"), join(standalone, ".next", "static"), { recursive: true });
cpSync(join(root, "public"), join(standalone, "public"), { recursive: true });

// the Electron app itself: main process + icon + a dependency-free package.json
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const app = join(root, ".desktop-app");
mkdirSync(app, { recursive: true });
cpSync(join(root, "electron"), app, { recursive: true });
cpSync(join(root, "build", "icon.png"), join(app, "icon.png"));
writeFileSync(
  join(app, "package.json"),
  JSON.stringify({ name: "svara-desktop", productName: "Svara", version: pkg.version, description: pkg.description, author: pkg.author, main: "main.cjs" }, null, 2),
);
console.log("desktop app staged in .desktop-app, server in .next/standalone");
