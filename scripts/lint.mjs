import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const files = [];
function collect(directory) {
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    if (["node_modules", "dist", ".git", ".pnpm-store"].includes(item.name)) continue;
    const path = join(directory, item.name);
    if (item.isDirectory()) collect(path);
    else if (item.name.endsWith(".js") || item.name.endsWith(".mjs")) files.push(path);
  }
}
collect(process.cwd());
for (const file of files) execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
console.log(`Syntax lint passed for ${files.length} JavaScript modules.`);
