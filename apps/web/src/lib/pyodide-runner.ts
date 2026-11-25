/** Minimal client-side Pyodide surface (avoid importing the npm package in the bundle). */
export interface PyodideInterface {
  runPythonAsync(code: string): Promise<Record<string, unknown>>;
}

let pyodidePromise: Promise<PyodideInterface> | null = null;

export interface TestResult {
  name: string;
  pass: boolean;
  msg: string;
}

export interface RunResult {
  stdout: string;
  tests: TestResult[];
  allPassed: boolean;
  error?: string;
}

/** Served from apps/web/public/pyodide (copied from node_modules on postinstall). */
const LOCAL_INDEX_URL = "/pyodide/";

async function loadPyodideInstance(): Promise<PyodideInterface> {
  if (typeof window === "undefined") {
    throw new Error("Pyodide can only run in the browser");
  }

  // Must load from public/ — bundling the pyodide npm package breaks under Next/Turbopack.
  // @ts-expect-error runtime-loaded asset from public/
  const mod = await import(/* webpackIgnore: true */ "/pyodide/pyodide.mjs");
  const loadPyodide = mod.loadPyodide as (opts: { indexURL: string }) => Promise<PyodideInterface>;
  if (typeof loadPyodide !== "function") {
    throw new Error("loadPyodide missing from /pyodide/pyodide.mjs");
  }
  return loadPyodide({ indexURL: LOCAL_INDEX_URL });
}

export function getPyodide(): Promise<PyodideInterface> {
  if (!pyodidePromise) {
    pyodidePromise = loadPyodideInstance().catch((err) => {
      pyodidePromise = null;
      throw err;
    });
  }
  return pyodidePromise;
}

export function resetPyodide() {
  pyodidePromise = null;
}

export async function runPythonWithTests(
  userCode: string,
  testHarness: string,
): Promise<RunResult> {
  try {
    const pyodide = await getPyodide();

    const capture = `
import sys
from io import StringIO
_buf = StringIO()
_old = sys.stdout
sys.stdout = _buf
`;

    const script = `
${capture}
import json
__results = []
${userCode}

${testHarness}
_out = _buf.getvalue()
sys.stdout = _old
json.dumps({"stdout": _out, "tests": __results, "allPassed": all(t["pass"] for t in __results)})
`;

    const raw = await pyodide.runPythonAsync(script);
    const parsed = JSON.parse(String(raw)) as {
      stdout?: string;
      tests?: TestResult[];
      allPassed?: boolean;
    };
    return {
      stdout: String(parsed.stdout ?? ""),
      tests: (parsed.tests ?? []).map((t) => ({
        name: String(t.name ?? ""),
        pass: Boolean(t.pass),
        msg: String(t.msg ?? ""),
      })),
      allPassed: Boolean(parsed.allPassed),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      stdout: "",
      tests: [],
      allPassed: false,
      error: message,
    };
  }
}
