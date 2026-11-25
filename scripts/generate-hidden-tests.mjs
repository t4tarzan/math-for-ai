#!/usr/bin/env node
/**
 * Generate hidden test harnesses for T2-rubric lessons.
 * Run: node scripts/generate-hidden-tests.mjs
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const INTERACTIVE = path.join(ROOT, "apps/web/src/content/lessons/interactive");
const HIDDEN = path.join(ROOT, "apps/web/src/content/exercises/hidden");

function extraChecks(starter, visibleTests) {
  const m = starter.match(/def (\w+)\(([^)]*)\)/);
  if (!m) return "";
  const fn = m[1];
  const params = m[2].trim();
  const extras = [];
  const zeroArg = params.length === 0;

  if (visibleTests.includes("len(") && zeroArg) {
    extras.push(` __check("hidden_len_pos", len(${fn}()) > 0)`);
  }
  if ((starter.includes("return [") || starter.includes("return (")) && zeroArg) {
    extras.push(` __check("hidden_no_none", all(x is not None for x in ${fn}()))`);
  }
  if (/return\s+["']/.test(starter) && zeroArg) {
    extras.push(` __check("hidden_nonempty_str", len(str(${fn}())) > 0)`);
  }
  if ((starter.includes("True") || starter.includes("False")) && zeroArg) {
    extras.push(` __check("hidden_bool", isinstance(${fn}(), bool))`);
  }
  if (extras.length === 0) {
    extras.push(` __check("hidden_callable", callable(${fn}))`);
    if (zeroArg) {
      extras.push(` __check("hidden_idempotent", ${fn}() == ${fn}())`);
    }
  }

  return extras.join("\n");
}

function buildHiddenHarness(visibleTests, starter) {
  const extra = extraChecks(starter, visibleTests);
  if (!extra) return visibleTests;
  if (visibleTests.includes("try:")) {
    return visibleTests.replace(/(\nexcept Exception)/, `\n${extra}$1`);
  }
  return `${visibleTests}\n${extra}`;
}

async function main() {
  await fs.mkdir(HIDDEN, { recursive: true });
  const files = await fs.readdir(INTERACTIVE);
  let written = 0;

  for (const file of files.filter((f) => f.endsWith(".json"))) {
    const lesson = JSON.parse(await fs.readFile(path.join(INTERACTIVE, file), "utf8"));
    const build = lesson.steps?.find((s) => s.type === "build");
    if (!build?.code?.tests) continue;
    if (build.exercise?.rubric !== "T2") continue;

    const tests = buildHiddenHarness(build.code.tests, build.code.starter);
    const outPath = path.join(HIDDEN, `${lesson.id}.json`);
    await fs.writeFile(outPath, JSON.stringify({ lessonId: lesson.id, tests }, null, 2));
    written++;
  }

  console.log(`Hidden harnesses: ${written} → ${HIDDEN}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
