import { defineConfig } from "vite";
import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = process.cwd();
function htmlEntries(directory = root, entries = {}) {
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    if (["node_modules", "dist", ".git", "supabase"].includes(item.name)) continue;
    const path = join(directory, item.name);
    if (item.isDirectory()) htmlEntries(path, entries);
    else if (item.name.endsWith(".html")) entries[relative(root, path).replace(/\.html$/, "").replaceAll("/", "_")] = resolve(path);
  }
  return entries;
}

export default defineConfig({
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  plugins: [{ name: "copy-runtime-config", closeBundle() { for (const dir of ["passenger", "driver"]) { mkdirSync(`dist/${dir}`, { recursive: true }); copyFileSync(`${dir}/config.js`, `dist/${dir}/config.js`); } } }],
  build: {
    rollupOptions: { input: htmlEntries() }
  }
});
