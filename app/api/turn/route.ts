import { closingRemarks } from "@/lib/closing";
import { clientIp, rateLimited } from "@/lib/limit";
import { endOfTrial, resolveExchange, verdictOf } from "@/lib/mechanics";
import { prosecute } from "@/lib/prosecute";
import { readDefense } from "@/lib/read";
import { readExchange } from "@/lib/ruling";
import type { CaseFile, ChainLink, Exchange, TranscriptTurn } from "@/lib/types";
import { LINK_ORDER } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface TurnBody {
  case: CaseFile;
  chain: ChainLink[];
  jury: number;
  round: number;
  history: TranscriptTurn[];
  argument: string;
}

function fail(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

function checkCase(value: unknown): CaseFile {
  const c = value as CaseFile;
  if (!c || typeof c !== "object") throw new Error("missing case");
  if (typeof c.id !== "string" || typeof c.charge !== "string") throw new Error("case is not a case file");
  if (!Array.isArray(c.links) || c.links.length !== LINK_ORDER.length) throw new Error("case chain is malformed");
  if (!Array.isArray(c.exhibits) || !Array.isArray(c.witnesses)) throw new Error("case record is malformed");
  if (!Array.isArray(c.flaws) || c.flaws.length === 0) throw new Error("case has no defects");
  for (const flaw of c.flaws) {
    if (typeof flaw.id !== "string" || typeof flaw.thesis !== "string" || !LINK_ORDER.includes(flaw.link)) {
      throw new Error("case defect is malformed");
    }
  }
  if (typeof c.rounds !== "number" || typeof c.startJury !== "number") throw new Error("case clock is malformed");
  return c;
}

function checkChain(value: unknown, caseFile: CaseFile): ChainLink[] {
  if (!Array.isArray(value) || value.length !== LINK_ORDER.length) throw new Error("chain state is malformed");
  return LINK_ORDER.map((key) => {
    const found = (value as ChainLink[]).find((link) => link.key === key);
    if (!found || typeof found.integrity !== "number") throw new Error(`chain link ${key} is missing`);
    const source = caseFile.links.find((link) => link.key === key);
    return {
      key,
      label: source?.label ?? key,
      claim: source?.claim ?? found.claim,
      integrity: Math.min(100, Math.max(0, Math.round(found.integrity))),
    };
  });
}

export async function POST(request: Request) {
  if (rateLimited(clientIp(request))) {
    return fail("this courtroom is at capacity, try again shortly", 429);
  }

  let body: TurnBody;
  try {
    body = (await request.json()) as TurnBody;
  } catch {
    return fail("the request was not JSON");
  }

  let caseFile: CaseFile;
  let chain: ChainLink[];
  try {
    caseFile = checkCase(body.case);
    chain = checkChain(body.chain, caseFile);
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }

  const argument = String(body.argument ?? "").replace(/\s+/g, " ").trim().slice(0, 900);
  if (argument.length < 2) return fail("say something to the court");
  const round = Math.max(1, Math.min(caseFile.rounds, Math.round(Number(body.round) || 1)));
  const jury = Math.max(0, Math.min(100, Math.round(Number(body.jury ?? caseFile.startJury))));
  const history = Array.isArray(body.history) ? body.history.slice(-caseFile.rounds) : [];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event, data })}\n\n`));
      };

      try {
        const defense = await readDefense(caseFile, history, argument);
        send("read", { read: defense.read, round, ms: defense.ms });

        const prosecution = await prosecute(caseFile, history, argument, defense.read);
        send("reply", {
          reply: prosecution.reply,
          objection: prosecution.objection,
          voice: prosecution.whisper,
          ms: prosecution.ms,
        });

        const exchangeRead = await readExchange(
          caseFile,
          argument,
          prosecution.reply,
          prosecution.objection,
          defense.read,
        );
        const alreadyFound = new Set<string>();
        for (const earlier of history) {
          for (const flaw of earlier.read.flaws) if (flaw.p >= 0.62) alreadyFound.add(flaw.id);
        }
        const resolution = resolveExchange(caseFile, chain, jury, defense.read, {
          rebuttal: exchangeRead.rebuttal,
          sustained: exchangeRead.sustained,
          overreach: exchangeRead.overreach,
          alreadyFound: [...alreadyFound],
        });

        const ruling = prosecution.objection
          ? {
              ground: prosecution.objection.ground,
              sustained: exchangeRead.sustained,
              probability: exchangeRead.sustainedP,
            }
          : null;

        const turn: TranscriptTurn = {
          round,
          argument,
          read: defense.read,
          reply: prosecution.reply,
          objection: prosecution.objection,
          ruling,
          rebuttal: exchangeRead.rebuttal,
          link: defense.read.link,
          damage: resolution.damage,
          broken: resolution.broken,
          juryAfter: resolution.jury,
        };

        const historyAfter = [...history, turn];
        const finished = endOfTrial(caseFile, round, resolution.chain);
        const verdict = finished ? verdictOf(caseFile, resolution.chain, resolution.jury, historyAfter) : null;
        if (verdict) verdict.remarks = await closingRemarks(caseFile, verdict);

        const exchange: Exchange = {
          argument,
          read: defense.read,
          reply: prosecution.reply,
          objection: prosecution.objection,
          ruling,
          rebuttal: exchangeRead.rebuttal,
          damage: resolution.damage,
          broken: resolution.broken,
          jury: resolution.jury,
          chain: resolution.chain,
          round,
          verdict,
          voice: prosecution.whisper,
          latency: { read: defense.ms, reply: prosecution.ms, ruling: exchangeRead.ms },
        };
        send("result", exchange);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("turn failed:", message);
        send("error", { error: `the court could not be convened: ${message}` });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
