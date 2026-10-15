// Fiche d'un rendez-vous. Julie peut changer le statut ; une coiffeuse consulte seulement.
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { requireStaff } from "@/lib/auth";
import { formatDate, formatLongDate, formatPrice, formatTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { parisDate } from "@/lib/time";
import { formatPhone, isUuid } from "@/lib/validation";
import { setStatus } from "../actions";

const STATUS_LABEL = { confirme: "Confirmé", annule: "Annulé", venue: "Venue", absente: "Absente" } as const;

export default async function AppointmentDetail({ params }: PageProps<"/admin/rdv/[id]">) {
  const profile = await requireStaff();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const supabase = await createClient();
  const { data: a } = await supabase
    .from("appointments")
    .select("*, stylists(name, color), clients(full_name, phone, email, no_show_count)")
    .eq("id", id)
    .maybeSingle();
  if (!a) notFound(); // inexistant, ou pas autorisé (RLS)

  const client = a.clients as { full_name: string; phone: string; email: string; no_show_count: number };
  const stylist = a.stylists as { name: string; color: string };
  const status = a.status as keyof typeof STATUS_LABEL;
  const day = parisDate(new Date(a.starts_at));

  return (
    <div className="max-w-xl">
      <Link href={`/admin?vue=jour&date=${day}`} className="text-sm font-semibold text-sage-dark">← Planning du {formatDate(a.starts_at)}</Link>

      <div className="card mt-3 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl first-letter:uppercase">{formatLongDate(a.starts_at)}</h1>
          <span className="rounded-full bg-sand px-3 py-1 text-xs font-semibold">{STATUS_LABEL[status]}</span>
        </div>
        <p className="text-lg">{formatTime(a.starts_at)} – {formatTime(a.ends_at)}</p>
        <p>{a.service_name} · {formatPrice(a.price_cents)}</p>
        <p className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: stylist.color }} /> {stylist.name}
        </p>
        <p className="text-sm text-muted">{a.source === "telephone" ? "Pris par téléphone" : "Réservé en ligne"}</p>
        {a.notes && <p className="rounded-lg bg-sand p-2 text-sm">{a.notes}</p>}
      </div>

      <div className="card mt-3 space-y-1">
        <h2 className="text-xl">Cliente</h2>
        <p className="font-semibold">{client.full_name}</p>
        <p><a href={`tel:${client.phone}`} className="text-sage-dark underline">{formatPhone(client.phone)}</a></p>
        {client.email && <p><a href={`mailto:${client.email}`} className="text-sage-dark underline">{client.email}</a></p>}
        {client.no_show_count > 0 && (
          <p className="text-sm font-semibold text-danger">⚠ {client.no_show_count} absence(s) non prévenue(s)</p>
        )}
      </div>

      {profile.role === "admin" && (
        <div className="card mt-3">
          <h2 className="mb-3 text-xl">Statut</h2>
          <div className="grid grid-cols-2 gap-2">
            {(["venue", "absente", "confirme", "annule"] as const).filter((s) => s !== status).map((s) => (
              <ActionForm key={s} action={setStatus} confirm={s === "annule" ? "Annuler ce rendez-vous ?" : undefined}>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="status" value={s} />
                <button className={`btn w-full ${s === "annule" || s === "absente" ? "btn-secondary text-danger" : "btn-secondary"}`}>
                  {s === "venue" ? "✓ Venue" : s === "absente" ? "✗ Absente" : s === "confirme" ? "Remettre confirmé" : "Annuler"}
                </button>
              </ActionForm>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
