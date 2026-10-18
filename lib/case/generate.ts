import { int, makeRng, pick, sample, shuffle } from "./rng";
import { makeCtx } from "./pools";
import { arson } from "./arson";
import { fraud } from "./fraud";
import { murder } from "./murder";
import { robbery } from "./robbery";
import type { CaseModule } from "./template";
import type { CaseFile, ChainLink, Flaw } from "../types";
import { LINK_LABEL, LINK_ORDER } from "../types";

const MODULES: CaseModule[] = [robbery, murder, arson, fraud];
const COURTS = ["Superior Court, Criminal Term, Part 4", "Superior Court, Criminal Term, Part 11"];
const SEED_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function freshSeed(): string {
  let out = "";
  for (let i = 0; i < 6; i++) out += SEED_ALPHABET[Math.floor(Math.random() * SEED_ALPHABET.length)];
  return out;
}

function resolveTokens(text: string, tokens: Map<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = tokens.get(key);
    if (value === undefined) {
      throw new Error(`case generation left an unresolved token: ${match}`);
    }
    return value;
  });
}

export function generateCase(seedInput?: string): CaseFile {
  const seed = (seedInput ?? freshSeed()).toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 24) || freshSeed();
  const rnd = makeRng(seed);
  const module = pick(rnd, MODULES);
  const ctx = makeCtx(rnd, seed, module.gender);
  const body = module.build(ctx);

  body.base(ctx);
  const chosen = sample(rnd, body.flaws, 3);
  const flaws: Flaw[] = chosen.map((factory) => factory(ctx));

  const exhibits = shuffle(rnd, ctx.exhibits).map((item, index) => ({
    key: item.key,
    id: `Exhibit ${index + 1}`,
    label: item.label,
    detail: item.detail,
  }));
  const tokens = new Map<string, string>();
  exhibits.forEach((item) => tokens.set(item.key, `(${item.id})`));
  ctx.witnesses.forEach((item) => tokens.set(item.key, item.name));

  const links: ChainLink[] = LINK_ORDER.map((key) => ({
    key,
    label: LINK_LABEL[key],
    claim: resolveTokens(body.links[key], tokens),
    integrity: 100,
  }));

  return {
    id: `CR-${int(rnd, 24, 26)}-${int(rnd, 1000, 9999)}`,
    seed,
    charge: body.charge,
    chargeKey: module.key,
    court: pick(rnd, COURTS),
    defendant: ctx.defendant,
    victim: ctx.victim,
    setting: body.setting,
    incident: resolveTokens(body.incident, tokens),
    theory: resolveTokens(body.theory, tokens),
    links,
    exhibits: exhibits.map(({ key: _key, ...rest }) => rest),
    witnesses: ctx.witnesses.map(({ key: _key, ...rest }, index) => ({ id: `w${index + 1}`, ...rest })),
    clientStatement: resolveTokens(body.clientStatement, tokens),
    opening: resolveTokens(body.theory, tokens),
    flaws: flaws.map((flaw) => ({
      ...flaw,
      thesis: resolveTokens(flaw.thesis, tokens),
      tell: resolveTokens(flaw.tell, tokens),
    })),
    rounds: body.rounds,
    startJury: body.startJury,
  };
}
