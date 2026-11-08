# learn-fine-tuning-slm-with-phoebe - official course map (source map)

Internal build document. Never linked from an audience page. Built 2026-11-08 by the course lead.
Bucket `ai`, single-track 6 sessions x 45 min, audience: builders (engineers, data scientists, technical
PMs) who already prompt and maybe run RAG, and are asked "should we fine-tune / go smaller?".

**Fast-moving tooling: re-verify the changelog before delivery.** Every tool, model, version and price
fact below is dated 2026-11-08 and carries "re-verify" by default.

Evidence tiers: **[S] read at source** (fetched and read on 2026-11-08) · **[R] reported** (secondary,
or a primary we did not read in full) · **[C] constructed** (invented for teaching, labelled on the page) ·
**[M] modelled** (computed by a stated rule, labelled on the widget).

## Session titles (locked, sibling h1s grepped 2026-11-08)

| # | File | Title | Diff |
|---|------|-------|------|
| 1 | courses/01-the-decision-ladder.html | Prompt, RAG or fine-tune? The decision ladder | foundations |
| 2 | courses/02-small-models-trade-offs.html | Small language models: what you give up, what you get back | core |
| 3 | courses/03-building-the-training-set.html | The training set: where a tune is won or lost | core |
| 4 | courses/04-lora-and-qlora.html | LoRA and QLoRA without the maths fear | deeper |
| 5 | courses/05-evals-before-and-after.html | Evals before and after the tune | deeper |
| 6 | courses/06-the-break-even-bench.html | The break-even bench: cost, serving and drift | bench night |

Collisions avoided: "The data is the model, the algorithm is the easy part" (an estate h1) so session 3 is
not "Data is the model"; "Proving it: ..." is used twice in the estate, so session 5 drops it.
"Fine-tune your own Hermes" is learn-hermes-ai 94 (consistent with ours: LoRA nudge, 100-500 examples
as its own advice, keep the stock model beside the tune).

## Running case [C]

**Larkline** (constructed; grepped: no collision in github_repo), a fictional mid-size insurer's claims
desk. Its claim-triage prompt routes each incoming claim note to one of six queues, one of which is the
urgent queue, on a big general API model. Slow and costly at volume. Question across the course: should
Larkline fine-tune a small model? Every page labels it "Constructed Larkline example". Larkline's people:
Priya (ML engineer), Tom (claims operations lead), constructed. Larkline's volume: 900,000 routed
messages a month (claim notes, portal messages, call summaries), constructed.

**Real rows standing in for Larkline's notes:** Banking77 customer messages, mapped to six queues
(below). The bench says plainly that banking messages stand in for claim notes.

## The bench data [S + M]

- **Banking77** [S]: PolyAI, github.com/PolyAI-LDN/task-specific-datasets, `banking_data/train.csv` and
  `test.csv`. Licence file in the repo: Creative Commons Attribution 4.0 International (read). README: train
  10,003 examples, test 3,080, 77 intents (read). Citation: Casanueva, Temcinas, Gerz, Henderson, Vulic,
  "Efficient Intent Detection with Dual Sentence Encoders", ACL 2020 NLP4ConvAI workshop, arXiv:2003.04807.
  Abstract (read): dataset of 13,083 annotated examples over 77 intents; their dual-encoder detectors beat
  fine-tuning full BERT-Large; gains largest with 10 or 30 examples per intent; train in minutes on a CPU.
  No accuracy number is quoted from the abstract.
- **Sample:** 600 test rows, seed 20261108, text unchanged; queue support 57 / 141 / 89 / 136 / 104 / 73.
- **Queues:** 0 Fraud and loss (urgent: lost_or_stolen_card, lost_or_stolen_phone, compromised_card,
  card_payment_not_recognised, cash_withdrawal_not_recognised, direct_debit_payment_not_recognised,
  card_swallowed), 1 Cards (20 intents), 2 Transfers (11), 3 Top-ups and cash (17), 4 Payments and fees
  (13), 5 Account and identity (9). Full mapping in assets/ftn-sample.js (`intentQueue`).
