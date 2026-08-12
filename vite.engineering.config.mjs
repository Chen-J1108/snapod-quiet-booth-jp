import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const occtDir = path.join(projectRoot, "node_modules", "occt-import-js", "dist");
const engineeringRoot = path.join(projectRoot, "engineering");

const engineeringAssets = {
  "/cad.worker.js": {
    source: path.join(engineeringRoot, "cad.worker.js"),
    type: "text/javascript; charset=utf-8",
  },
  "/occt-import-js/occt-import-js.js": {
    source: path.join(occtDir, "occt-import-js.js"),
    type: "text/javascript; charset=utf-8",
  },
  "/occt-import-js/occt-import-js.wasm": {
    source: path.join(occtDir, "occt-import-js.wasm"),
    type: "application/wasm",
  },
};

function internalCadAssets() {
  return {
    name: "internal-cad-assets",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url || "/", "http://localhost").pathname;
        const asset = engineeringAssets[pathname];
        if (!asset) return next();
        response.statusCode = 200;
        response.setHeader("Content-Type", asset.type);
        response.setHeader("Cache-Control", "no-store");
        response.end(fs.readFileSync(asset.source));
      });
    },
    generateBundle() {
      for (const [url, asset] of Object.entries(engineeringAssets)) {
        this.emitFile({
          type: "asset",
          fileName: url.slice(1),
          source: fs.readFileSync(asset.source),
        });
      }
    },
  };
}

export default defineConfig({
  root: engineeringRoot,
  publicDir: false,
  build: {
    outDir: path.join(projectRoot, "dist-engineering"),
    emptyOutDir: true,
  },
  server: {
    host: "127.0.0.1",
    port: 5180,
  },
  plugins: [react(), internalCadAssets()],
});
