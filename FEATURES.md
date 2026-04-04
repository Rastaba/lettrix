# Lettrix - Document de suivi des fonctionnalites

> Document de travail pour le suivi des features en place et les evolutions futures.
> Derniere mise a jour : 31 mars 2026

---

## Sommaire

- [1. Moteur de jeu](#1-moteur-de-jeu)
- [2. Multijoueur & Reseau](#2-multijoueur--reseau)
- [3. Interface utilisateur](#3-interface-utilisateur)
- [4. Systeme audio & feedback](#4-systeme-audio--feedback)
- [5. Scoring & celebrations](#5-scoring--celebrations)
- [6. Dashboard & statistiques](#6-dashboard--statistiques)
- [7. Internationalisation](#7-internationalisation)
- [8. Themes visuels](#8-themes-visuels)
- [9. Infrastructure technique](#9-infrastructure-technique)
- [10. Limitations connues](#10-limitations-connues)
- [11. Roadmap / Evolutions possibles](#11-roadmap--evolutions-possibles)

---

## 1. Moteur de jeu

### Plateau
- [x] Grille standard 15x15
- [x] 8 cases Triple Word (TW)
- [x] 17 cases Double Word (DW) dont la case centrale
- [x] 12 cases Triple Letter (TL)
- [x] 24 cases Double Letter (DL)

### Tuiles
- [x] Distribution anglaise : 100 tuiles (A=9x1pt, B=2x3pt... Z=1x10pt, 2 jokers)
- [x] Distribution francaise : 102 tuiles (E=15x1pt, K=1x10pt, W=1x10pt... 2 jokers)
- [x] Sac de tuiles avec melange Fisher-Yates
- [x] Pioche automatique apres chaque coup (remplissage a 7)
- [x] Retour au sac + re-melange lors d'un echange
- [x] Compteur de tuiles restantes dans le sac

### Regles implementees
- [x] Premier mot obligatoirement sur la case centrale (7,7)
- [x] Premier mot minimum 2 lettres
- [x] Placement en ligne unique (horizontale OU verticale)
- [x] Contiguïte obligatoire (pas de trous entre les tuiles posees)
- [x] Connexion obligatoire aux tuiles existantes (sauf premier coup)
- [x] Detection de tous les mots formes (mot principal + mots croises)
- [x] Validation de chaque mot contre le dictionnaire
- [x] Echange de tuiles (retourne au sac, pioche de nouvelles)
- [x] Passe de tour
- [x] Jokers (tuiles blanches) avec choix de lettre via modal

### Scoring
- [x] Valeurs de lettres standards (EN et FR)
- [x] Bonus de case DL (x2 lettre), TL (x3 lettre)
- [x] Bonus de case DW (x2 mot), TW (x3 mot)
- [x] Bonus appliques uniquement aux tuiles nouvellement posees
- [x] Jokers = 0 points (meme sur case bonus)
- [x] Bingo : +50 points pour utilisation des 7 tuiles en un coup
- [x] Mots multiples scores separement et additionnes
- [x] Score preview en temps reel cote client (avant validation serveur)

### Fin de partie
- [x] Fin quand un joueur vide son chevalet ET le sac est vide
- [x] Fin apres 6 passes consecutives (3 par joueur)
- [x] Penalite : chaque joueur perd la valeur de ses tuiles restantes
- [x] Bonus : le joueur qui finit gagne la valeur des tuiles de l'adversaire
- [x] Detection d'egalite
- [x] Determination du gagnant par score final

### Dictionnaires
- [x] Anglais : 359 038 mots (`dwyl/english-words`)
- [x] Francais : 402 325 mots (dictionnaire open-source, 402k mots)
- [x] Validation insensible a la casse, mots de 2 a 15 lettres
- [x] Fallback : si pas de dictionnaire, tous les mots sont acceptes
- [x] Script de telechargement automatique (`npm run setup-dict`)

---

## 2. Multijoueur & Reseau

### Gestion des parties
- [x] Creation de partie avec code 4 caracteres (A-Z sans I/O, 2-9 sans 0/1)
- [x] Unicite garantie des codes
- [x] Rejoindre une partie par code (insensible a la casse)
- [x] Limitation stricte a 2 joueurs par partie
- [x] Blocage si la partie est deja commencee ou pleine
- [x] Demarrage automatique quand le 2e joueur rejoint

### Temps reel (Socket.io)
- [x] Synchronisation instantanee du plateau, scores, tours, pioche
- [x] Broadcast personnalise : chaque joueur ne voit que son propre chevalet
- [x] Nombre de tuiles de l'adversaire visible (mais pas les lettres)
- [x] Indicateur de connexion/deconnexion par joueur (pastille verte/rouge)
- [x] Mise a jour apres chaque action (coup, passe, echange)

### Authentification & Identite
- [x] **Mode invité** : entre un pseudo, joue immédiatement (zero friction)
- [x] Token unique genere automatiquement au premier lancement (localStorage)
- [x] Token envoye avec chaque action (create, join)
- [x] Profil joueur persistant lie au token (nom, stats)
- [x] **Protection de pseudo** (optionnel) : mot de passe pour reserver son nom
- [x] Si un pseudo protege est utilise, mot de passe demande
- [x] Login recupere le token original + toutes les stats
- [x] Hash SHA-256 avec salt cote serveur
- [x] Auto-creation du profil au chargement du dashboard (survit au reset DB)

### Reconnexion
- [x] Session persistee en sessionStorage (gameCode + playerId)
- [x] Auto-rejoin par token a la connexion (survit au refresh)
- [x] Fallback sessionStorage si auto-rejoin echoue
- [x] Mise a jour du socketId cote serveur
- [x] Re-broadcast de l'etat complet au joueur reconnecte
- [x] Recherche de partie active par token (findGameByToken)

### Chrono de tour (nudge, pas de limite dure)
- [x] Chrono ascendant (temps ecoule depuis debut du tour)
- [x] Affiche pour les 2 joueurs (mon tour + tour adverse)
- [x] Nudges progressifs a 1, 2, 3, 4, 5 minutes ("Tic tac...", "Ton adversaire attend...", etc.)
- [x] Glow progressif sur le panneau de controles :
  - 0-59s : gris discret
  - 1-2 min : texte ambre
  - 3-4 min : texte orange + glow orange pulsant lent
  - 4 min+ : texte rouge + glow rouge pulsant rapide
- [x] Timer reset a chaque action
- [x] Serveur broadcast l'etat toutes les 10s pour synchronisation
- [x] Tick local chaque seconde pour fluidite entre updates serveur

### Revanche (Rematch)
- [x] Bouton "Revanche !" en fin de partie
- [x] Notification quand l'adversaire veut une revanche
- [x] Bouton "Accepter la revanche !" (vert pulsant)
- [x] Creation automatique d'une nouvelle partie avec memes joueurs et langue
- [x] Transition automatique vers la nouvelle partie (zero friction)
- [x] Bouton "Retour au dashboard" si pas de revanche

### Events Socket.io
| Event | Direction | Description |
|-------|-----------|-------------|
| `create-game` | Client → Serveur | Cree une partie (+ token) |
| `join-game` | Client → Serveur | Rejoint une partie existante (+ token) |
| `auto-rejoin` | Client → Serveur | Reconnexion automatique par token |
| `rejoin-game` | Client → Serveur | Reconnexion par code + playerId |
| `play-move` | Client → Serveur | Soumet un coup |
| `pass-turn` | Client → Serveur | Passe son tour |
| `exchange-tiles` | Client → Serveur | Echange de tuiles |
| `request-rematch` | Client → Serveur | Demande de revanche |
| `get-player-stats` | Client → Serveur | Stats d'un joueur |
| `get-game-history` | Client → Serveur | Historique des parties |
| `get-leaderboard` | Client → Serveur | Classement global |
| `check-name` | Client → Serveur | Verifie si un pseudo est protege |
| `claim-name` | Client → Serveur | Protege un pseudo avec mot de passe |
| `login` | Client → Serveur | Connexion avec pseudo + mot de passe |
| `check-my-claim` | Client → Serveur | Verifie si mon pseudo est protege (+ auto-register) |
| `game-state` | Serveur → Client | Etat de partie (+ turnElapsed) |
| `rematch-requested` | Serveur → Client | L'adversaire veut une revanche |
| `rematch-started` | Serveur → Client | Nouvelle partie creee (auto-transition) |
| `disconnect` | Auto | Marque le joueur comme deconnecte |

### Deploiement
- [x] Serveur Express sert le build client en production
- [x] Docker + Fly.io ready
- [x] PM2 pour auto-restart

---

## 3. Interface utilisateur

### Navigation
- [x] **Ecran d'accueil** : saisie pseudo + leaderboard visible (premiere visite)
- [x] **Dashboard** : 3 onglets (Accueil / Mes stats / Classement)
- [x] **Lobby** : creation ou rejoindre une partie
- [x] **Ecran d'attente** : affichage du code, copie en 1 clic, boutons partage (X, WhatsApp, copier)
- [x] **Jeu** : plateau, chevalet, controles, sidebar, bouton aide (?)
- [x] **Game Over** : scores, stats, revanche, replay, partage
- [x] **Tuto premiere partie** : 4 etapes (bienvenue, placement, bonus, scoring)
- [x] **Modal aide** : regles, legende des cases, astuces (accessible via ?)
- [x] Nom du joueur sauvegarde en localStorage

### Plateau de jeu
- [x] Grille 15x15 responsive (max 600px, 95vw)
- [x] Cases bonus avec labels clairs selon la langue (M×3, M×2, L×3, L×2 en FR / W×3, W×2 en EN)
- [x] Etoile animee sur la case centrale
- [x] Tuiles posees avec animation pop-in
- [x] Dernier coup en surbrillance verte
- [x] Ghost tiles : preview semi-transparente au survol quand une tuile est selectionnee
- [x] Zones de drop highlight pendant le drag (contour dore)

### Chevalet
- [x] 7 emplacements avec slots vides en pointilles
- [x] Drag & drop pour reorganiser les tuiles (`@dnd-kit/sortable`)
- [x] Drag & drop du chevalet vers le plateau (`@dnd-kit/core`)
- [x] Click-to-select + click-to-place (fonctionne en parallele du DnD)
- [x] Bouton shuffle pour melanger aleatoirement
- [x] Overlay fantome dore pendant le drag
- [x] Tuile selectionnee : scale + glow
- [x] Mode echange : selection multiple avec anneau rouge

### Controles
- [x] **Jouer** : soumet le coup (affiche le score prevu dans le bouton)
- [x] **Rappeler** : retire toutes les tuiles posees
- [x] **Echanger** : mode echange avec confirmation
- [x] **Passer** : passe son tour
- [x] **Shuffle** : melange le chevalet
- [x] **Quitter** : bouton discret avec modal de confirmation
- [x] Boutons desactives quand l'action n'est pas possible
- [x] Timer affichant le temps de reflexion de l'adversaire (MM:SS)

### Score preview
- [x] Calcul en temps reel cote client (meme algorithme que le serveur)
- [x] Affichage du score potentiel au-dessus des boutons
- [x] Mots detectes affiches a cote du score
- [x] Score integre dans le bouton Jouer : "Jouer (+42)"
- [x] N'affiche rien si le placement est invalide

### Scoreboard
- [x] Score de chaque joueur avec animation count-up (500ms ease-out)
- [x] Indicateur de tour actif (barre laterale doree + glow)
- [x] Couronne du joueur en tete
- [x] Ecart de score affiche en bas
- [x] Nombre de tuiles en main par joueur
- [x] Compteur de tuiles restantes dans le sac
- [x] Pastille connexion (vert/rouge)

### Historique des coups
- [x] Liste en ordre chronologique inverse
- [x] Dernier coup mis en avant
- [x] Couleurs par type : ambre (joue), bleu (echange), gris (passe)
- [x] Score affiche pour les coups joues
- [x] Mots affiches pour les coups joues
- [x] Scrollable (max 52 lignes)

### Ecran de fin
- [x] Modal avec emoji (trophee, triste)
- [x] Scores finaux tries, medailles
- [x] Stats : nombre de mots joues, meilleur coup de la partie
- [x] Bouton "Revanche !" (1 clic, notification adversaire, transition auto)
- [x] Bouton "🎬 Voir le replay" (animation Canvas mot par mot)
- [x] Boutons partage (X, WhatsApp, copier le resultat)
- [x] Bouton "Retour au dashboard"

### Copier le code de partie
- [x] Clic sur le code = copie dans le presse-papier
- [x] Feedback visuel "✓ Copied!"
- [x] Fonctionne sur l'ecran d'attente et dans le header en jeu

### Titre d'onglet dynamique
- [x] Attente : `Lettrix - ⏳ AB3K`
- [x] Mon tour : `Lettrix - 🟢 À VOUS DE JOUER`
- [x] Tour adverse : `Lettrix - ⏳ TOUR ADVERSE`

### Barre de reglages unifiee (SettingsBar)
- [x] Son : icone haut-parleur avec ondes animees, toggle mute
- [x] Langue : drapeau + code (🇫🇷 FR / 🇬🇧 EN), bascule en 1 clic
- [x] Theme : icone eclair ⚡ Neon / soleil ☀ Classic
- [x] Design compact en pill, separateurs subtils
- [x] Bouton aide (?) ouvre le modal de regles/legende
- [x] Present partout (lobby, dashboard, jeu, attente)

---

## 4. Systeme audio & feedback

### Sons synthetises (Web Audio API)
| Action | Son | Haptic |
|--------|-----|--------|
| Selection tuile | Blip aigu + noise click | Light (8ms) |
| Placement tuile | Thud triangle + sine harmonique | Medium (20ms) |
| Retrait tuile | Tons descendants doux | Light |
| Erreur | Sawtooth grave descendant | Heavy (pattern) |
| A votre tour | 3 notes ascendantes (carillon) | Success (pattern) |
| Passe | Ton grave court | - |
| Echange | Cascade de 3 clicks | - |
| Shuffle | 6 noise bursts rapides | Medium |
| Fin victoire | Accord triomphant ascendant | Success |
| Fin defaite | 3 notes descendantes tristes | Heavy |

### Design sonore
- [x] 2 oscillateurs desaccordes par note pour richesse
- [x] Noise burst percussif pour les clicks
- [x] Variation de pitch aleatoire (±3%) pour naturel
- [x] Enveloppes ADSR (attaque, sustain, release)
- [x] Types d'oscillateurs : sine, triangle, sawtooth
- [x] Mute persistant en localStorage
- [x] Haptic feedback sur mobile (navigator.vibrate)

---

## 5. Scoring & celebrations

### Paliers de celebration
| Points | Tier | Visuels | Son |
|--------|------|---------|-----|
| 1-9 | Basic | Score flottant | Ding simple |
| 10-19 | Good | Score + message "Pas mal !" | 2 notes |
| 20-34 | Great | Particules burst + "Bien joue !" | Accord C-E-G |
| 35-49 | Excellent | Particules + flash ecran + "Magnifique !" | Arpege 4 notes + harmonie |
| 50-69 | Incredible | Confetti + flash + "INCROYABLE !" | Fanfare 5 notes + accord |
| 70+ | Legendary | Confetti massif + glow intense + "LEGENDAIRE !!" | Fanfare epique + accord soutenu |
| 7 lettres | **Lettrix!** | **80 confettis arc-en-ciel, 50 particules, 4 tuiles L·E·T·X en orbite, texte rainbow anime, double flash, +50 BONUS badge** | **8 notes montantes (do-do), accord 6 voix, sparkle, triple haptic** |

### Effets visuels
- [x] Score flottant : apparait avec blur, grossit, monte, disparait
- [x] Message slam : zoom x3 → x1 avec claquement
- [x] Particules : burst radial du centre avec couleurs aleatoires
- [x] Confetti : pieces colorees tombant du haut avec rotation et wobble
- [x] Flash ecran : radial gradient pulsant
- [x] Glow texte : ombre lumineuse sur le score
- [x] Messages bilingues aleatoires (2 variantes par palier)
- [x] Notification discrete pour le score de l'adversaire

### Animations (CSS)
- [x] `pop-in` : scale bounce 0.5→1.1→1 (0.25s)
- [x] `slide-up` : translateY + opacity (0.4s)
- [x] `float` : oscillation Y (3s loop)
- [x] `pulse-glow` : brightness pulse (2s loop)
- [x] `shimmer` : gradient position shift (4s loop)
- [x] `score-bump` : scale 1→1.3→1 (0.5s) sur changement de score
- [x] `star-pulse` : rotation + drop-shadow (3s loop)
- [x] `sound-wave` : pulse opacite ondes sonores (1.2s loop)
- [x] `celeb-score-float` : montee + fade (2.5s)
- [x] `celeb-message-slam` : zoom slam (3s)
- [x] `celeb-confetti` : chute + wobble + rotation (3s)
- [x] `celeb-particle` : burst radial (0.8s)
- [x] `celeb-screen-flash` : radial flash (1.5s)
- [x] `rainbow-shift` : cycle couleur arc-en-ciel (2s loop, celebration Lettrix)
- [x] `fullrack-orbit` : lettres en orbite autour du centre (4s, celebration Lettrix)
- [x] `timer-pulse-orange` : glow orange pulsant (3s, nudge tour)
- [x] `timer-pulse-red` : glow rouge pulsant rapide (1.5s, nudge tour urgent)

---

## 6. Dashboard & statistiques

### Dashboard a onglets
- [x] **Accueil** : stats rapides en ligne + 5 dernieres parties
- [x] **Mes stats** : performance (parties/victoires/taux + barre), records (meilleur score/mot/mot le plus long/moyenne), activite (mots joues/lettrix/total points)
- [x] **Classement** : leaderboard global (joueurs/meilleurs mots/meilleurs scores)

### Stats personnelles trackees
- [x] Parties jouees / victoires / taux de victoire (%)
- [x] Points totaux cumules / meilleur score / score moyen par partie
- [x] Meilleur mot joue (+ score) / mot le plus long
- [x] Nombre total de mots joues
- [x] Nombre de Lettrix (7 lettres)
- [x] Score moyen par mot
- [x] Serie de victoires en cours / meilleure serie
- [x] Date de derniere partie

### Historique des parties
- [x] 50 dernieres parties par joueur
- [x] Resultat (Victoire / Defaite / Egalite) avec code couleur
- [x] Adversaire, scores, nombre de tours, langue, date
- [x] Charge depuis le serveur au retour au dashboard

### Leaderboard (classement global)
- [x] **Onglet Joueurs** : top 10 par victoires, taux, score total
- [x] **Onglet Meilleurs mots** : top 10 coups les plus scores (20+ pts)
- [x] **Onglet Meilleurs scores** : top 10 scores en une partie
- [x] Medailles pour le top 3 (🥇🥈🥉)
- [x] Coups epiques enregistres separement (moves 20+ pts)
- [x] Maximum 100 coups epiques conserves

### Stockage
- [x] **Persistance JSON** (`server/data/db.json`)
- [x] Sauvegarde automatique a la fin de chaque partie
- [x] Throttled write (max 1 ecriture/seconde pour performance)
- [x] Survit au redemarrage du serveur
- [x] Joueurs, stats, historique, coups epiques persistes
- [x] Max 500 parties en historique, 100 coups epiques

---

## 7. Internationalisation

### Langues supportees
- [x] Francais (defaut)
- [x] Anglais

### Ce qui change selon la langue
- [x] Toute l'interface (60+ cles de traduction)
- [x] Distribution et valeurs des tuiles (FR: 102 tuiles, EN: 100 tuiles)
- [x] Dictionnaire utilise pour la validation
- [x] Messages de celebration
- [x] La langue est choisie a la creation de partie et envoyee au serveur

### Persistance
- [x] Preference sauvegardee en localStorage
- [x] Changement en temps reel sans rechargement

---

## 8. Themes visuels

### Neon (defaut)
- Fond : gradient sombre bleu/violet avec particules animees
- Panneaux : glassmorphism (backdrop-blur + semi-transparent)
- Tuiles : gradient dore avec glow
- Cases bonus : gradients neon avec glow colore
- Bordures : gradient multicolore anime
- Effets : glow, shimmer, particules, text-shadow neon

### Classic (style classique)
- Fond : gradient bois noyer sombre
- Panneaux : bois chaud opaque
- Plateau : feutre vert avec cadre bois marron
- Tuiles : ivoire/creme avec ombre douce
- Cases bonus : couleurs unies traditionnelles
- Etoile centrale : or statique
- Pas de glow, pas de particules

### Persistance
- [x] Preference sauvegardee en localStorage
- [x] Class CSS appliquee sur `<body>` (`neon` ou `classic`)
- [x] Overrides CSS complets pour le theme classic

---

## 9. Infrastructure technique

### Stack
| Couche | Technologie |
|--------|-------------|
| Serveur | Node.js 18+, Express 4, Socket.io 4, TypeScript 5 |
| Client | React 18, Vite 5, Tailwind CSS 3, TypeScript 5 |
| DnD | @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities |
| Audio | Web Audio API (synthese, 0 fichier externe) |
| Temps reel | Socket.io (WebSocket + polling fallback) |

### Scripts npm
| Script | Description |
|--------|-------------|
| `npm run dev` | Lance serveur (3001) + client (5180) en parallele |
| `npm run dev:server` | Lance le serveur seul |
| `npm run dev:client` | Lance le client seul |
| `npm run build` | Build production du client |
| `npm start` | Lance le serveur en production |
| `npm run setup-dict` | Telecharge les dictionnaires FR + EN |
| `npm run install:all` | Installe les deps serveur + client |

### Ports
| Service | Port |
|---------|------|
| Serveur Express + Socket.io | 3001 |
| Client Vite dev | 5180 |

### Persistance (db.ts)
- [x] Fichier JSON (`server/data/db.json`)
- [x] Ecriture throttled (1s) pour eviter les I/O excessifs
- [x] Structure : `{ players: Record<token, PlayerRecord>, games: GameRecord[], epicMoves: EpicMoveRecord[] }`
- [x] Survit au redemarrage du serveur
- [x] Charge au demarrage (`loadDB()`)
- [x] Zero dependance externe (juste `fs`)

### Securite
- [x] Validation de tous les coups cote serveur (anti-triche)
- [x] Le chevalet de l'adversaire n'est jamais envoye au client
- [x] Verification que les tuiles jouees sont bien dans le chevalet du joueur
- [x] Verification du tour de jeu (pas de coup hors tour)
- [x] CORS ouvert (necessaire pour dev, a restreindre en prod)

---

## 10. Limitations connues

| # | Limitation | Impact | Piste d'evolution |
|---|-----------|--------|-------------------|
| 1 | ~~Donnees en memoire~~ | ~~RESOLU~~ : persistance JSON | ✅ Fait |
| 2 | ~~Pas d'authentification~~ | ~~RESOLU~~ : token + protection pseudo optionnelle | ✅ Fait |
| 3 | ~~Pas de timeout d'inactivite~~ | ~~RESOLU~~ : chrono + nudges progressifs | ✅ Fait |
| 4 | Pas de mode spectateur | On ne peut que jouer, pas regarder | Mode spectateur |
| 5 | Pas de mode solo / IA | Necessite 2 joueurs humains | IA avec niveaux |
| 6 | Pas de systeme de challenge | On ne peut pas contester un mot | Systeme de defi |
| 7 | ~~Pas de replay de partie~~ | ~~RESOLU~~ : replay Canvas anime + export video | ✅ Fait |
| 8 | Pas de rate limiting | Risque de spam socket | Rate limiter |
| 9 | Accessibilite limitee | Peu d'ARIA labels, pas de nav clavier complete | Audit accessibilite |
| 10 | ~~Pas de partage social~~ | ~~RESOLU~~ : boutons X/WhatsApp/copier + replay video | ✅ Fait |
| 11 | Parties actives non persistees | Parties en cours perdues au restart serveur | Serialisation Game |

---

## 11. Roadmap / Evolutions possibles

### Court terme (quick wins)
- [x] ~~Persistance des donnees~~ → JSON file (`db.json`)
- [x] ~~Timer par tour~~ → 120s avec auto-passe et countdown visuel
- [x] ~~Mode "Revanche"~~ → 1 clic, transition automatique
- [x] ~~Authentification legere~~ → Token + protection pseudo optionnelle
- [x] ~~Partage de resultat~~ → Boutons X/WhatsApp/copier + replay video
- [x] ~~Tutoriel pour debutants~~ → Tuto 4 etapes + modal aide permanent
- [x] ~~Labels bonus clairs~~ → M×3/M×2/L×3/L×2 au lieu de TW/DW/TL/DL
- [x] ~~Celebration Lettrix~~ → Effet special quand 7 lettres posees
- [ ] Systeme de defi (contester un mot)

### Moyen terme
- [ ] Mode solo contre IA (niveaux facile/moyen/difficile)
- [ ] Mode 3-4 joueurs
- [x] ~~Comptes joueur avec authentification~~ → Protection pseudo + login simple
- [ ] Persistance base de donnees
- [ ] Chat en jeu
- [ ] Mode spectateur
- [x] ~~Replay de partie~~ → Animation Canvas + export WebM
- [x] ~~Tutoriel interactif~~ → 4 etapes + modal aide

### Long terme
- [ ] Matchmaking automatique
- [ ] Classement ELO
- [ ] Tournois
- [ ] Themes saisonniers
- [ ] Systeme d'achievements / badges
- [ ] Application mobile native (React Native)
- [ ] Mode hors-ligne (PWA)

---

*Ce document est mis a jour au fil des evolutions du projet.*
