# Mémoire du Projet — Sports Tournament Manager

## Contexte

Organisation et suivi des compétitions et tournois sportifs de l'école (Institut Universitaire Saint Jérôme / campus).
Disciplines couvertes : Football, Basketball, Handball, Volleyball.
Responsable : Dony Makam.

## Spécifications & Règles Métier Validées

1. **Règles de Calcul par Sport :**
   - **Football :**
     - Victoire = 3 pts, Nul = 1 pt, Défaite = 0 pt.
     - Départage : Différence de buts (BP - BC), puis Buts Pour (BP).
     - Stats : Buteurs, Passes décisives, Cartons, Homme du match.
   - **Basketball (exigence explicite) :**
     - Victoire = 2 pts, Défaite = 1 pt (match nul impossible en basket, prolongation requise).
     - Stats suivies : Points marqués, 3-points, Passes décisives (Assists), Rebonds, MVP.
   - **Handball :**
     - Victoire = 2 pts, Nul = 1 pt, Défaite = 0 pt.
     - Stats : Buts marqués, 7m, 2min, Homme du match.
   - **Volleyball :**
     - Victoire 3-0 ou 3-1 = 3 pts.
     - Victoire 3-2 = 2 pts.
     - Défaite 2-3 = 1 pt.
     - Défaite 0-3 ou 1-3 = 0 pt.
     - Stats : Sets gagnés/perdus, Points totaux, MVP.

2. **Équipes et Joueurs :**
   - Équipes avec nom, sigle, filière, couleur et logo (upload ou icône générée).
   - Joueurs : nom, numéro, poste. Photo **au choix** : avec photo (upload direct) ou sans photo (avatar élégant avec numéro).

3. **Portail Spectateur & Liens de Partage :**
   - Mode public épuré, accessible via `/public` pour les smartphones et PC connectés au réseau.
   - Liens directs par tournoi et par onglet (classement, buteurs, MVP).
   - Génération de cartes visuelles résumées pour partage WhatsApp.

4. **Contrainte Technique Windows & Exécution :**
   - Base de données SQLite locale (`data/tournament.db`).
   - Aucune dépendance externe (Python standard `http.server`, `sqlite3`, `json`, `urllib`).
   - Le lanceur `Lancer_Tournoi.bat` doit être écrit avec des retours chariot Windows stricts (`\r\n` - CRLF) et encodage ASCII pour éviter tout bug d'invite de commande sous Windows.
