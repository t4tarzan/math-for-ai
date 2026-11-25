import "server-only";
import katex from "katex";
import { Marked, type Tokens } from "marked";

/**
 * Render a source lesson's markdown (ai-engineering-from-scratch, synced by scripts/sync-source.mjs)
 * to HTML on the server.
 *
 * Third-party content, so: raw HTML in the markdown is escaped (never passed through), link and image
 * URLs are limited to http(s)/mailto/#, math goes through KaTeX, mermaid source is escaped into a
 * <pre> that a client component turns into a diagram, and the source site's interactive ```figure
 * blocks become a link card to that figure on aiengineeringfromscratch.com.
 */
export interface TocItem {
  id: string;
  text: string;
  depth: 2 | 3;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const safeUrl = (u: string | null | undefined) => {
  const v = (u ?? "").trim();
  return /^(https?:\/\/|mailto:|#)/i.test(v) ? v : "#";
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z#0-9]+;/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 64) || "section";

const tex = (src: string, displayMode: boolean) =>
  katex.renderToString(src, { displayMode, throwOnError: false, output: "html", strict: "ignore" });

export function renderLessonMarkdown(markdown: string, opts: { upstreamUrl: string }) {
  const toc: TocItem[] = [];
  const used = new Map<string, number>();
  let figures = 0;

  const marked = new Marked({
    gfm: true,
    extensions: [
      {
        name: "inlineMath",
        level: "inline",
        start(src: string) {
          const i = src.indexOf("$");
          return i < 0 ? undefined : i;
        },
        tokenizer(src: string) {
          const m = /^\$(?!\s)([^$\n]+?)(?<![\s\\])\$(?!\d)/.exec(src);
          if (m) return { type: "inlineMath", raw: m[0], text: m[1] };
          return undefined;
        },
        renderer(token) {
          return tex((token as unknown as { text: string }).text, false);
        },
      },
    ],
    renderer: {
      html(token: Tokens.HTML | Tokens.Tag) {
        return esc(token.text);
      },
      heading(this: { parser: { parseInline: (t: Tokens.Generic[]) => string } }, token: Tokens.Heading) {
        const inner = this.parser.parseInline(token.tokens);
        const depth = Math.min(Math.max(token.depth, 2), 4);
        if (token.depth === 2 || token.depth === 3) {
          let id = slugify(token.text);
          const n = used.get(id) ?? 0;
          used.set(id, n + 1);
          if (n) id = `${id}-${n + 1}`;
          toc.push({ id, text: token.text.replace(/[*_`$]/g, ""), depth: token.depth as 2 | 3 });
          return `<h${depth} id="${id}" class="anchor-target">${inner}</h${depth}>\n`;
        }
        return `<h${depth}>${inner}</h${depth}>\n`;
      },
      code(token: Tokens.Code) {
        const lang = (token.lang ?? "").trim().split(/\s+/)[0].toLowerCase();
        if (lang === "math" || lang === "latex" || lang === "tex") {
          return `<div class="lesson-math">${tex(token.text, true)}</div>\n`;
        }
        if (lang === "mermaid") {
          return `<figure class="lesson-mermaid"><pre class="mermaid-src">${esc(token.text)}</pre></figure>\n`;
        }
        if (lang === "figure") {
          figures += 1;
          const id = token.text.trim().split(/\s+/)[0] ?? "figure";
          return (
            `<a class="lesson-figure-link" href="${esc(safeUrl(opts.upstreamUrl))}" target="_blank" rel="noreferrer">` +
            `<span class="lf-kicker">Interactive figure</span><span class="lf-id">${esc(id)}</span>` +
            `<span class="lf-cta">Open it on aiengineeringfromscratch.com →</span></a>\n`
          );
        }
        const label = lang || "text";
        return (
          `<div class="lesson-code"><div class="lesson-code-head">${esc(label)}</div>` +
          `<pre><code class="language-${esc(label)}">${esc(token.text)}</code></pre></div>\n`
        );
      },
      link(this: { parser: { parseInline: (t: Tokens.Generic[]) => string } }, token: Tokens.Link) {
        const href = safeUrl(token.href);
        const external = /^https?:/i.test(href);
        const title = token.title ? ` title="${esc(token.title)}"` : "";
        return `<a href="${esc(href)}"${title}${external ? ' target="_blank" rel="noreferrer"' : ""}>${this.parser.parseInline(token.tokens)}</a>`;
      },
      image(token: Tokens.Image) {
        const src = safeUrl(token.href);
        if (src === "#") return esc(token.text);
        return `<img src="${esc(src)}" alt="${esc(token.text)}" loading="lazy" decoding="async" />`;
      },
      table(this: { parser: { parseInline: (t: Tokens.Generic[]) => string } }, token: Tokens.Table) {
        const cell = (c: Tokens.TableCell, tag: "th" | "td") =>
          `<${tag}${c.align ? ` style="text-align:${c.align}"` : ""}>${this.parser.parseInline(c.tokens)}</${tag}>`;
        const head = `<tr>${token.header.map((c) => cell(c, "th")).join("")}</tr>`;
        const body = token.rows.map((r) => `<tr>${r.map((c) => cell(c, "td")).join("")}</tr>`).join("");
        return `<div class="lesson-table"><table><thead>${head}</thead><tbody>${body}</tbody></table></div>\n`;
      },
    },
  });

  const html = marked.parse(markdown, { async: false }) as string;
  return { html, toc, figures, hasMermaid: html.includes('class="mermaid-src"') };
}
