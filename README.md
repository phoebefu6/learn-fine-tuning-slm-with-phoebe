# Learn Fine-tuning and Small Language Models with Phoebe

Where the AI shelf stops: when a smaller tuned model beats the big general one, and how to prove it with evals.
Six 45-minute sessions for builders who already prompt and maybe run RAG, by Phoebe Fu.

1. Prompt, RAG or fine-tune? The decision ladder
2. Small language models: what you give up, what you get back
3. The training set: where a tune is won or lost
4. LoRA and QLoRA without the maths fear
5. Evals before and after the tune
6. The break-even bench: cost, serving and drift

The running case, Larkline, is a constructed insurer's claims desk. The bench (session 6) scores three model
arms on 600 real customer messages from Banking77 (PolyAI, CC BY 4.0; Casanueva et al. 2020, arXiv:2003.04807),
modified: sampled with a fixed seed and mapped from 77 intents to six queues. The arms' predictions are modelled
by a seeded rule, not produced by any model; every metric is computed in the browser and checked against an
independent Python run. Prices are vendor list prices read on 2026-11-08: re-verify before relying on them.

Static site: open `index.html`. No build step.
