/*
 * Practice runner: checks a learner's Python against a problem's tests in Pyodide, off the main thread.
 * Adapted from ai-engineering-from-scratch's site/practice-worker.js (MIT, Rohit Ghumare and contributors).
 * The harness (practice_check.py) is synced from the same repo into /practice/.
 *
 * in:  {type:"boot"} | {type:"run", id, code, tests, fixtures, support, layers[], limit}
 * out: {type:"status", phase} | {type:"progress", id, step, value, name} | {type:"result", id, report} | {type:"error", id, message}
 *
 * A module worker: Pyodide 314 refuses classic workers. Create it with new Worker(url, { type: "module" }).
 */
import { loadPyodide, version as PYODIDE_VERSION } from "/pyodide/pyodide.mjs";

var runtime = null;
var harnessText = null;
var DIR = "/home/pyodide/practice";
var INDEX_URL = "/pyodide/";
var HARNESS_URL = "/practice/practice_check.py";

function post(m) {
  self.postMessage(m);
}

function boot() {
  if (runtime) return runtime;
  post({ type: "status", phase: "runtime" });
  // The runtime is served from /pyodide/, but its package files (numpy) are not: load them from the
  // jsDelivr build of the exact same Pyodide version (exported by pyodide.mjs), so the two never drift.
  runtime = loadPyodide({
    indexURL: INDEX_URL,
    packageBaseUrl: "https://cdn.jsdelivr.net/pyodide/v" + PYODIDE_VERSION + "/full/",
  })
    .then(function (py) {
      post({ type: "status", phase: "numpy" });
      return py.loadPackage("numpy").then(function () {
        py.FS.mkdirTree(DIR);
        py.runPython('import sys\nsys.path.insert(0, "' + DIR + '")\nimport numpy');
        post({ type: "status", phase: "ready" });
        return py;
      });
    });
  runtime.catch(function () {
    runtime = null;
  });
  return runtime;
}

function harness() {
  if (harnessText) return Promise.resolve(harnessText);
  return fetch(HARNESS_URL, { credentials: "same-origin" }).then(function (r) {
    if (!r.ok) throw new Error("Could not load the test harness (" + r.status + ")");
    return r.text().then(function (t) {
      harnessText = t;
      return t;
    });
  });
}

function run(m) {
  var started = Date.now();
  return boot().then(function (py) {
    return harness().then(function (h) {
      var fs = py.FS;
      fs.writeFile(DIR + "/practice_check.py", h);
      fs.writeFile(DIR + "/practice_tests.py", m.tests);
      if (m.support) fs.writeFile(DIR + "/support.py", m.support);
      else if (fs.analyzePath(DIR + "/support.py").exists) fs.unlink(DIR + "/support.py");
      py.globals.set("practice_source", m.code);
      py.globals.set("practice_fixtures", m.fixtures || "");
      py.globals.set("practice_layers", (m.layers || []).join(","));
      py.globals.set("practice_limit", Number(m.limit) || 0);
      py.globals.set("practice_sink", function (step, value, name) {
        post({ type: "progress", id: m.id, step: step, value: value, name: name });
      });
      var text;
      try {
        text = py.runPython(
          [
            "import sys",
            'for _n in ("practice_check", "practice_tests", "submission", "support"):',
            "    sys.modules.pop(_n, None)",
            "import practice_check",
            "practice_check.set_sink(practice_sink)",
            'practice_check.evaluate_json(practice_source, "' + DIR + '/practice_tests.py", practice_fixtures, practice_layers, practice_limit)',
          ].join("\n"),
        );
      } finally {
        py.runPython("import practice_check\npractice_check.set_sink(None)");
        var sink = py.globals.get("practice_sink");
        if (sink && sink.destroy) sink.destroy();
        py.globals.delete("practice_sink");
      }
      var report = JSON.parse(text);
      report.ms = Date.now() - started;
      return report;
    });
  });
}

self.onmessage = function (e) {
  var m = e.data || {};
  if (m.type === "boot") {
    boot().then(
      function () {},
      function (err) {
        post({ type: "status", phase: "failed", message: String((err && err.message) || err) });
      },
    );
    return;
  }
  if (m.type !== "run") return;
  run(m).then(
    function (report) {
      post({ type: "result", id: m.id, report: report });
    },
    function (err) {
      post({ type: "error", id: m.id, message: String((err && err.message) || err) });
    },
  );
};
