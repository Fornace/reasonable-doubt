#!/usr/bin/env node
/**
 * Play the real game over HTTP: one case, one argument per exchange, exactly
 * what the browser does. Usage:
 *   node scripts/playtest.mjs --seed alpha1 --mode sharp
 *   node scripts/playtest.mjs --mode blind --rounds 3
 */
const BASE = process.env.COURT_URL ?? "http://localhost:4321";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

const SEED = arg("seed", "alpha1");
const MODE = arg("mode", "sharp");
const LIMIT = Number(arg("rounds", "99"));

async function post(path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${path} ${response.status}: ${text.slice(0, 400)}`);
  }
  return response.json();
}

/** Plays one exchange over the event stream and returns the final exchange. */
async function turnRequest(body) {
  const response = await fetch(`${BASE}/api/turn`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`/api/turn ${response.status}: ${(await response.text()).slice(0, 300)}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result = null;
  let read = null;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let cut;
    while ((cut = buffer.indexOf("\n\n")) >= 0) {
      const chunk = buffer.slice(0, cut);
      buffer = buffer.slice(cut + 2);
      const line = chunk.split("\n").find((part) => part.startsWith("data: "));
      if (!line) continue;
      const { event, data } = JSON.parse(line.slice(6));
      if (event === "read") read = data.read;
      else if (event === "result") result = data;
      else if (event === "error") throw new Error(data.error);
    }
  }
  if (!result) throw new Error("the court closed without a ruling");
  return { ...result, read };
}

const LINK_NAME = {
  identity: "identity",
  timeline: "opportunity",
  forensics: "physical proof",
  custody: "chain of custody",
  motive: "motive",
};

function sharpArgument(caseFile, round) {
  const flaw = caseFile.flaws[(round - 1) % caseFile.flaws.length];
  const claim = caseFile.links.find((l) => l.key === flaw.link).claim;
  const variant = Math.floor((round - 1) / caseFile.flaws.length);
  if (variant === 0) {
    return `Your Honour, on ${LINK_NAME[flaw.link]} the State's own record is against it. The State says ${claim} But ${flaw.tell}`;
  }
  if (variant === 1) {
    return `The People have to prove ${LINK_NAME[flaw.link]}, and their proposition is that ${claim} Exhibit here says otherwise: ${flaw.tell} That is a hole in the foundation, not a detail for the jury to smooth over. ${flaw.thesis}`;
  }
  return `Your Honour, the People answered my brother on ${LINK_NAME[flaw.link]} and did not touch the document. ${flaw.tell} Until that is explained, the ${LINK_NAME[flaw.link]} link is unsupported and the charge fails on its own evidence.`;
}

function preciseArgument(caseFile, round) {
  const flaw = caseFile.flaws[(round - 1) % caseFile.flaws.length];
  const pass = Math.floor((round - 1) / caseFile.flaws.length);
  if (pass === 0) return `Your Honour, ${flaw.thesis} The People cannot carry that link, and the charge fails with it.`;
  if (pass === 1) return `Your Honour, on ${LINK_NAME[flaw.link]}, the People were asked about this and did not answer it: ${flaw.tell} Nothing in the record repairs that, and the burden is theirs, not mine.`;
  return `Your Honour, the People's ${LINK_NAME[flaw.link]} link rests on ${flaw.tell} The court should direct a verdict on that link before this goes to the jury.`;
}

function blindArgument(caseFile, round) {
  const generic = [
    "My client is innocent and the State has not proved its case beyond reasonable doubt.",
    "The prosecution's witnesses are not reliable and the jury should not believe them.",
    "There is no evidence my client did this. He was at home. This is a mistake.",
    "The burden is on the State, and the burden has not been met here.",
  ];
  return generic[(round - 1) % generic.length];
}

const caseFile = await post("/api/case", { seed: SEED });
console.log(`\n=== ${caseFile.id} · ${caseFile.charge} · seed ${caseFile.seed}`);
console.log(caseFile.setting);
console.log(`defendant: ${caseFile.defendant.name}, ${caseFile.defendant.age}, ${caseFile.defendant.occupation}`);
console.log(`\nflaws in this file:`);
for (const flaw of caseFile.flaws) console.log(`  - [${flaw.link}] ${flaw.name}: ${flaw.thesis}`);

let chain = caseFile.links.map((l) => ({ ...l, integrity: 100 }));
let jury = caseFile.startJury;
let history = [];
let verdict = null;
const started = Date.now();

for (let round = 1; round <= Math.min(caseFile.rounds, LIMIT); round++) {
  const argument =
    MODE === "precise" ? preciseArgument(caseFile, round)
    : MODE === "sharp" ? sharpArgument(caseFile, round)
    : blindArgument(caseFile, round);
  console.log(`\n--- exchange ${round} -------------------------------------------------`);
  console.log(`DEFENCE: ${argument.slice(0, 220)}${argument.length > 220 ? "…" : ""}`);
  const turn = await turnRequest({ case: caseFile, chain, jury, round, history, argument });

  const flaws = turn.read.flaws.map((f) => `${f.name} ${f.p.toFixed(2)}`).join(", ");
  console.log(
    `READ   link=${turn.read.link} force=${turn.read.force.toFixed(2)} technique=${turn.read.technique} ` +
      `invents=${turn.read.invents.toFixed(2)} concede=${turn.read.concede.toFixed(2)}`,
  );
  console.log(`FLAWS  ${flaws}`);
  console.log(`STATE: ${turn.reply}`);
  if (turn.objection) {
    console.log(`OBJECTION ${turn.objection.ground.toUpperCase()}: "${turn.objection.quote}" → ${turn.ruling.sustained ? "SUSTAINED" : "overruled"} (${turn.ruling.probability.toFixed(2)})`);
  }
  console.log(`REBUTTAL ${turn.rebuttal}/3 · damage ${turn.damage} · jury ${jury} → ${turn.jury} · seats ${Math.round((turn.jury / 100) * 12)}/12`);
  console.log(`CHAIN  ${turn.chain.map((l) => `${l.key}:${l.integrity}`).join("  ")}`);
  if (turn.voice) console.log(`CLIENT whispers: ${turn.voice}`);
  if (turn.broken) console.log(`*** CHAIN LINK BROKEN: ${turn.broken}`);
  if (turn.latency) console.log(`latency  read ${turn.latency.read}ms · reply ${turn.latency.reply}ms · ruling ${turn.latency.ruling}ms`);

  chain = turn.chain;
  jury = turn.jury;
  history.push({
    round,
    argument,
    read: turn.read,
    reply: turn.reply,
    objection: turn.objection,
    ruling: turn.ruling,
    rebuttal: turn.rebuttal,
    link: turn.link,
    damage: turn.damage,
    broken: turn.broken,
    juryAfter: turn.jury,
  });
  if (turn.verdict) {
    verdict = turn.verdict;
    break;
  }
}

console.log(`\n=== ${verdict ? verdict.headline : "NO VERDICT"} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
if (verdict) {
  console.log(verdict.scoreLine);
  console.log(verdict.remarks);
}
