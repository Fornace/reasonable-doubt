"use client";

import { useEffect, useRef } from "react";
import { PROSECUTOR_NAME } from "@/lib/docket";
import { TECHNIQUE_LABEL } from "@/lib/labels";
import type { CaseFile, Exchange } from "@/lib/types";
import { useTyped } from "./useTyped";

const FLOOR = 0.62;

/** A turn as it arrives: the read lands first, the speech next, the ruling last. */
export type TurnLike = Partial<Exchange> & { argument: string; round: number };

function Speaker({ children, mark }: { children: React.ReactNode; mark?: string }) {
  return (
    <div className="speaker">
      {mark ? <span className="n">{mark}</span> : null}
      <span>{children}</span>
    </div>
  );
}

export function TurnView({
  turn,
  animate = false,
  onDone,
}: {
  turn: TurnLike;
  animate?: boolean;
  onDone?: () => void;
}) {
  const [shown, done] = useTyped(animate && turn.reply ? turn.reply : "", (turn.reply?.length ?? 0) * 26);
  const read = turn.read;
  const hits = read ? read.flaws.filter((f) => f.p >= FLOOR) : [];

  useEffect(() => {
    if (animate && done) onDone?.();
  }, [animate, done, onDone]);

  return (
    <div className="entry">
      <div className="counsel">
        <Speaker mark={String(turn.round)}>Counsel for the defence</Speaker>
        <p>{turn.argument}</p>
      </div>

      {turn.reply ? (
        <div className="state-speech" style={{ marginTop: 16 }}>
          <Speaker mark="The People">{PROSECUTOR_NAME}</Speaker>
          <p>{animate ? shown : turn.reply}</p>
        </div>
      ) : (
        <div className="pending">
          <span className="pulse" />
          The People are answering
        </div>
      )}

      {turn.ruling ? (
        <div className={`objection${turn.ruling.sustained ? "" : " overruled"}`}>
          <span>Objection · {turn.ruling.ground}</span>
          <span>
            {turn.ruling.sustained ? "Sustained" : "Overruled"} ·{" "}
            {Math.round(turn.ruling.probability * 100)}%
          </span>
        </div>
      ) : null}

      {turn.ruling?.sustained ? (
        <div className="read-row" style={{ marginTop: 6 }}>
          <span>Struck</span>
          <b>argument discounted</b>
        </div>
      ) : null}

      {read ? (
        <div className="read">
          <div className="read-row">
            <span>Attacking</span>
            <b className={read.link === "none" ? "" : "hot"}>
              {read.link === "none" ? "nothing specific" : read.link}
            </b>
          </div>
          <div className="read-row">
            <span>Force</span>
            <b>{read.force.toFixed(2)} / 4</b>
          </div>
          <div className="read-row">
            <span>Move</span>
            <b>{TECHNIQUE_LABEL[read.technique] ?? read.technique}</b>
          </div>
          <div className="read-row">
            <span>Defect</span>
            <b className={hits.length ? "hit" : ""}>
              {hits.length ? hits.map((h) => h.name).join(" · ") : "none reached"}
            </b>
          </div>
          {read.repeat >= 0.7 ? (
            <div className="read-row">
              <span>Status</span>
              <b>the court has heard it</b>
            </div>
          ) : null}
          {turn.damage !== undefined ? (
            <div className="read-row">
              <span>Damage</span>
              <b>{turn.damage}</b>
            </div>
          ) : null}
        </div>
      ) : null}

      {turn.broken ? (
        <div className="objection" style={{ borderColor: "var(--gold)", color: "var(--gold)" }}>
          <span>The chain breaks</span>
          <span>{turn.broken}</span>
        </div>
      ) : null}

      {turn.voice ? (
        <div className="whisper">
          <b>Your client whispers:</b> {turn.voice}
        </div>
      ) : null}
    </div>
  );
}

const CAPTION: Record<string, string> = {
  bench: "The court is in session",
  prosecutor: "The People are heard",
  jury: "The jury retires",
};

export function Court({
  caseFile,
  turns,
  live,
  onSpeechDone,
  scene,
  children,
}: {
  caseFile: CaseFile;
  turns: Exchange[];
  live: TurnLike | null;
  onSpeechDone: () => void;
  scene: "bench" | "prosecutor" | "jury";
  children: React.ReactNode;
}) {
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length, live?.reply, live?.read]);

  return (
    <section className="court">
      <div className={`scene ${scene}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/art/${scene}.jpg`} alt="" />
        <div className="cap">
          <span className="dot" />
          {CAPTION[scene]}
        </div>
      </div>

      <div className="transcript">
        <div className="entry">
          <div className="state-speech">
            <Speaker mark="Opening">The People</Speaker>
            <p>{caseFile.opening}</p>
          </div>
          <div className="whisper" style={{ marginTop: 12 }}>
            {caseFile.exhibits.length} exhibits and {caseFile.witnesses.length} witnesses are on the
            record. {caseFile.rounds} exchanges. Break the chain; the seats follow.
          </div>
        </div>

        {turns.map((turn) => (
          <TurnView key={`${turn.round}-${turn.argument.slice(0, 24)}`} turn={turn} />
        ))}

        {live ? (
          <TurnView key={`live-${live.round}`} turn={live} animate onDone={onSpeechDone} />
        ) : null}

        <div ref={bottom} />
      </div>

      {children}
    </section>
  );
}
