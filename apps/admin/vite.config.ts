import path from "node:path";
import { createRequire } from "node:module";
import { readdirSync } from "node:fs";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const appRoot = path.resolve(__dirname);
const packagesRoot = path.resolve(__dirname, "..", "..", "packages");
const workspaceRoot = path.resolve(__dirname, "..", "..");
const require = createRequire(import.meta.url);
const sanityClientRoot = path.dirname(require.resolve("@sanity/client/package.json"));
const sanityClientEntry = path.join(sanityClientRoot, "dist", "index.browser.js");
const sanityClientCsmEntry = path.join(sanityClientRoot, "dist", "csm.js");
const sanityImageUrlEntry = require.resolve("@sanity/image-url");

function getHtmlInputs(root: string) {
  return Object.fromEntries(
    readdirSync(root)
      .filter((fileName) => fileName.endsWith(".html"))
      .map((fileName) => [
        path.basename(fileName, ".html").replace(/[^a-zA-Z0-9_$]/g, "_"),
        path.resolve(root, fileName),
      ]),
  );
}

export default defineConfig({
  root: appRoot,
  envDir: workspaceRoot,
  publicDir: path.resolve(appRoot, "public"),
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(appRoot, "src") },
      { find: "@admin", replacement: path.resolve(appRoot, "src") },
      { find: "@siggistore/auth", replacement: path.resolve(packagesRoot, "auth", "src") },
      { find: "@siggistore/supabase", replacement: path.resolve(packagesRoot, "supabase", "src") },
      { find: "@siggistore/sanity", replacement: path.resolve(packagesRoot, "sanity", "src") },
      { find: "@siggistore/services", replacement: path.resolve(packagesRoot, "services", "src") },
      { find: "@siggistore/shared-types", replacement: path.resolve(packagesRoot, "shared-types", "src") },
      { find: "@siggistore/utils", replacement: path.resolve(packagesRoot, "utils", "src") },
      { find: "@siggistore/ui", replacement: path.resolve(packagesRoot, "ui", "src") },
      { find: /^@sanity\/client$/, replacement: sanityClientEntry },
      { find: /^@sanity\/client\/csm$/, replacement: sanityClientCsmEntry },
      { find: /^@sanity\/image-url$/, replacement: sanityImageUrlEntry },
    ],
  },
  server: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
    hmr: {
      host: "127.0.0.1",
      clientPort: 3000,
      path: "/admin",
    },
  },
  build: {
    outDir: path.resolve(appRoot, "dist"),
    cssMinify: false,
    emptyOutDir: false,
    rollupOptions: {
      input: getHtmlInputs(appRoot),
    },
  },
  base: "/admin/",
});