- **Computed facts on the full splits (for session 3)** [S, computed by materials/build-ftn-sample.py]:
  train 10,003 rows; 4 exact duplicate texts inside train (4 after lower-case and whitespace
  normalisation too); **7 test texts also appear verbatim in train** (normalised) - a real leakage example;
  train rows per intent range from 35 to 187 (test is balanced, 40 each); train per queue
  860 / 2,237 / 1,581 / 2,336 / 1,976 / 1,013.
- **Predictions [M]:** three arms, each a seeded draw per row: correct with the arm's per-queue probability,
  else a neighbouring queue by fixed weights (materials/build-ftn-sample.py, `ARMS`, `CONFUSE`). Not
  produced by any model. Labelled "modelled predictions" on every number.
  Big API model + prompt p = .95 .93 .90 .91 .86 .92; small prompt-only p = .80 .78 .74 .76 .66 .75;
  small LoRA-tuned p = .86 .97 .95 .96 .93 .96 (the tuned arm is deliberately weaker on the rare urgent
  queue: the per-class lesson). Only the ORDERING is a claim about the world, and only as "typical shape".

## Canon numbers (python == node, 253 values, relative tolerance 1e-9; planted 0.1% fault fails)

Run: `python3 materials/ftn_reference.py assets/ftn-sample.js` vs `node materials/ftn-node.js .`, compared
by `materials/compare-ladder.py`. Frozen in materials/canon.json. Widget prints (exact strings):

| Arm | Accuracy | Correct | Macro-F1 | Fraud and loss recall | Weakest queue |
|---|---|---|---|---|---|
| Big API model + prompt | 91.0% | 546 of 600 | 0.910 | 98.2% | Payments and fees 81.7% |
| Small model, prompt only | 74.2% | 445 | 0.736 | 86.0% | Payments and fees 63.5% |
| Small model, LoRA-tuned | 94.3% | 566 | 0.936 | 84.2% | Fraud and loss 84.2% |

Per-queue recall (Fraud, Cards, Transfers, Top-ups, Payments, Account):
big 98.2 92.9 93.3 88.2 81.7 97.3 · base 86.0 77.3 71.9 77.2 63.5 71.2 · tuned 84.2 97.9 93.3 97.1 94.2 91.8.

Break-even defaults: 900,000 requests/month; big model 600 input + 20 output tokens per request; gpt-4.1
$2.00 / $8.00 per 1M; small: 1 x L4 at $0.80/h x 730 h x 1 replica; training 2,000 examples x 150 tokens x
3 epochs at $0.34 per 1M, $4.00 minimum; one-off build $6,000 [C] amortised 12 months; retrain people cost
$600 a month [C]; floor 92% on accuracy; latency placeholders 900 / 180 ms [C, label "vendor-reported input"].

| Scenario | Big / month | Small / month | Break-even volume | Per 1,000 big / small | Verdict |
|---|---|---|---|---|---|
| Default | $1,224 | $1,084 | 797,304 | $1.36 / $1.20 | GO |
| Retrain every month (break) | $1,224 | $1,688 | 1,241,422 | $1.36 / $1.88 | NO-GO (cost) |
| Floor on fraud and loss recall, 92% | $1,224 | $1,084 | 797,304 | | NO-GO (84.2% under floor) |
| Same, "cheapest wins" (anti-lever) | | | | | GO, flagged "the floor would refuse" |
| Floor 96% on accuracy | | | | | NO-GO; cheapest wins prints GO |
| gpt-5 preset | $855 | $1,084 | 1,141,404 | $0.95 / $1.20 | NO-GO (cost) |
| gpt-5-mini preset | $171 | $1,084 | 5,707,018 | $0.19 / $1.20 | NO-GO (cost) |
| 300,000 requests | $408 | $1,084 | 797,304 | $1.36 / $3.61 | NO-GO (cost) |

One training run costs $4.00 (the minimum charge; the token cost is $0.31). Lesson: compute is the small
line; hosting and people are the big ones. Note on gpt-5: reasoning models also bill reasoning tokens as
output, so 20 output tokens is a floor, not an estimate [R: general vendor behaviour; teach as "check"].

## Prices [S, vendor list price, read 2026-11-08, re-verify]

