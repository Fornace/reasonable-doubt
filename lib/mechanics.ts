import type { ChainLink, CaseFile, DefenseRead, Exchange, LinkKey, TranscriptTurn, Verdict } from "./types";

const REBUTTAL_FACTOR = [1, 0.86, 0.64, 0.46];

/** jev returns the rubric's expected value, so map a fractional score onto the table. */
function between(table: number[], position: number): number {
  const at = Math.max(0, Math.min(table.length - 1, position));
  const low = Math.floor(at);
  const high = Math.min(table.length - 1, low + 1);
  return table[low] + (table[high] - table[low]) * (at - low);
}
export const FLAW_FLOOR = 0.55;
const MAX_DAMAGE = 60;

export interface Resolution {
  damage: number;
  byLink: Record<LinkKey, number>;
  broken: LinkKey | null;
  jury: number;
  chain: ChainLink[];
  notes: string[];
}

/** Turns the two typed reads into the board: link damage, breakage, jury. */
export function resolveExchange(
  caseFile: CaseFile,
  chain: ChainLink[],
  jury: number,
  read: DefenseRead,
  opts: { rebuttal: number; sustained: boolean; overreach: number; alreadyFound: string[] },
): Resolution {
  const notes: string[] = [];
  const repeated = read.repeat >= 0.7;
  const factor =
    between(REBUTTAL_FACTOR, opts.rebuttal) * (opts.sustained ? 0.38 : 1) * (repeated ? 0.55 : 1);
  const byLink: Record<LinkKey, number> = { identity: 0, timeline: 0, forensics: 0, custody: 0, motive: 0 };

  const hits = read.flaws.filter((f) => f.p >= FLAW_FLOOR);
  const target: LinkKey | null = read.link === "none" ? null : read.link;
  if (target) byLink[target] += read.force * 8 * factor;

  const found = new Set(opts.alreadyFound);
  for (const hit of hits) {
    const flaw = caseFile.flaws.find((f) => f.id === hit.id);
    if (!flaw) throw new Error(`unknown flaw reached: ${hit.id}`);
    // A defect pays in full the first time it is put to the court; after that it is a repeat.
    const breakthrough = found.has(hit.id) ? 0.85 : 1.45;
    byLink[flaw.link] += (16 + 10 * hit.p) * breakthrough * factor;
    notes.push(found.has(hit.id) ? `returned to ${flaw.name}` : `broke through on ${flaw.name}`);
  }

  if (read.concede > 0.3) {
    for (const key of Object.keys(byLink) as LinkKey[]) byLink[key] *= 1 - 0.55 * read.concede;
    notes.push("conceded part of the State's case");
  }
  if (opts.sustained) notes.push("argument struck");
  if (repeated) notes.push("the court has heard this already");

  let total = 0;
  for (const key of Object.keys(byLink) as LinkKey[]) total += byLink[key];
  if (!Number.isFinite(total)) throw new Error(`damage is not a number: ${JSON.stringify({ ...opts, force: read.force })}`);
  if (total > MAX_DAMAGE) {
    const scale = MAX_DAMAGE / total;
    for (const key of Object.keys(byLink) as LinkKey[]) byLink[key] *= scale;
    total = MAX_DAMAGE;
  }

  const next = chain.map((link) => {
    const damage = Math.round(byLink[link.key]);
    return { ...link, integrity: Math.max(0, link.integrity - damage) };
  });
  const brokenLink = next.find((link) => link.integrity === 0 && chain.find((old) => old.key === link.key)!.integrity > 0);

  let delta = Math.round(total * 0.28 - 1.5);
  if (repeated) delta -= 2;
  if (!target && read.force < 1) delta -= 4;
  if (read.invents >= 0.7) delta -= 2;
  if (read.concede >= 0.6) delta -= 2;
  if (opts.sustained) delta -= 3;
  if (opts.overreach >= 0.7) {
    delta += 3;
    notes.push("prosecution overreached");
  }
  if (brokenLink) {
    delta += 9;
    notes.push(`chain link broken: ${brokenLink.label}`);
  }

  return {
    damage: Math.round(total),
    byLink,
    broken: brokenLink ? brokenLink.key : null,
    jury: Math.min(100, Math.max(0, jury + delta)),
    chain: next,
    notes,
  };
}

export function seatsFor(jury: number): number {
  return Math.min(12, Math.max(0, Math.round((jury / 100) * 12)));
}

export function countBroken(chain: ChainLink[]): number {
  return chain.filter((link) => link.integrity === 0).length;
}

export function flawsFound(caseFile: CaseFile, history: TranscriptTurn[]): number {
  const reached = new Set<string>();
  for (const turn of history) {
    for (const flaw of turn.read.flaws) if (flaw.p >= FLAW_FLOOR) reached.add(flaw.id);
  }
  return caseFile.flaws.filter((flaw) => reached.has(flaw.id)).length;
}

export function verdictOf(caseFile: CaseFile, chain: ChainLink[], jury: number, history: TranscriptTurn[]): Verdict {
  const seats = seatsFor(jury);
  const broken = countBroken(chain);
  const found = flawsFound(caseFile, history);

  let outcome: Verdict["outcome"];
  if (broken >= 2) outcome = "dismissed";
  else if (seats >= 8) outcome = "acquittal";
  else if (seats <= 4) outcome = "conviction";
  else outcome = "hung";

  const headline =
    outcome === "dismissed" ? "CASE DISMISSED"
    : outcome === "acquittal" ? "NOT GUILTY"
    : outcome === "conviction" ? "GUILTY"
    : "HUNG JURY";

  return {
    outcome,
    headline,
    seats,
    broken,
    flawsFound: found,
    flawsTotal: caseFile.flaws.length,
    remarks: "",
    scoreLine: `${seats} of 12 for acquittal · ${broken} break${broken === 1 ? "" : "s"} in the State's chain · ${found} of ${caseFile.flaws.length} defects found`,
  };
}

export function endOfTrial(caseFile: CaseFile, round: number, chain: ChainLink[]): boolean {
  return round >= caseFile.rounds || countBroken(chain) >= 2;
}
