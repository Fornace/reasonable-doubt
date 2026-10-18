"use client";

import { seatsFor } from "@/lib/mechanics";
import type { CaseFile, ChainLink, TranscriptTurn } from "@/lib/types";

const FLOOR = 0.62;

export default function StatePanel({
  caseFile,
  chain,
  jury,
  history,
}: {
  caseFile: CaseFile;
  chain: ChainLink[];
  jury: number;
  history: TranscriptTurn[];
}) {
  const seats = seatsFor(jury);
  const reached = caseFile.flaws.filter((flaw) =>
    history.some((turn) => turn.read.flaws.some((f) => f.id === flaw.id && f.p >= FLOOR)),
  );

  return (
    <aside className="column state">
      <div className="state-inner">
        <div className="panel">
          <h3>
            <span>The State&rsquo;s chain</span>
            <span>{chain.filter((l) => l.integrity === 0).length} broken</span>
          </h3>
          {chain.map((link) => {
            const tone = link.integrity === 0 ? "low" : link.integrity < 55 ? "mid" : "";
            return (
              <div className={`link${link.integrity === 0 ? " broken" : ""}`} key={link.key}>
                <div className="top">
                  <span className="name">{link.label}</span>
                  <span className="val">{link.integrity === 0 ? "broken" : link.integrity}</span>
                </div>
                <div className={`bar ${tone}`}>
                  <span style={{ width: `${link.integrity}%` }} />
                </div>
                <div className="claim" title={link.claim}>
                  {link.claim}
                </div>
              </div>
            );
          })}
        </div>

        <div className="panel">
          <h3>
            <span>The jury</span>
            <span>{seats}/12 not guilty</span>
          </h3>
          <div className="jury" aria-label={`${seats} of 12 jurors lean not guilty`}>
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className={`seat${i < seats ? " notguilty" : ""}`} />
            ))}
          </div>
          <div className="jury-count">
            <span>Eight seats acquit</span>
            <b>{jury}/100</b>
          </div>
        </div>

        <div className="panel">
          <h3>
            <span>Defects reached</span>
            <span>
              {reached.length}/{caseFile.flaws.length}
            </span>
          </h3>
          {reached.length === 0 ? (
            <div className="legend">
              Read the exhibits against the State&rsquo;s claims. Every file has holes in it.
            </div>
          ) : (
            reached.map((flaw) => (
              <div className="legend" key={flaw.id} style={{ color: "var(--gold)" }}>
                ✦ {flaw.name}
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
