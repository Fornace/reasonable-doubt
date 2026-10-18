import { exhibit, witness, type Ctx } from "./pools";
import type { CaseModule } from "./template";

export const arson: CaseModule = {
  key: "arson",
  gender: "m",
  build: (c) => {
  const guard = c.takeName();
  const neighbour = c.takeName();
  const marshal = c.takeName();
  const driftMinutes = 40 + Math.floor(c.rnd() * 20);
  const carHours = 6 + Math.floor(c.rnd() * 5);
  const firedWeeks = 2 + Math.floor(c.rnd() * 4);
  const fenceWeeks = 4 + Math.floor(c.rnd() * 5);

  return {
    charge: "Arson in the first degree",
    rounds: 7,
    startJury: 41,
    setting: `${c.weekday} ${c.date}, alarm ${c.time} — ${c.place}, ${c.street}, ${c.district}.`,
    incident: `A fire started in the loading bay of ${c.place} at ${c.time}. The building was empty and nobody was hurt. Damage is assessed at ${c.amount}. ${c.defendant.name} had been dismissed from the site ${firedWeeks} weeks earlier. A plastic jerry can was found in the yard, and a boot print was lifted from the fence line.`,
    theory: `The State says ${c.defendant.name} cut the fence, poured what was in the can, and lit it. The fence-line camera caught a man of his build at ${c.at(-6)}, and his phone was on the mast that covers the yard. The can carries a print from his right thumb. He was dismissed ${firedWeeks} weeks earlier and had been told he would not be rehired.`,
    links: {
      identity: `The fence-line camera {{fencecam}} caught a man in a work jacket at ${c.at(-6)}, and the boot print {{boot}} matches ${c.defendant.name}'s size and wear pattern.`,
      timeline: `The alarm panel logged heat in the loading bay at ${c.time}, and ${c.defendant.name}'s phone hit the mast covering the yard at ${c.at(-6)}.`,
      forensics: `A right thumb print was developed on the handle of the jerry can {{can}} found eleven metres from the loading bay door.`,
      custody: `${c.officer} bagged the can at the scene and it reached the property store {{intake}} the same morning.`,
      motive: `${c.defendant.name} was dismissed for cause ${firedWeeks} weeks earlier, and the stock in the bay was insured for ${c.amount}. The State says he burned the place out of spite and the policy is the reason the fire was set at all.`,
    },
    clientStatement: `I was on the north site that night, ${c.street} side, from 22:00 until four. I clock in and I clock out. I have a can like that in my own garage, they sell them at the hardware place on the corner. I did not go near ${c.place}.`,
    base: (ctx) => {
      exhibit(ctx, "fencecam", "Fence-line camera export",
        `Frame 4471, burned-in time ${c.at(-6)}. A figure in a dark work jacket crosses the fence line at the north-east corner, carrying nothing visible. The camera records continuously, one frame every two seconds.`);
      exhibit(ctx, "boot", "Footwear impression report",
        `One partial impression, right boot, size 44, block tread with two saw cuts. Consistent with the brand issued to site staff. No unique wear marks; four hundred pairs were issued at the depot.`);
      exhibit(ctx, "can", "Lab report, jerry can",
        `One 20 litre polyethylene can, empty, residual mineral spirits. One latent, right thumb, on the handle. Two ridge points and a delta. The can has no cap.`);
      exhibit(ctx, "intake", "Property store receipt",
        `Jerry can received ${c.at(240)}, bagged at the scene, seal intact on arrival, sealed by ${c.officer}. Bag number 00447.`);
      exhibit(ctx, "policy", "Insurance schedule",
        `Policy on plant and stock, ${c.amount}, scheduled to renew in eight weeks. Premium paid. Previous claim: none in eleven years.`);
      witness(ctx, "guard", guard, "Night security, north site",
        `${c.defendant.name} was on my sheet all night. I saw him at the gate at ${c.at(-70)} and again at ${c.at(120)} when he took his break. He does not leave the site on shift, the gate logs it.`);
      witness(ctx, "neighbour", neighbour, "Resident, opposite the yard",
        `I woke up because of the light. I saw a person running along the fence away from the fire. I could not say who. Medium build, dark top. It could have been anyone.`);
      witness(ctx, "marshal", marshal, "Fire investigator",
        `Origin at the loading bay, single seat, accelerant pour pattern on the concrete. The dog alerted on the can in the yard. The can is the only accelerant container recovered.`);
      exhibit(ctx, "gate", "North site gate log",
        `Badge 3381, ${c.defendant.name}: in ${c.at(-250)}, out ${c.at(310)}. No other movements on the badge. The gate reader is on the only vehicle entrance.`);
    },
    flaws: [
      (ctx) => {
        exhibit(ctx, "drift", "Camera time sync and clock drift log",
          `Unit NVR-04. Last manual time set 61 days before the fire. Drift measured at the scene: the burned-in time runs ${driftMinutes} minutes ahead of the reference clock. Frame 4471 burned-in ${c.at(-6)} is therefore ${c.at(-6 - driftMinutes)} by the reference clock.`);
        return {
          id: "clock-drift",
          name: "The camera clock runs fast",
          link: "identity",
          thesis: `The fence camera's burned-in time is ${driftMinutes} minutes fast: the drift log {{drift}} puts frame 4471 at ${c.at(-6 - driftMinutes)} by the reference clock, when the gate log {{gate}} has the defendant inside the north site and the security guard has him at the gate.`,
          tell: `A drift log that turns the ${c.at(-6)} sighting into ${c.at(-6 - driftMinutes)}, against a gate log that places him elsewhere.`,
        };
      },
      (ctx) => {
        exhibit(ctx, "solvent", "Lab comparison, mineral spirits",
          `The residual in the can is mineral spirits, petroleum distillate, no additive package. The site parts washer uses the same grade from the same supplier. Eleven containers of that grade were on site in the bay at the time of the fire.`);
        return {
          id: "common-solvent",
          name: "The accelerant is the site's own solvent",
          link: "forensics",
          thesis: `The "accelerant" is mineral spirits identical to the site's own parts-washer grade {{solvent}}, and eleven containers of it were in the bay that night, so the can's contents identify nobody.`,
          tell: "The same solvent the site used in its own parts washer, stored in the same bay.",
        };
      },
      (ctx) => {
        const initials = 2 + Math.floor(ctx.rnd() * 3);
        exhibit(ctx, "car", "Patrol vehicle movement log",
          `Vehicle 214: can placed in the trunk at ${c.at(52)}. Trunk opened at ${c.at(carHours * 60)} for an unrelated call, another bag removed. Can received at the property store ${c.at(carHours * 60 + 40)}. The bag is recorded as "resealed at store" with ${initials} initials on the seal.`);
        return {
          id: "trunk",
          name: "The can rode in a patrol trunk",
          link: "custody",
          thesis: `The can spent ${carHours} hours in the trunk of a patrol car, the trunk was opened for another call, and the seal carries ${initials} different initials {{car}}, so the print on the handle cannot be tied to the night of the fire.`,
          tell: `An unsealed trunk, an unrelated opening, and a seal with several hands on it.`,
        };
      },
      (ctx) => {
        exhibit(ctx, "payroll", "Dismissal file and final pay",
          `Dismissal for cause, ${firedWeeks} weeks before the fire. Final pay issued, ${c.amount} withheld pending a tool return. Tools returned and signed for two weeks later. Rehire status: eligible. Two other staff were dismissed the same week for the same reason.`);
        return {
          id: "rehire",
          name: "He was eligible for rehire",
          link: "motive",
          thesis: `The motive is a dismissal, but the file {{payroll}} shows the withheld pay was released on return of the tools, two other men were dismissed the same week, and his rehire status is listed as eligible, so there was no grudge to burn a building over.`,
          tell: "Rehire eligible, tools returned, pay released, and two others dismissed the same week.",
        };
      },
      (ctx) => {
        exhibit(ctx, "fencework", "Maintenance request, north-east fence",
          `Request 88-14, ${fenceWeeks} weeks before the fire: "north-east fence cut, temporary repair, replace panel". Closed as completed. Photograph attached shows the same gap. The panel was never replaced.`);
        return {
          id: "fence-old",
          name: "The fence was already open",
          link: "identity",
          thesis: `The cut fence is offered as his entry, but the maintenance request {{fencework}} shows the north-east fence was cut and left open ${fenceWeeks} weeks earlier, so anybody could walk in and the cut proves no entry by him.`,
          tell: `A closed maintenance ticket for the same cut, ${fenceWeeks} weeks earlier.`,
        };
      },
      (ctx) => {
        exhibit(ctx, "printwork", "Print comparison note",
          `The latent on the handle is a two-point match. Two points is the minimum the lab will report. The examiner's note: "not suitable for identification; reported as association of the batch, not of a person." The same thumb appears on twelve cans in the site's stores inventory.`);
        return {
          id: "two-point",
          name: "A two-point print is not an identification",
          link: "forensics",
          thesis: `The print on the handle is a two-point match, and the examiner's own note {{printwork}} says it is not suitable for identification and matches twelve cans in the site stores, so it does not put his hand on that can.`,
          tell: "The examiner's note limits the match to a batch of cans, not a person.",
        };
      },
    ],
  };
},
};
