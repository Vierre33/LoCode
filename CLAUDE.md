# LoCode

## Description

Éditeur de code web léger et rapide, alternative à VSCode orientée performance et accessibilité mobile.
Conçu pour le développement sur serveurs distants via SSH, avec une interface simple et ergonomique.

L'objectif principal est la vitesse : chargement instantané, interactions fluides, et une UI qui ne ralentit pas le développeur.

## Architecture

- **Frontend** : Nuxt 4 + Vue 3 + Monaco Editor (même moteur d'édition que VSCode)
- **Backend** : Deno (serveur HTTP standalone, port 8080)
- **Proxy** : Nuxt server route `server/api/[...url].ts` redirige les appels `/api/*` vers le backend Deno
- **Style** : Design glassmorphism (blur + transparence) avec Tailwind CSS via @nuxt/ui

## Structure du projet

```
app/                              # Frontend Nuxt
  app.vue                         # Layout racine + fond animé gradient
  pages/
    index.vue                     # Page principale (éditeur + explorateur)
    [..._].vue                    # Catch-all redirect vers /
  components/
    FileExplorer.vue              # Sidebar explorateur de fichiers
    FileTree.vue                  # Arbre de fichiers récursif
    MonacoEditor.client.vue       # Éditeur Monaco (client-only)
  plugins/
    monaco.client.ts              # Initialisation des workers Monaco
  middleware/
    auth.global.ts                # Middleware auth (désactivé pour le moment)
  assets/css/
    main.css                      # Import Tailwind

backend/
  server.ts                       # API Deno (read/write/list)

server/
  api/[...url].ts                 # Proxy Nuxt → Deno
```

## API Backend (Deno)

Le serveur Deno expose 3 endpoints REST :

| Route | Méthode | Description | Paramètres |
|-------|---------|-------------|------------|
| `/list` | GET | Liste le contenu d'un répertoire | `path` (query, défaut: `.`) |
| `/read` | GET | Lit le contenu d'un fichier | `path` (query) |
| `/write` | POST | Écrit/sauvegarde un fichier | `{ path, content }` (body JSON) |

Le frontend appelle ces routes via `/api/list`, `/api/read`, `/api/write` — le proxy Nuxt redirige vers le backend Deno.

## Commandes

```bash
# Démarrer le backend Deno
deno run --allow-all backend/server.ts

# Démarrer le frontend Nuxt (dev)
npm run dev

# Build de production
npm run build

# Preview du build
npm run preview
```

Les deux serveurs doivent tourner simultanément en développement.

## Configuration

Fichier `.env` à la racine :

```
DENO_URL="http://localhost"
DENO_PORT="8080"
```

## Ce qui a été fait

- Éditeur Monaco avec coloration syntaxique (~50 langages : JS, TS, Vue, Python, Rust, Go, C/C++, Haskell, Java, Kotlin, Ruby, PHP, etc.)
- Détection automatique du langage selon l'extension du fichier (table `langMap` extensible)
- Explorateur de fichiers avec chargement lazy des sous-dossiers
- Lecture et écriture de fichiers via API REST
- Design glassmorphism avec fond animé en gradient (bleu/vert)
- Proxy Nuxt vers backend Deno (server route catch-all)
- Préchargement du répertoire racine côté backend (cache mémoire au démarrage du serveur Deno)
- Layout responsive avec sidebar mobile en drawer slide-in depuis la gauche (bords arrondis)
- Bouton hamburger pour toggle de la sidebar sur mobile (masqué sur desktop)
- Fermeture automatique du drawer à la sélection d'un fichier sur mobile
- Touch targets agrandis pour l'explorateur de fichiers sur mobile
- Persistance du fichier ouvert via `localStorage` (restauré après refresh)
- Protection contre le rechargement inutile d'un fichier déjà ouvert
- Poids de police progressif dans le file tree (medium → bold au hover → extra-bold pour le fichier actif)
- Persistance du worktree (dossiers ouverts) dans `localStorage` — restaurés récursivement après refresh
- Sidebar redimensionnable sur desktop via drag du bord droit (largeur persistée dans `localStorage`, min 150px / max 500px)
- Transition fluide sur la largeur de la sidebar (désactivée pendant le drag pour réactivité)
- Noms de fichiers sur une seule ligne avec coupure visuelle (overflow hidden, pas d'ellipsis)
- Éditeur Monaco affiché immédiatement avec fond `#1e1e1e` (même couleur que le thème vs-dark) avant le chargement du contenu
- Raccourci clavier `Ctrl+S` / `Cmd+S` pour sauvegarder le fichier avec animation visuelle sur le bouton Save
- Correction de la coloration syntaxique des fichiers `.vue` (mappé vers le mode `html` de Monaco)
- Sélecteur de dossier de travail (bouton "Open Folder" / "Select Folder") avec navigation dans `/home` (dossiers uniquement)
- Bouton "Open" sur chaque dossier en mode browse pour le sélectionner comme racine de travail
- Persistance du dossier de travail sélectionné dans `localStorage` — restauré après refresh
- Première visite : affichage automatique du sélecteur de dossier
- Retour au worktree de travail via Escape ou re-clic sur le bouton
- Animations hover cohérentes sur tous les boutons (translateY -2px)
- Chemin du fichier affiché en relatif par rapport au dossier de travail sélectionné
- Troncature du chemin par le début (`...`) pour garder le nom du fichier visible sur mobile (CSS `direction: rtl` + `<bdo dir="ltr">`)
- Tooltip sur le chemin du fichier pour afficher le chemin complet au survol
- Protection contre les fichiers trop volumineux (max 5 MB) côté backend — retourne HTTP 413 au lieu de crasher
- Gestion des erreurs de lecture côté frontend (message affiché dans l'éditeur en plaintext)
- Proxy Nuxt refactorisé avec `proxyRequest` (h3) — streaming des réponses au lieu de bufferisation mémoire, relai correct des status codes HTTP
- Sécurité backend : protection path traversal (`isPathAllowed` vérifie que les chemins restent sous `/home`), validation des inputs (null check, type check), messages d'erreur génériques (pas de leak d'infos système), try-catch global sur le handler `serve()`
- Validation POST `/write` : JSON parsing protégé, vérification des types `path` et `content`, status 500 en cas d'erreur d'écriture (au lieu de 200)
- Headers `Content-Type: text/plain` sur toutes les réponses texte du backend
- Correction memory leaks frontend : cleanup du listener `MediaQueryList`, cleanup des listeners resize si unmount pendant un drag, dispose du listener `onDidChangeModelContent` de Monaco
- Watcher de `language` séparé dans MonacoEditor — le changement de coloration syntaxique s'applique indépendamment du changement de contenu
- Restauration parallèle des dossiers ouverts (`Promise.all` au lieu de boucle séquentielle)
- Error handling sur `loadFile()` et `saveFile()` : try-catch réseau, vérification `res.ok`, mutex anti-spam sur save
- Gestion du `<head>` via `useHead()` de Nuxt (titre + viewport) au lieu de tags HTML bruts dans le template
- Polices adaptatives mobile : tailles réduites sur mobile (file tree, file label, boutons, Monaco Editor 12px vs 15px desktop)

## Stack technique

- **Nuxt** 4.1.0
- **Vue** 3.5.20
- **Monaco Editor** 0.53.0
- **Deno** 2.4.4 (backend)
- **@nuxt/ui** 3.3.3 + **@nuxt/ui-pro** 3.3.3
- **Tailwind CSS** (via @nuxt/ui)
