# Reasonable Doubt

A courtroom game. You are the defence. The State has charged a client with a crime, the file is procedurally generated, and three defects are buried in it. You argue the case in your own words against a model prosecutor who answers every exchange, and a decision model scores each exchange as typed decisions that move the case.

Live: https://reasonable-doubt.vercel.app

## The loop

1. **Read the record.** Five links hold the State's case: identity, opportunity, physical proof, chain of custody, motive. Each carries the State's claim. The exhibits and witness statements are the only evidence: three of them contradict the claim that depends on them.
2. **Argue.** Free text, one exchange at a time. Name the exhibit and draw the contradiction. A general objection does nothing.
3. **The court reads you.** Jev (`fornace-jev`, `POST /v1/systemone`) answers one batch of typed questions from a single read of the docket: which link you attacked (`choice`), how strong the argument is (`score` 0-4), whether you reached each planted defect (`noul`, one per defect), whether you invented facts outside the record (`noul`), whether you conceded (`noul`), and whether you are repeating yourself (`noul`).
4. **The People answer.** `fornace-flash` writes the prosecutor's reply from the docket, the transcript, and jev's read of your argument. She defends the link you attacked, objects when there is a real evidentiary ground, and never concedes.
5. **The ruling.** A second jev read scores whether that answer held (`score`), whether the objection would be sustained (`noul`), and whether the prosecution misstated the record (`noul`).
6. **The board moves.** Link integrity falls, the jury follows, and the seats fill. Three broken links or a weaker chain at the end of the seventh exchange decides it.

## Why it could not exist without models

The game is the scoring. Nothing in the codebase can tell whether a sentence "identifies the defect that the seal log shows a seven-hour gap" or "argues a case the record does not contain". Jev does that, per exchange, on typed questions, and the answer is the mechanic: link, force, breakthrough, objection ground, sustain. The prosecutor is a second model whose answer is itself judged, so a good reply by her costs the player real ground. The verdict is written by the model from the final state.

## Run

```bash
npm install
printf 'FORNACE_LLM_BASE_URL=https://llm.fornace.net\nFORNACE_LLM_API_KEY=<key>\n' > .env.local
npm run dev                                                  # http://localhost:4321
node scripts/playtest.mjs --seed alpha1 --mode precise     # plays a whole trial over the real API
node scripts/playtest.mjs --seed alpha1 --mode blind       # the same case, argued badly
node scripts/audit.mjs --cases 10                          # has a model hunt contradictions in generated files
```

`--mode precise` argues each defect as the record states it; `--mode sharp` argues them crudely; `--mode blind` argues nothing in particular. On seed `bravo2` precise acquits, sharp hangs, blind convicts.

Cases are deterministic from their seed, which is in the URL: `/?c=alpha1`. `node scripts/case.mjs alpha1` prints a case file without the UI.

## Deploy

```bash
vercel --prod --scope fornace
```

Needs `FORNACE_LLM_BASE_URL` and `FORNACE_LLM_API_KEY` in the Vercel project (production and preview).

## Layout

```
app/api/case    procedural case, no model call
app/api/turn    event stream: jev read -> prosecutor -> ruling -> result
lib/case/       four charge templates, seeded generator, planted defects
lib/read.ts     the typed read of the defence argument
lib/prosecute.ts fornace-flash, strict JSON
lib/ruling.ts   the typed read of the exchange
lib/mechanics.ts link damage, jury, verdict
components/     record, court, chain, verdict
```
