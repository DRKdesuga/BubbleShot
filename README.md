# 🫧 Jeu de Bulles de Mots

Un petit jeu multijoueur en temps réel qu'on a fait entre potes. Tu ajoutes des mots, ils deviennent des bulles, et tu peux éclater celles des autres. C'est con, c'est fun.

---

## C'est quoi ?

T'arrives sur le site, tu tapes un mot, il apparaît comme une bulle qui flotte à l'écran. Plus un mot est ajouté souvent, plus sa bulle est grosse. Tu peux cliquer sur une bulle pour lui retirer de la vie — quand elle tombe à 0, elle éclate. Toutes les 15 minutes, tout se remet à zéro et on repart de zéro.

Plusieurs personnes peuvent jouer en même temps, tout est synchronisé en temps réel.

---

## Fonctionnalités

**Les bulles**
- Tape un mot → une bulle apparaît avec 5 PV
- Le même mot retapé → la bulle grossit
- Clique sur une bulle → elle perd 1 PV
- 0 PV → 💥 elle éclate
- Les bulles gravitent autour de la plus grosse et se repoussent entre elles
- Passe ta souris dessus → elles fuient

**Le classement**
- Leaderboard en temps réel des mots les plus populaires
- Stats : nombre de mots uniques + total des ajouts

**Le reset**
- Toutes les 15 minutes, tout est remis à zéro automatiquement

---

## Stack technique

| Partie | Techno |
|--------|--------|
| Frontend | React + Canvas/CSS animations |
| Backend | Node.js + WebSocket |
| Base de données | Cloud privé (externe) |
| Déploiement | Docker sur VM OVH |

---

## Architecture

```
Navigateur
    │
    ├── WebSocket ──► Backend Node.js ──► DB Cloud
    │                      │
    └── HTTP      ──► Fichiers frontend servis par le backend
```

Le backend gère à la fois les fichiers statiques du frontend et les connexions WebSocket en temps réel.

**Événements WebSocket :**
- `addWord(word)` — ajoute ou agrandit une bulle
- `hitWord(word)` — retire 1 PV à une bulle
- `leaderboard` — demande le classement actuel

**Endpoints REST :**
- `POST /clearAll` — reset complet (déclenché automatiquement toutes les 15 min)

---

## Lancer le projet en local

### Prérequis
- Node.js 18+
- Docker (optionnel)

### Sans Docker
```bash
# Cloner le repo
git clone https://github.com/votre-equipe/bulles-de-mots
cd bulles-de-mots

# Installer les dépendances
npm install

# Lancer
npm run dev
```

### Avec Docker
```bash
docker compose up --build
```

L'app tourne sur `http://localhost:3000`.

---

## Déploiement sur la VM OVH

Le workflow est simple :

```bash
# 1. Tu push ton code sur GitHub depuis ton PC
git push

# 2. Tu te connectes à la VM
ssh user@ip-de-la-vm

# 3. Tu récupères le code
git pull

# 4. Tu relances Docker
docker compose up --build -d
```

Et c'est live. 🎉

---

## Structure du projet

```
.
├── frontend/         # Interface React
│   ├── src/
│   └── ...
├── backend/          # Serveur Node.js // Java
│   ├── index.js
│   └── ...
├── docker-compose.yml
└── README.md
```

---

## Contribuer

On travaille tous sur la même branche `main` pour l'instant. Si tu veux ajouter un truc :

1. Tu crées une branche (`git checkout -b ma-feature`)
2. Tu codes, tu testes en local
3. Tu push et tu fais une PR
4. Un des autres valide et merge

---

*Fait avec amour et trop de Red Bull 🫧*
