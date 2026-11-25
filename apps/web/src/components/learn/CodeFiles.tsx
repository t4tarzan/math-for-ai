"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export interface CodeFile {
  name: string;
  lang: string;
  content: string;
}

/** The lesson's own code files (code/ in the source repo), as tabs with a copy button. */
export function CodeFiles({ files, githubDir }: { files: CodeFile[]; githubDir: string }) {
  const [i, setI] = useState(0);
  const [copied, setCopied] = useState(false);
  const f = files[i];
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(f.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };
  return (
    <div className="code-file overflow-hidden rounded-2xl border border-[var(--rule)] bg-[#fbfaf6]">
      <div className="flex flex-wrap items-center gap-1 border-b border-[var(--rule)] bg-[var(--bg-sunk)] px-2 py-1.5">
        {files.map((x, xi) => (
          <button
            key={x.name}
            type="button"
            onClick={() => setI(xi)}
            className={`rounded-lg px-2.5 py-1 font-mono text-xs ${xi === i ? "bg-white text-[var(--ink)] shadow-sm" : "text-[var(--ink-mute)] hover:text-[var(--ink)]"}`}
          >
            {x.name}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-1">
          <a href={`${githubDir}/${encodeURIComponent(f.name)}`} target="_blank" rel="noreferrer" className="rounded-lg px-2 py-1 text-xs text-[var(--ink-mute)] hover:text-[var(--ink)]">
            GitHub
          </a>
          <button type="button" onClick={copy} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[var(--ink-mute)] hover:text-[var(--ink)]" aria-label="Copy code">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy"}
          </button>
        </span>
      </div>
      <pre className="max-h-[520px]">
        <code>{f.content}</code>
      </pre>
    </div>
  );
}
