// The learning foundry: the true numbers every readout in the figure comes from.
// Source: rohitg00/ai-engineering-from-scratch at 9712e323 (2026-11-18), counted in
// projects/math-for-ai/docs/RECCE-2026-11-25.md.
export const COURSE = {
  lessons: 542, // phases/*/* lesson folders
  phases: 20, // phases 00–19
  quizzes: 392, // lessons that ship a quiz.json
  practice: 54, // practice/ problems
  testLayers: 4, // each practice problem's tests.py has four layers (practice/AUTHORING.md)
  capstones: 85, // phase 19 capstone lessons
  projects: 79, // ready staged projects in projects/
};

// The five stations a lesson card visits, left to right on the bench.
export const STATIONS = [
  { key: "read", name: "Read", line: (c) => `Read · ${c.lessons} lessons in ${c.phases} phases` },
  { key: "quiz", name: "Quiz gate", line: (c) => `Quiz gate · ${c.quizzes} of ${c.lessons} lessons have quizzes` },
  { key: "practice", name: "Practice rig", line: (c) => `Practice · ${c.practice} problems, ${c.testLayers} layers of tests` },
  { key: "cloud", name: "Cloud lab", line: (c) => `Cloud lab · ${c.capstones} capstones on a local AWS (Floci)` },
  { key: "ship", name: "Ship", line: (c) => `Ship · ${c.projects} projects + ${c.capstones} capstones to host` },
];

export const readouts = STATIONS.map((s) => s.line(COURSE));
