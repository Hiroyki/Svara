// Svara for Windows: Electron shell around the bundled Next.js standalone server.
const { app, BrowserWindow, nativeTheme, shell, utilityProcess } = require("electron");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");

let server = null;
let win = null;

/** The Next.js standalone build: packaged under resources/app-server, or .next/standalone in development. */
function serverDir() {
  return app.isPackaged ? path.join(process.resourcesPath, "app-server") : path.join(__dirname, "..", ".next", "standalone");
}

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.unref();
    s.on("error", reject);
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

function waitFor(url, timeoutMs = 30000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      http
        .get(url, (res) => {
          res.resume();
          resolve();
        })
        .on("error", () => {
          if (Date.now() - started > timeoutMs) reject(new Error("Svara server did not start"));
          else setTimeout(tick, 150);
        });
    };
    tick();
  });
}

async function startServer() {
  const port = await freePort();
  const dir = serverDir();
  server = utilityProcess.fork(path.join(dir, "server.js"), [], {
    cwd: dir,
    env: { ...process.env, NODE_ENV: "production", PORT: String(port), HOSTNAME: "127.0.0.1" },
    stdio: "ignore",
    serviceName: "Svara server",
  });
  await waitFor(`http://127.0.0.1:${port}`);
  // load via "localhost": the embed rejects pages served from a bare IP (every song fails as unavailable)
  return `http://localhost:${port}`;
}

async function createWindow() {
  nativeTheme.themeSource = "dark";
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 620,
    title: "Svara",
    backgroundColor: "#0c0c0d",
    autoHideMenuBar: true,
    // dark, seamless title bar: the app draws the strip, Windows keeps its native caption buttons
    titleBarStyle: "hidden",
    titleBarOverlay: { color: "#0c0c0d", symbolColor: "#a1a1aa", height: 36 },
    show: false,
    icon: path.join(__dirname, "icon.png"),
    webPreferences: {
      autoplayPolicy: "no-user-gesture-required",
      backgroundThrottling: false, // keep the player clock running when minimised
    },
  });

  // links to other sites open in the default browser, not inside Svara
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // launch animation plays straight away while the server boots in parallel
  win.once("ready-to-show", () => win.show());
  const splashDone = new Promise((r) => setTimeout(r, 1700));
  const serverUp = startServer();
  await win.loadFile(path.join(__dirname, "splash.html"));
  const [url] = await Promise.all([serverUp, splashDone]);

  win.webContents.on("will-navigate", (e, target) => {
    if (!target.startsWith(url)) {
      e.preventDefault();
      shell.openExternal(target);
    }
  });
  // ?from=splash tells the app the intro has already played
  await win.loadURL(`${url}/?from=splash`);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });
  app.setAppUserModelId("app.svara.music");
  app.whenReady().then(createWindow);
  app.on("window-all-closed", () => app.quit());
  app.on("before-quit", () => server?.kill());
}
