import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT;
// PORT is only required for dev/preview servers, not during production build
const port = rawPort ? Number(rawPort) : 3001;

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
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          // React core — always needed
          if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/scheduler/")) return "vendor-react";
          // Data fetching
          if (id.includes("/@tanstack/")) return "vendor-query";
          // UI primitives
          if (id.includes("/@radix-ui/")) return "vendor-ui";
          // Chart library (heavy, rarely first page)
          if (id.includes("/recharts/") || id.includes("/d3-") || id.includes("/victory-")) return "vendor-charts";
          // Rich text editor (heavy, only report/doc pages)
          if (id.includes("/@tiptap/") || id.includes("/prosemirror")) return "vendor-editor";
          // i18n
          if (id.includes("/i18next") || id.includes("/react-i18next")) return "vendor-i18n";
          // Utilities
          if (id.includes("/date-fns/") || id.includes("/axios/") || id.includes("/wouter/") || id.includes("/zod/")) return "vendor-utils";
          // Everything else in node_modules
          return "vendor-misc";
        },
      },
    },
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq, req) => {
            // Forward original host so tenantResolver can detect *.localhost subdomains
            const host = req.headers["host"] ?? "";
            if (host) proxyReq.setHeader("X-Forwarded-Host", host);
          });
        },
      },
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
