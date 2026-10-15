// =====================================================================
// Test des règles d'accès (RLS) — npm run test:rls
// Vérifie, avec les vraies règles de la base, ce que chacun peut voir/faire.
// À lancer après "npm run db:seed".
// =====================================================================
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import { TEST_USERS } from "./test-users.mjs";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
let failures = 0;

function check(label, ok) {
  console.log(ok ? "  ✔" : "  ✘", label);
  if (!ok) failures++;
}

async function as(email) {
  const client = createClient(URL, KEY, { auth: { persistSession: false } });
  if (email) {
    const u = TEST_USERS.find((x) => x.email === email);
    const { error } = await client.auth.signInWithPassword({ email, password: u.password });
    if (error) throw new Error(`Connexion ${email} : ${error.message}`);
  }
  return client;
}

// ---------- Visiteuse (non connectée) ----------
console.log("Visiteuse :");
const anon = await as(null);
check("voit les prestations", ((await anon.from("services").select("id")).data ?? []).length === 4);
check("voit les horaires du salon", ((await anon.from("salon_hours").select("weekday")).data ?? []).length === 7);
check("ne voit AUCUN rendez-vous", ((await anon.from("appointments").select("id")).data ?? []).length === 0);
check("ne voit AUCUNE cliente", ((await anon.from("clients").select("id")).data ?? []).length === 0);
const anonInsert = await anon.from("services").insert({ name: "Pirate", duration_min: 30, price_cents: 0 });
check("ne peut pas créer de prestation", Boolean(anonInsert.error));

// ---------- Sarah (coiffeuse) ----------
console.log("Sarah (coiffeuse) :");
const sarah = await as("sarah@atelier-julie.test");
const sarahRdv = (await sarah.from("appointments").select("stylist_id")).data ?? [];
check(`voit ses rendez-vous (${sarahRdv.length})`, sarahRdv.length > 0);
check("ne voit que les siens", sarahRdv.every((r) => r.stylist_id === "22222222-2222-2222-2222-222222222222"));
const sarahClients = (await sarah.from("clients").select("id")).data ?? [];
check(`ne voit que ses clientes (${sarahClients.length} sur 4)`, sarahClients.length > 0 && sarahClients.length < 4);
await sarah.from("services").update({ price_cents: 1 }).eq("name", "Coupe femme");
const price = (await anon.from("services").select("price_cents").eq("name", "Coupe femme").single()).data;
check("ne peut pas modifier un prix", price?.price_cents === 3500);
const promote = await sarah.from("profiles").update({ role: "admin" }).neq("id", "00000000-0000-0000-0000-000000000000").select();
check("ne peut pas se donner le rôle admin", (promote.data ?? []).length === 0);

// ---------- Julie (admin) ----------
console.log("Julie (admin) :");
const julie = await as("julie@atelier-julie.test");
const allRdv = (await julie.from("appointments").select("stylist_id")).data ?? [];
check(`voit tous les rendez-vous (${allRdv.length})`, new Set(allRdv.map((r) => r.stylist_id)).size === 3);
check("voit toutes les clientes", ((await julie.from("clients").select("id")).data ?? []).length === 4);
const upd = await julie.from("settings").update({ min_notice_hours: 2 }).eq("id", 1).select();
check("peut modifier les réglages", (upd.data ?? []).length === 1);

// ---------- Garde-fou anti double réservation (base) ----------
console.log("Base de données :");
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await db.connect();
try {
  await db.query("begin");
  const { rows } = await db.query("select * from appointments limit 1");
  const a = rows[0];
  let blocked = false;
  try {
    await db.query(
      `insert into appointments (client_id, stylist_id, service_name, price_cents, starts_at, ends_at)
       values ($1, $2, 'Test', 0, $3::timestamptz + interval '10 minutes', $4)`,
      [a.client_id, a.stylist_id, a.starts_at, a.ends_at],
    );
  } catch (e) {
    blocked = e.message.includes("appointments_no_overlap");
  }
  check("refuse deux rendez-vous qui se chevauchent", blocked);
} finally {
  await db.query("rollback");
  await db.end();
}

console.log(failures === 0 ? "\nTous les tests passent ✔" : `\n${failures} test(s) en échec ✘`);
process.exitCode = failures === 0 ? 0 : 1;
