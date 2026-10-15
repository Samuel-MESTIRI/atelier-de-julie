// =====================================================================
// Notifications aux clientes — POINT DE BRANCHEMENT DES EMAILS
//
// Pour l'instant aucun email n'est envoyé (choix du salon) : ces fonctions
// se contentent d'écrire dans les journaux du serveur.
//
// Pour activer les emails plus tard (ex. Resend, offre gratuite) :
//   1. créer un compte, vérifier le domaine du salon, récupérer une clé API
//   2. ajouter RESEND_API_KEY et EMAIL_FROM dans les variables d'environnement
//   3. remplacer le contenu de send() par un appel à l'API (exemple ci-dessous)
//   4. pour le rappel de la veille : appeler sendReminders() chaque jour à 18 h
//      via une "Scheduled Function" Netlify (voir README)
// =====================================================================
import { formatLongDate, formatTime } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDays, parisDate, parisToUtc } from "@/lib/time";

type Email = { to: string; subject: string; text: string };

async function send(email: Email) {
  if (!email.to) return;
  console.info(`[email non envoyé] à ${email.to} : ${email.subject}`);

  // Exemple d'envoi avec Resend (aucune bibliothèque nécessaire) :
  // await fetch("https://api.resend.com/emails", {
  //   method: "POST",
  //   headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
  //   body: JSON.stringify({ from: process.env.EMAIL_FROM, to: email.to, subject: email.subject, text: email.text }),
  // });
}

type AppointmentInfo = {
  email: string;
  name: string;
  serviceName: string;
  startsAt: string;
  stylistName: string;
  link: string; // lien /rdv/<jeton> complet
};

const when = (a: AppointmentInfo) => `${formatLongDate(a.startsAt)} à ${formatTime(a.startsAt)}`;

export function notifyBooked(a: AppointmentInfo) {
  return send({
    to: a.email,
    subject: `Rendez-vous confirmé le ${when(a)}`,
    text: `Bonjour ${a.name},\n\nVotre rendez-vous « ${a.serviceName} » avec ${a.stylistName} est confirmé le ${when(a)}.\n\nPour le consulter ou l'annuler : ${a.link}\n\nÀ bientôt,\nL'Atelier de Julie`,
  });
}

export function notifyCancelled(a: AppointmentInfo) {
  return send({
    to: a.email,
    subject: `Rendez-vous du ${when(a)} annulé`,
    text: `Bonjour ${a.name},\n\nVotre rendez-vous « ${a.serviceName} » du ${when(a)} est annulé.\n\nL'Atelier de Julie`,
  });
}

/** Rappel de la veille : à appeler une fois par jour (tâche programmée). */
export async function sendReminders(siteUrl: string) {
  const tomorrow = addDays(parisDate(), 1);
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("appointments")
    .select("starts_at, service_name, cancel_token, stylists(name), clients(full_name, email)")
    .eq("status", "confirme")
    .gte("starts_at", parisToUtc(tomorrow, "00:00").toISOString())
    .lt("starts_at", parisToUtc(addDays(tomorrow, 1), "00:00").toISOString());

  for (const r of data ?? []) {
    const client = r.clients as unknown as { full_name: string; email: string };
    const stylist = r.stylists as unknown as { name: string };
    await send({
      to: client.email,
      subject: `Rappel : rendez-vous demain à ${formatTime(r.starts_at)}`,
      text: `Bonjour ${client.full_name},\n\nPetit rappel : « ${r.service_name} » avec ${stylist.name} demain à ${formatTime(r.starts_at)}.\n\nEn cas d'empêchement, merci d'appeler le salon.\nVotre rendez-vous : ${siteUrl}/rdv/${r.cancel_token}\n\nL'Atelier de Julie`,
    });
  }
  return data?.length ?? 0;
}
