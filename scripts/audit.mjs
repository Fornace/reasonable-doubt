#!/usr/bin/env node
/**
 * Coherence audit: ask a model to find contradictions in a generated case file
 * that are NOT the three planted defects. Model judgement, not a rule set.
 *   node scripts/audit.mjs --cases 8
 */
import { generateCase } from "../lib/case/generate.ts";

const START = process.argv.includes("--cases") ? Number(process.argv[process.argv.indexOf("--cases") + 1]) : 6;
const BASE = (process.env.FORNACE_LLM_BASE_URL || "https://llm.fornace.net").replace(/\/$/, "").replace(/\/v1$/, "");
const KEY = process.env.FORNACE_LLM_API_KEY;
if (!KEY) throw new Error("set FORNACE_LLM_API_KEY");

const seeds = ["alpha1", "bravo2", "charlie3", "delta4", "echo5", "foxtrot6", "golf7", "hotel8", "india9", "juliet10"];
let flagged = 0;

for (const seed of seeds.slice(0, START)) {
  const c = generateCase(seed);
  const docket = [
    `CASE ${c.id} — ${c.charge}`,
    `SETTING: ${c.setting}`,
    `WHAT HAPPENED: ${c.incident}`,
    `THE STATE'S THEORY: ${c.theory}`,
    "THE STATE'S CLAIMS:",
    ...c.links.map((l) => `${l.label}: ${l.claim}`),
    `THE DEFENDANT SAYS: ${c.clientStatement}`,
    "EXHIBITS:",
    ...c.exhibits.map((e) => `${e.id} — ${e.label}: ${e.detail}`),
    "WITNESSES:",
    ...c.witnesses.map((w) => `${w.name}, ${w.role}: ${w.statement}`),
  ].join("\n");

  const response = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: "fornace-flash",
      temperature: 0.2,
      max_tokens: 6000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'You audit a fictional criminal case file for internal consistency. The file is meant to contain exactly three defects, listed as PLANTED DEFECTS. Find every OTHER inconsistency: a time that cannot follow from another, a date that does not fit, a number that contradicts another, a name used for the wrong person, an exhibit that contradicts its own claim, a fact that is impossible. Do not report gaps in the prosecution case that the defence is meant to find, and do not repeat the planted defects. Return only JSON: {"issues":[{"quote":"the exact text","problem":"what is wrong"}]}. An empty list is a good answer.',
        },
        {
          role: "user",
          content: `${docket}\n\nPLANTED DEFECTS (do not report these):\n${c.flaws.map((f) => `- ${f.name}: ${f.thesis}`).join("\n")}`,
        },
      ],
    }),
  });
  const body = await response.json();
  const content = body.choices?.[0]?.message?.content;
  let issues = [];
  try {
    issues = JSON.parse(content ?? "{}").issues ?? [];
  } catch {
    console.log(`${seed}: unparseable audit response`);
    continue;
  }
  if (issues.length) flagged += 1;
  console.log(`\n${seed} · ${c.charge}`);
  if (!issues.length) console.log("  clean");
  for (const issue of issues) console.log(`  - ${issue.problem}\n    "${String(issue.quote).slice(0, 160)}"`);
}

console.log(`\n${flagged} of ${Math.min(START, seeds.length)} cases flagged`);
