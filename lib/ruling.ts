import { renderDocket } from "./docket";
import { askJev, noul, score, type Question } from "./jev";
import type { CaseFile, DefenseRead } from "./types";

const REBUTTAL_LEVELS = [
  "evades the point without answering it",
  "answers in general terms the defence can come back to",
  "answers the specific point with the record",
  "turns the point against the defence and leaves it worse than before",
];

export interface ExchangeRead {
  rebuttal: number;
  sustained: boolean;
  sustainedP: number;
  overreach: number;
  ms: number;
}

export async function readExchange(
  caseFile: CaseFile,
  argument: string,
  reply: string,
  objection: { ground: string; quote: string } | null,
  read: DefenseRead,
): Promise<ExchangeRead> {
  const quoted = argument.replace(/\s+/g, " ").trim();
  const questions: Record<string, Question> = {
    rebuttal: {
      type: "score",
      instructions: `The defence argued: "${quoted}" The prosecution answered: "${reply}" How well does that answer hold against the defence's point? Judge the exchange, not either side in isolation.`,
      criteria: REBUTTAL_LEVELS,
    },
    overreach: {
      type: "noul",
      instructions: `The prosecution answered the defence with: "${reply}" Does it assert a fact, a document or a witness that is not in the record, or misstate what the record says?`,
      criteria: { true: "misstates or invents record material", false: "stays inside the record" },
    },
  };

  if (objection) {
    questions.sustained = {
      type: "noul",
      instructions: `The prosecution objected on the ground of ${objection.ground} to the defence saying: "${objection.quote}". Under the ordinary rules of evidence, and with this record, would the court sustain that objection?`,
      criteria: { true: "sustained: the objection is well taken", false: "overruled: the objection fails" },
    };
  } else {
    questions.sustained = {
      type: "noul",
      instructions: `The prosecution made no objection to the defence saying: "${quoted}". Would a court nevertheless have been likely to strike that argument on its own motion?`,
      criteria: { true: "the court would strike it", false: "no" },
    };
  }

  const state = [
    renderDocket(caseFile),
    `THE DEFENCE ARGUED: "${quoted}"`,
    `THE PROSECUTION ANSWERED: "${reply}"`,
    `Defects the defence reached: ${read.flaws.filter((f) => f.p >= 0.62).map((f) => f.name).join("; ") || "none"}.`,
  ].join("\n\n");

  const { answers, ms } = await askJev(state, questions);
  return {
    rebuttal: score(answers, "rebuttal"),
    overreach: noul(answers, "overreach"),
    sustainedP: noul(answers, "sustained"),
    sustained: Boolean(objection) && noul(answers, "sustained") >= 0.5,
    ms,
  };
}
