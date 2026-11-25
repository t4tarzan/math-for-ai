/**
 * The nine core equations (from the operator's "Math for AI Engineers Field Guide").
 * Each card: the formula, the intuition, where it bites in a real system, and a live lab
 * whose numbers come from the formula itself (see components/home/labs.tsx).
 */
export type PartId = 1 | 2 | 3;

export interface Equation {
  n: number;
  part: PartId;
  slug: string;
  title: string;
  useCase: string;
  tex: string;
  intuition: string;
  scenarioTitle: string;
  scenario: string;
  /** lesson in the course that teaches it (catalog id), when there is one */
  lessonId?: string;
  /** capstones (phase 19 catalog ids) that put it to work */
  capstones: { id: string; title: string }[];
}

export const PARTS: Record<PartId, { label: string; title: string; blurb: string }> = {
  1: {
    label: "Part I · Production foundations",
    title: "Classic ML on database rows",
    blurb: "Recommendations, fraud blocks and churn alerts straight from Postgres rows, with no GPU cluster.",
  },
  2: {
    label: "Part II · LLM inference",
    title: "What happens inside a model call",
    blurb: "Why tokens attend to each other, how sampling is shaped, and what actually fills your GPU memory.",
  },
  3: {
    label: "Part III · Agent harnesses",
    title: "Loops that plan, explore and survive",
    blurb: "The maths that decides whether a multi-step agent finishes the job or quietly falls apart.",
  },
};

