# Guide de Déploiement en Ligne 100% Gratuit — Sports Tournament Manager

Ce guide vous explique comment mettre votre application en ligne **gratuitement, sans carte bancaire**, afin que tous les étudiants et supporters de Saint Jérôme puissent consulter les classements, résultats et statistiques 24h/24 sur leur smartphone (en 4G/5G/Wi-Fi), même quand votre ordinateur est éteint.

---

## 🏆 Solution Recommandée : Render.com (100% Gratuit)

Render est un hébergeur cloud moderne très réputé qui propose un forfait **Web Service Free** (0 FCFA / mois pour toujours, avec certificat SSL HTTPS sécurisé inclus).

### Étape 1 : Mettre votre code sur GitHub (Gratuit)
1. Rendez-vous sur [GitHub.com](https://github.com) et connectez-vous (ou créez un compte gratuit).
2. Cliquez sur **« New repository »** (Nouveau dépôt).
3. Nommez-le par exemple : `sports-tournament-manager`.
4. Laissez-le en **Public** (ou Privé), puis cliquez sur **« Create repository »**.
5. Publiez les fichiers du dossier `sports_tournament_manager` sur ce dépôt (soit via l'interface web de GitHub en glissant les fichiers, soit via GitHub Desktop, soit avec Git).

### Étape 2 : Lancer le service sur Render
1. Rendez-vous sur [Render.com](https://render.com) et cliquez sur **« Sign In »** (connectez-vous directement avec votre compte GitHub ou Google).
2. Sur votre tableau de bord Render, cliquez sur le bouton bleu **« New + »** en haut à droite, puis choisissez **« Web Service »**.
3. Sélectionnez **« Build and deploy from a Git repository »** et cliquez sur **Next**.
4. Choisissez votre dépôt GitHub `sports-tournament-manager`.
5. Remplissez les quelques champs simples :
   - **Name :** `stjerome-sports` (ou le nom de votre choix).
   - **Region :** `Frankfurt (EU Central)` (idéal pour l'Afrique/Europe).
   - **Runtime :** `Python`.
   - **Build Command :** laissez vide (ou `pip install -r requirements.txt`).
   - **Start Command :** `python src/app.py`
   - **Instance Type :** Choisissez **« Free »** (0 $/month).
6. Cliquez tout en bas sur **« Deploy Web Service »**.

### Étape 3 : Votre lien est en ligne !
En moins de 2 minutes, Render affiche **« Live »** avec un crochet vert et vous donne votre lien officiel permanent :
👉 **`https://stjerome-sports.onrender.com`**

- **Pour vous (Gestion / Administration) :**
  `https://stjerome-sports.onrender.com`
- **Pour les étudiants et supporters (Portail public épuré) :**
  `https://stjerome-sports.onrender.com/public`

---

## 📲 Comment partager avec les étudiants sur WhatsApp ?

1. Rendez-vous sur votre interface de tournoi.
2. Allez dans l'onglet **« Liens & Partage WhatsApp »**.
3. Cliquez sur **« Copier le résumé WhatsApp »** : le logiciel génère automatiquement le message formaté avec les scores du jour, les buteurs, le MVP et le lien direct vers le classement !
4. Collez directement le message dans les groupes WhatsApp de promo ou de filières.
