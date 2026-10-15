// Page d'accueil : présentation, prestations et horaires.
import Link from "next/link";
import { formatDuration, formatPrice } from "@/lib/format";
import { WEEKDAYS, formatHour, getSalonHours, getServices } from "@/lib/public-data";

export default async function HomePage() {
  const [services, hours] = await Promise.all([getServices(), getSalonHours()]);

  return (
    <>
      {/* ---------- Bandeau d'accueil ---------- */}
      <section className="bg-gradient-to-b from-sage-light/60 to-cream">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:py-20">
          <p className="text-sm font-semibold uppercase tracking-widest text-sage-dark">
            Salon de coiffure · Saint-Germain-en-Laye
          </p>
          <h1 className="mt-3 max-w-xl text-4xl sm:text-5xl">
            Une parenthèse douce, pour des cheveux qui vous ressemblent.
          </h1>
          <p className="mt-4 max-w-lg text-muted">
            Julie, Sarah et Inès vous accueillent du mardi au samedi. Réservez en ligne en
            quelques instants, sans créer de compte.
          </p>
          <Link href="/reserver" className="btn btn-primary mt-8">
            Prendre rendez-vous
          </Link>
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 md:grid-cols-[3fr_2fr]">
        {/* ---------- Prestations ---------- */}
        <section aria-labelledby="prestations">
          <h2 id="prestations" className="text-3xl">Prestations</h2>
          <ul className="mt-5 divide-y divide-beige rounded-2xl border border-beige bg-white">
            {services.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-sm text-muted">
                    {formatDuration(s.duration_min)}
                    {s.description && ` · ${s.description}`}
                  </p>
                </div>
                <p className="shrink-0 font-semibold text-sage-dark">{formatPrice(s.price_cents)}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- Horaires ---------- */}
        <section aria-labelledby="horaires">
          <h2 id="horaires" className="text-3xl">Horaires</h2>
          <ul className="card mt-5 space-y-2 text-sm">
            {hours.map((h) => (
              <li key={h.weekday} className="flex justify-between gap-4">
                <span className="font-semibold">{WEEKDAYS[h.weekday]}</span>
                <span className={h.is_open ? "" : "text-muted"}>
                  {h.is_open ? `${formatHour(h.open_time)} – ${formatHour(h.close_time)}` : "Fermé"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
