"use client";

import type { CaseFile } from "@/lib/types";

export default function Record({ caseFile }: { caseFile: CaseFile }) {
  return (
    <div className="column record">
      <div className="record-head">
        <span className="label">The record</span>
        <h2>{caseFile.charge}</h2>
        <div className="who">
          The People v. {caseFile.defendant.name} · {caseFile.id}
        </div>
      </div>
      <div className="record-body">
        <section className="block">
          <span className="label">Setting</span>
          <p>{caseFile.setting}</p>
        </section>

        <section className="block">
          <span className="label">What happened</span>
          <p>{caseFile.incident}</p>
        </section>

        <section className="block">
          <span className="label">Your client</span>
          <p>
            {caseFile.defendant.name}, {caseFile.defendant.age}, {caseFile.defendant.occupation}.{" "}
            {caseFile.defendant.record}
          </p>
          <p className="statement">&ldquo;{caseFile.clientStatement}&rdquo;</p>
        </section>

        <section className="block">
          <span className="label">Exhibits in evidence</span>
          {caseFile.exhibits.map((exhibit) => (
            <article className="item" key={exhibit.id}>
              <h4>
                <span className="num">{exhibit.id.replace("Exhibit ", "EX ")}</span>
                {exhibit.label}
              </h4>
              <p>{exhibit.detail}</p>
            </article>
          ))}
        </section>

        <section className="block">
          <span className="label">Witness statements</span>
          {caseFile.witnesses.map((witness) => (
            <article className="item" key={witness.id}>
              <h4>{witness.name}</h4>
              <p>
                <em>{witness.role}.</em> {witness.statement}
              </p>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
