# Panel Interne — Encore Design
## Spécifications techniques & architecture

> Document de référence pour le développement du panel interne (`panel.encore-design.fr`).
> À utiliser comme base de contexte pour un assistant IA de développement (Claude Code, etc.)

---

## 1. Vue d'ensemble

Outil interne web pour l'agence Encore Design, accessible uniquement aux employés via authentification. Centralise : gestion des accès clients (sensible), fiches clients, monitoring des domaines/SSL/hébergements, notes collaboratives, boîte à outils, raccourcis, calendrier personnel, recherche globale et assistant IA.

**Priorité absolue : la sécurité**, car l'outil contient des identifiants/mots de passe de clients et des informations internes de l'agence.

---

## 2. Stack technique

### Backend
- **Symfony** (dernière version LTS stable)
- **Doctrine ORM** pour la persistance
- API REST exposée sous `/api/*`
- **Symfony Security** (composant natif) pour l'authentification — pas besoin de réinventer, c'est robuste, bien documenté et maintenu
- **Symfony Validator** pour la validation des entrées
- **Symfony RateLimiter** pour le throttling (anti brute-force)
- **NelmioSecurityBundle** pour les headers de sécurité (CSP, HSTS, etc.)

### Frontend
- **React 18+** avec **Vite** (dernière config)
- **TypeScript** (fortement recommandé pour un projet de cette taille)
- **Tailwind CSS** avec design tokens (primitifs + sémantiques)
- **React Router DOM v6** pour le routing
- **shadcn/ui** pour les composants de base (boutons, inputs, modales, dropdowns, etc.)
- **Motion** (ex-Framer Motion) pour les animations
- **TipTap** pour l'éditeur de texte riche (notes type Notion)
- **TanStack Query** (React Query) pour la gestion des appels API / cache / synchronisation
- **Zustand** pour le state global léger (auth state, thème, etc.)

---

## 3. Architecture & déploiement

**Recommandation forte : une seule origine (same-origin)**, pour simplifier la sécurité et éviter les complications CORS.

```
panel.encore-design.fr
├── Symfony sert l'API sous /api/*
└── Symfony sert aussi le build React (dossier public/) pour tout le reste
```

Concrètement : `npm run build` génère les fichiers statiques du frontend, qui sont placés dans `public/` (ou un sous-dossier) du projet Symfony. Apache/Symfony sert ces fichiers pour les routes front, et l'API pour `/api/*`.

**Avantage majeur** : avec une même origine, on peut utiliser des **cookies de session httpOnly + Secure + SameSite=Strict** géré nativement par Symfony Security. Pas besoin de JWT côté frontend, pas de stockage de token en localStorage (vulnérable au XSS), pas de CORS à configurer. C'est l'approche la plus simple ET la plus sûre pour ce cas d'usage (un seul frontend, un seul backend, même domaine).

> JWT n'apporte de réel intérêt que si on a besoin d'une API découplée consommée par plusieurs clients différents (app mobile, portail client externe sur un autre domaine...). Pour le panel interne v1, **session Symfony + cookie httpOnly** est plus simple et plus sécurisé.

---

## 4. Sécurité — détail des mesures

