# 🫧 Bubble Shooter — Backend (Node.js + Postgres) — Archi en couches

Backend temps réel (WebSocket) + un endpoint REST (`POST /clearAll`) + persistance **PostgreSQL**.

## 🎯 Objectifs
Séparer **API / cas d’usage / règles métier / technique** pour éviter un `index.js` monolithique et garder un code testable.

---

## 🧱 Les couches

### 1) `presentation/` — Entrées/Sorties (API)
- **HTTP** : routes + controllers
- **WebSocket** : reçoit `addWord`, `hitWord` et **push** l’état / leaderboard à tous

📌 Fichiers :
- `src/presentation/http/routes.ts`
- `src/presentation/http/controllers/adminController.ts` (REST : `POST /clearAll`)
- `src/presentation/ws/wsGateway.ts` (WS : events + broadcast)

---

### 2) `application/` — Use cases (orchestration)
Orchestre le “quoi faire” : appelle le repo, applique le domaine, déclenche le broadcast.
- `addWord.ts`, `hitWord.ts`, `getLeaderboard.ts`, `clearAll.ts`
- scheduler reset auto 15 min

📌 Fichiers :
- `src/application/usecases/addWord.ts`
- `src/application/usecases/hitWord.ts`
- `src/application/usecases/getLeaderboard.ts`
- `src/application/usecases/clearAll.ts`
- `src/application/scheduler/resetScheduler.ts`

---

### 3) `domain/` — Métier pur (règles du jeu)
Aucune dépendance technique (ni DB, ni HTTP, ni WS).
- entité `Bubble`
- règles PV / taille / pop

📌 Fichiers :
- `src/domain/entities/bubble.ts`
- `src/domain/services/bubbleRules.ts`
- `src/domain/errors/domainError.ts`

---

### 4) `infrastructure/` — Technique (Postgres + WS impl)
Implémentations concrètes :
- accès DB (client)
- repository Postgres (SQL)
- broadcaster socket.io/ws

📌 Fichiers :
- `src/infrastructure/db/client.ts`
- `src/infrastructure/db/connectionManager.ts` (**failover DB1/DB2**)
- `src/infrastructure/repositories/bubbleRepository.ts` (interface)
- `src/infrastructure/repositories/bubbleRepositoryPostgres.ts` (impl Postgres)
- `src/infrastructure/realtime/broadcaster.ts` (interface)
- `src/infrastructure/realtime/socketIoBroadcaster.ts` (impl)

---

## 🗄️ DB1 / DB2 : failover (Patroni / Primary-Standby)

On a **deux instances Postgres** :
- **DB1** : normalement **PRIMARY** (read-write)
- **DB2** : normalement **STANDBY** (read-only) qui réplique DB1

En cas de panne de DB1, **Patroni promeut DB2** en nouveau PRIMARY.

### Comment l’app “switch” ?
L’app ne doit pas connaître les règles Patroni dans les use cases.  
Le switch est géré **uniquement** dans `infrastructure/db/` via `connectionManager.ts` :

- l’app a 2 URLs en config :
  - `DB_URL_SITE_A` (DB1)
  - `DB_URL_SITE_B` (DB2)
- le `connectionManager` choisit automatiquement **le leader** (PRIMARY) et re-bascule après un failover
- le reste du code utilise juste le client DB (ex: `db.query(...)`) sans se soucier de DB1/DB2

📌 Fichier clé :
- `src/infrastructure/db/connectionManager.ts` : logique de sélection DB + reconnexion + failover

---

## 🔌 Bootstrap
Point d’entrée : wiring (instancie repo, use cases, ws/http)

- `src/main.ts`

---

## ✅ Scope actuel (in-memory, sans DB)

Le backend est actuellement orienté validation locale multi-clients via WebSocket, avec stockage en mémoire.

### HTTP
- `GET /health` -> `{ "status": "ok" }`

### WebSocket
Events entrants :
- `addWord` payload `{ word: string }`
- `hitWord` payload `{ word: string }`
- `leaderboard` (optionnellement avec ack)

Events sortants :
- `state` -> `Array<{ word: string; hp: number }>`
- `leaderboard` -> `Array<{ word: string; hp: number }>`
- `error` -> `{ code: string; message: string }`

### Règles métier
- Nouveau mot: `5 HP`
- Mot existant: `+5 HP` (cap `25`)
- Hit: `-1 HP`
- `HP <= 0`: bulle supprimée

### Run
```bash
npm install
npm run dev
npm test
```
