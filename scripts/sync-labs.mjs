#!/usr/bin/env node
// Copy each lab's public page content into the web app, and record its capstone.json hash as accepted.
// The hash is what the grader writes (sha256 of the file's bytes); older accepted hashes are kept, so
// reports from the previous lab release still import (design §9.3).
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const LABS = [{ id: "rag-chatbot", repo: "t4tarzan/m4ai-lab-rag-chatbot" }];
for (const lab of LABS) {
  const src = path.join(root, "labs", lab.id);
  const dst = path.join(root, "apps/web/content/labs", lab.id);
  fs.mkdirSync(path.join(dst, "guides"), { recursive: true });
  const raw = fs.readFileSync(path.join(src, "capstone.json"));
  const hash = createHash("sha256").update(raw).digest("hex");
  fs.writeFileSync(path.join(dst, "capstone.json"), raw);
  fs.copyFileSync(path.join(src, "README.md"), path.join(dst, "README.md"));
  const guides = fs.readdirSync(path.join(src, "guides")).filter((f) => f.endsWith(".md")).sort();
  for (const g of guides) fs.copyFileSync(path.join(src, "guides", g), path.join(dst, "guides", g));
  const accPath = path.join(dst, "accepted.json");
  const acc = fs.existsSync(accPath) ? JSON.parse(fs.readFileSync(accPath, "utf8")) : { repo: lab.repo, hashes: [] };
  if (!acc.hashes.includes(hash)) acc.hashes.push(hash);
  acc.repo = lab.repo;
  fs.writeFileSync(accPath, JSON.stringify(acc, null, 1) + "\n");
  console.log(`${lab.id}: ${guides.length} guides, capstone ${hash.slice(0, 12)}…, ${acc.hashes.length} accepted hash(es)`);
}
