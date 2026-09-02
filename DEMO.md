---
marp: true
theme: default
paginate: true
size: 16:9
style: |
  section {
    font-family: 'Inter', -apple-system, 'Segoe UI', sans-serif;
    background: #ffffff;
    color: #0f172a;
    padding: 60px 70px;
  }
  h1 { color: #0b1524; font-size: 46px; letter-spacing: -0.02em; }
  h2 { color: #1d4ed8; font-size: 34px; letter-spacing: -0.01em; }
  h3 { color: #334155; font-size: 24px; }
  strong { color: #1d4ed8; }
  table { font-size: 22px; }
  th { background: #f6f8fb; color: #334155; text-align: left; }
  code { background: #eff6ff; color: #1d4ed8; }
  .lead { font-size: 30px; color: #64748b; }
  .big { font-size: 84px; font-weight: 800; color: #1d4ed8; letter-spacing: -0.03em; }
  .cite { font-size: 16px; color: #94a3b8; }
  section.title { background: #0b1524; color: #ffffff; }
  section.title h1 { color: #ffffff; font-size: 58px; }
  section.title .lead { color: #94a3b8; }
---

<!-- _class: title -->

# AI Cost Estimator

<span class="lead">What our prompts actually cost — and where the money goes</span>

<br>

<span class="cite">Internal demo</span>

<!--
SPEAKER NOTES

Open here. One sentence: "We're spending on AI, and almost nobody in the
engineering org can tell you what a single request costs. I built a tool
that answers that, and it found some things worth acting on."

Don't open the app yet. Set up the problem first.
-->

---

## The problem

We can see the **monthly invoice**.

We cannot see:

- What a single request costs
- Which part of the request drives that cost
- What we'd save by changing it

<br>

<span class="lead">Cost decisions are being made at design time, by people with no cost feedback.</span>

<!--
SPEAKER NOTES

Keep this short — 20 seconds. The point is the gap between an invoice and
a decision. An invoice tells you what happened. It doesn't tell an engineer
choosing max_tokens what that choice is worth.

Avoid blame framing. Nobody hid this; the tooling just didn't exist.
-->

---

## What the tool does

Paste a prompt → see tokens, cost, and where it goes

- Real tokenizer, not an estimate (OpenAI models)
- **18 models** across OpenAI, Azure, Anthropic, Google, Cohere, Voyage
- Embedding **and** generation models, priced correctly for each
- Analyses the **system prompt separately** — it's billed on every call
- Quantifies what each optimisation would save

<br>

<span class="cite">No API is called — all figures are computed locally from provider list prices.</span>

<!--
SPEAKER NOTES

Mention the last line out loud. Someone will ask "is this hitting our
production keys?" — answer it before they ask.

If asked how token counts are obtained: we run OpenAI's actual cl100k_base
BPE tokenizer locally. For other providers we approximate and the UI
labels those as approximate.
-->

---

## Demo 1 — What a prompt costs

<span class="lead">Live: paste a real test-generation prompt</span>

<br>

| | |
|---|---|
| System prompt | sent on **every** request |
| User prompt | the feature description |
| Response | the generated test script |

<!--
SPEAKER NOTES — LIVE DEMO

1. App is already open on Claude Sonnet 4.5
2. Paste your real system prompt into "System prompt"
3. Paste a feature description into "User prompt"
4. Set Response length to 2,500 (realistic for a test script)
5. Click "Analyze prompt"

Point at the three KPI cards: Input tokens, Output tokens, Cost per request.

Say: "Nineteen tokens of question. Two and a half thousand tokens of answer."

Then pause. Let them look at it before you move on.

OPTIONAL: click "Prompt tips" to show the system prompt priced separately.
Useful if someone asks "shouldn't we be optimising our prompts?" — the tool
puts a monthly figure on that prompt, and it is usually small.
-->

---

## The finding

<div class="big">99%</div>

<span class="lead">of generation spend is the <strong>response</strong>, not the prompt</span>

<br>

| | Tokens | Cost | Share |
|---|---|---|---|
| Input — prompt | 126 | $0.00038 | 0.7% |
| **Output — response** | **2,500** | **$0.037** | **99.3%** |

<span class="cite">Claude Sonnet 4.5 · $3 in / $15 out per 1M tokens</span>

<!--
SPEAKER NOTES

This is the slide that changes the conversation. Deliver it slowly.

"Every prompt-engineering effort we've run has been optimising 0.7% of
the bill."

Why output costs 5x: input is processed in one pass; output is generated
one token at a time, each requiring another pass through the model. The
pricing reflects real compute, it isn't arbitrary.

Expect a question here: "so should we stop optimising prompts?" Answer:
for generation, largely yes — control response length instead.
-->

---

## Model choice is worth 190×

| Model | In / Out per 1M | Monthly @ 10k |
|---|---|---|
| Gemini 2.0 Flash | $0.10 / $0.40 | **$10** |
| GPT-4o mini | $0.15 / $0.60 | $15 |
| Claude Haiku 4.5 | $1 / $5 | $63 |
| GPT-4o | $2.50 / $10 | $250 |
| Claude Sonnet 4.5 | $3 / $15 | $379 |
| Claude Opus 4.1 | $15 / $75 | $1,880 |

<span class="cite">Identical prompt, identical 2,500-token response. List prices.</span>

<!--
SPEAKER NOTES

Be honest here — this is a cost table, not a quality table. Opus is not
188x worse than Gemini Flash; for hard problems it is genuinely better.

The argument is NOT "move everything to the cheapest model." It is
"we currently send everything to one model regardless of difficulty."

If someone pushes back: agree with them. That's the right instinct, and
it leads directly to the next slide.
-->

---

## Demo 2 — What we'd save

<span class="lead">Live: the Reduce cost tab</span>

| # | Change | Monthly | Trade-off |
|---|---|---|---|
| 1 | Current | $377 | — |
| 2 | Ban preamble | $321 | none |
| 3 | **Emit spec, template the code** | **$62** | **none** |
| 4 | Route simple cases to a cheap model | $2 | quality risk |
| 5 | Batch API | $1 | latency |

<!--
SPEAKER NOTES — LIVE DEMO

Click the "Reduce cost" tab. Walk down the rows.

Emphasise rows 2 and 3 — $377 to $62, an 84% cut with NO capability
trade-off. We simply stop paying a model to retype imports and page
objects that a template can produce for free.

Be openly sceptical of row 4 on their behalf: it assumes ALL traffic
routes to the cheapest model, which won't hold. The tool prints that
assumption on screen. Say so — it buys credibility for rows 2 and 3.

Then drag "Requests per month" to 200,000 and let the numbers move.
-->

---

## Recommendation

**Do now** — no quality risk

1. Emit a structured test spec; template the Playwright code
2. Cap `max_tokens` on every call
3. Ban preamble in the system prompt

**Evaluate next** — needs validation

4. Route routine cases to a cheaper model
5. Move generation to the Batch API

<!--
SPEAKER NOTES

Separate the two groups explicitly. The first three are engineering
hygiene we can start this sprint. The last two need an evaluation harness
before anyone commits.

If asked for a number: items 1-3 take a prompt change and a template.
Days, not weeks.
-->

---

## What I'd want next

- **Instrument production** — log tokens per request, not just latency
- **Track cost per test script**, not cost per token
- Alert on cost-per-unit drift, not just total spend
- Feed real output lengths back into this model

<br>

<span class="lead">Right now every number here is a well-grounded estimate. Instrumentation makes them measurements.</span>

<!--
SPEAKER NOTES

This is the ask. Small: add token logging to the generation service.

The business-unit point matters — "cost per test script" survives a
conversation with finance in a way "cost per token" never will, and it
makes regressions visible. If a prompt change moves us from $0.038 to
$0.061 per script, that shows up. A token count wouldn't.

If someone asks "what about prompt caching?" — the tool checks it and,
at our system prompt size, says it would save about $3/month. Worth
saying out loud: we looked at the popular answer and it wasn't the
right one for us.
-->

---

## Methodology and caveats

| | |
|---|---|
| Token counts — OpenAI / Azure | **Exact** — real cl100k_base tokenizer |
| Token counts — other providers | **Approximate** — different tokenizers |
| Prices | Provider **list** prices, editable in-app |
| Savings percentages | Planning heuristics, **not** measurements |
| API calls | **None** — computed locally |

<!--
SPEAKER NOTES

Do not skip this slide. Volunteering the limitations before anyone
probes them is what makes the rest of the numbers credible.

Specifically own: the 15% preamble figure and the 84% boilerplate figure
are estimates, not measurements from our system. They're directionally
right; instrumentation would sharpen them.

Also note prices change — verify before anyone builds a budget on this.
-->

---

<!-- _class: title -->

# Questions

<span class="lead">Output length is the lever. Model choice is the multiplier.</span>

<!--
SPEAKER NOTES

Closing line to land: "The prompt was never the expensive part."

LIKELY QUESTIONS

"Are these our real costs?" — List prices and estimated response lengths.
Directionally right; instrumentation would confirm.

"Why not just use the cheapest model?" — Because quality matters for
complex scripts. That's why routing is in "evaluate", not "do now".

"How long to implement?" — Items 1-3 are days.

"Does this work for RAG?" — Yes, the tool handles embedding models too.
Different economics: embedding a corpus is cents; querying it is the
recurring cost.

"Did you use our production keys?" — No. Nothing leaves the machine.
-->