- OpenAI API pricing (developers.openai.com/api/docs/pricing; platform.openai.com/docs/pricing redirects
  there), standard tier per 1M tokens, input / cached / output: gpt-5 $1.25 / $0.125 / $10.00; gpt-5-mini
  $0.25 / $0.025 / $2.00; gpt-5-nano $0.05 / $0.005 / $0.40; gpt-4.1 $2.00 / $0.50 / $8.00; gpt-4.1-mini
  $0.40 / $0.10 / $1.60; gpt-4o-mini $0.15 / $0.075 / $0.60. The page also lists newer GPT-5.x and GPT-6
  families; we use only the three presets above.
- OpenAI fine-tuning prices (same page), training per 1M tokens: gpt-4.1 $25.00, gpt-4.1-mini $5.00,
  gpt-4o-mini $3.00; fine-tuned gpt-4.1-mini inference $0.80 in / $3.20 out. **The page says OpenAI is
  winding down its fine-tuning platform.**
- Together AI pricing (together.ai/pricing): supervised fine-tuning $0.34 per 1M tokens for Llama 3.1 8B
  and Qwen3.5 0.8B-9B, minimum charge $4.00; 27B-31B class $1.05. A second table on the page shows $0.38
  for Llama 3.1 8B without saying which tier applies [S, ambiguity noted]. Dedicated H100 $5.49 per GPU-hour.
  Serverless Qwen3.5 9B $0.17 in / $0.25 out per 1M.
- Hugging Face Inference Endpoints (huggingface.co/pricing), per hour, AWS: T4 14GB $0.50; L4 24GB $0.80;
  L40S 48GB $1.80; A100 80GB $2.50; H100 80GB $4.50.

## Sources read at source [S] (citation appendix; cite in this form)

1. Hu et al. 2021, "LoRA: Low-Rank Adaptation of Large Language Models", arXiv:2106.09685 (v2 Oct 2021).
   Abstract: freezes pre-trained weights, injects trainable rank decomposition matrices into each layer;
   vs GPT-3 175B fine-tuned with Adam, reduces trainable parameters by 10,000 times and GPU memory by 3
   times; on-par or better quality on RoBERTa, DeBERTa, GPT-2, GPT-3; no additional inference latency
   (unlike adapters).
2. Dettmers et al. 2023, "QLoRA: Efficient Finetuning of Quantized LLMs", arXiv:2305.14314. Abstract:
   finetune a 65B model on a single 48GB GPU preserving 16-bit task performance; 4-bit NormalFloat (NF4),
   double quantization, paged optimizers; Guanaco reaches 99.3% of ChatGPT's level on the Vicuna benchmark
   after 24 hours of finetuning on a single GPU. Teach: one benchmark, judged as the paper did; not "a 4-bit
   model equals ChatGPT".
3. Hugging Face PEFT LoraConfig reference (huggingface.co/docs/peft/main/en/package_reference/lora):
   `r` "Lora attention dimension (the rank)", default 8; `lora_alpha` default 8; `target_modules` default
   None (chosen by architecture; 'all-linear' targets all linear layers except the output layer);
   `lora_dropout` default 0.0; `bias` default 'none'; `use_rslora` default False (when True, scaling is
   lora_alpha/sqrt(r), otherwise lora_alpha/r); `init_lora_weights` default True: B initialised to 0 so the
   untrained adapter is a no-op.
4. Hugging Face TRL SFTTrainer docs (huggingface.co/docs/trl/sft_trainer, v1.17.1): accepts language
   modeling and prompt-completion datasets, standard or conversational (`messages` with roles); for
   prompt-completion datasets loss is on the completion only by default; `assistant_only_loss=True` for
   conversational; PEFT via `peft_config=LoraConfig()`; tip: adapters typically use a higher learning
   rate (about 1e-4); SFTConfig default learning_rate 2e-5, num_train_epochs 3.0, max_length 1024,
   gradient_checkpointing True.
