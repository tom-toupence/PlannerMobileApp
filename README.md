# PlannerApp

README en français — aperçu et instructions pour développer et déployer l'application.

## Description

PlannerApp est une application de gestion d'événements et de groupes composée de :

- un backend écrit en Go (API REST) situé dans le dossier `backend/` ;
- un frontend (application mobile/web avec Expo / React Native + TypeScript) dans `frontend/` ;
- un worker Cloudflare pour les uploads vers R2 dans `cloudflare-worker/`.

L'application utilise Supabase pour la base de données/auth et Cloudflare R2 pour le stockage d'objets.

## Structure du dépôt

- `backend/` — code serveur Go, `go.mod` fourni, point d'entrée `main.go` et binaire `plannerapp-backend.exe` (Windows).
	- `internal/config/` — gestion des configs
	- `internal/database/` — intégration Supabase
	- `internal/handlers/` — handlers HTTP (auth, events, groups, members, messages, profile, upload)
	- `internal/middleware/` — middleware (ex : auth)
	- `internal/models/` — structures de données
	- `internal/storage/` — R2 / stockage

- `frontend/` — application Expo / React Native (TypeScript)
	- `app/` — écrans et routes
	- `lib/` — utilitaires côté client (ex : `supabase.ts`, `api.ts`)
	- `assets/` — images et icônes
	- `package.json` — scripts et dépendances

- `cloudflare-worker/` — worker JS pour recevoir et stocker des uploads dans R2

## Contrat rapide (inputs/outputs)

- Inputs : requêtes HTTP REST depuis le frontend (utilisateur authentifié ou anonyme selon l'endpoint).
- Outputs : JSON pour l'API backend, fichiers stockés dans R2, notifications/messages selon implémentation.
- Erreurs : réponses HTTP avec code d'erreur standard (401/403/404/500) et message JSON.

## Prérequis

- Go (1.20+ recommandé) pour le backend
- Node.js (16+ recommandé) et npm pour le frontend (Expo)
- Compte Supabase et clés (URL + service/API key)
- Compte Cloudflare avec R2 (access key, secret, bucket)
- (Optionnel) Wrangler si vous gérez/déployez le worker Cloudflare localement

## Variables d'environnement importantes

Créez un fichier d'environnement pour le backend (par exemple `backend/.env`) ou configurez vos variables dans votre gestionnaire de secrets :

- SUPABASE_URL — URL de votre instance Supabase
- SUPABASE_KEY — clé publique/anon ou clé serveur selon usage (ne pas exposer la clé serveur côté client)
- CF_R2_ACCOUNT_ID — (si nécessaire selon votre intégration)
- CF_R2_ACCESS_KEY_ID — clé d'accès R2
- CF_R2_SECRET_ACCESS_KEY — secret R2
- CF_R2_BUCKET — nom du bucket R2
- OTHER configuration possible : PORT, JWT_SECRET, etc.

Consultez `backend/internal/config/config.go` pour la liste exacte des variables lues par le backend.

## Installation et exécution (développement)

Les commandes suivantes sont données pour PowerShell (Windows). Adaptez-les si vous êtes sous Mac/Linux.

1) Backend (Go)

```powershell
cd backend
# installer les dépendances Go (module-aware) et lancer en mode développement
go mod download
go run .
# ou construire l'exécutable Windows
go build -o plannerapp-backend.exe
```

Le serveur écoute généralement sur `:8080` (ou le PORT configuré). Vérifiez les logs en sortie.

2) Frontend (Expo / React Native)

```powershell
cd frontend
npm install
npm start
# puis choisissez 'Run on Android/iOS/web' ou utilisez l'app Expo Go
```

Si vous préférez Yarn : `yarn install` puis `yarn start`.

3) Cloudflare Worker (optionnel, local)

Si vous utilisez Wrangler pour déployer/localiser le worker :

```powershell
cd cloudflare-worker
# installer Wrangler si besoin : npm i -g wrangler
# configurer wrangler.toml et variables, puis :
wrangler dev r2-upload-worker.js
# ou pour déployer : wrangler publish
```

## Commandes utiles

- Tests backend (Go) :

```powershell
cd backend
go test ./...
```

- Linter / vet (Go) :

```powershell
go vet ./...
golangci-lint run   # si installé et configuré
```

- Frontend :

```powershell
cd frontend
npm test
npm run build   # si un script 'build' est défini
```

## Déploiement

- Backend : builder l'exécutable avec `go build` et déployer sur votre serveur/VM/container.
- Frontend : pour Expo, utilisez EAS/Expo build ou build web (`npm run web`) si vous ciblez le web.
- Worker Cloudflare : déployez via `wrangler publish` vers votre compte Cloudflare.

N'oubliez pas de configurer correctement les variables d'environnement et les secrets côté CI/CD.

## Sécurité et bonnes pratiques

- Ne stockez jamais de clés secrètes dans le dépôt. Utilisez des variables d'environnement ou un secret manager.
- Limitez les permissions des clés utilisée (p. ex. clé anon pour le client, clé service côté serveur uniquement).
- Validez et échappez les entrées côté serveur.

## Dépannage rapide

- Backend ne démarre pas : vérifiez que les variables d'environnement requises sont fournies et que les modules Go sont téléchargés (`go mod download`).
- Frontend Expo : si Metro échoue, supprimez `node_modules` et réinstallez : `rm -r node_modules; npm install` (Windows PowerShell : `Remove-Item -Recurse node_modules; npm install`).

## Contribution

Contributions bienvenues — créez une issue pour proposer une fonctionnalité ou un bug, puis ouvrez une PR sur la branche `main` ou une branche dédiée. Quelques recommandations :

- Ouvrez une branche feature/bugfix claire (ex : `feature/login-improvements`).
- Ajoutez des tests pour les comportements modifiés (Go / JS) et assurez-vous qu'ils passent.
- Respectez le style existant et les linters.

## Fichiers importants

- `backend/main.go` — point d'entrée backend
- `frontend/package.json` — scripts et dépendances frontend
- `cloudflare-worker/r2-upload-worker.js` — worker pour R2

## Roadmap et améliorations possibles

- Ajouter une documentation d'API (OpenAPI/Swagger).
- Automatiser CI/CD pour build & tests (GitHub Actions).
- Ajout d'une suite de tests end-to-end pour le flux principal.

## Licence

Licence : à préciser (ajoutez un fichier `LICENSE` si besoin).

---
