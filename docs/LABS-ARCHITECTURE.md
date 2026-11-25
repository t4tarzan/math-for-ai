# Floci cloud labs — architecture (v2: Codespaces first)

> The cockpit colours each box from the task list: grey = planned, amber = building, green = verified.
> Box ids are `comp-<key>` and match the component keys in `bin/labplan.py`. v1 (own VM per learner) was replaced on 2026-11-26.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 470" font-family="Inter, system-ui, sans-serif" font-size="13" role="img" aria-label="Floci labs architecture v2">
  <style>
    .t { fill: #16181d; font-weight: 600; }
    .s { fill: #555a66; font-size: 11px; }
    .ln { stroke: #8a8d96; stroke-width: 1.4; fill: none; marker-end: url(#a); }
    .zone { fill: none; stroke: #b9bcc4; stroke-dasharray: 5 4; rx: 14; }
    .zl { fill: #7c808a; font-size: 11px; letter-spacing: .08em; }
  </style>
  <defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#8a8d96"/></marker></defs>

  <rect class="zone" x="12" y="12" width="440" height="330"/><text class="zl" x="26" y="34">MATH.WNTAP.ORG (VERCEL + NEON) — OURS</text>
  <rect class="zone" x="500" y="12" width="448" height="330"/><text class="zl" x="514" y="34">LEARNER MACHINE — CODESPACES OR LAPTOP</text>

  <rect id="comp-app" fill="#e5e7eb" stroke="#9ca3af" stroke-width="1.2" rx="10" x="32" y="56" width="400" height="66"/><text class="t" x="46" y="82">Capstone page</text><text class="s" x="46" y="102">guides · Start lab (Codespaces) · Run locally · lab token · import report</text>
  <rect id="comp-model" fill="#e5e7eb" stroke="#9ca3af" stroke-width="1.2" rx="10" x="32" y="142" width="400" height="66"/><text class="t" x="46" y="168">Model proxy /api/lab/model</text><text class="s" x="46" y="188">lab-token auth · Bedrock-id mapping · embeddings route</text>
  <rect id="comp-safety" fill="#e5e7eb" stroke="#9ca3af" stroke-width="1.2" rx="10" x="32" y="228" width="400" height="66"/><text class="t" x="46" y="254">Ledger and caps</text><text class="s" x="46" y="274">USD per call · daily cap · monthly ceiling · rate limit · spend view</text>

  <rect id="comp-devbox" fill="#e5e7eb" stroke="#9ca3af" stroke-width="1.2" rx="10" x="520" y="56" width="408" height="66"/><text class="t" x="534" y="82">devcontainer (lab repo)</text><text class="s" x="534" y="102">VS Code · Docker-in-Docker · aws CLI · Terraform · m4ai-lab</text>
  <rect id="comp-floci" fill="#e5e7eb" stroke="#9ca3af" stroke-width="1.2" rx="10" x="520" y="142" width="408" height="66"/><text class="t" x="534" y="168">Floci (pinned)</text><text class="s" x="534" y="188">S3 · S3 Vectors · Lambda · API GW · Cognito · DynamoDB · Logs</text>
  <rect id="comp-grader" fill="#e5e7eb" stroke="#9ca3af" stroke-width="1.2" rx="10" x="520" y="228" width="196" height="66"/><text class="t" x="534" y="254">Grader CLI</text><text class="s" x="534" y="274">self-checked report</text>
  <rect id="comp-content" fill="#e5e7eb" stroke="#9ca3af" stroke-width="1.2" rx="10" x="732" y="228" width="196" height="66"/><text class="t" x="746" y="254">Capstone 08</text><text class="s" x="746" y="274">6 stages · golden set</text>

  <rect id="comp-pilot" fill="#e5e7eb" stroke="#9ca3af" stroke-width="1.2" rx="10" x="12" y="380" width="936" height="50"/><text class="t" x="26" y="410">Decisions · reviews · spike go/no-go · pilot</text>

  <path class="ln" d="M520 175 L432 175"/>
  <path class="ln" d="M618 294 C618 330 300 330 232 122"/>
  <path class="ln" d="M432 89 L520 89"/>
  <path class="ln" d="M232 208 L232 228"/>
</svg>

| Key | Component | Phase(s) |
|---|---|---|
| app | capstone page on math.wntap.org | L5 |
| model | model proxy + embeddings route | L1, L4 |
| safety | ledger, caps, spend view | L4, L6 |
| devbox | devcontainer + lab repo | L3 |
| floci | Floci services the capstone needs | L1 |
| grader | grader CLI + proof | L2 |
| content | capstone 08 Floci edition | L2 |
| pilot | decisions, reviews, go/no-go, pilot | L0, L1, L7 |