5. OpenAI supervised fine-tuning guide (developers.openai.com/api/docs/guides/supervised-fine-tuning):
   minimum 10 examples; "We see improvements from fine-tuning on 50-100 examples" (the page uses an en
   dash; we write a hyphen); "We recommend starting with 50 well-crafted demonstrations"; "Only invest in
   fine-tuning after setting up evals."; "If 50 examples have no impact, rethink your task or prompt
   before adding training data."; JSONL chat format with a `messages` array; holdout set carved from the
   same collected data with the same diversity; no fixed split ratio given; models listed gpt-4.1,
   gpt-4.1-mini, gpt-4.1-nano (2025-04-14); **"The platform is no longer accessible to new users";
   eligible existing customers can create jobs until January 6, 2027.**
6. Unsloth requirements (unsloth.ai/docs/get-started/beginner-start-here/unsloth-requirements;
   docs.unsloth.ai redirects): minimum VRAM, QLoRA 4-bit / LoRA 16-bit: 3B 3.5 GB / 8 GB; 7B 5 / 19;
   8B 6 / 22; 14B 8.5 / 33; 32B 26 / 76; 70B 41 / 164. "these numbers are the absolute minimum"; batch
   size 1-3 to use less VRAM. TRL docs report Unsloth "up to 2x faster with up to 70% less VRAM" [R:
   vendor claim, quoted by TRL].
7. DeepLearning.AI short course "Finetuning Large Language Models", Sharon Zhou, with Lamini, 1h35m:
   lessons Why finetune, Where finetuning fits in, Instruction finetuning, Data preparation, Training
   process, Evaluation and iteration. Certificates and videos stay official; we teach the shared core.
8. Model cards (Hugging Face, read 2026-11-08):
   - meta-llama/Llama-3.2-3B-Instruct: 3.21B; 128k context (quantized variants 8k); released Sept 25,
     2024; Llama 3.2 Community License (open weights, not an OSI open-source licence); 8 officially
     supported languages; pretraining data cutoff December 2023; quantized variants use 4-bit groupwise
     weights (group 32) with SpinQuant/GPTQ, and a QAT + LoRA variant.
   - Qwen/Qwen3-4B: 4.0B (3.6B non-embedding); 36 layers; GQA 32 Q / 8 KV heads; 32,768 context
     natively, 131,072 with YaRN; Apache 2.0; thinking mode on by default, non-thinking mode available.
   - microsoft/Phi-4-mini-instruct: 3.8B; 128K context; MIT; February 2025; vocabulary 200,064; data
     cutoff June 2024; 23 listed languages; card: "The model simply does not have the capacity to store
     too much factual knowledge" and suggests pairing it with search / RAG.
9. Ovadia et al. 2023, "Fine-Tuning or Retrieval? Comparing Knowledge Injection in LLMs",
   arXiv:2312.05934: unsupervised fine-tuning gives some improvement but RAG consistently outperforms it,
   for existing and new knowledge; LLMs struggle to learn new facts through unsupervised fine-tuning;
   many paraphrases of a fact may help.
10. Gekhman et al. 2024, "Does Fine-Tuning LLMs on New Knowledge Encourage Hallucinations?",
   arXiv:2405.05904: examples with new knowledge are learned significantly slower; once learned they
   linearly increase the tendency to hallucinate; LLMs mostly acquire facts in pre-training.
