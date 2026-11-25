"use client";

import { useEffect, useState, type ReactNode } from "react";

const TABS = [
  { id: "math", label: "The nine equations" },
  { id: "catalogue", label: "Course catalogue" },
] as const;
type TabId = (typeof TABS)[number]["id"];

/** Two homepage tabs; the hash (#catalogue) makes each one linkable. Both panels are server-rendered. */
export function HomeTabs({ math, catalogue }: { math: ReactNode; catalogue: ReactNode }) {
  const [tab, setTab] = useState<TabId>("math");

  useEffect(() => {
    const read = () => setTab(window.location.hash === "#catalogue" ? "catalogue" : "math");
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  const pick = (id: TabId) => {
    setTab(id);
    history.replaceState(null, "", id === "catalogue" ? "#catalogue" : window.location.pathname);
  };

  return (
    <div>
      <div role="tablist" aria-label="Homepage sections" className="sticky top-[57px] z-20 -mx-1 flex gap-1 bg-[var(--header-bg)] px-1 py-2 backdrop-blur">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => pick(t.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? "bg-[var(--ink)] text-white" : "text-[var(--ink-soft)] hover:bg-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div id="panel-math" role="tabpanel" hidden={tab !== "math"} className="pt-4">
        {math}
      </div>
      <div id="panel-catalogue" role="tabpanel" hidden={tab !== "catalogue"} className="pt-4">
        {catalogue}
      </div>
    </div>
  );
}
