import { renderDocket, renderTranscript } from "./docket";
import { askJev, choice, noul, score, type Question } from "./jev";
import type { CaseFile, DefenseRead, LinkKey, TranscriptTurn } from "./types";
import { LINK_LABEL, LINK_ORDER } from "./types";
import { TECHNIQUE_TEXT } from "./labels";

const FORCE_LEVELS = [
  "no argument at all: a question, a feeling, or nothing a court can use",
  "a bare assertion with no part of the record attached to it",
  "competent: tied to the case, but general, and the State can answer it",
  "strong: names the exact exhibit, time or witness and draws the contradiction",
  "decisive: names the defect, shows why it defeats the charge, and cannot be answered",
];

export interface DefenseTurn {
  read: DefenseRead;
  ms: number;
}

export async function readDefense(
  caseFile: CaseFile,
  history: TranscriptTurn[],
  argument: string,
): Promise<DefenseTurn> {
  const quoted = argument.replace(/\s+/g, " ").trim();
  const prior = history.slice(-4).map((turn) => turn.argument.replace(/\s+/g, " ").trim().slice(0, 260));
  const questions: Record<string, Question> = {
    link: {
      type: "choice",
      instructions: `The defence counsel has just said, word for word: "${quoted}" Which link of the State's chain of proof is this argument attacking?`,
      criteria: {
        identity: "that it was the defendant who did this at all",
        timeline: "that it happened when and where the State says it did",
        forensics: "the physical or forensic evidence tying the defendant to the act",
        custody: "how the police, lab or bank handled the evidence and whether the record is complete",
        motive: "the defendant's reason, intent or gain",
        none: "it does not attack any particular link of the State's proof",
      },
    },
    technique: {
      type: "choice",
      instructions: `Defence counsel said: "${quoted}" What kind of move is that, as a courtroom technique?`,
      criteria: TECHNIQUE_TEXT,
    },
    force: {
      type: "score",
      instructions: `Defence counsel said: "${quoted}" As a court-ready argument in this trial, how strong is it? Judge only what was said, against the record.`,
      criteria: FORCE_LEVELS,
    },
    invents: {
      type: "noul",
      instructions: `Defence counsel said: "${quoted}" Does it assert as fact anything that is not in the record: a person, document, time or event that appears nowhere in the exhibits or witness statements?`,
      criteria: { true: "asserts facts outside the record", false: "stays inside the record" },
    },
    concede: {
      type: "noul",
      instructions: `Defence counsel said: "${quoted}" Does it concede part of the State's case, or harm the client's own defence?`,
      criteria: { true: "concedes or self-harms", false: "does not concede" },
    },
    repeat: {
      type: "noul",
      instructions: prior.length
        ? `Defence counsel said: "${quoted}" Counsel has already said the following to this court: ${prior.map((p) => `"${p}"`).join(" / ")}. Is the new statement substantially the same words making the same point with the same support, rather than a sharper or differently grounded version of it? A new exhibit, a new witness, a new inference or a direct answer to the prosecution's last answer is NOT the same argument.`
        : `Defence counsel said: "${quoted}" This is counsel's first argument to the court. Is it a restatement of something already said in this trial? Answer no unless the record already contains it.`,
      criteria: { true: "the same words and the same support, again", false: "new support or a new angle" },
    },
  };

  const flawQuestions: Record<string, Question> = {};
  caseFile.flaws.forEach((flaw, index) => {
    flawQuestions[`flaw_${index}`] = {
      type: "noul",
      instructions: `The State's proof has this weakness: ${flaw.thesis} Defence counsel said: "${quoted}" Does the argument put that weakness to the court? Answer true if the argument uses it, even in different words or only in part.`,
      criteria: { true: "the argument uses this weakness", false: "the argument does not reach it" },
    };
  });

  const state = [
    renderDocket(caseFile),
    `EXCHANGES SO FAR`,
    renderTranscript(history),
    `It is exchange ${history.length + 1} of ${caseFile.rounds}. Defence counsel has the floor.`,
  ].join("\n\n");

  const [style, defects] = await Promise.all([askJev(state, questions), askJev(state, flawQuestions)]);
  const answers = style.answers;
  const ms = Math.max(style.ms, defects.ms);
  const flaws = caseFile.flaws.map((flaw, index) => ({
    id: flaw.id,
    name: flaw.name,
    p: noul(defects.answers, `flaw_${index}`),
  }));
  const link = choice(answers, "link") as LinkKey | "none";
  return {
    read: {
      link,
      force: score(answers, "force"),
      technique: choice(answers, "technique"),
      invents: noul(answers, "invents"),
      concede: noul(answers, "concede"),
      repeat: noul(answers, "repeat"),
      flaws,
    },
    ms,
  };
}
