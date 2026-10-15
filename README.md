# L'Atelier de Julie — réservation en ligne

Site de prise de rendez-vous du salon de coiffure **L'Atelier de Julie** (Saint-Germain-en-Laye),
avec un back-office pour Julie (gérante) et les coiffeuses.

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS 4**
- **Supabase** : base PostgreSQL, connexion, règles d'accès RLS
- Hébergement **Netlify** (déploiement automatique depuis GitHub)

## Lancer le projet en local

Prérequis : Node.js 20 ou plus récent.

```bash
npm install
cp .env.example .env.local   # puis remplir les valeurs (voir ci-dessous)
npm run db:migrate           # crée les tables et les règles d'accès
npm run db:seed              # données de test + comptes de test
npm run dev                  # http://localhost:3000
```

### Variables d'environnement (`.env.local`)

| Variable | Où la trouver | Visible côté navigateur ? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase > Connect > Project URL | oui |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project Settings > API Keys (`sb_publishable_…`) | oui |
| `SUPABASE_SECRET_KEY` | Project Settings > API Keys (`sb_secret_…`) | **non, serveur uniquement** |
| `DATABASE_URL` | Connect > Connection string | **non, scripts locaux uniquement** |

`.env.local` est exclu de Git : aucune clé secrète ne doit être commitée.

## Comptes de test

Créés par `npm run db:seed` (identifiants dans [`scripts/test-users.mjs`](scripts/test-users.mjs)) :

| Compte | Rôle |
|---|---|
| julie@atelier-julie.test | admin (gérante) |
| sarah@atelier-julie.test | coiffeuse |
| ines@atelier-julie.test | coiffeuse |

⚠️ À supprimer ou changer avant la mise en service réelle.

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | serveur de développement |
| `npm run build` | build de production |
| `npm run db:migrate` | applique `supabase/migrations/*.sql` (rejouable sans risque) |
| `npm run db:seed` | **efface** et recharge les données de test |
| `npm run test:rls` | vérifie les droits d'accès (visiteuse / coiffeuse / admin) |
| `npm run test:creneaux` | vérifie le calcul des créneaux (pauses, fermetures, absences, délais, heure d'été) |

## Réservation : règles métier

- Créneaux calculés côté serveur ([`src/lib/availability.ts`](src/lib/availability.ts)) : horaires du salon
  et de chaque coiffeuse, pause déjeuner, fermetures, absences, rendez-vous existants et durée de la prestation.
- Réservation possible de « maintenant + délai minimum » (2 h) à « aujourd'hui + délai maximum » (60 j), réglables.
- « Peu importe la coiffeuse » : attribution à la coiffeuse la moins chargée ce jour-là.
- Double réservation impossible : vérification serveur + contrainte d'exclusion dans la base.
- Chaque rendez-vous a un lien secret `/rdv/<jeton>` pour le retrouver et l'annuler (jusqu'à 24 h avant, réglable).
- Les clientes sont reconnues par leur numéro de téléphone (pas de compte).

## Back-office (`/admin`)

| Écran | Gérante (Julie) | Coiffeuse |
|---|---|---|
| Planning jour / semaine | tout le salon, filtre par coiffeuse | son planning uniquement |
| Fiche rendez-vous | statut venue / absente / annulé | consultation |
| + Rendez-vous (pris par téléphone) | ✓ (sans délai minimum) | — |
| Clientes (recherche, historique, absences) | ✓ | — |
| Prestations (durée, prix, visibilité, coiffeuses) | ✓ | — |
| Équipe (horaires propres, prestations, accès) | ✓ | — |
| Horaires du salon et pause déjeuner | ✓ | — |
| Congés : fermetures du salon et absences | ✓ | — |
| Réglages (délais, infos légales) | ✓ | — |

Le compteur d'absences d'une cliente est recalculé à chaque changement de statut.
Les actions sont vérifiées deux fois : côté serveur (`requireAdmin`) et par les règles RLS de la base.

## Organisation du code

```
src/
  app/
    (public)/        site public (accueil, réservation, pages légales)
    admin/           back-office (protégé par connexion)
    connexion/       page et actions de connexion
  components/        composants partagés (logo…)
  lib/
    supabase/        clients Supabase (server = droits de la personne connectée,
                     admin = clé secrète, serveur uniquement)
    auth.ts          vérification du rôle
    format.ts        formats français (dates, heures, prix)
  proxy.ts           rafraîchit la session, protège /admin
supabase/
  migrations/        schéma de la base + règles RLS
  seed.sql           données de test
scripts/             outils base de données et tests
```

## Déploiement (Netlify)

_Section complétée à l'étape 4._
