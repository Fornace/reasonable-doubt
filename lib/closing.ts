import { JUDGE_NAME, PROSECUTOR_NAME, renderDocket } from "./docket";
import { postGateway } from "./gateway";
import type { CaseFile, Verdict } from "./types";

/** The one place the courtroom speaks after the verdict. Two short voices, no summary of the game. */
export async function closingRemarks(caseFile: CaseFile, verdict: Verdict): Promise<string> {
  const system = `You write the last thirty seconds of a courtroom drama. Return only JSON: {"remarks": "the judge's words to the court, 2-3 sentences, addressed to the parties and the jury, consistent with the verdict", "client": "one line the defendant says to counsel after the ruling, twelve words or fewer"}.
You are ${JUDGE_NAME}. Cold, precise, no speech-making. Never restate the plot, never explain the rules, never mention juries "seeing" evidence they did not see.`;

  const user = [
    renderDocket(caseFile),
    `VERDICT: ${verdict.headline}. ${verdict.scoreLine}.`,
    verdict.outcome === "dismissed"
      ? `The State's chain of proof broke in ${verdict.broken} places and the court is dismissing the charge.`
      : verdict.outcome === "acquittal"
        ? `The jury has acquitted on its own count of the evidence.`
        : verdict.outcome === "conviction"
          ? `The jury has convicted.`
          : `The jury could not agree and the court must declare a mistrial.`,
    `Write the ruling and the client's line.`,
  ].join("\n\n");

  const { json } = await postGateway("/v1/chat/completions", {
    model: "fornace-flash",
    temperature: 0.6,
    max_tokens: 3000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  const body = json as { choices?: { message?: { content?: string } }[] };
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error("closing returned no content");
  const parsed = JSON.parse(content) as { remarks?: unknown; client?: unknown };
  const remarks = typeof parsed.remarks === "string" ? parsed.remarks.trim() : "";
  const client = typeof parsed.client === "string" ? parsed.client.trim() : "";
  if (!remarks) throw new Error(`closing returned no remarks: ${content.slice(0, 200)}`);
  return client ? `${remarks}\n\n${client}` : remarks;
}

export const PROSECUTION_LABEL = PROSECUTOR_NAME;
