"use client";
// Parcours de réservation en 4 étapes :
//   1. prestation → 2. coiffeuse → 3. jour et heure → 4. coordonnées
// Les disponibilités sont toujours calculées par le serveur.
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { TIME_ZONE, formatDuration, formatLongDate, formatPrice, formatTime } from "@/lib/format";
import type { Service } from "@/lib/public-data";
import { createBooking, fetchAvailableDays, fetchSlots, type BookingState } from "./actions";

export type StylistOption = { id: string; name: string; color: string; serviceIds: string[] };

const STEPS = ["Prestation", "Coiffeuse", "Date et heure", "Coordonnées"];

// Puce de jour : "mar." / "20" / "oct."
const dayParts = (date: string) => {
  const d = new Date(`${date}T12:00:00Z`);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("fr-FR", { timeZone: TIME_ZONE, ...o }).format(d);
  return { weekday: f({ weekday: "short" }), day: f({ day: "numeric" }), month: f({ month: "short" }) };
};

export function BookingFlow({ services, stylists }: { services: Service[]; stylists: StylistOption[] }) {
  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState("");
  const [stylistId, setStylistId] = useState("any");
  const [days, setDays] = useState<string[] | null>(null);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[] | null>(null);
  const [start, setStart] = useState("");
  // Coordonnées gardées en mémoire : rien à retaper en cas d'erreur
  const [contact, setContact] = useState({ name: "", phone: "", email: "" });
  const contactField = (key: keyof typeof contact) => ({
    value: contact[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setContact({ ...contact, [key]: e.target.value }),
  });
  const [loading, startLoading] = useTransition();
  const [state, submit, submitting] = useActionState<BookingState, FormData>(async (prev, formData) => {
    const result = await createBooking(prev, formData);
    // Créneau pris entre-temps : retour au choix de l'heure, liste rafraîchie
    if (result.slotTaken) {
      setStep(3);
      await loadSlots(serviceId, stylistId, date);
    }
    return result;
  }, {});

  const service = services.find((s) => s.id === serviceId);
  const stylist = stylists.find((s) => s.id === stylistId);
  const eligibleStylists = stylists.filter((s) => s.serviceIds.includes(serviceId));

  function loadDays(svc: string, sty: string) {
    setDays(null);
    setDate("");
    setSlots(null);
    setStart("");
    startLoading(async () => {
      const list = await fetchAvailableDays(svc, sty);
      setDays(list);
      if (list[0]) await loadSlots(svc, sty, list[0]);
    });
  }

  async function loadSlots(svc: string, sty: string, d: string) {
    setDate(d);
    setSlots(null);
    setStart("");
    setSlots(await fetchSlots(svc, sty, d));
  }

  return (
    <div className="mt-6">
      {/* ---------- Progression ---------- */}
      <ol className="mb-6 grid grid-cols-4 gap-1.5" aria-label="Étapes">
        {STEPS.map((label, i) => (
          <li key={label} className="text-xs">
            <span className={`mb-1 block h-1.5 rounded-full ${i < step ? "bg-sage-dark" : "bg-beige"}`} />
            <span className={i + 1 === step ? "font-semibold text-ink" : "text-muted"}>{label}</span>
          </li>
        ))}
      </ol>

      {step > 1 && (
        <button type="button" onClick={() => setStep(step - 1)} className="mb-4 text-sm font-semibold text-sage-dark">
          ← Retour
        </button>
      )}

      {/* ---------- 1. Prestation ---------- */}
      {step === 1 && (
        <section>
          <h2 className="mb-3 text-2xl">Quelle prestation ?</h2>
          <ul className="space-y-3">
            {services.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => { setServiceId(s.id); setStylistId("any"); setStep(2); }}
                  className="card flex w-full items-center justify-between gap-4 text-left transition hover:border-sage"
                >
                  <span>
                    <span className="block font-semibold">{s.name}</span>
                    <span className="text-sm text-muted">{formatDuration(s.duration_min)}</span>
                  </span>
                  <span className="font-semibold text-sage-dark">{formatPrice(s.price_cents)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------- 2. Coiffeuse ---------- */}
      {step === 2 && (
        <section>
          <h2 className="mb-3 text-2xl">Avec qui ?</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[{ id: "any", name: "Peu importe", color: "#e3d5c1" }, ...eligibleStylists].map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => { setStylistId(s.id); setStep(3); loadDays(serviceId, s.id); }}
                  className="card flex w-full items-center gap-3 text-left transition hover:border-sage"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-serif text-lg text-white"
                        style={{ background: s.color }}>
                    {s.id === "any" ? "✶" : s.name[0]}
                  </span>
                  <span>
                    <span className="block font-semibold">{s.name}</span>
                    {s.id === "any" && <span className="text-sm text-muted">Le plus de créneaux</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------- 3. Jour et heure ---------- */}
      {step === 3 && (
        <section>
          <h2 className="mb-3 text-2xl">Quand ?</h2>
          {state.slotTaken && <p role="alert" className="mb-3 rounded-lg bg-danger/10 p-3 text-sm text-danger">{state.error}</p>}

          {days === null ? (
            <p className="text-muted">Recherche des disponibilités…</p>
          ) : days.length === 0 ? (
            <p className="card text-muted">
              Aucun créneau disponible pour le moment. Essayez une autre coiffeuse ou appelez-nous.
            </p>
          ) : (
            <>
              {/* Jours : défilement horizontal sur mobile */}
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2" role="listbox" aria-label="Jours disponibles">
                {days.map((d) => {
                  const p = dayParts(d);
                  const selected = d === date;
                  return (
                    <button
                      key={d}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => startLoading(() => loadSlots(serviceId, stylistId, d))}
                      className={`flex min-w-16 shrink-0 flex-col items-center rounded-2xl border px-3 py-2 text-sm transition ${
                        selected ? "border-sage-dark bg-sage-dark text-white" : "border-beige bg-white hover:border-sage"
                      }`}
                    >
                      <span className="capitalize">{p.weekday}</span>
                      <span className="text-xl font-semibold">{p.day}</span>
                      <span>{p.month}</span>
                    </button>
                  );
                })}
              </div>

              {date && <p className="mt-4 mb-2 font-semibold first-letter:uppercase">{formatLongDate(`${date}T12:00:00Z`)}</p>}
              {slots === null ? (
                <p className="text-muted">Chargement des horaires…</p>
              ) : slots.length === 0 ? (
                <p className="text-muted">Plus de créneau libre ce jour-là.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {slots.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setStart(s); setStep(4); }}
                      className="rounded-xl border border-beige bg-white py-2.5 font-semibold transition hover:border-sage-dark hover:bg-sage-light"
                    >
                      {formatTime(s)}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          {loading && days !== null && <p className="sr-only" aria-live="polite">Chargement…</p>}
        </section>
      )}

      {/* ---------- 4. Coordonnées et confirmation ---------- */}
      {step === 4 && service && (
        <section>
          <h2 className="mb-3 text-2xl">Vos coordonnées</h2>

          <div className="card mb-5 bg-sage-light/40">
            <p className="font-semibold">{service.name} · {formatPrice(service.price_cents)}</p>
            <p className="text-sm first-letter:uppercase">
              {formatLongDate(start)} à {formatTime(start)} ({formatDuration(service.duration_min)})
            </p>
            <p className="text-sm text-muted">Avec {stylist ? stylist.name : "la première coiffeuse disponible"}</p>
          </div>

          <form action={submit} className="space-y-4">
            <input type="hidden" name="serviceId" value={serviceId} />
            <input type="hidden" name="stylistId" value={stylistId} />
            <input type="hidden" name="date" value={date} />
            <input type="hidden" name="start" value={start} />
            {/* Piège à robots : invisible pour les humains */}
            <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

            <div>
              <label htmlFor="name" className="label">Nom et prénom</label>
              <input id="name" name="name" required minLength={2} maxLength={80} autoComplete="name" className="input" {...contactField("name")} />
            </div>
            <div>
              <label htmlFor="phone" className="label">Téléphone</label>
              <input id="phone" name="phone" type="tel" required autoComplete="tel" placeholder="06 12 34 56 78" className="input" {...contactField("phone")} />
            </div>
            <div>
              <label htmlFor="email" className="label">Email</label>
              <input id="email" name="email" type="email" required autoComplete="email" className="input" {...contactField("email")} />
            </div>

            {state.error && !state.slotTaken && (
              <p role="alert" className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{state.error}</p>
            )}

            <button type="submit" disabled={submitting} className="btn btn-primary w-full">
              {submitting ? "Réservation…" : "Confirmer le rendez-vous"}
            </button>
            <p className="text-xs text-muted">
              Vos coordonnées servent uniquement à gérer votre rendez-vous.{" "}
              <Link href="/confidentialite" className="underline">Politique de confidentialité</Link>
            </p>
          </form>
        </section>
      )}
    </div>
  );
}
