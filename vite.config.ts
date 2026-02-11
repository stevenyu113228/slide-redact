import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import os from "os";

// Dev certs are optional — only needed for local dev, not for production build
const certDir = path.join(os.homedir(), ".office-addin-dev-certs");
const keyPath = path.join(certDir, "localhost.key");
const certPath = path.join(certDir, "localhost.crt");
const hasCerts = fs.existsSync(keyPath) && fs.existsSync(certPath);

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    ...(hasCerts
      ? {
          https: {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath),
          },
        }
      : {}),
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        editor: path.resolve(__dirname, "editor.html"),
      },
    },
  },
});
