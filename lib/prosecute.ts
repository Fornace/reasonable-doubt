import { PROSECUTOR_NAME, renderDocket, renderTranscript } from "./docket";
import { postGateway } from "./gateway";
import { TECHNIQUE_TEXT } from "./labels";
import type { CaseFile, DefenseRead, TranscriptTurn } from "./types";
import { LINK_LABEL } from "./types";

const MODEL = "fornace-flash";
const GROUNDS = ["none", "hearsay", "speculation", "relevance", "foundation", "argumentative"];

export interface Prosecution {
  reply: string;
  objection: { ground: string; quote: string } | null;
  whisper: string;
  ms: number;
}

const SYSTEM = `You are ${PROSECUTOR_NAME}, a twenty-year trial prosecutor for the State. You are in court, on your feet, arguing to the judge and the jury. You are clipped, concrete and relentless.

Rules you never break:
- Two or three sentences. Sixty words at most. Never more.
- Never concede a point, never praise the defence, never say counsel is right. Where a point is strong you attack its weight, its source or its relevance.
- Cite the record by exhibit, time, or witness name. You know the docket cold.
- You may object when there is a real evidentiary ground (speculation, hearsay, relevance, foundation, argumentative). Do not object just to interrupt.
- You speak to the court ("Your Honour", "the People"), never to the player as a person.

Return only JSON with these fields:
{"reply": "what you say to the court", "objection": {"ground": "one of ${GROUNDS.join("|")}", "quote": "the exact words of the defence you object to"} or null, "whisper": "at most ten words your client whispers to defence counsel"}`;

export async function prosecute(
  caseFile: CaseFile,
  history: TranscriptTurn[],
  argument: string,
  read: DefenseRead,
): Promise<Prosecution> {
  const flawHits = read.flaws.filter((f) => f.p >= 0.55);
  const readout = [
    `Attacks: ${read.link === "none" ? "nothing specific" : LINK_LABEL[read.link]}`,
    `Force: ${read.force.toFixed(2)} of 4`,
    `Technique: ${TECHNIQUE_TEXT[read.technique] ?? read.technique}`,
    flawHits.length ? `Defects the defence actually reached: ${flawHits.map((f) => f.name).join("; ")}` : `Defects reached: none`,
    `Asserts facts outside the record: ${read.invents >= 0.6 ? "yes" : "no"}`,
    `Concedes the State's case: ${read.concede >= 0.6 ? "yes" : "no"}`,
  ].join("\n");

  const user = [
    renderDocket(caseFile),
    `EXCHANGES SO FAR`,
    renderTranscript(history, 4),
    `The defence has just said, word for word: "${argument.trim()}"`,
    `An internal note on that argument, for your eyes only. Do not quote it, do not mention that you have it:`,
    readout,
    `Answer it now. If the defence reached a real defect, your job is to argue it does not defeat the charge.`,
  ].join("\n\n");

  const { json, ms } = await postGateway(
    "/v1/chat/completions",
    {
      model: MODEL,
      temperature: 0.75,
      max_tokens: 3000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: user },
      ],
    },
    60_000,
  );

  const body = json as {
    choices?: { message?: { content?: string }; finish_reason?: string }[];
  };
  const content = body.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`prosecutor returned no content (finish_reason ${body.choices?.[0]?.finish_reason ?? "none"})`);
  }

  let parsed: { reply?: unknown; objection?: unknown; whisper?: unknown };
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`prosecutor returned non-JSON: ${content.slice(0, 300)}`);
  }
  const reply = typeof parsed.reply === "string" ? parsed.reply.trim() : "";
  if (!reply) throw new Error(`prosecutor returned no reply: ${content.slice(0, 300)}`);

  let objection: Prosecution["objection"] = null;
  const raw = parsed.objection as { ground?: unknown; quote?: unknown } | null | undefined;
  if (raw && typeof raw === "object") {
    const ground = typeof raw.ground === "string" ? raw.ground.toLowerCase().trim() : "none";
    const quote = typeof raw.quote === "string" ? raw.quote.trim() : "";
    if (ground !== "none" && GROUNDS.includes(ground) && quote) objection = { ground, quote };
  }

  return {
    reply,
    objection,
    whisper: typeof parsed.whisper === "string" ? parsed.whisper.trim().slice(0, 90) : "",
    ms,
  };
}
