import { postGateway } from "./gateway";

export type Question =
  | { type: "noul"; instructions: string; criteria?: { true: string; false: string } }
  | { type: "choice"; instructions: string; criteria: Record<string, string> }
  | { type: "score"; instructions: string; criteria: string[] };

export type Answer =
  | { type: "noul"; noul: number }
  | { type: "choice"; choice: string; confidence: number }
  | { type: "score"; score: number; confidence: number };

export interface JevRead {
  answers: Record<string, Answer>;
  ms: number;
}

const MODEL = "fornace-jev";

/**
 * One typed decision set per read of the state. The gateway validates both
 * directions, so a malformed question or answer is an error here, never a
 * silently invented score.
 */
export async function askJev(state: string, questions: Record<string, Question>): Promise<JevRead> {
  const { json, ms } = await postGateway("/v1/systemone", { model: MODEL, state, questions });
  const body = json as { answers?: Record<string, Answer> };
  const answers = body.answers;
  if (!answers || typeof answers !== "object") throw new Error("jev returned no answers object");

  const defects: string[] = [];
  for (const [name, question] of Object.entries(questions)) {
    const answer = answers[name];
    if (!answer || answer.type !== question.type) {
      defects.push(`${name}: expected ${question.type}, got ${answer?.type ?? "nothing"}`);
      continue;
    }
    if (question.type === "noul" && answer.type === "noul") {
      if (!(answer.noul >= 0 && answer.noul <= 1)) defects.push(`${name}: noul ${answer.noul} outside 0..1`);
    }
    if (question.type === "choice" && answer.type === "choice") {
      if (!(answer.choice in question.criteria)) defects.push(`${name}: chose ${answer.choice}, not offered`);
    }
    if (question.type === "score" && answer.type === "score") {
      if (!(answer.score >= 0 && answer.score <= question.criteria.length - 1)) {
        defects.push(`${name}: score ${answer.score} outside the rubric`);
      }
    }
  }
  if (defects.length) throw new Error(`jev incomplete answer: ${defects.join("; ")}`);
  return { answers, ms };
}

export function noul(answers: Record<string, Answer>, name: string): number {
  const answer = answers[name];
  if (!answer || answer.type !== "noul") throw new Error(`jev: ${name} is not a noul answer`);
  return answer.noul;
}

export function choice(answers: Record<string, Answer>, name: string): string {
  const answer = answers[name];
  if (!answer || answer.type !== "choice") throw new Error(`jev: ${name} is not a choice answer`);
  return answer.choice;
}

export function score(answers: Record<string, Answer>, name: string): number {
  const answer = answers[name];
  if (!answer || answer.type !== "score") throw new Error(`jev: ${name} is not a score answer`);
  return answer.score;
}
