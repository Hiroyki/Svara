import type { CapacitorConfig } from "@capacitor/cli";

/** Android shell. The web app is the static export in out/ (SVARA_TARGET=android). */
const config: CapacitorConfig = {
  appId: "app.svara.music",
  appName: "Svara",
  webDir: "out",
  backgroundColor: "#0c0c0d",
  server: { androidScheme: "https" },
  android: { backgroundColor: "#0c0c0d" },
  plugins: {
    // route fetch/XHR through native HTTP so YouTube Music requests aren't blocked by CORS
    CapacitorHttp: { enabled: true },
  },
};

export default config;
