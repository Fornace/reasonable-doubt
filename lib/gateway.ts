const DEFAULT_BASE = "https://llm.fornace.net";

export function gatewayBase(): string {
  const raw = process.env.FORNACE_LLM_BASE_URL || process.env.MANTICE_BASE_URL || DEFAULT_BASE;
  const trimmed = raw.replace(/\/+$/, "");
  return trimmed.endsWith("/v1") ? trimmed.slice(0, -3) : trimmed;
}

export function gatewayKey(): string {
  const key = process.env.FORNACE_LLM_API_KEY || process.env.MANTICE_API_KEY;
  if (!key) throw new Error("gateway credential missing: set FORNACE_LLM_API_KEY");
  return key;
}

export interface GatewayReply {
  json: unknown;
  ms: number;
}

const TRANSIENT = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
const ATTEMPTS = 3;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Retries transport and 5xx failures only; a real rejection surfaces on the first attempt. */
export async function postGateway(path: string, body: unknown, timeoutMs = 60_000): Promise<GatewayReply> {
  const started = Date.now();
  let lastError = "";

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    let response: Response;
    try {
      response = await fetch(`${gatewayBase()}${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${gatewayKey()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt === ATTEMPTS) break;
      await sleep(600 * attempt);
      continue;
    }

    const text = await response.text();
    if (!response.ok) {
      lastError = `HTTP ${response.status}: ${text.slice(0, 300)}`;
      if (!TRANSIENT.has(response.status) || attempt === ATTEMPTS) break;
      await sleep(600 * attempt);
      continue;
    }
    try {
      return { json: JSON.parse(text) as unknown, ms: Date.now() - started };
    } catch {
      throw new Error(`${path} returned a non-JSON body: ${text.slice(0, 300)}`);
    }
  }

  throw new Error(`${path} failed after ${ATTEMPTS} attempts: ${lastError}`);
}