export const EQUATIONS: Equation[] = [
  {
    n: 1,
    part: 1,
    slug: "cosine-similarity",
    title: "Cosine similarity",
    useCase: "Vector search & recommendations",
    tex: String.raw`\text{sim}(A,B)=\frac{A\cdot B}{\lVert A\rVert\,\lVert B\rVert}=\frac{\sum_{i} A_iB_i}{\sqrt{\sum_{i} A_i^2}\,\sqrt{\sum_{i} B_i^2}}`,
    intuition:
      "It measures the angle between two vectors, not the distance. A score of +1 means the same direction, 0 means unrelated, −1 means opposite. Magnitude drops out, so a power user with 200 purchases matches a newcomer with 4 if their taste points the same way.",
    scenarioTitle: "In your database",
    scenario:
      "Store each product as an embedding in Postgres with pgvector. When someone opens a laptop page, ORDER BY the cosine distance and you get semantic \"more like this\" results that a LIKE '%...%' query would never find.",
    lessonId: "01-linear-algebra-intuition",
    capstones: [{ id: "02-rag-over-codebase", title: "RAG over a codebase" }, { id: "65-hybrid-retrieval-bm25-dense", title: "Hybrid BM25 + dense retrieval" }, { id: "08-production-rag-chatbot", title: "Production RAG chatbot" }],
  },
  {
    n: 2,
    part: 1,
    slug: "bayes",
    title: "Bayes' theorem",
    useCase: "Spam filters, fraud & ticket triage",
    tex: String.raw`P(A\mid B)=\frac{P(B\mid A)\,P(A)}{P(B)}`,
    intuition:
      "An engine for updating a belief when evidence arrives. Start from the base rate (the prior), then weigh how much more often the signal shows up when the thing is true than when it is a false alarm.",
    scenarioTitle: "In your database",
    scenario:
      "Only 2% of checkouts in your orders table are fraud. A 3 a.m. order from a mismatched country with a throwaway email trips a signal that fraud shows 85% of the time and honest orders 4% of the time. The risk jumps from 2% to about 30%: enough for step-up verification, not an automatic block.",
    lessonId: "07-bayes-theorem",
    capstones: [{ id: "83-prompt-injection-detector", title: "Prompt-injection detector" }, { id: "85-content-classifier-integration", title: "Content classifier" }, { id: "11-llm-observability-dashboard", title: "LLM observability dashboard" }],
  },
  {
    n: 3,
    part: 1,
    slug: "sigmoid",
    title: "Logistic regression & the sigmoid",
    useCase: "Churn scoring, lead conversion, neural gates",
    tex: String.raw`\sigma(z)=\frac{1}{1+e^{-z}},\qquad z=w^{\top}x+b`,
    intuition:
      "A weighted sum of features can be any number. The sigmoid squashes it into a probability between 0 and 1, steep in the middle and flat at the ends, which is exactly how a confident yes or no should behave.",
    scenarioTitle: "In your database",
    scenario:
      "Days since last login, open support tickets and seats used become x. Fit w and b on last quarter's churned accounts and every customer row gets a churn probability your customer-success team can sort by.",
    lessonId: "03-logistic-regression",
    capstones: [{ id: "38-classifier-finetuning", title: "Classifier fine-tuning" }, { id: "66-reranker-cross-encoder", title: "Cross-encoder reranker" }, { id: "83-prompt-injection-detector", title: "Prompt-injection detector" }],
  },
  {
    n: 4,
    part: 2,
    slug: "attention",
    title: "Scaled dot-product attention",
    useCase: "How every token reads the others",
    tex: String.raw`\text{Attention}(Q,K,V)=\operatorname{softmax}\!\left(\frac{QK^{\top}}{\sqrt{d_k}}\right)V`,
    intuition:
      "Each token asks a question (its query), every token offers a label (its key), and the dot products decide how much of each token's content (its value) flows in. Dividing by the square root of the dimension keeps the scores from saturating the softmax.",
    scenarioTitle: "In production",
    scenario:
      "This is the quadratic part of a transformer: n tokens make n² scores. It is why long prompts cost more, why FlashAttention exists, and why a well-placed instruction near the question gets more weight than one buried mid-context.",
    lessonId: "02-self-attention-from-scratch",
    capstones: [{ id: "33-multihead-self-attention", title: "Multi-head self-attention" }, { id: "35-gpt-model-assembly", title: "Assemble a GPT" }, { id: "14-speculative-decoding-server", title: "Speculative-decoding server" }],
  },
  {
    n: 5,
    part: 2,
    slug: "softmax-temperature",
    title: "Softmax with temperature",
    useCase: "Token sampling & creativity control",
    tex: String.raw`P(x_i)=\frac{e^{z_i/T}}{\sum_{j=1}^{V} e^{z_j/T}}`,
    intuition:
      "Before writing each word the model scores every token in its vocabulary (the logits). Dividing by T before exponentiating reshapes the odds: a low T sharpens toward the top choice, a high T flattens the curve so long-shot tokens get picked.",
    scenarioTitle: "In production",
    scenario:
      "Set temperature near 0–0.2 for JSON, SQL and tool-call arguments, where one strange token breaks the parser. Raise it for brainstorming copy or synthetic test data, where variety is the point.",
    capstones: [{ id: "35-gpt-model-assembly", title: "Assemble a GPT" }, { id: "01-terminal-native-coding-agent", title: "Terminal coding agent" }, { id: "14-speculative-decoding-server", title: "Speculative-decoding server" }],
  },
  {
    n: 6,
    part: 2,
    slug: "kv-cache",
    title: "KV-cache memory",
    useCase: "Context length vs. GPU memory",
    tex: String.raw`\text{KV bytes}=2\cdot L\cdot H_{kv}\cdot d_{\text{head}}\cdot n_{\text{ctx}}\cdot b`,
    intuition:
      "To avoid recomputing attention for old tokens, the model keeps every layer's keys and values for every token in the context. That cache grows linearly with context length and often outweighs the model itself.",
    scenarioTitle: "In production",
    scenario:
      "An 8B model with 32 layers, 8 KV heads of size 128 in 16-bit holds 128 KiB per token: a full 128k-token context is 16 GiB per conversation. Grouped-query attention (fewer KV heads) is the reason that number is not four times larger.",
    lessonId: "12-kv-cache-flash-attention",
    capstones: [{ id: "14-speculative-decoding-server", title: "Speculative-decoding server" }, { id: "07-end-to-end-fine-tuning-pipeline", title: "Fine-tuning to serving pipeline" }, { id: "11-llm-observability-dashboard", title: "LLM observability dashboard" }],
  },
  {
    n: 7,
    part: 3,
    slug: "bellman",
    title: "Bellman value (discounted return)",
    useCase: "Agent planning & RL fine-tuning",
    tex: String.raw`V^{\pi}(s)=\mathbb{E}_{\pi}\!\left[\sum_{t=0}^{\infty}\gamma^{t}\,R(s_t,a_t)\right]`,
    intuition:
      "An agent in a loop should not grab the next token's reward. It should maximise the total reward of the whole trajectory, with future rewards discounted by γ each step. γ near 0 is short-sighted; γ near 1 values finishing the task.",
    scenarioTitle: "In an agent harness",
    scenario:
      "In RL-tuned coding models, reading files and running tests earn nothing; only the final passing test suite pays out. Discounting is what makes the policy prefer short, direct trajectories over endless tool calls.",
    lessonId: "01-mdps-states-actions-rewards",
    capstones: [{ id: "40-dpo-from-scratch", title: "DPO from scratch" }, { id: "01-terminal-native-coding-agent", title: "Terminal coding agent" }, { id: "16-github-issue-to-pr-agent", title: "Issue-to-PR agent" }],
  },
  {
    n: 8,
    part: 3,
    slug: "ucb1",
    title: "Upper confidence bound (UCB1)",
    useCase: "Tree search, routing & prompt bandits",
    tex: String.raw`\text{UCB}_i=\bar{x}_i+c\sqrt{\frac{\ln N}{n_i}}`,
    intuition:
      "Optimism in the face of uncertainty. Keep using what has worked (exploitation) but add a bonus for options you have barely tried (exploration). The bonus shrinks as an option gets tried, so search never wastes compute forever.",
    scenarioTitle: "In an agent harness",
    scenario:
      "When a harness runs tree search over fixes, or routes traffic across prompts and model providers, UCB1 balances the proven winner against a promising newcomer that has only been tried twice.",
    capstones: [{ id: "05-autonomous-research-agent", title: "Autonomous research agent" }, { id: "56-iteration-scheduler", title: "Iteration scheduler" }, { id: "10-multi-agent-software-team", title: "Multi-agent software team" }],
  },
  {
    n: 9,
    part: 3,
    slug: "reliability-decay",
    title: "Compound reliability",
    useCase: "Why long agent loops fail",
    tex: String.raw`P(\text{workflow succeeds})=p^{N}`,
    intuition:
      "If each step of an agent succeeds with probability p and the steps are independent, an N-step workflow succeeds with p to the power N. Small per-step error rates compound fast.",
    scenarioTitle: "In an agent harness",
    scenario:
      "A 95%-reliable step sounds great until a task needs 15 of them: 46% end-to-end. Verifiers, retries and checkpoints exist to lift the effective p of each step, which is where most real harness engineering goes.",
    capstones: [{ id: "25-verification-gates-observation-budget", title: "Verification gates" }, { id: "29-end-to-end-coding-task-demo", title: "End-to-end coding agent" }, { id: "16-github-issue-to-pr-agent", title: "Issue-to-PR agent" }],
  },
];
