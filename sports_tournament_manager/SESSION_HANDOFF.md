# Session Handoff — Sports Tournament Manager

**Dernière mise à jour :** 2026-10-01
**État :** Terminé, testé et validé

## Ce qui a été accompli
1. **Couche de données SQLite (`src/database.py`) :**
   - Tables : `tournaments`, `teams`, `players`, `matches`, `match_events`, `weekly_awards`.
   - Prise en charge des joueurs avec photo ou sans photo (au choix).
   - Données de démonstration réalistes pré-injectées (Tournoi de Basketball Inter-Filières et Football).
2. **Moteur de règles et classements (`src/sports_engine.py`) :**
   - **Basketball :** Règle officielle avec Victoire = 2 pts, Défaite = 1 pt.
   - Statistiques individuelles Basketball : Points marqués, Paniers à 3-points, Passes décisives (Assists), Rebonds, Homme du match (MVP).
   - **Football & Handball :** Victoires, nuls, défaites, buteurs, cartons, MVP.
   - **Volleyball :** Points par sets (3-0, 3-1: 3 pts, 3-2: 2 pts/1 pt).
3. **Serveur HTTP & API REST (`src/app.py`) :**
   - 100% autonome en Python standard (sans dépendance externe).
   - Endpoints complets pour la gestion et la consultation publique.
4. **Interface d'administration (`src/static/index.html`, `style.css`, `admin.js`) :**
   - Dashboard complet : sélecteur de tournoi, classement, calendrier des rencontres, effectifs d'équipes, saisie des scores et MVP, joueur de la semaine.
5. **Portail public spectateurs (`src/static/public.html`, `public.css`, `public.js`) :**
   - Design épuré, sombre et ultra-rapide adapté aux smartphones.
   - Accessible par simple lien sans mot de passe via `/public?t=<id>`.
   - Bouton de partage direct (Web Share API mobile / copie du lien) et générateur de résumé WhatsApp.
6. **Lanceur Windows (`Lancer_Tournoi.bat`) :**
   - Écrit en binaire strict avec sauts de ligne Windows CRLF (`\r\n`) et encodage ASCII pur.
   - Ouvre automatiquement Microsoft Edge ou le navigateur par défaut sur `http://127.0.0.1:8000`.
7. **Tests automatisés (`tests/test_sports_engine.py`) :**
   - 4 tests unitaires validés avec succès (règles de points basket 2/1, foot 3/1, classements, leaders).

## Comment lancer l'application
1. Double-cliquer sur `PROJECTS\sports_tournament_manager\Lancer_Tournoi.bat`.
2. L'application s'ouvre directement sur `http://127.0.0.1:8000` (Admin) et `http://127.0.0.1:8000/public` (Public).
