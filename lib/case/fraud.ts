import { exhibit, witness, type Ctx } from "./pools";
import type { CaseModule } from "./template";

export const fraud: CaseModule = {
  key: "fraud",
  gender: "f",
  build: (c) => {
  const cfo = c.takeName();
  const teller = c.takeName();
  const auditor = c.takeName();
  const transferHour = 22 + Math.floor(c.rnd() * 2);
  const workedYears = 4 + Math.floor(c.rnd() * 6);
  const reverseDays = 2 + Math.floor(c.rnd() * 3);
  const repairDays = 3 + Math.floor(c.rnd() * 4);
  const betting = `$${(3 + Math.floor(c.rnd() * 7)) * 500}`;
  const cardBalance = `$${(Number(c.amount.replace(/[^0-9]/g, "")) + 1000 + Math.floor(c.rnd() * 8) * 250).toLocaleString("en-US")}`;
  const threshold = `$${(Number(c.amount.replace(/[^0-9]/g, "")) * 2).toLocaleString("en-US")}`;
  const singleDeposit = `$${(2 + Math.floor(c.rnd() * 4)) * 250}`;

  return {
    charge: "Grand larceny in the first degree",
    rounds: 7,
    startJury: 44,
    setting: `${c.weekday} ${c.date}, ${String(transferHour).padStart(2, "0")}:14 — remote banking session, ${c.place}, ${c.street}, ${c.district}.`,
    incident: `At ${String(transferHour).padStart(2, "0")}:14 a payment instruction moved ${c.amount} from the operating account of ${c.place} to an account at a second bank opened eleven days earlier in the name of a shell company. The instruction was authorised with the credentials of ${c.defendant.name}, who had kept the books for ${workedYears} years.`,
    theory: `The State says the device and the bank's client are the same person. ${c.defendant.name} was at that keyboard when the payment left at ${String(transferHour).padStart(2, "0")}:14, on the office network, from her own laptop's device identifier, and the State says she moved the entries afterwards to cover it. She carried a card balance of ${cardBalance} and money in a betting account. The credential was shared; the laptop was not.`,
    links: {
      identity: `The session {{session}} was opened with the finance.ops credential from the device identifier of ${c.defendant.name}'s laptop.`,
      timeline: `The transfer left at ${String(transferHour).padStart(2, "0")}:14:38 and cleared at ${String(transferHour).padStart(2, "0")}:19, inside the session that stayed open until ${String(transferHour).padStart(2, "0")}:41.`,
      forensics: `The authorisation on the payment file {{token}} is signed with the finance.ops credential and the bank's own authentication token, and ${c.defendant.name} was one of the four people who held it.`,
      custody: `The bank produced the transaction record {{record}} under subpoena, extracted by its own operations team.`,
      motive: `${c.defendant.name} carried a card balance of ${cardBalance} and was depositing into a betting account every week {{spending}}, and the State says the company money fed both.`,
    },
    clientStatement: `I did the books for ${workedYears} years and I never touched the operating account. That login is on a piece of paper taped inside the finance cupboard, four of us use it. My laptop was with the repair shop that week. I do not gamble on anything but the horses, and I am behind on that, I know it.`,
    base: (ctx) => {
      exhibit(ctx, "session", "Bank session extract",
        `Session opened ${String(transferHour).padStart(2, "0")}:03 from 203.0.113.24, the single outbound address for the whole building. Device identifier: LPT-FIN-02. Closed ${String(transferHour).padStart(2, "0")}:41. Two credential failures preceded it, at ${String(transferHour - 1).padStart(2, "0")}:58 and ${String(transferHour).padStart(2, "0")}:01.`);
      exhibit(ctx, "token", "Payment authorisation file",
        `Instruction 88412. User signature: finance.ops. Token reference: 4471-AA. No second approver field completed. The bank's own policy permits a single-signature instruction below ${threshold}.`);
      exhibit(ctx, "record", "Bank subpoena response",
        `Statement extract, operating account, covering ${c.date} only. Fields supplied: date, value, reference, amount, balance. Fields not supplied: counterparty bank, return codes, reversal flags. Certificate of authenticity signed by the operations supervisor.`);
      exhibit(ctx, "spending", "Card and betting statements",
        `Card balance ${cardBalance}, minimum payment met every month. Betting account: net deposits ${betting} over the year, net position negative. No single deposit above ${singleDeposit}.`);
      witness(ctx, "cfo", cfo, "Chief financial officer",
        `Finance has one shared login for the banking portal. It is taped inside the cupboard. IT has been asked to fix it twice. I signed the instruction policy, and it permits a single signature below ${threshold}.`);
      witness(ctx, "teller", teller, "Second bank, account opening officer",
        `The shell company account was opened in person by a man of about fifty with a passport in the name on the application. Not the defendant. I would say that with confidence; I sat with him for forty minutes.`);
      witness(ctx, "auditor", auditor, "Forensic accountant, instructed by the defence",
        `I asked the bank for reversal flags and counterparty data. The extract I was given had neither. My own read of the account run shows the payment coming back ${reverseDays} days after the day the extract covers, with the same reference.`);
    },
    flaws: [
      (ctx) => {
        exhibit(ctx, "repair", "Repair shop work order",
          `Work order 7712: laptop LPT-FIN-02, dropped off ${c.at(-repairDays * 1440 - 300)}, collected ${c.at(-1440 + 240)}. Fault: swollen battery, keyboard. The shop's intake photograph shows the machine on the bench with its asset tag. The device cannot have been on the office network on the night of the transfer.`);
        return {
          id: "laptop-away",
          name: "The laptop was at the repair shop",
          link: "identity",
          thesis: `The session is attributed to device LPT-FIN-02, but the repair work order {{repair}} has that laptop at the shop for ${repairDays} days across the transfer, photographed on the bench, so the device identifier puts nobody at the keyboard.`,
          tell: "A work order with the asset tag, covering the night of the transfer.",
        };
      },
      (ctx) => {
        const people = 4;
        exhibit(ctx, "policy", "Finance access policy and IT ticket",
          `Portal access policy F-4: one shared credential for ${people} finance staff, no per-user accounts, no MFA. IT ticket 1183, raised eleven months earlier, "finance portal needs individual logins", still open, priority low.`);
        return {
          id: "shared-login",
          name: "The login is shared by four people",
          link: "forensics",
          thesis: `The user signature is not a person: policy F-4 {{policy}} gives the same shared credential to ${people} finance staff with no per-user accounts and no MFA, and the IT ticket to fix it has been open for eleven months, so the signature identifies the department, not the defendant.`,
          tell: `One shared password for ${people} staff, with an open ticket asking for individual logins.`,
        };
      },
      (ctx) => {
        exhibit(ctx, "reversal", "Reversal and return advice",
          `Payment 88412 returned ${reverseDays} days later, reference RET-88412, full amount ${c.amount}, reason code "account restricted by receiving bank". The receiving account was frozen on the same day. The company's operating balance was restored.`);
        return {
          id: "money-returned",
          name: "The money came back",
          link: "motive",
          thesis: `The loss is the motive, but the reversal advice {{reversal}} shows the full amount returned ${reverseDays} days later and the operating balance restored, and the subpoena extract {{record}} omits return codes, so the State's figure is a gross debit, not a loss.`,
          tell: "A return advice for the full amount, missing from the extract the State relied on.",
        };
      },
      (ctx) => {
        exhibit(ctx, "nat", "Network address register",
          `203.0.113.24 is the building's single outbound address for all four floors, 214 devices, and the guest wireless. The register is maintained by the managed service provider and covers the whole building, not the finance floor.`);
        return {
          id: "office-nat",
          name: "The IP is the whole building",
          link: "timeline",
          thesis: `"From the office network" means nothing: the address register {{nat}} shows one outbound address shared by 214 devices on four floors and the guest wireless, so the session's origin cannot be placed at her desk at ${String(transferHour).padStart(2, "0")}:14.`,
          tell: "A single NAT address for the entire building, guest wireless included.",
        };
      },
      (ctx) => {
        exhibit(ctx, "extract", "Extraction specification and change log",
          `Extraction run by the bank's operations team five days later, unaccompanied. Script version 3 does not select return codes, reversal flags or counterparty fields. The script was amended on the same day to exclude them "for clarity". No custodian was present for the run.`);
        return {
          id: "extract-filtered",
          name: "The extract was filtered",
          link: "custody",
          thesis: `The bank's extract {{extract}} was produced unaccompanied by a script amended the same day to drop return codes and reversal flags, with no custodian present, so the record {{record}} the State relies on is a filtered subset and cannot support the numbers drawn from it.`,
          tell: "A script changed on the day of extraction to remove return codes, with no custodian watching.",
        };
      },
      (ctx) => {
        exhibit(ctx, "opening", "Account opening file, receiving bank",
          `Application for the shell company, signed in branch by a male applicant, passport number on file, video still attached. The still is time-stamped and shows a man of about fifty. The defendant's date of birth appears nowhere in the file; the applicant's does.`);
        return {
          id: "someone-else",
          name: "Someone else opened the account",
          link: "identity",
          thesis: `The receiving account was opened in branch by a man, on a passport, with a video still {{opening}} in the file, and the branch officer {{teller}} sat with him for forty minutes, so the beneficiary of the transfer is a person the defendant is not.`,
          tell: "A branch opening file with a passport, a video still, and a male applicant.",
        };
      },
    ],
  };
},
};
