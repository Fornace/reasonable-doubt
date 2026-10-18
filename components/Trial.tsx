"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CaseFile, ChainLink, Exchange, TranscriptTurn, Verdict } from "@/lib/types";
import { Court, type TurnLike } from "./Court";
import Record from "./Record";
import StatePanel from "./StatePanel";
import VerdictCard from "./VerdictCard";

const LIMIT = 900;

function toTurn(turn: Exchange): TranscriptTurn {
  return {
    round: turn.round,
    argument: turn.argument,
    read: turn.read,
    reply: turn.reply,
    objection: turn.objection,
    ruling: turn.ruling,
    rebuttal: turn.rebuttal,
    link: turn.read.link,
    damage: turn.damage,
    broken: turn.broken,
    juryAfter: turn.jury,
  };
}

interface ServerEvent {
  event: "read" | "reply" | "result" | "error";
  data: Record<string, unknown>;
}

export default function Trial() {
  const [caseFile, setCaseFile] = useState<CaseFile | null>(null);
  const [chain, setChain] = useState<ChainLink[]>([]);
  const [jury, setJury] = useState(0);
  const [round, setRound] = useState(1);
  const [turns, setTurns] = useState<Exchange[]>([]);
  const [live, setLive] = useState<TurnLike | null>(null);
  const [spoken, setSpoken] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [brief, setBrief] = useState(true);
  const [tab, setTab] = useState<"court" | "record" | "chain">("court");
  const box = useRef<HTMLTextAreaElement>(null);

  const startTrial = useCallback(async (seed?: string) => {
    setLoading(true);
    setError(null);
    setVerdict(null);
    setTurns([]);
    setLive(null);
    setSpoken(false);
    setDraft("");
    try {
      const response = await fetch("/api/case", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(seed ? { seed } : {}),
      });
      const data = (await response.json()) as CaseFile & { error?: string };
      if (!response.ok || data.error) throw new Error(data.error ?? `case ${response.status}`);
      setCaseFile(data);
      setChain(data.links.map((link) => ({ ...link, integrity: 100 })));
      setJury(data.startJury);
      setRound(1);
      window.history.replaceState(null, "", `?c=${data.seed}`);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : String(problem));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const seed = new URLSearchParams(window.location.search).get("c") ?? undefined;
    void startTrial(seed);
  }, [startTrial]);

  useEffect(() => {
    if (!live) box.current?.focus();
  }, [live]);

  const commit = useCallback(() => {
    setLive((current) => {
      if (!current || current.chain === undefined || current.jury === undefined) return current;
      const finished = current as Exchange;
      setChain(finished.chain);
      setJury(finished.jury);
      setTurns((existing) =>
        existing.some((t) => t.round === finished.round) ? existing : [...existing, finished],
      );
      setRound(finished.round + 1);
      if (finished.verdict) setVerdict(finished.verdict);
      setSpoken(false);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!spoken || !live?.chain) return;
    const timer = setTimeout(commit, 1100);
    return () => clearTimeout(timer);
  }, [spoken, live?.chain, commit]);

  const submit = useCallback(async () => {
    if (!caseFile || live) return;
    const argument = draft.trim();
    if (argument.length < 2) return;
    setDraft("");
    setError(null);
    setSpoken(false);
    setLive({ argument, round });
    try {
      const response = await fetch("/api/turn", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ case: caseFile, chain, jury, round, history: turns.map(toTurn), argument }),
      });
      if (!response.ok || !response.body) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `the court returned ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let cut = buffer.indexOf("\n\n");
        while (cut >= 0) {
          const chunk = buffer.slice(0, cut);
          buffer = buffer.slice(cut + 2);
          const line = chunk.split("\n").find((part) => part.startsWith("data: "));
          if (line) {
            const { event, data } = JSON.parse(line.slice(6)) as ServerEvent;
            if (event === "read") {
              setLive((current) => (current ? { ...current, read: data.read as TurnLike["read"] } : current));
            } else if (event === "reply") {
              setLive((current) =>
                current
                  ? {
                      ...current,
                      reply: data.reply as string,
                      objection: (data.objection ?? null) as TurnLike["objection"],
                      voice: data.voice as string,
                    }
                  : current,
              );
            } else if (event === "result") {
              const exchange = data as unknown as Exchange;
              setLive((current) => (current ? { ...current, ...exchange } : current));
            } else if (event === "error") {
              throw new Error(String(data.error ?? "the court could not be convened"));
            }
          }
          cut = buffer.indexOf("\n\n");
        }
      }
    } catch (problem) {
      setLive(null);
      setDraft(argument);
      setError(problem instanceof Error ? problem.message : String(problem));
    }
  }, [caseFile, draft, live, chain, jury, round, turns]);

  const scene = verdict ? "jury" : turns.length || live ? "prosecutor" : "bench";
  const busy = Boolean(live);

  if (loading || !caseFile) {
    return (
      <div className="shell">
        <header className="topbar">
          <div className="wordmark">
            <h1>Reasonable Doubt</h1>
          </div>
          <span />
          <span />
        </header>
        <div style={{ display: "grid", placeItems: "center" }}>
          {error ? (
            <div style={{ maxWidth: 460, padding: 24 }}>
              <div className="error">{error}</div>
              <button className="submit" type="button" onClick={() => void startTrial()}>
                Try again
              </button>
            </div>
          ) : (
            <div className="pending">
              <span className="pulse" />
              The court is being convened
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="shell" data-tab={tab}>
      <header className="topbar">
        <div className="wordmark">
          <h1>Reasonable Doubt</h1>
          <span className="docket">
            {caseFile.id} · {caseFile.charge}
          </span>
        </div>
        <div className={`clock${verdict ? " done" : ""}`}>
          <span className="tick" />
          {verdict ? "Verdict entered" : `Exchange ${Math.min(round, caseFile.rounds)} of ${caseFile.rounds}`}
        </div>
        <button className="ghost" type="button" onClick={() => setBrief(true)}>
          Rules
        </button>
      </header>

      <nav className="tabs" aria-label="Panels">
        {(["court", "record", "chain"] as const).map((name) => (
          <button
            key={name}
            type="button"
            className={`tab${tab === name ? " on" : ""}`}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </nav>

      <div className="columns">
        <Record caseFile={caseFile} />

        <Court
          caseFile={caseFile}
          turns={turns}
          live={live}
          scene={scene}
          onSpeechDone={() => setSpoken(true)}
        >
          <div className="compose">
            {error ? <div className="error">{error}</div> : null}
            <div className="label">
              <span>Your move</span>
              <span>
                {draft.length}/{LIMIT}
              </span>
            </div>
            <textarea
              ref={box}
              value={draft}
              maxLength={LIMIT}
              disabled={busy || Boolean(verdict)}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void submit();
                }
              }}
              placeholder="Your Honour, Exhibit 5 shows the tray was collected at 02:52 and not sealed until 09:10…"
              aria-label="Your argument to the court"
            />
            <div className="row">
              <span className="hint">Enter files it · Shift+Enter for a new line</span>
              <button
                className="submit"
                type="button"
                onClick={() => void submit()}
                disabled={busy || Boolean(verdict) || draft.trim().length < 2}
              >
                {busy ? "In session" : "File it"}
              </button>
            </div>
          </div>
        </Court>

        <StatePanel caseFile={caseFile} chain={chain} jury={jury} history={turns.map(toTurn)} />
      </div>

      {verdict ? (
        <VerdictCard
          caseFile={caseFile}
          verdict={verdict}
          history={turns}
          onNewTrial={() => void startTrial()}
        />
      ) : null}

      {brief ? (
        <div className="brief" role="dialog" aria-modal="true" aria-label="How this works">
          <div className="brief-card">
            <span className="label">How this works</span>
            <h2>You are the defence.</h2>
            <p>
              The State&rsquo;s case is built on five links. Three of them are defective. Find the
              defects in the exhibits and witness statements, then say so to the court in your own
              words.
            </p>
            <ol>
              <li>
                <b>Read the record.</b> The State&rsquo;s claims are on the right; what the exhibits
                actually say is on the left.
              </li>
              <li>
                <b>Argue one exchange at a time.</b> Name the exhibit and draw the contradiction. A
                general objection does nothing.
              </li>
              <li>
                <b>The court scores you.</b> A decision model reads every exchange and says what you
                attacked, how hard, and whether you reached a real defect. The prosecutor answers.
              </li>
            </ol>
            <p style={{ fontSize: 14, color: "var(--muted)" }}>
              {caseFile.rounds} exchanges. Eight of twelve jurors acquits. Two broken links end the
              case on the spot.
            </p>
            <button className="submit" type="button" onClick={() => setBrief(false)}>
              Take the floor
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
