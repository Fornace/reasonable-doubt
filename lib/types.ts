export type LinkKey = "identity" | "timeline" | "forensics" | "custody" | "motive";

export const LINK_ORDER: LinkKey[] = ["identity", "timeline", "forensics", "custody", "motive"];

export const LINK_LABEL: Record<LinkKey, string> = {
  identity: "Identity",
  timeline: "Opportunity",
  forensics: "Physical proof",
  custody: "Chain of custody",
  motive: "Motive and intent",
};

export interface ChainLink {
  key: LinkKey;
  label: string;
  claim: string;
  integrity: number;
}

export interface Exhibit {
  id: string;
  label: string;
  detail: string;
}

export interface Witness {
  id: string;
  name: string;
  role: string;
  statement: string;
}

export interface Flaw {
  id: string;
  name: string;
  link: LinkKey;
  /** Exactly what defect the defense must identify. Used verbatim in the typed question. */
  thesis: string;
  /** The neutral-looking record line that carries the contradiction. */
  tell: string;
}

export interface Defendant {
  name: string;
  age: number;
  occupation: string;
  record: string;
}

export interface CaseFile {
  id: string;
  seed: string;
  charge: string;
  chargeKey: string;
  court: string;
  defendant: Defendant;
  victim: string;
  setting: string;
  incident: string;
  theory: string;
  links: ChainLink[];
  exhibits: Exhibit[];
  witnesses: Witness[];
  clientStatement: string;
  opening: string;
  flaws: Flaw[];
  rounds: number;
  startJury: number;
}

export interface TranscriptTurn {
  round: number;
  argument: string;
  read: DefenseRead;
  reply: string;
  objection: { ground: string; quote: string } | null;
  ruling: { ground: string; sustained: boolean; probability: number } | null;
  rebuttal: number;
  link: LinkKey | "none";
  damage: number;
  broken: LinkKey | null;
  juryAfter: number;
}

export interface DefenseRead {
  link: LinkKey | "none";
  force: number;
  technique: string;
  invents: number;
  concede: number;
  repeat: number;
  flaws: { id: string; name: string; p: number }[];
}

export interface Exchange {
  argument: string;
  read: DefenseRead;
  reply: string;
  objection: { ground: string; quote: string } | null;
  ruling: { ground: string; sustained: boolean; probability: number } | null;
  rebuttal: number;
  damage: number;
  broken: LinkKey | null;
  jury: number;
  chain: ChainLink[];
  round: number;
  verdict: Verdict | null;
  voice: string;
  latency: { read: number; reply: number; ruling: number };
}

export interface Verdict {
  outcome: "acquittal" | "hung" | "conviction" | "dismissed";
  headline: string;
  seats: number;
  broken: number;
  flawsFound: number;
  flawsTotal: number;
  remarks: string;
  scoreLine: string;
}

export interface CaseRequest {
  seed?: string;
}

export interface TurnRequest {
  case: CaseFile;
  chain: ChainLink[];
  jury: number;
  round: number;
  history: TranscriptTurn[];
  argument: string;
}
