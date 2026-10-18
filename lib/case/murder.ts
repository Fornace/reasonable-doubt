import { exhibit, witness, type Ctx } from "./pools";
import type { CaseModule } from "./template";

export const murder: CaseModule = {
  key: "murder",
  gender: "m",
  build: (c) => {
  const neighbour = c.takeName();
  const bartender = c.takeName();
  const tech = c.takeName();
  const windowLo = 20 + Math.floor(c.rnd() * 15);
  const windowHi = windowLo + 80 + Math.floor(c.rnd() * 20);
  const lateBy = 40 + Math.floor(c.rnd() * 20);
  const towerMiles = 2 + Math.floor(c.rnd() * 3);
  const bagDays = 2 + Math.floor(c.rnd() * 3);
  const willMonths = 7 + Math.floor(c.rnd() * 5);

  return {
    charge: "Murder in the second degree",
    rounds: 7,
    startJury: 40,
    setting: `${c.weekday} ${c.date} — the lot behind ${c.place}, ${c.street}, ${c.district}.`,
    incident: `${c.victim} was found at ${c.at(200)} slumped in the driver's seat of a grey sedan with a fractured skull and no weapon in the car. ${c.defendant.name} had been drinking with him earlier that evening. The two were seen leaving the bar together at ${c.at(-95)}.`,
    theory: `The State says ${c.defendant.name} and ${c.victim} left the bar arguing over money, drove to the lot, and that ${c.defendant.name} struck him once and left him there. The victim's blood was on the cuff of ${c.defendant.name}'s jacket. His phone was on the mast by the lot at ${c.at(42)}. A neighbour saw the two of them leave the bar. The only person with a reason and an opportunity was ${c.defendant.name}.`,
    links: {
      identity: `${neighbour} watched ${c.defendant.name} and ${c.victim} leave the bar together at ${c.at(-95)}, and ${c.defendant.name}'s phone was on the mast covering the lot at ${c.at(42)}.`,
      timeline: `${c.examiner} puts death between ${c.at(windowLo)} and ${c.at(windowHi)}, inside the window when ${c.defendant.name} was near the lot.`,
      forensics: `${c.victim}'s blood was on the right cuff of the jacket {{jacket}} seized from ${c.defendant.name}'s flat.`,
      custody: `The jacket went to the lab with the rest of the seizure {{intake}} and was tested ${bagDays + 2} days later.`,
      motive: `${c.victim} was changing his will {{will}} and had told ${bartender} that ${c.defendant.name} would be looked after. That is the State's reason for the killing.`,
    },
    clientStatement: `I had two drinks with him and I left at ${c.at(-118)}. He was fine. He was talking about a boat. I walked home. When I heard he was dead I went to the lot and I touched him, I put my hand on his shoulder to see if he was breathing. That is why he is on my jacket.`,
    base: (ctx) => {
      exhibit(ctx, "jacket", "Forensic report, jacket cuff",
        `One contact transfer stain, 3 cm by 2 cm, victim's blood, right cuff. No spatter, no cast-off, no impact pattern anywhere on the garment. Garment examined ${c.after(3)}.`);
      exhibit(ctx, "intake", "Evidence intake sheet",
        `Seizure from the flat on ${c.after(0)}: one jacket, one pair of boots, two phones. Jacket placed in a plastic bag and not sealed. Property locker 14. Lab receipt ${c.after(bagDays)}.`);
      exhibit(ctx, "autopsy", "Autopsy summary",
        `Blunt force trauma, left parietal. Single impact. Body examined at the scene ${c.at(212)}. Time of death estimated from gastric contents and body temperature, interval ${c.at(windowLo)} to ${c.at(windowHi)}, the examiner noting that the ambient temperature makes the estimate a soft one.`);
      exhibit(ctx, "phone", "Cell site record",
        `Outgoing call ${c.at(42)}, 41 seconds, mast 1172. Mast 1172 serves a radius of ${towerMiles} miles across three sectors. The flat is ${(towerMiles - 1).toFixed(1)} miles from the mast.`);
      exhibit(ctx, "will", "Will, executed",
        `Executed ${willMonths} months before the death. Sole beneficiary: the victim's sister. ${c.defendant.name} is not named in the will or the codicil.`);
      witness(ctx, "neighbour", neighbour, "Neighbour, 40 metres from the bar door",
        `${c.defendant.name} and ${c.victim} came out at the same time. They were not shouting. I know ${c.defendant.name}'s walk. I have had trouble with him over the fence line for two years.`);
      witness(ctx, "bartender", bartender, "Bartender",
        `They had four drinks between them over an hour. No argument that I heard. ${c.victim} paid. ${c.defendant.name} left first, alone, and ${c.victim} stayed maybe twenty minutes more.`);
      witness(ctx, "tech", tech, "Crime scene technician",
        `The car was locked. No weapon in the vehicle or within 30 metres. No defensive wounds on the victim's hands. The driver's door was the only door with prints, and they were the victim's.`);
    },
    flaws: [
      (ctx) => {
        exhibit(ctx, "band", "Autopsy worksheet and margin note",
          `Body temperature 31.1 C at ${ctx.at(212)}. Ambient 9 C. Gastric contents partially digested, consistent with a meal 90 minutes to three hours earlier. ${ctx.examiner}'s worksheet widens the interval to ${ctx.at(windowLo - 10)} to ${ctx.at(windowHi + lateBy)}, and notes that death after ${ctx.at(windowHi)} is not excluded.`);
        return {
          id: "death-window",
          name: "The death window is wider than the charge",
          link: "timeline",
          thesis: `The autopsy {{autopsy}} interval is soft: the worksheet {{band}} widens it to ${ctx.at(windowLo - 10)} to ${ctx.at(windowHi + lateBy)}, which covers the hours after the defendant had left the bar and gone home, so the medical evidence does not place the death in his window.`,
          tell: "The examiner's own worksheet puts death as late as the small hours.",
        };
      },
      (ctx) => {
        const sector = 1 + Math.floor(ctx.rnd() * 3);
        exhibit(ctx, "sector", "Cell site engineering map",
          `Mast 1172 has three sectors of 120 degrees. Sector ${sector} covers the lot. The flat at ${ctx.street} is inside sector ${sector === 3 ? 3 : sector + 1}, at 1.4 miles, and is served by the same mast. An outgoing call from the flat logs identically to an outgoing call from the lot.`);
        return {
          id: "tower-sector",
          name: "The tower cannot separate two addresses",
          link: "identity",
          thesis: `The cell record {{phone}} cannot put him at the lot: the engineering map {{sector}} shows his own flat at ${ctx.street} sits inside the same mast footprint, and an outgoing call from home logs the same mast and sector.`,
          tell: "The flat is inside the same sector as the lot.",
        };
      },
      (ctx) => {
        exhibit(ctx, "transfer", "Stain morphology addendum",
          `The stain is a transfer, not impact: no satellite droplets, no directionality, edges consistent with contact against fabric at low velocity. Contact transfer is consistent with touching a body, a hand on a shoulder, or handling the victim's clothing.`);
        return {
          id: "contact-transfer",
          name: "The blood is a contact stain",
          link: "forensics",
          thesis: `The blood on the cuff {{jacket}} is a contact transfer, not impact spatter, and the addendum {{transfer}} says it is consistent with a hand on the shoulder, so it corroborates the account of finding the body rather than the killing.`,
          tell: "No spatter, no cast-off, and the morphology addendum says contact only.",
        };
      },
      (ctx) => {
        exhibit(ctx, "bags", "Property locker log",
          `Jacket logged on ${ctx.after(0)} into an unsealed plastic bag. Locker 14 opened six times before the lab receipt, none of the openings by the same officer, none with a reason recorded. Lab took possession on ${ctx.after(bagDays)}.`);
        return {
          id: "unsealed",
          name: "The jacket sat unsealed for days",
          link: "custody",
          thesis: `The jacket sat in an unsealed bag for ${bagDays} days {{bags}} while the locker was opened six times with no reason recorded, so the stain's presence on the cuff cannot be attributed to the night of the death.`,
          tell: `An unsealed bag and six unlogged locker openings over ${bagDays} days.`,
        };
      },
      (ctx) => {
        exhibit(ctx, "codicil", "Codicil and probate filing",
          `The will {{will}} was executed ${willMonths} months before the death. The sister is the sole beneficiary. A later handwritten note, unsigned, mentions "the money for the boat" and is not part of the instrument. Probate filed nine days after death.`);
        return {
          id: "no-beneficiary",
          name: "He inherits nothing",
          link: "motive",
          thesis: `The motive collapses on the instrument itself: the will {{will}} and the probate filing {{codicil}} show the sister is the sole beneficiary, the codicil is unsigned, and the defendant was never named, so there was nothing for him to gain.`,
          tell: "The will names the sister, and the only mention of him is an unsigned note.",
        };
      },
      (ctx) => {
        exhibit(ctx, "complaints", "Two police reports and a civil filing",
          `Report 1: fence-line dispute three years ago, no charge. Report 2: a complaint by the neighbour about a dog, withdrawn. Civil filing: a boundary claim the neighbour lost.`);
        return {
          id: "grudge",
          name: "The eyewitness has a grudge",
          link: "identity",
          thesis: `The only sighting comes from ${neighbour}, who lost a boundary claim and filed two complaints against the defendant {{complaints}}, so the identification is the word of a man with a reason to give it.`,
          tell: "A lost boundary case and two withdrawn complaints behind the identification.",
        };
      },
    ],
  };
},
};