11. Zhou et al. 2023, "LIMA: Less Is More for Alignment", arXiv:2305.11206: fine-tuned on only 1,000
   carefully curated prompts and responses; almost all knowledge is learned during pretraining.
   ("Superficial alignment hypothesis" is the paper's name for this idea [R: phrase not in abstract].)
12. Zhao et al. 2024, "LoRA Land: 310 Fine-tuned LLMs that Rival GPT-4, A Technical Report",
   arXiv:2405.00732: 310 models, 10 base models, 31 tasks; 4-bit LoRA fine-tuned models outperform base
   models by 34 points and GPT-4 by 10 points on average. Authors are Predibase staff [R: affiliation not
   on the abstract page]. Teach: task-specific, the authors' own benchmark set, an average.
13. Biderman et al. 2024, "LoRA Learns Less and Forgets Less", arXiv:2405.09673: on code and maths, LoRA
   substantially underperforms full finetuning in standard low-rank settings, but better maintains
   performance outside the target domain; full finetuning learns perturbations of rank 10-100x higher.
14. Bertsch et al. 2024, "In-Context Learning with Long-Context Models: An In-Depth Exploration",
   arXiv:2405.00200: with large label spaces performance keeps rising with thousands of demonstrations;
   finetuning is more data hungry than ICL but can exceed long-context ICL with additional data.
15. Hsieh et al. 2023, "Distilling Step-by-Step!", Findings of ACL 2023, arXiv:2305.02301: a finetuned 770M
   T5 outperforms few-shot prompted 540B PaLM using 80% of the available data, on one benchmark; standard
   finetuning of the same T5 struggles to match it with 100%.

## Added at verify (from page agents)

- [R] Apache 2.0 and MIT are OSI-approved open-source licences; the Open Source Initiative's definition
  requires use, study, modification and redistribution without field-of-use discrimination (session 2;
  general knowledge, not fetched this build; re-verify at opensource.org/licenses before delivery).
- [C] Session 3's 90/10 train/validation split is a starting choice, labelled as such; OpenAI gives no ratio.
- Session 4 arithmetic: r x 6144 trainable values on the illustrative 3072 x 3072 matrix: r=4 24,576
  (0.26%), r=8 49,152 (0.52%), r=16 98,304 (1.04%), r=64 393,216 (4.17%).
- Session 2 arithmetic, weights only: 3.21B 6.42 GB / 1.61 GB; 3.8B 7.6 / 1.9; 4.0B 8.0 / 2.0 (16-bit / 4-bit).

## Teach the disagreement (do not resolve)

- **"Fine-tuning teaches the model new facts."** Against: Ovadia 2023 (RAG beats unsupervised FT for
  knowledge), Gekhman 2024 (new facts learned slowly, raise hallucination), LIMA (knowledge is from
  pretraining), Phi-4-mini card. Nuance for: Ovadia notes paraphrase-heavy training helps; the field's
  practical rule is "fine-tune for behaviour, retrieve for knowledge", consistent with learn-rag a1
  ("RAG adds knowledge. Fine-tuning changes behavior.").
- **How many examples.** OpenAI: start with 50, improvements from 50-100, minimum 10. LIMA: 1,000
  curated. learn-hermes-ai 94: 100-500 excellent examples. learn-prompt-engineering a-track: "thousands
  of examples and a stable task". Bertsch 2024: finetuning is more data hungry than ICL. Present all,
  attributed; the honest answer is "measure on your eval set as you double".
- **Fine-tuning vs long-context prompting.** Bertsch 2024 (ICL keeps improving with thousands of
  demonstrations; finetuning can exceed it with more data); LoRA Land (tuned 7B-class beats GPT-4 by 10
  points on average on its 31 tasks); Distilling step-by-step (770M beats 540B on its benchmark). Each is
  task-specific; none is "a small model beats GPT-4" in general.
- **LoRA vs full fine-tune.** Hu 2021 (on-par or better) vs Biderman 2024 (underperforms on code and maths,
  forgets less). Both true in their settings.

## Famous claims tiered

- "Fine-tuning teaches the model new facts" -> contested, above.
- "You need only 50-100 examples" -> OpenAI guidance, attribute it every time ("OpenAI's guide says").
- "A 7B tuned model beats GPT-4 on X" -> cite LoRA Land (average of 31 tasks) or cut.
- "LoRA cuts trainable parameters by 10,000x" -> true only for GPT-3 175B vs full fine-tune with Adam.
- "QLoRA matches ChatGPT" -> 99.3% on the Vicuna benchmark, one benchmark.

## Seams (link, never reteach; absolute https)

- learn-rag-with-phoebe: https://phoebefu6.github.io/learn-rag-with-phoebe/courses/a1-what-rag-is.html
  (session 1's RAG rung; retrieval, embeddings, chunking stay there).
- learn-prompt-engineering-with-phoebe: https://phoebefu6.github.io/learn-prompt-engineering-with-phoebe/courses/b2-core-techniques.html
  (bottom rungs: prompt, few-shot).
- learn-ai-evals-with-phoebe: b2 golden set https://phoebefu6.github.io/learn-ai-evals-with-phoebe/courses/b2-golden-set.html ,
  b5 LLM-as-judge https://phoebefu6.github.io/learn-ai-evals-with-phoebe/courses/b5-llm-as-judge.html ,
  b8 regression suites https://phoebefu6.github.io/learn-ai-evals-with-phoebe/courses/b8-regression-suites.html (session 5).
- learn-ai-observability-with-phoebe: https://phoebefu6.github.io/learn-ai-observability-with-phoebe/courses/b9-drift-and-silent-changes.html (session 6 drift).
- learn-agent-launch-with-phoebe: https://phoebefu6.github.io/learn-agent-launch-with-phoebe/courses/b9-the-launch-gate.html (session 6 go/no-go).
- learn-hermes-ai-with-phoebe: https://phoebefu6.github.io/learn-hermes-ai-with-phoebe/courses/94-fine-tune-your-own.html (Unsloth-on-Colab walk-through; session 4 links it).
- learn-text-to-sql-with-phoebe, learn-ai-literacy-with-phoebe, learn-asking-right-questions-as-ai-with-phoebe:
  mention fine-tuning; grepped, consistent ("try the cheaper levers first"; "RAG, not fine-tuning, is the
  default for knowledge").
- learn-voice-multimodal-agents-with-phoebe (sibling, building): no overlap.

## Per-session coverage

1. **Decision ladder.** What fine-tuning changes (behaviour, format, style, a narrow task) vs what it does
   not (fresh knowledge -> RAG); ladder prompt -> few-shot -> RAG -> fine-tune -> distil; the disagreement
   on facts; build-along: score Larkline's task against the ladder (six questions). Sources 5, 9, 10, 11,
   15, DLAI "where finetuning fits".
2. **Small models.** Parameter counts, context, licences (open weights vs open source: Llama Community
   License vs Apache 2.0 vs MIT), quantisation (bytes per parameter: 16-bit 2 bytes, 4-bit 0.5 bytes;
   arithmetic, labelled as weights only), on-device/edge, latency; build-along: compare the three model
   cards (source 8). Phi card's own limitation on facts.
3. **Training set.** Chat/JSONL format (5), TRL formats and completion-only loss (4), label quality,
   leakage (Banking77: 7 test texts in train), duplicates (4), split, how many examples (disagreement),
   synthetic data risks [R: general; teach as risk list, no statistic]; build-along: clean and split.
4. **LoRA and QLoRA.** Full vs PEFT; W + BA, rank, alpha, scaling alpha/r (rsLoRA alpha/sqrt r), B=0 init,
   target_modules; QLoRA NF4, double quantisation, paged optimisers; memory estimate (Unsloth table);
   build-along: read a LoraConfig and estimate memory. Trainable fraction for a d x d matrix: 2r/d
   (r=16, d=3072 [C illustrative]: 98,304 of 9,437,184 = 1.04%).
5. **Evals before and after.** Held-out set, baseline (big + prompt) vs tuned small, per-class recall,
   confusion, catastrophic forgetting (Biderman 2024), regression set; links ai-evals b2, b5, b8; uses
   the bench's Part A numbers.
6. **Bench.** Break-even, go/no-go, serving options (dedicated GPU hourly, serverless per-token, vendor
   fine-tune API that is closing to new users), retraining cadence, drift (link observability b9,
   agent-launch b9); capstone: Larkline's decision memo.

## Not covered (honest list)

- RLHF, DPO, preference tuning beyond a mention (Together lists DPO prices; not taught).
- Pre-training and continued pre-training on raw corpora.
- Running a real training job in the browser (impossible); the bench's predictions are modelled.
- Multi-GPU training, FSDP, DeepSpeed.
- Model merging, MoE internals.
- Measured latency: the latency fields are inputs, not measurements.
- RAG internals (learn-rag), eval tooling depth (learn-ai-evals), production monitoring (learn-ai-observability).
- Exact hidden sizes of the three small models (not read at source; the LoRA arithmetic uses an
  illustrative 3072 x 3072 matrix, labelled constructed).
