import type { Defendant, Exhibit, Witness } from "../types";
import { int, pick, type Rng } from "./rng";

export interface DraftExhibit extends Omit<Exhibit, "id"> {
  key: string;
}
export interface DraftWitness extends Omit<Witness, "id"> {
  key: string;
}

export interface Ctx {
  rnd: Rng;
  defendant: Defendant;
  victim: string;
  place: string;
  street: string;
  district: string;
  date: string;
  weekday: string;
  incident: number;
  clock: (minutes: number) => string;
  time: string;
  at: (offset: number) => string;
  before: (days: number) => string;
  after: (days: number) => string;
  officer: string;
  detective: string;
  examiner: string;
  judge: string;
  prosecutor: string;
  amount: string;
  distance: string;
  cast: string[];
  takeName: () => string;
  gender: "m" | "f";
  exhibits: DraftExhibit[];
  witnesses: DraftWitness[];
}

const MALE_FIRST = [
  "Dana", "Marlow", "Teodor", "Osric", "Cyrus", "Emeka", "Anton", "Lorcan", "Kwame", "Ivo",
  "Rafael", "Saul", "Idris", "Bram", "Nikos", "Hugo", "Amos", "Karim", "Vaughn", "Soren",
];
const FEMALE_FIRST = [
  "Ines", "Rue", "Halina", "Nadia", "Bettina", "Yusra", "Priya", "Delphine", "Sana", "Maren",
  "Rosa", "Tilda", "Noor", "Ewa", "Camille", "Aisha", "Wren", "Odile", "Iris", "Nadine",
];
const LAST = [
  "Vance", "Okonjo", "Ruiz", "Halloran", "Becker", "Ferreira", "Nowak", "Adeyemi", "Kowal",
  "Lindqvist", "Bhatt", "Moreau", "Escobar", "Yilmaz", "Sandoval", "Petrov", "Nakamura",
  "Achterberg", "Duarte", "Whitlock",
];
const OCCUPATIONS = [
  "night warehouse loader", "diesel mechanic", "line cook", "school bus driver", "roofer",
  "hospital porter", "long-haul dispatcher", "laundromat owner", "graveyard-shift nurse",
];
const RECORDS = [
  "No prior record.",
  "One prior: a 2019 misdemeanour for trespass, no jail time.",
  "Two priors, both more than eight years old, neither for a violent offence.",
];
const VENUES = [
  { name: "the Quick-Ee Mart", street: "Halstead Avenue" },
  { name: "the Halstead depot", street: "Deacon Row" },
  { name: "the Cormorant Laundromat", street: "Cormorant Street" },
  { name: "the Anselm storage yard", street: "Anselm Road" },
  { name: "Ferrier Cold Storage", street: "Ferrier Lane" },
  { name: "the Brindle Road garage", street: "Brindle Road" },
];
const DISTRICTS = ["the Fifth District", "the North Ward", "Riverside", "the Docks", "Kestrel Heights"];
const OFFICERS = ["Sgt. A. Reyes", "Off. J. Mallory", "Det. C. Okonjo", "Off. P. Kwan", "Sgt. M. Duarte"];
const EXAMINERS = ["Dr. E. Sarkis", "Dr. L. Mbeki", "Dr. H. Prosser"];
const JUDGES = ["Hon. Imre Korda"];
const PROSECUTORS = ["ADA Vera Halvorsen"];
const MONTHS = ["March", "October", "January", "June", "November", "April"];
const WEEKDAYS = ["Tuesday", "Thursday", "Saturday", "Monday", "Wednesday"];

/** Dates in this record are day-and-month only; the fiction does not need leap years. */
export function dayOf(date: string, offset: number): string {
  const [dayText, month] = date.split(" ");
  let day = Number(dayText) + offset;
  let index = MONTHS.indexOf(month);
  while (day < 1) {
    index = (index + MONTHS.length - 1) % MONTHS.length;
    day += 30;
  }
  while (day > 30) {
    index = (index + 1) % MONTHS.length;
    day -= 30;
  }
  return `${day} ${MONTHS[index]}`;
}

export function clockOf(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function makeCtx(rnd: Rng, caseId: string, gender: "m" | "f"): Ctx {
  const usedFirst = new Set<string>();
  const firstOf = (pool: readonly string[]): string => {
    for (let attempt = 0; attempt < 40; attempt++) {
      const name = pick(rnd, pool);
      if (!usedFirst.has(name)) {
        usedFirst.add(name);
        return name;
      }
    }
    return pick(rnd, pool);
  };
  const person = (g: "m" | "f"): string =>
    `${firstOf(g === "m" ? MALE_FIRST : FEMALE_FIRST)} ${pick(rnd, LAST)}`;

  const venue = pick(rnd, VENUES);
  const defendantName = person(gender);
  const cast = Array.from({ length: 7 }, (_, i) => person(i % 2 === 0 ? "m" : "f"));
  let deck = 0;
  const incident = int(rnd, 0, 300) + (rnd() > 0.5 ? 0 : 1200);
  const dateValue = `${int(rnd, 9, 27)} ${pick(rnd, MONTHS)}`;
  const amount = `$${int(rnd, 6, 48) * 500 + 250}`;
  const ctx: Ctx = {
    rnd,
    defendant: {
      name: defendantName,
      age: int(rnd, 24, 57),
      occupation: pick(rnd, OCCUPATIONS),
      record: pick(rnd, RECORDS),
    },
    victim: person(gender),
    place: venue.name,
    street: venue.street,
    district: pick(rnd, DISTRICTS),
    date: dateValue,
    weekday: pick(rnd, WEEKDAYS),
    incident,
    clock: clockOf,
    time: clockOf(incident),
    at: (offset: number) => clockOf(incident + offset),
    before: (days: number) => dayOf(dateValue, -days),
    after: (days: number) => dayOf(dateValue, days),
    officer: pick(rnd, OFFICERS),
    detective: pick(rnd, OFFICERS),
    examiner: pick(rnd, EXAMINERS),
    judge: pick(rnd, JUDGES),
    prosecutor: pick(rnd, PROSECUTORS),
    amount,
    distance: `${int(rnd, 2, 9)}.${int(rnd, 1, 9)} miles`,
    cast,
    takeName: () => cast[deck++ % cast.length],
    gender,
    exhibits: [],
    witnesses: [],
  };
  void caseId;
  return ctx;
}

export function exhibit(ctx: Ctx, key: string, label: string, detail: string): string {
  ctx.exhibits.push({ key, label, detail });
  return `{{${key}}}`;
}

export function witness(ctx: Ctx, key: string, name: string, role: string, statement: string): string {
  ctx.witnesses.push({ key, name, role, statement });
  return name;
}

export function money(rnd: Rng, min: number, max: number): string {
  return `$${(int(rnd, min, max) * 100 + 50).toLocaleString("en-US")}`;
}
