import type { Flaw, LinkKey } from "../types";
import type { Ctx } from "./pools";

export type FlawFactory = (c: Ctx) => Flaw;

export interface CaseBody {
  charge: string;
  rounds: number;
  startJury: number;
  setting: string;
  incident: string;
  theory: string;
  links: Record<LinkKey, string>;
  clientStatement: string;
  base: (c: Ctx) => void;
  flaws: FlawFactory[];
}

export type CaseBuilder = (c: Ctx) => CaseBody;

export interface CaseModule {
  key: string;
  gender: "m" | "f";
  build: CaseBuilder;
}
