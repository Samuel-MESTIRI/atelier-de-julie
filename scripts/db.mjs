// =====================================================================
// Outil base de données (développement uniquement)
//   npm run db:migrate  → applique supabase/migrations/*.sql dans l'ordre
//   npm run db:seed     → charge les données de test + crée les comptes de test
// Les variables viennent de .env.local (option --env-file de Node).
// =====================================================================
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { TEST_USERS } from "./test-users.mjs";

const root = path.resolve(import.meta.dirname, "..");
const command = process.argv[2];

async function runSqlFile(client, file) {
  const sql = await readFile(file, "utf8");
  await client.query("begin");
  try {
    await client.query(sql);
    await client.query("commit");
    console.log("✔", path.relative(root, file));
  } catch (err) {
    await client.query("rollback");
    throw new Error(`${path.relative(root, file)} : ${err.message}`);
  }
}

async function migrate(client) {
  const dir = path.join(root, "supabase", "migrations");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) await runSqlFile(client, path.join(dir, f));
}

// Crée (ou retrouve) un compte via l'API d'administration de Supabase
async function ensureAuthUser({ email, password }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (res.ok) return (await res.json()).id;

  // Déjà existant : on le retrouve dans la liste et on remet le mot de passe de test
  const list = await (await fetch(`${url}/auth/v1/admin/users?per_page=200`, { headers })).json();
  const user = list.users?.find((u) => u.email === email);
  if (!user) throw new Error(`Création du compte ${email} impossible : ${await res.text()}`);
  await fetch(`${url}/auth/v1/admin/users/${user.id}`, { method: "PUT", headers, body: JSON.stringify({ password }) });
  return user.id;
}

async function seed(client) {
  await runSqlFile(client, path.join(root, "supabase", "seed.sql"));
  for (const u of TEST_USERS) {
    const id = await ensureAuthUser(u);
    await client.query(
      `insert into profiles (id, full_name, role, stylist_id) values ($1, $2, $3, $4)
       on conflict (id) do update set full_name = excluded.full_name, role = excluded.role, stylist_id = excluded.stylist_id`,
      [id, u.full_name, u.role, u.stylist_id],
    );
    console.log("✔ compte", u.email, `(${u.role})`);
  }
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  if (command === "migrate") await migrate(client);
  else if (command === "seed") await seed(client);
  else console.log("Usage : node scripts/db.mjs migrate|seed");
} catch (err) {
  console.error("✘", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
