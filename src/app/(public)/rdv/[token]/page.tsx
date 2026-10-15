// Page d'un rendez-vous, accessible par son lien secret (sans compte).
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { canCancel, getAppointmentByToken, isUpcoming } from "@/lib/appointment-by-token";
import { formatLongDate, formatPrice, formatTime } from "@/lib/format";
import { getSettings } from "@/lib/public-data";
import { CancelButton, CopyLink } from "./AppointmentActions";

export const metadata: Metadata = { title: "Votre rendez-vous", robots: { index: false } };

const STATUS = {
  confirme: { label: "Confirmé", className: "bg-sage-light text-sage-dark" },
  annule: { label: "Annulé", className: "bg-danger/10 text-danger" },
  venue: { label: "Effectué", className: "bg-sand text-muted" },
  absente: { label: "Non honoré", className: "bg-sand text-muted" },
};

export default async function AppointmentPage({ params, searchParams }: PageProps<"/rdv/[token]">) {
  const { token } = await params;
  const { nouveau } = await searchParams;
  const [appointment, settings] = await Promise.all([getAppointmentByToken(token), getSettings()]);
  if (!appointment) notFound();

  const status = STATUS[appointment.status];
  const cancellable = canCancel(appointment);

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      {nouveau && appointment.status === "confirme" && (
        <div className="mb-6 rounded-2xl bg-sage-light p-5 text-center">
          <p className="font-serif text-3xl">Merci {appointment.client_name.split(" ")[0]} !</p>
          <p className="mt-1">Votre rendez-vous est confirmé.</p>
        </div>
      )}

      <div className="card space-y-1">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h1 className="text-2xl">Votre rendez-vous</h1>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>
        </div>
        <p className="text-lg font-semibold first-letter:uppercase">{formatLongDate(appointment.starts_at)}</p>
        <p>{formatTime(appointment.starts_at)} – {formatTime(appointment.ends_at)}</p>
        <p>{appointment.service_name} avec {appointment.stylist_name} · {formatPrice(appointment.price_cents)}</p>
        <p className="pt-2 text-sm text-muted">{settings.salon_name} · {settings.address}</p>
      </div>

      {appointment.status === "confirme" && isUpcoming(appointment) && (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-muted">
            📌 Conservez ce lien : il vous permet de retrouver et d&apos;annuler votre rendez-vous.
          </p>
          <CopyLink />
          {cancellable ? (
            <CancelButton token={token} />
          ) : (
            <p className="rounded-xl bg-sand p-4 text-sm">
              L&apos;annulation en ligne n&apos;est plus possible à moins de {appointment.cancel_limit_hours} h du
              rendez-vous. Pour tout changement, appelez le salon
              {settings.phone && (
                <> au <a className="font-semibold underline" href={`tel:${settings.phone.replace(/\s/g, "")}`}>{settings.phone}</a></>
              )}.
            </p>
          )}
        </div>
      )}

      {appointment.status === "annule" && (
        <Link href="/reserver" className="btn btn-primary mt-6 w-full">Reprendre un rendez-vous</Link>
      )}
    </div>
  );
}
