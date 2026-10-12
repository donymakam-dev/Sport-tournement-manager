# Sports Tournament Manager — Gestionnaire de Tournois Sportifs

Application web locale pour l'organisation et le suivi des tournois sportifs scolaires et universitaires (Football, Basketball, Handball, Volleyball), avec portail public partageable par liens.

**Domaines :** Sport, Organisation d'événements, Gestion de compétitions, Web
**Démarré :** 2026-10-01
**Statut :** actif

## Finalité

Fournir à l'école et à l'Institut Universitaire Saint Jérôme une plateforme autonome, moderne et épurée pour gérer tous les tournois sportifs inter-promotions ou inter-écoles :
- Configuration des tournois (Nom, discipline, format).
- Gestion des équipes (noms, filières, couleurs, logos).
- Gestion des effectifs de joueurs (avec ou sans photo au choix, postes, numéros).
- Feuilles de match et programmation des rencontres (date, heure, terrain).
- Saisie des scores et des statistiques détaillées (Buts, Points, 3-points, Passes décisives, Rebonds, MVP / Homme du match).
- Classements automatiques selon les règles officielles de chaque sport (ex: Basketball 2 pts victoire / 1 pt défaite).
- Portail public spectateur épuré, accessible via simple lien pour tous les étudiants et supporters sans mot de passe.
- Fiches récapitulatives prêtes pour le partage dans les groupes WhatsApp.

## Périmètre

- **Disciplines prises en charge :**
  - **Football :** Victoire 3 pts, Nul 1 pt, Défaite 0 pt. Buteurs, passeurs, cartons, Homme du match.
  - **Basketball :** Victoire 2 pts, Défaite 1 pt. Points, 3-points, passes décisives (assists), rebonds, MVP.
  - **Handball :** Victoire 2 pts, Nul 1 pt, Défaite 0 pt. Buteurs, jets de 7m, exclusions 2 min, Homme du match.
  - **Volleyball :** Victoire par sets (3-0, 3-1, 3-2), points de sets, MVP.

- **Formats :** Championnat (poule unique) et Phase finale (Arbre éliminatoire / Demi-finales et Finale).

## Architecture

- **Backend :** Python 3.14 standard (sans dépendance externe lourde).
- **Base de données :** SQLite 3 locale (`data/tournament.db`), persistante et légère.
- **Frontend :** HTML5, CSS3 épuré, Vanilla JavaScript (zéro dépendance Internet, fonctionne 100% hors-ligne).
- **Lanceur :** `Lancer_Tournoi.bat` Windows autonome, encodage strict CRLF / ASCII.
