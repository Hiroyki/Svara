// Runs after packing, before the installer is built:
//  1. electron-builder skips node_modules in extraResources, so the standalone
//     server's traced dependencies are copied in here.
//  2. It also bundles the repo's own dependencies into the app folder; the main
//     process needs none of them (it only uses Electron/Node built-ins), so drop them.
const { cpSync, existsSync, rmSync } = require("node:fs");
const path = require("node:path");

exports.default = async function afterPack(context) {
  const src = path.join(context.packager.projectDir, ".next", "standalone", "node_modules");
  const dst = path.join(context.appOutDir, "resources", "app-server", "node_modules");
  if (!existsSync(src)) throw new Error(`missing ${src}; run the desktop Next build first`);
  cpSync(src, dst, { recursive: true, dereference: true });
  rmSync(path.join(context.appOutDir, "resources", "app", "node_modules"), { recursive: true, force: true });
};
