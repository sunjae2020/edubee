import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT;
// PORT is only required for dev/preview servers, not during production build
const port = rawPort ? Number(rawPort) : 3000;

if (rawPort && (Number.isNaN(port) || port <= 0)) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? "/";

// SPA fallback for the PREVIEW (production) server only.
// The dev server already handles SPA routing natively via transformIndexHtml.
// vite preview uses sirv which returns 404 for unknown paths — this fixes it.
function spaFallback(): Plugin {
  return {
    name: "spa-fallback",
    configurePreviewServer(server) {
      server.middlewares.use((req: any, _res: any, next: any) => {
        const url: string = req.url ?? "/";
        // Let through anything that looks like a static asset (has a file extension)
        if (/\.[a-zA-Z0-9]{1,8}(\?.*)?$/.test(url)) return next();
        // All other paths are client-side routes → serve index.html
        req.url = "/index.html";
        next();
      });
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    spaFallback(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom", "@tanstack/react-query"],
  },
  optimizeDeps: {
    include: [
      "react", "react-dom",
      "@radix-ui/react-tabs", "@radix-ui/react-dialog", "@radix-ui/react-sheet",
      "@radix-ui/react-dropdown-menu", "@radix-ui/react-select", "@radix-ui/react-tooltip",
      "@radix-ui/react-avatar", "@radix-ui/react-label", "@radix-ui/react-slot",
      "@tanstack/react-query", "axios", "wouter", "date-fns",
    ],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
