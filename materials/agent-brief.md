# Agent brief - shared by every fan-out page of learn-fine-tuning-slm-with-phoebe

You are writing ONE static HTML session page. No servers, no npm. **If your target file already
exists on disk, do not write it; report that and stop.** Write the file, return its path and one
line of coverage. No HTML in your reply.

## Read first, in this order

1. The template page. Copy its structure, classes, SVG grammar and quiz markup EXACTLY, including
   how many options each question has (4):
   `/Users/phoebe.fu/Documents/Claude_Work/github_repo/learn-fine-tuning-slm-with-phoebe/courses/01-the-decision-ladder.html`
2. The source map: every verified number, its evidence tier, per-session coverage, the seams. Use
   ONLY its numbers; never invent a statistic; if a fact is missing, teach the uncertainty.
   `/Users/phoebe.fu/Documents/Claude_Work/github_repo/learn-fine-tuning-slm-with-phoebe/materials/official-course-map.md`
3. The stylesheet `:root` block (first 30 lines) for the palette tokens:
   `/Users/phoebe.fu/Documents/Claude_Work/github_repo/learn-fine-tuning-slm-with-phoebe/assets/style.css`

## Page skeleton (keep every component)

toolbar (crumb EXACTLY "learn-fine-tuning-slm-with-phoebe / Session N of 6", #toggle-all, #zoom-toggle) ·
masthead (eyebrow "Learn Fine-tuning and Small Language Models with Phoebe · Session N of 6", h1 with
one `<span class="accent">`, .sub, .chip-row with the level chip (🟡 Core for sessions 2-3, 🟠 Deeper
for sessions 4-5) + two `.chip.audience` + `.chip.time` "45 min", .agenda a1-a4 with flex weights 1/4/5/1)
· main.wrap · section#intro (Part 0: kicker, .lede that opens "Constructed Larkline example.", .legend
pills as in the template, .callout.win "★ What you walk out with tonight.") · 3 Parts, each
`section.section#part-N` with section-kicker (klabel "Part N · covers ...", h2, `.tag.concept "5 min live"`),
a `.lede`, ONE figure, two or three `details.card` accordions (summary: `.mode.live` or `.mode.self`,
title, `.mini`, `.caret ▶`), at least one `.callout.example` with `span.ex-pill` "Real world" on the
page · section#demo-1 Build-along (kicker klabel "Build-along", `.tag.demo "★ 22 min · everyone builds"`,
.lede, ONE figure, `.steps > .step`, each `p` then a `.prompt-box.good` carrying a `span.label`
"★ Step N · ...") · section#exercise Homework (ol, 4 items, `.tag.exercise "30 min"`) · section#quiz
(3 x `.quiz-q data-answer="0-based"`, `p.qtext`, 4 x `button.qopt` "A · ...", `p.qwhy`; one
`p.quiz-score` after the last; vary the correct letter) · section#official, h2 EXACTLY "What this session
teaches, and where it came from", `.covered > .covered-row` (pill solid ✓ / light ◐ + name + note), then
the `.mono` line EXACTLY "Every fact on this page, and its verification tier, is recorded in the course's
source map." · section.cheat#cheatsheet (h3 "Session N cheat sheet <span>· pin this</span>", .grid-2 of
six .cheat-item) · `.callout.next` with `.nx-pill` "Next session" · footer.pagefoot ·
`<script src="../assets/app.js?v=1"></script>`.

Head: the template's social meta block with this page's own title/description/url;
`<title>Session N · <Title> - learn fine-tuning slm with phoebe</title>`;
`<link rel="stylesheet" href="../assets/style.css?v=2">`. Nothing else external.

First `details.card` in Part 1 is `open`; no other. Sentence case headings. Warm practitioner voice for
builders, concrete, never dry. Inside prompt-boxes escape `&` `<` `>`. 450 to 650 lines is guidance about
depth, never a target: never collapse whitespace, dissolve a list into a paragraph, or drop a component.

## Hard rules (a violation is rework)

- NEVER an em dash or en dash, anywhere (prose, code, aria-labels, comments). Hyphen only. Ranges: "50-100" or "50 to 100".
- No meta text: never "this course", "in this course", "the course teaches", "banned here". State the
  professional norm directly with its reason. The two exact estate phrases above are the only
  self-references; "session 5" cross-references are fine.
- Attribution "by Phoebe Fu". Never "built with" a tool.
- Every number comes from the source map or is labelled constructed. For constructed data print "your
  numbers will differ", never invented outputs as if run. Do not invent training logs, loss values,
  benchmark scores or GPU timings.
- Contested or missing evidence: teach the disagreement; never resolve what the literature has not.
  Attribute "50-100 examples" to OpenAI's guide every time.
- Citations as "Author et al. YEAR" with the arXiv id where the map gives one; anything marked [R] in the map is "reported".
- Prices and versions: say "list price read 2026-11-08, re-verify" whenever a price appears.
- NEVER "lottery" or "lotteries". English words only.
- Titles, widget ids and class names must not collide with siblings. Banned h1/title strings: "The data
  is the model", "Proving it", "Fine-tune your own Hermes", any "ladder" title other than session 1's.
- Do not reteach RAG internals, eval tooling depth or production monitoring: link the seams in the map
  with absolute https URLs.
- Running case is ALWAYS labelled "Constructed Larkline example" (Larkline insurer, Priya the ML engineer,
  Tom the claims operations lead). Never any real employer or client.

