"use client";

import { useEffect } from "react";

/** Turns escaped ```mermaid blocks (pre.mermaid-src) into diagrams, loading mermaid only on pages that need it. */
export function MermaidDiagrams({ rootId }: { rootId: string }) {
  useEffect(() => {
    const root = document.getElementById(rootId);
    const blocks = root ? [...root.querySelectorAll<HTMLPreElement>("pre.mermaid-src")] : [];
    if (!blocks.length) return;
    let cancelled = false;
    (async () => {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: "neutral",
        securityLevel: "strict",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      });
      for (const [n, pre] of blocks.entries()) {
        if (cancelled) return;
        try {
          const { svg } = await mermaid.render(`mmd-${rootId}-${n}`, pre.textContent ?? "");
          const holder = document.createElement("div");
          holder.innerHTML = svg;
          pre.replaceWith(holder);
        } catch {
          pre.dataset.failed = "1"; // leave the source visible if a diagram does not parse
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rootId]);
  return null;
}
