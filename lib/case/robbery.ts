import { exhibit, witness, type Ctx } from "./pools";
import type { CaseModule } from "./template";

const TAKINGS = ["$412", "$286", "$1,040", "$575"];

export const robbery: CaseModule = {
  key: "robbery",
  gender: "m",
  build: (c) => {
  const clerk = c.takeName();
  const customer = c.takeName();
  const responder = c.takeName();
  const takings = TAKINGS[Math.floor(c.rnd() * TAKINGS.length)];
  const cameraDistance = 9 + Math.floor(c.rnd() * 6);
  const hoodAngle = 35 + Math.floor(c.rnd() * 25);
  const gapHours = 5 + Math.floor(c.rnd() * 4);

  return {
    charge: "Robbery in the first degree",
    rounds: 7,
    startJury: 42,
    setting: `${c.weekday} ${c.date}, ${c.time} — ${c.place}, ${c.street}, ${c.district}.`,
    incident: `A man in a grey hood walked into ${c.place} shortly after ${c.time}, put a hand in his jacket pocket in the shape of a pistol, and told ${clerk} to empty the register. ${takings} left the drawer. ${clerk} was not hurt and called police from the back office.`,
    theory: `The State says ${c.defendant.name} is the man in the grey hood. ${clerk} picked him out of a photo array the next morning and has not wavered. The counter camera caught the figure at the drawer, and ${c.defendant.name}'s palm print came off the counter. He was behind ${c.amount} on a title loan at the time. There is no other candidate and no other explanation.`,
    links: {
      identity: `${clerk} identified ${c.defendant.name} from a photo array within a day of the robbery, and the counter camera {{camera}} caught the man at the drawer.`,
      timeline: `The register audit {{register}} shows the drawer open at ${c.time}, and ${c.defendant.name}'s phone hit the mast on ${c.street} at ${c.at(6)}.`,
      forensics: `${c.defendant.name}'s left palm print was lifted from the customer counter {{print}}. It was not there before the robbery.`,
      custody: `The cash tray was taken into evidence at ${c.at(52)} by ${c.officer} and sealed the same morning, with a continuous property record.`,
      motive: `${c.defendant.name} was ${c.amount} in arrears on a title loan secured against his truck, and the lender's file {{lender}} says the account was in default.`,
    },
    clientStatement: `I buy cigarettes there most weeks. I was not there that night. I was at the depot on ${c.street} until the shift ended at ${c.at(230)}, and then I went home. My palm is on every counter on that block.`,
    base: (ctx) => {
      exhibit(ctx, "camera", `Counter camera still, ${c.time}:07`, 
        `Single frame exported from the unit mounted above the door. The figure is ${cameraDistance} metres from the lens, hood up, head turned ${hoodAngle} degrees away. No facial features are recorded in the frame. The lens is a 2.8 mm fixed at 1.4 m.`);
      exhibit(ctx, "register", "Register audit tape", 
        `Drawer opened ${c.time}:04, closed ${c.time}:41. Cash removed ${takings}. No void, no refund, no manager override.`);
      exhibit(ctx, "lender", "Title loan statement", 
        `Arrears ${c.amount}. Minimum payment 90 days late. Statement period ended eleven days before the robbery.`);
      exhibit(ctx, "call", "Recorded 911 call", 
        `${clerk} reports a robbery at ${c.time}:51, describes the man as "tall, grey hood, young", and says he ran left toward ${c.street}.`);
      exhibit(ctx, "print", "Latent print report", 
        `One left palm, lifted from the customer-side counter, 62 cm from the register, developed and reported as an identification of the defendant. Lifted ${c.at(96)}.`);
      witness(ctx, "clerk", clerk, "Night clerk, complainant",
        `He was at the counter. Grey hood. I saw his face when he came in, two seconds or three, and I have not forgotten it. I picked him out the next morning and I am sure.`);
      witness(ctx, "customer", customer, "Customer outside, on the pavement",
        `I was waiting for the bus. A man came out fast, grey top, and went left. I did not see his face. I would not be able to pick him out.`);
      witness(ctx, "responder", responder, "First responding officer",
        `We got there at ${c.at(11)}. The clerk was shaking but clear. No weapon recovered. No money recovered. The camera was pulled that night.`);
    },
    flaws: [
      (ctx) => {
        exhibit(ctx, "mounting", "Camera mounting and field sheet", 
          `Unit above the door, 1.4 m, yaw 38 degrees toward the street. Field of view covers the door threshold and the top of the register. The customer-side counter, where the print was lifted, is outside the frame. The man at the drawer is ${cameraDistance} m from the lens at a ${hoodAngle} degree turn.`);
        return {
          id: "blind-camera",
          name: "The camera never sees a face",
          link: "identity",
          thesis: `The camera {{camera}} never shows a face, and the mounting sheet {{mounting}} proves the lens looks at the door, not the counter, from ${cameraDistance} metres behind a hood at ${hoodAngle} degrees.`,
          tell: "The mounting sheet puts the lens on the door and the figure at the far end of the frame with the head turned away.",
        };
      },
      (ctx) => {
        exhibit(ctx, "showup", "Supplementary investigation report", 
          `At ${ctx.at(600)} ${clerk} was shown a single still frame taken from the morning news broadcast and asked whether the man in it was the robber. The clerk said yes. The six-pack array was compiled afterwards, on the same day, and the third photograph is that same still.`);
        return {
          id: "single-photo",
          name: "A one-photo show-up",
          link: "identity",
          thesis: `The identification was a single-photo show-up from a news broadcast {{showup}} at ${ctx.at(600)}, before any array existed, so the array only repeats what the broadcast already planted.`,
          tell: "The report describes one picture, not an array, and the array was built afterwards from the same still.",
        };
      },
      (ctx) => {
        exhibit(ctx, "visit", "Customer receipt and cleaning log", 
          `Receipt: ${ctx.before(3)}, 18:42, cash, one pack of cigarettes, ${ctx.place}. Store cleaning log for the same counter: wiped ${ctx.before(8)}; next wipe ${ctx.after(9)}. The counter lift was taken ${ctx.at(96)}.`);
        return {
          id: "print-explained",
          name: "The print is from a public counter",
          link: "forensics",
          thesis: `The palm print {{print}} is on a public counter that the defendant demonstrably touched as a customer {{visit}} three days earlier, and the cleaning log shows the counter was not wiped in between, so the print proves nothing about that night.`,
          tell: "His own receipt from three days earlier, on a counter nobody cleaned in between.",
        };
      },
      (ctx) => {
        exhibit(ctx, "gap", "Property intake and seal log", 
          `Cash tray received ${ctx.at(52)} by ${ctx.officer}. Sealed ${ctx.at(52 + gapHours * 60)} by ${ctx.officer}. No entry of any kind between the two. One seal on the bag, applied at the later time, seal number left blank.`);
        return {
          id: "seal-gap",
          name: "The seal is hours late",
          link: "custody",
          thesis: `The cash tray was received at ${ctx.at(52)} and sealed ${gapHours} hours later at ${ctx.at(52 + gapHours * 60)} {{gap}}, with nothing recorded in between and no seal number, so the State cannot show continuous custody.`,
          tell: `The seal log has a ${gapHours} hour hole between receipt and sealing.`,
        };
      },
      (ctx) => {
        exhibit(ctx, "payoff", "Title loan payoff receipt", 
          `Stamped PAID IN FULL, six weeks before the robbery. Amount ${ctx.amount}. Balance zero. The lender's default notice {{lender}} was generated from an automated age-bucket report, not read back from the account.`);
        return {
          id: "motive-paid",
          name: "The debt was already paid",
          link: "motive",
          thesis: `The motive is ${ctx.amount} in arrears, but the lender issued a payoff receipt {{payoff}} six weeks before the robbery showing a zero balance, and the default notice {{lender}} is an automated report, not the account.`,
          tell: "A stamped payoff receipt six weeks before the night, against a computer-generated arrears letter.",
        };
      },
      (ctx) => {
        const stamp = ctx.at(-3);
        exhibit(ctx, "transit", "Transit transfer and route log", 
          `Transfer stamped ${stamp} at Cormorant Street and ${ctx.street}, ${ctx.distance} from ${ctx.place}. Route 14 runs from there toward the depot; the driver's running sheet puts that bus past the store at ${ctx.at(9)}, nine minutes after the drawer opened.`);
        return {
          id: "impossible-travel",
          name: "He was on a bus",
          link: "timeline",
          thesis: `The timeline is impossible: the transit transfer {{transit}} is stamped ${stamp}, three minutes before the drawer opened, ${ctx.distance} away from ${ctx.place}, and the route log has that bus still on ${ctx.street} at ${ctx.at(9)}.`,
          tell: `A stamped bus transfer ${ctx.distance} away at the moment of the robbery.`,
        };
      },
    ],
  };
},
};