## Figure grammar (hand-drawn, every figure)

Palette, ONLY these hexes (no invented greys): `#645F0C` accent · `#3F3C06` deep · `#55510A` mid ·
`#E8DE8C` soft · `#FBF7DC` accent-50 tint · `#23210E` ink · `#5E5A44` muted · `#D6D0AE` faint ·
`#ECE7CF` hairline · `#1F4A7C` contrast (ink blue) · `#16355A` contrast-ink · `#FFF5C4` contrast tint ·
`#F5D63D` lab yellow (fill only, ink text on it) · `#FFFFFF` · universal reds `#991B1B` `#FEF2F2`
`#FCA5A5` only for a wrong-way panel.

- `<figure class="zoomable">` > `<svg viewBox="0 0 880 H" xmlns="http://www.w3.org/2000/svg" role="img"
  aria-label="the data, not the shape">` > `<defs>` + `<style>` + content, then
  `<figcaption>🔍 Click to zoom - takeaway</figcaption>`. Grow H, never W.
- Prefix unique per figure, used for every class and id: `fNx` where N is the session number and x is
  a, b, c, d in page order (session 2: f2a, f2b, f2c, f2d).
- `<defs>` holds with prefix P: a wobble filter `id="PSk"` (`feTurbulence type="fractalNoise"
  baseFrequency="0.02" numOctaves="2" seed="<int>"` + `feDisplacementMap scale="2.4"
  xChannelSelector="R" yChannelSelector="G"`, `x="-3%" y="-3%" width="106%" height="106%"`), a hachure
  pattern `id="PHc"` (7x7 userSpaceOnUse, rotate(-38), one #645F0C line, opacity .5) when used, an open
  arrowhead marker `id="PAr"` (path `M1 1 L9 5 L1 9`, fill none, stroke #23210E 1.6). ALL shapes sit
  inside ONE `<g filter="url(#PSk)" fill="none" stroke="#23210E" stroke-width="2" stroke-linecap="round"
  stroke-linejoin="round">`; rects carry a tiny rotation (-4 to 4 degrees for hand-placed items, under 1
  for panels). Fills: white, #FBF7DC, the hachure for "the pile" or "the data", and #FFF5C4 with a
  #1F4A7C stroke ONLY for the one thing the figure is about. One doodle anchor per figure at most,
  simple strokes, never a mascot. Text classes exactly as the template: `.PH` 800 12px #23210E heading ·
  `.PL` 600 12px #23210E label · `.PS` 400 11px #5E5A44 · `.PB` 800 11px #16355A · `.PV` 800 16-20px
  #3F3C06 value · `.PA` 700 11px #645F0C axis caption · `.PN` 400 12px #5E5A44 note.
  Never put text on the hachure. Hand-stacked items must not overlap as painted rects (the gate flags it);
  never draw a rect inside or overlapping another rect unless the inner one is fully contained.
- ALL `<text>` outside the filtered group, never below 10.5px.
- Fit: max chars ≈ (box width - 20) / 7 at 12px, 6.4px/char at 11px; full-width note under 110 chars;
  40px between neighbouring point labels; bottom note 22px below the last row, H clears it by 8px. No
  line, arrow or curve may cross a label. When in doubt, shorten.
- Floor: one figure per Part plus one in the build-along. Draw the MECHANISM (what flows where, what
  changes, what is frozen), never a metaphor literally, never decoration.

## Voice and honesty

Every Part gets a real-world story from the map's sources (model cards, papers, vendor docs, the
Banking77 leakage finding). Constructed cases say "Constructed Larkline example" on the page.
Bench numbers (session 6) may be quoted only exactly as the map's canon tables give them.

## Cross-links (absolute URLs, from the map's Seams section)

- RAG: https://phoebefu6.github.io/learn-rag-with-phoebe/courses/a1-what-rag-is.html
- Prompting: https://phoebefu6.github.io/learn-prompt-engineering-with-phoebe/courses/b2-core-techniques.html
- Evals: https://phoebefu6.github.io/learn-ai-evals-with-phoebe/courses/b2-golden-set.html , .../b5-llm-as-judge.html , .../b8-regression-suites.html
- Hermes fine-tune walk-through: https://phoebefu6.github.io/learn-hermes-ai-with-phoebe/courses/94-fine-tune-your-own.html
- Hub: https://phoebefu6.github.io/learn-with-phoebe/

## Footer chain and session titles

Footer left: "Session N of 6 · learn-fine-tuning-slm-with-phoebe · by Phoebe Fu &nbsp;·&nbsp; 📚 <a href="https://phoebefu6.github.io/learn-with-phoebe/">Learn with Phoebe ↗</a>"
Footer right: `<a href="0(N-1)-....html">← Prev: <short title></a> &nbsp;·&nbsp; <a href="0(N+1)-....html">Next: <short title> →</a>`

Session titles (exact, h1 carries one accent span):
1. 01-the-decision-ladder.html · Prompt, RAG or fine-tune? The decision ladder
2. 02-small-models-trade-offs.html · Small language models: what you give up, what you get back
3. 03-building-the-training-set.html · The training set: where a tune is won or lost
4. 04-lora-and-qlora.html · LoRA and QLoRA without the maths fear
5. 05-evals-before-and-after.html · Evals before and after the tune
6. 06-the-break-even-bench.html · The break-even bench: cost, serving and drift
