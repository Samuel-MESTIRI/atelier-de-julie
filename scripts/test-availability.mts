// =====================================================================
// Tests du calcul des créneaux — npm run test:creneaux
// Utilise la vraie base (données de test) avec une date "maintenant" simulée.
// Hypothèses du seed : mardi→samedi 9h–19h, pause 12h30–13h30,
// Inès ne travaille pas le mercredi, salon fermé du 02/08 au 22/08/2027.
// =====================================================================
import pg from "pg";
import { getAvailability } from "../src/lib/availability";
import { formatTime } from "../src/lib/format";
import { parisToUtc } from "../src/lib/time";

const SERVICE = {
  coupeFemme: "aaaaaaaa-0000-0000-0000-000000000001", // 45 min
  couleur: "aaaaaaaa-0000-0000-0000-000000000003",    // 1 h 30
  brushing: "aaaaaaaa-0000-0000-0000-000000000004",   // 30 min
};
const SARAH = "22222222-2222-2222-2222-222222222222";
const INES = "33333333-3333-3333-3333-333333333333";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(ok ? "  ✔" : "  ✘", label, ok ? "" : detail);
  if (!ok) failures++;
}

/** Heures (HH:MM, Paris) proposées pour un jour */
async function times(serviceId: string, stylistId: string | null, date: string, now: Date) {
  const day = (await getAvailability({ serviceId, stylistId, from: date, to: date, now })).get(date);
  return (day?.slots ?? []).map((s) => formatTime(s.start));
}

// "Maintenant" simulé : lundi 01/03/2027 à 10:00 (aucun rendez-vous de test à cette période)
const NOW = parisToUtc("2027-03-01", "10:00");

console.log("Horaires et pauses :");
let t = await times(SERVICE.coupeFemme, null, "2027-03-02", NOW); // mardi
check("mardi : premier créneau à 09:00", t[0] === "09:00", t[0]);
check("mardi : dernier créneau 45 min à 18:15", t.at(-1) === "18:15", t.at(-1));
check("pas de créneau à cheval sur la pause (12:00 refusé)", !t.includes("12:00"));
check("11:45 accepté (fin à 12:30 pile)", t.includes("11:45"));
check("reprise à 13:30 après la pause", t.includes("13:30") && !t.includes("13:15"));
t = await times(SERVICE.couleur, null, "2027-03-02", NOW);
check("couleur 1 h 30 : dernier créneau à 17:30", t.at(-1) === "17:30", t.at(-1));
check("lundi fermé", (await times(SERVICE.brushing, null, "2027-03-01", NOW)).length === 0);
check("dimanche fermé", (await times(SERVICE.brushing, null, "2027-03-07", NOW)).length === 0);

console.log("Coiffeuses :");
check("Inès ne travaille pas le mercredi", (await times(SERVICE.brushing, INES, "2027-03-03", NOW)).length === 0);
check("Inès travaille le jeudi", (await times(SERVICE.brushing, INES, "2027-03-04", NOW)).length > 0);

console.log("Délais :");
const tuesdayMorning = parisToUtc("2027-03-02", "10:05");
t = await times(SERVICE.brushing, null, "2027-03-02", tuesdayMorning);
check("réservation au plus tard 2 h avant (rien avant 12:05)", t[0] === "13:30", t[0]);
check("au-delà de 60 jours : rien", (await times(SERVICE.brushing, null, "2027-05-04", NOW)).length === 0);

console.log("Fermetures :");
const july = parisToUtc("2027-07-20", "10:00");
check("congés d'août : salon fermé le 10/08/2027", (await times(SERVICE.brushing, null, "2027-08-10", july)).length === 0);
check("rouvert le mardi 24/08/2027", (await times(SERVICE.brushing, null, "2027-08-24", july)).length > 0);

console.log("Changement d'heure :");
const oct = parisToUtc("2027-10-20", "10:00");
const day = (await getAvailability({ serviceId: SERVICE.brushing, stylistId: null, from: "2027-11-02", to: "2027-11-02", now: oct })).get("2027-11-02");
check("après le passage à l'heure d'hiver, 09:00 Paris = 08:00 UTC", day?.slots[0].start === "2027-11-02T08:00:00.000Z", day?.slots[0].start);

console.log("Rendez-vous et absences :");
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await db.connect();
try {
  // Rendez-vous de Sarah le mardi 02/03/2027 de 10:00 à 11:30 (temporaire)
  const { rows: [client] } = await db.query("select id from clients limit 1");
  await db.query(
    `insert into appointments (client_id, stylist_id, service_name, price_cents, starts_at, ends_at, notes)
     values ($1, $2, 'Test', 0, $3, $4, 'TEST-AUTO')`,
    [client.id, SARAH, parisToUtc("2027-03-02", "10:00"), parisToUtc("2027-03-02", "11:30")],
  );
  await db.query(
    `insert into stylist_absences (stylist_id, start_at, end_at, reason) values ($1, $2, $3, 'TEST-AUTO')`,
    [SARAH, parisToUtc("2027-03-02", "15:00"), parisToUtc("2027-03-02", "19:00")],
  );
  t = await times(SERVICE.brushing, SARAH, "2027-03-02", NOW);
  check("Sarah : 09:30 libre (fin 10:00 pile)", t.includes("09:30"));
  check("Sarah : 09:45 → 11:15 bloqués par son rendez-vous", !t.includes("09:45") && !t.includes("10:30") && !t.includes("11:15"));
  check("Sarah : 11:30 de nouveau libre", t.includes("11:30"));
  check("Sarah : absente l'après-midi (rien après 14:30)", t.at(-1) === "14:30", t.at(-1));
  t = await times(SERVICE.brushing, null, "2027-03-02", NOW);
  check("« Peu importe » : 10:00 reste proposé (Julie et Inès libres)", t.includes("10:00"));
} finally {
  await db.query("delete from appointments where notes = 'TEST-AUTO'");
  await db.query("delete from stylist_absences where reason = 'TEST-AUTO'");
  await db.end();
}

console.log(failures === 0 ? "\nTous les tests passent ✔" : `\n${failures} test(s) en échec ✘`);
process.exitCode = failures === 0 ? 0 : 1;