### 4.1 Authentification
- **Symfony Security** gère l'authentification (form login + cookie de session)
- Hashage des mots de passe employés via `PasswordHasherInterface` avec l'algorithme `auto` (Symfony choisit `sodium`/argon2id si disponible, sinon bcrypt — toujours le meilleur dispo)
- Session avec expiration (ex: 8h), renouvelée à chaque activité
- Rôles : `ROLE_ADMIN`, `ROLE_EMPLOYEE` (et éventuellement `ROLE_INTERN` avec accès restreint à certains modules comme le coffre-fort d'accès)
- Voters Symfony pour les permissions fines (ex: qui peut voir/éditer une fiche client)

### 4.2 Anti brute-force / anti-bot
- **Symfony RateLimiter** sur l'endpoint de login : limiter les tentatives par IP et par compte (ex: 5 tentatives / 15 min)
- Verrouillage temporaire du compte après X échecs
- Page de login en `noindex` (meta robots) + `robots.txt` qui bloque tout le panel — c'est un outil interne, aucune indexation
- Optionnel : Cloudflare Turnstile (gratuit, alternative respectueuse à reCAPTCHA) sur le formulaire de login si le sous-domaine est exposé publiquement

### 4.3 Chiffrement des données sensibles (accès clients)
Les identifiants de connexion clients (hébergement, WordPress admin) doivent être **chiffrés en base, pas juste hashés** (on doit pouvoir les déchiffrer pour les afficher).
- Chiffrement symétrique via **libsodium** (`sodium_crypto_secretbox`), intégré nativement à PHP
- Clé de chiffrement stockée dans les variables d'environnement (`.env.local`, jamais commité), **distincte** de toute autre clé/secret
- Un `EncryptionService` dédié dans Symfony, appelé via un listener Doctrine (ou manuellement) pour chiffrer/déchiffrer à la volée les champs sensibles de `SiteAccess`

### 4.4 Injections & validation
- Doctrine ORM = requêtes paramétrées par défaut → protection native contre l'injection SQL (ne jamais utiliser de requêtes SQL brutes avec concatenation)
- **Symfony Validator** sur toutes les entrées (DTOs avec contraintes)
- Côté React : ne jamais utiliser `dangerouslySetInnerHTML` sans passer par **DOMPurify** (notamment pour le rendu des notes riches type Notion)

### 4.5 Headers & configuration générale
- **NelmioSecurityBundle** : CSP stricte, HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`
- CSRF token sur tous les formulaires sensibles (Symfony le gère nativement)
- HTTPS forcé (AutoSSL Let's Encrypt sur o2switch)
- Logs d'activité (qui s'est connecté, qui a consulté/modifié un accès client) → table `ActivityLog`, utile pour l'audit

---

## 5. Modèle de données (entités principales)

```
User           : id, email, password (hash), roles, nom, prénom
Client         : id, nom, secteur, contact, notes générales, date création
SiteAccess     : id, client_id, type (hébergement/wordpress), url,
                 login (chiffré), password (chiffré), notes
Domain         : id, client_id, nom_domaine, registrar,
                 date_expiration_domaine, date_expiration_ssl, hébergeur
Note           : id, auteur_id, titre, contenu (JSON/HTML), visibilité (privé/équipe)
Tag            : id, nom, couleur
NoteTag        : pivot Note <-> Tag (many-to-many)
Bookmark       : id, nom, url, favicon_url, catégorie, ordre
CalendarEvent  : id, user_id, titre, date, description
ActivityLog    : id, user_id, action, cible, date
```

---

## 6. Structure des dossiers

### Backend (Symfony)
```
src/
├── Controller/Api/
│   ├── AuthController.php
│   ├── ClientController.php
│   ├── SiteAccessController.php
│   ├── DomainController.php
│   ├── NoteController.php
│   ├── BookmarkController.php
│   └── ActivityLogController.php
├── Entity/
├── Repository/
├── Security/
│   ├── Voter/
│   └── ...
├── Service/
│   ├── EncryptionService.php
│   ├── WhoisService.php       (récupération expiration domaines)
│   ├── SslCheckerService.php  (récupération expiration SSL)
│   └── OvhApiService.php
└── Command/
    └── CheckDomainsExpirationCommand.php  (cron quotidien)
```

### Frontend (React + Vite)
```
src/
├── components/
│   ├── ui/              (composants shadcn)
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx
│   │   └── AppLayout.tsx
│   └── shared/
├── pages/
│   ├── auth/Login.tsx
│   ├── dashboard/Dashboard.tsx
│   ├── domaines/Domaines.tsx
│   ├── clients/
│   │   ├── ClientsList.tsx
│   │   └── ClientDetail.tsx
│   ├── acces/Acces.tsx
│   ├── notes/Notes.tsx
│   ├── outils/Outils.tsx
│   └── calendrier/Calendrier.tsx
├── routes/
│   ├── AppRouter.tsx
│   └── ProtectedRoute.tsx
├── hooks/
├── store/               (Zustand)
├── lib/
│   ├── api.ts           (client API centralisé)
│   └── utils.ts
└── styles/
    └── globals.css      (tokens Tailwind)
```

---

## 7. Design system — Tailwind avec tokens

Objectif : pouvoir changer la couleur principale, les fonts, et activer le dark mode en modifiant uniquement des variables CSS, sans toucher au reste du code.

### `globals.css` — tokens primitifs + sémantiques

```css
@layer base {
  :root {
    /* Primitifs */
    --color-blue-500: #3b82f6;
    --color-blue-600: #2563eb;
    --color-gray-50: #f9fafb;
    --color-gray-900: #111827;

    /* Fonts */
    --font-sans: "Inter", system-ui, sans-serif;
    --font-heading: "Inter", system-ui, sans-serif;

    /* Sémantiques (light mode) */
    --background: var(--color-gray-50);
    --foreground: var(--color-gray-900);
    --primary: var(--color-blue-600);
    --primary-foreground: #ffffff;
    --border: #e5e7eb;
    --muted: #f3f4f6;
  }

  .dark {
    --background: var(--color-gray-900);
    --foreground: var(--color-gray-50);
    --primary: var(--color-blue-500);
    --border: #374151;
    --muted: #1f2937;
  }
}
```

### `tailwind.config.js`

```js
export default {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        border: "var(--border)",
        muted: "var(--muted)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        heading: ["var(--font-heading)"],
      },
    },
  },
};
```

Avec ça : changer `--primary` ou `--font-sans` dans `globals.css` met à jour toute l'app instantanément, et le dark mode fonctionne juste en togglant la classe `.dark` sur `<html>`.

---

## 8. Modules / pages du panel

| Module | Description |
|---|---|
| **Dashboard** | Vue d'ensemble + fil d'activité récente |
| **Domaines** | Liste de tous les domaines (auto via API OVH + cPanel o2switch + WHOIS), tri par date d'expiration (les plus urgents en haut), filtres |
| **Clients** | Fiches clients (infos, stack technique, journal d'interventions) |
| **Accès sites** | Coffre-fort chiffré : identifiants hébergement + WordPress par site |
| **Notes** | Éditeur riche type Notion (TipTap), labels/tags, notes privées ou partagées équipe |
| **Outils** | Boîte à outils dev/design (favicon generator, compresseur d'images, contrast checker, QR code...) + raccourcis (cards avec favicon auto, tri par catégorie/domaine, barre de recherche) |
| **Calendrier** | Agenda personnel par utilisateur |
| **Recherche globale** | Barre de recherche (Cmd+K) cross-module |
| **Assistant IA** | Voir section 9 |

---

## 9. Intégration IA

**Contrainte réaliste** : héberger un modèle open-source (Ollama, Llama, Mistral...) demande des ressources serveur (RAM/GPU) que l'hébergement mutualisé o2switch ne fournit pas. L'auto-hébergement n'est donc pas viable pour ce projet.

**Recommandation** : passer par une **API externe à coût très faible/gratuit**, compatible avec le format OpenAI (donc facile à intégrer) :
- **DeepSeek API** — très bon rapport qualité/prix, API compatible OpenAI
- Modèles gratuits via **OpenRouter** (certains modèles open-source y sont accessibles gratuitement avec limites de débit)

**Cas d'usage concrets** :
- Assistant flottant (chat) accessible partout dans le panel
- Aide à la rédaction/résumé dans le module Notes
- Recherche sémantique dans les notes et fiches clients (en complément de la recherche globale classique)

Architecture : un `AiController` côté Symfony qui fait office de proxy vers l'API IA choisie (la clé API ne doit jamais être exposée côté frontend).

---

## 10. Roadmap suggérée

**Phase 1 — Fondations**
- Setup Symfony + Doctrine + auth (Security, login/logout, hash mots de passe)
- Setup React + Vite + Tailwind (tokens) + shadcn + React Router
- Layout général (sidebar, topbar, dark mode), routes protégées

**Phase 2 — Module Domaines**
- Entités Domain, services WHOIS/OVH API/SSL checker, commande cron
- Page Domaines avec tri/filtres

**Phase 3 — Clients & Accès sites**
- Fiches clients + journal d'interventions
- Coffre-fort chiffré (EncryptionService)

**Phase 4 — Notes**
- Éditeur TipTap, labels/tags, notes privées/partagées

**Phase 5 — Outils & Recherche**
- Boîte à outils dev/design
- Raccourcis avec favicon auto
- Recherche globale (Cmd+K)

**Phase 6 — Finitions**
- Calendrier perso
- Fil d'activité sur le dashboard
- Assistant IA
- Animations (Motion) sur les interactions clés