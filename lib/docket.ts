import type { CaseFile, TranscriptTurn } from "./types";

/** The docket as both models read it: complete, compact, no editorialising. */
export function renderDocket(c: CaseFile): string {
  const exhibits = c.exhibits.map((e) => `${e.id} — ${e.label}: ${e.detail}`).join("\n");
  const witnesses = c.witnesses
    .map((w) => `${w.name}, ${w.role}: ${w.statement}`)
    .join("\n");
  const links = c.links.map((l) => `${l.label}: ${l.claim}`).join("\n");
  return [
    `CASE ${c.id} — ${c.court}`,
    `CHARGE: ${c.charge}`,
    `DEFENDANT: ${c.defendant.name}, ${c.defendant.age}, ${c.defendant.occupation}. ${c.defendant.record}`,
    `SETTING: ${c.setting}`,
    `WHAT HAPPENED: ${c.incident}`,
    `THE STATE'S THEORY: ${c.theory}`,
    `THE STATE'S CHAIN OF PROOF`,
    links,
    `THE DEFENDANT SAYS: ${c.clientStatement}`,
    `EXHIBITS IN EVIDENCE`,
    exhibits,
    `WITNESS STATEMENTS ON THE RECORD`,
    witnesses,
  ].join("\n");
}

export function renderTranscript(history: TranscriptTurn[], limit = 4): string {
  if (!history.length) return "(no exchanges yet)";
  return history
    .slice(-limit)
    .map((t) => {
      const ruling = t.ruling
        ? `\nOBJECTION (${t.ruling.ground}): ${t.ruling.sustained ? "SUSTAINED" : "overruled"}`
        : "";
      return `Exchange ${t.round}\nDEFENCE: ${t.argument}\nPROSECUTION: ${t.reply}${ruling}`;
    })
    .join("\n\n");
}

export const PROSECUTOR_NAME = "ADA Vera Halvorsen";
export const JUDGE_NAME = "Hon. Imre Korda";
