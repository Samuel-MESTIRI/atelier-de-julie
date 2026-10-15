"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatDuration, formatPrice, formatTime } from "@/lib/format";
import type { Service } from "@/lib/public-data";
import { createStaffBooking, fetchStaffSlots, findClient } from "../actions";

type Props = {
  services: Service[];
  stylists: { id: string; name: string; serviceIds: string[] }[];
  today: string;
};

export function NewAppointmentForm({ services, stylists, today }: Props) {
  const router = useRouter();
  const [serviceId, setServiceId] = useState("");
  const [stylistId, setStylistId] = useState("");
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [start, setStart] = useState("");
  const [known, setKnown] = useState<string>("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [client, setClient] = useState({ name: "", phone: "", email: "", notes: "" });

  const eligible = stylists.filter((s) => s.serviceIds.includes(serviceId));

  function refresh(svc: string, sty: string, d: string) {
    setStart("");
    setSlots(null);
    if (!svc || !sty || !d) return;
    startTransition(async () => setSlots(await fetchStaffSlots(svc, sty, d)));
  }

  // Téléphone d'une cliente connue : on pré-remplit nom et email
  async function lookup() {
    const found = await findClient(client.phone);
    if (found) {
      setClient((c) => ({ ...c, name: c.name || found.full_name, email: c.email || found.email }));
      setKnown(found.no_show_count > 0 ? `Cliente connue · ⚠ ${found.no_show_count} absence(s)` : "Cliente connue");
    } else setKnown("");
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await createStaffBooking(data);
      if (r.id) router.push(`/admin/rdv/${r.id}`);
      else setError(r.error ?? "");
    });
  }

  const field = (key: keyof typeof client) => ({
    value: client[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setClient({ ...client, [key]: e.target.value }),
  });

  return (
    <form onSubmit={submit} className="space-y-4">
      <input type="hidden" name="start" value={start} />

      <div className="card space-y-4">
        <div>
          <label className="label" htmlFor="serviceId">Prestation</label>
          <select id="serviceId" name="serviceId" required className="input" value={serviceId}
                  onChange={(e) => { setServiceId(e.target.value); setStylistId(""); refresh("", "", ""); }}>
            <option value="">— Choisir —</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name} · {formatDuration(s.duration_min)} · {formatPrice(s.price_cents)}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="stylistId">Coiffeuse</label>
            <select id="stylistId" name="stylistId" required className="input" value={stylistId} disabled={!serviceId}
                    onChange={(e) => { setStylistId(e.target.value); refresh(serviceId, e.target.value, date); }}>
              <option value="">— Choisir —</option>
              {eligible.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="date">Jour</label>
            <input id="date" name="date" type="date" required min={today} className="input" value={date}
                   onChange={(e) => { setDate(e.target.value); refresh(serviceId, stylistId, e.target.value); }} />
          </div>
        </div>

        {stylistId && (
          <div>
            <p className="label">Heure</p>
            {slots === null ? (
              <p className="text-sm text-muted">Chargement…</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-muted">Aucun créneau libre ce jour-là (fermé, absente ou complet).</p>
            ) : (
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                {slots.map((s) => (
                  <button key={s} type="button" onClick={() => setStart(s)}
                          className={`rounded-lg border py-2 text-sm font-semibold ${start === s ? "border-sage-dark bg-sage-dark text-white" : "border-beige bg-white hover:border-sage"}`}>
                    {formatTime(s)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card space-y-4">
        <div>
          <label className="label" htmlFor="phone">Téléphone</label>
          <input id="phone" name="phone" type="tel" required className="input" {...field("phone")} onBlur={lookup} />
          {known && <p className="mt-1 text-sm text-sage-dark">{known}</p>}
        </div>
        <div>
          <label className="label" htmlFor="name">Nom et prénom</label>
          <input id="name" name="name" required className="input" {...field("name")} />
        </div>
        <div>
          <label className="label" htmlFor="email">Email <span className="font-normal text-muted">(facultatif)</span></label>
          <input id="email" name="email" type="email" className="input" {...field("email")} />
        </div>
        <div>
          <label className="label" htmlFor="notes">Note <span className="font-normal text-muted">(facultatif)</span></label>
          <textarea id="notes" name="notes" rows={2} maxLength={500} className="input" {...field("notes")} />
        </div>
      </div>

      {error && <p role="alert" className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p>}
      <button type="submit" disabled={pending || !start} className="btn btn-primary w-full">
        {pending ? "Enregistrement…" : "Enregistrer le rendez-vous"}
      </button>
    </form>
  );
}
