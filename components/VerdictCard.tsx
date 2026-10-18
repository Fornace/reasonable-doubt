"use client";

import type { CaseFile, Exchange, Verdict } from "@/lib/types";

const CLASS: Record<Verdict["outcome"], string> = {
  acquittal: "acquit",
  dismissed: "acquit",
  conviction: "convict",
  hung: "hung",
};

export default function VerdictCard({
  caseFile,
  verdict,
  history,
  onNewTrial,
}: {
  caseFile: CaseFile;
  verdict: Verdict;
  history: Exchange[];
  onNewTrial: () => void;
}) {
  const found = new Set<string>();
  for (const turn of history) {
    for (const flaw of turn.read.flaws) if (flaw.p >= 0.62) found.add(flaw.id);
  }

  return (
    <div className="verdict" role="dialog" aria-modal="true" aria-label="Verdict">
      <div className="verdict-card">
        <div className="kicker">
          {caseFile.id} · {caseFile.charge} · the People v. {caseFile.defendant.name}
        </div>
        <h2 className={CLASS[verdict.outcome]}>{verdict.headline}</h2>
        <div className="score">{verdict.scoreLine}</div>

        <p className="remarks">{verdict.remarks.split("\n\n")[0]}</p>
        {verdict.remarks.split("\n\n")[1] ? (
          <p className="remarks" style={{ fontSize: 14, color: "var(--muted)", marginTop: 10 }}>
            {verdict.remarks.split("\n\n")[1]}
          </p>
        ) : null}

        <div className="flaws">
          {caseFile.flaws.map((flaw) => (
            <div className={`flaw-row${found.has(flaw.id) ? " found" : ""}`} key={flaw.id}>
              <span className="mark">{found.has(flaw.id) ? "✦" : "·"}</span>
              <span>
                {flaw.name} — {flaw.link}
              </span>
            </div>
          ))}
        </div>

        <div className="verdict-actions">
          <button className="submit" onClick={onNewTrial} type="button">
            New trial
          </button>
        </div>
      </div>
    </div>
  );
}
