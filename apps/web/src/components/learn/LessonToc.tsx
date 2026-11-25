"use client";

import { useEffect, useState } from "react";

export interface TocEntry {
  id: string;
  text: string;
  depth: 2 | 3;
}

/** Stage rail (llm.wntap.org style): the lesson's h2/h3 with the current one highlighted. Desktop only. */
export function LessonToc({ items }: { items: TocEntry[] }) {
  const [active, setActive] = useState(items[0]?.id);
  useEffect(() => {
    const els = items.map((t) => document.getElementById(t.id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: "-80px 0px -65% 0px" },
    );
    els.forEach((e) => obs.observe(e));
    return () => obs.disconnect();
  }, [items]);

  return (
    <nav aria-label="Lesson contents" className="text-sm">
      <p className="eyebrow mb-2 text-[var(--ink-mute)]">In this lesson</p>
      <ol className="space-y-0.5 border-l border-[var(--rule)]">
        {items.map((t) => (
          <li key={t.id}>
            <a
              href={`#${t.id}`}
              className={`-ml-px block border-l-2 py-1 leading-snug transition-colors ${t.depth === 3 ? "pl-6 text-[13px]" : "pl-3"} ${
                active === t.id ? "border-[var(--blueprint)] text-[var(--ink)]" : "border-transparent text-[var(--ink-mute)] hover:text-[var(--ink)]"
              }`}
            >
              {t.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
