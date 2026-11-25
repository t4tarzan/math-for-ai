#!/usr/bin/env node
/** Copy Pyodide WASM/stdlib into public/ so the browser can load them locally. */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(root, "node_modules", "pyodide");
const dest = path.join(root, "public", "pyodide");

const files = [
  "pyodide.asm.wasm",
  "pyodide.asm.mjs",
  "python_stdlib.zip",
  "pyodide-lock.json",
  "pyodide.mjs",
  "pyodide.js",
];

if (!fs.existsSync(src)) {
  console.warn("[copy-pyodide] node_modules/pyodide missing — skip");
  process.exit(0);
}

fs.mkdirSync(dest, { recursive: true });
for (const file of files) {
  const from = path.join(src, file);
  if (!fs.existsSync(from)) {
    console.warn(`[copy-pyodide] missing ${file}`);
    continue;
  }
  fs.copyFileSync(from, path.join(dest, file));
}
console.log(`[copy-pyodide] → ${dest}`);
