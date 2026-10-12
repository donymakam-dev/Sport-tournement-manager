/**
 * Admin Dashboard Logic for Sports Tournament Manager
 */

let currentTournamentId = null;
let currentTournamentData = null;
let uploadedTeamLogoUrl = "";
let uploadedPlayerPhotoUrl = "";
let serverNetworkInfo = null;

// ---------------- DOM Ready ----------------
document.addEventListener("DOMContentLoaded", async () => {
  setupTabs();
  setupEventListeners();
  await loadNetworkInfo();
  await loadTournaments();
});

async function loadNetworkInfo() {
  try {
    const res = await fetch("/api/network-info");
    if (res.ok) {
      serverNetworkInfo = await res.json();
    }
  } catch (e) {
    console.warn("Could not load network info", e);
  }
}

function getPublicTournamentUrl(tournamentId) {
  if (serverNetworkInfo && serverNetworkInfo.local_ip && serverNetworkInfo.local_ip !== "127.0.0.1") {
    return `http://${serverNetworkInfo.local_ip}:${serverNetworkInfo.port || 8080}/public?t=${tournamentId}`;
  }
  return `${window.location.origin}/public?t=${tournamentId}`;
}

function setupTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      const tabId = btn.getAttribute("data-tab");
      document.getElementById(tabId).classList.add("active");
    });
  });
}

function setupEventListeners() {
  // Switch Tournament Select
  document.getElementById("selectTournament").addEventListener("change", (e) => {
    currentTournamentId = parseInt(e.target.value);
    loadTournamentFull();
  });

  // Create Tournament Form
  document.getElementById("formCreateTournament").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("tName").value.trim();
    const sport = document.getElementById("tSport").value;
    const year = document.getElementById("tYear").value.trim();

    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, sport, year })
      });
      const data = await res.json();
      if (data.status === "ok") {
        closeModal("modalTournament");
        await loadTournaments(data.id);
        showToast("Tournoi créé avec succès !");
      }
    } catch (err) {
      showToast("Erreur lors de la création du tournoi", "error");
    }
  });

  // Team Form
  document.getElementById("formTeam").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentTournamentId) return;

    const name = document.getElementById("teamName").value.trim();
    const filiere = document.getElementById("teamFiliere").value.trim();
    const short_name = document.getElementById("teamShort").value.trim();
    const color = document.getElementById("teamColor").value;

    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournament_id: currentTournamentId,
          name,
          filiere,
          short_name,
          color,
          logo_url: uploadedTeamLogoUrl
        })
      });
      const data = await res.json();
      if (data.status === "ok") {
        closeModal("modalTeam");
        await loadTournamentFull();
        showToast("Équipe ajoutée avec succès !");
      }
    } catch (err) {
      showToast("Erreur lors de l'enregistrement de l'équipe", "error");
    }
  });

  // Team Logo upload
  document.getElementById("teamLogoInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = await uploadImageFile(file);
      if (url) {
        uploadedTeamLogoUrl = url;
        const prev = document.getElementById("teamLogoPreview");
        prev.src = url;
        prev.style.display = "block";
      }
    }
  });

  // Player Form
  document.getElementById("formPlayer").addEventListener("submit", async (e) => {
    e.preventDefault();
    const team_id = parseInt(document.getElementById("playerTeamSelect").value);
    const name = document.getElementById("playerName").value.trim();
    const number = parseInt(document.getElementById("playerNumber").value) || 0;
    const position = document.getElementById("playerPosition").value.trim();

    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_id,
          name,
          number,
          position,
          photo_url: uploadedPlayerPhotoUrl
        })
      });
      const data = await res.json();
      if (data.status === "ok") {
        closeModal("modalPlayer");
        await loadTournamentFull();
        showToast("Joueur enregistré avec succès !");
      }
    } catch (err) {
      showToast("Erreur joueur", "error");
    }
  });

  // Player Photo upload
  document.getElementById("playerPhotoInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = await uploadImageFile(file);
      if (url) {
        uploadedPlayerPhotoUrl = url;
        const prev = document.getElementById("playerPhotoPreview");
        prev.src = url;
        prev.style.display = "block";
      }
    }
  });

  // Match Form
  document.getElementById("formMatch").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentTournamentId) return;

    const round_name = document.getElementById("matchRound").value.trim();
    const team_home_id = parseInt(document.getElementById("matchHomeTeam").value);
    const team_away_id = parseInt(document.getElementById("matchAwayTeam").value);
    const match_date = document.getElementById("matchDate").value;
    const match_time = document.getElementById("matchTime").value;
    const venue = document.getElementById("matchVenue").value.trim();

    if (team_home_id === team_away_id) {
      showToast("L'équipe à domicile et à l'extérieur doivent être différentes !", "error");
      return;
    }

    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournament_id: currentTournamentId,
          team_home_id,
          team_away_id,
          round_name,
          match_date,
          match_time,
          venue
        })
      });
      const data = await res.json();
      if (data.status === "ok") {
        closeModal("modalMatch");
        await loadTournamentFull();
        showToast("Match programmé !");
      }
    } catch (err) {
      showToast("Erreur match", "error");
    }
  });

  // Score & MVP Form
  document.getElementById("formScore").addEventListener("submit", async (e) => {
    e.preventDefault();
    const matchId = parseInt(document.getElementById("scoreMatchId").value);
    const score_home = parseInt(document.getElementById("scoreHome").value);
    const score_away = parseInt(document.getElementById("scoreAway").value);
    const sets_detail = document.getElementById("setsDetail").value.trim();
    const mvp_player_id = document.getElementById("scoreMvpSelect").value ? parseInt(document.getElementById("scoreMvpSelect").value) : null;

    try {
      const res = await fetch(`/api/matches/${matchId}/score`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score_home,
          score_away,
          sets_detail,
          status: "finished",
          mvp_player_id
        })
      });
      const data = await res.json();
      if (data.status === "ok") {
        closeModal("modalScore");
        await loadTournamentFull();
        showToast("Score et MVP enregistrés !");
      }
    } catch (err) {
      showToast("Erreur enregistrement score", "error");
    }
  });

  // Match Event Form (Stats)
  document.getElementById("formEvent").addEventListener("submit", async (e) => {
    e.preventDefault();
    const match_id = parseInt(document.getElementById("eventMatchId").value);
    const player_id = parseInt(document.getElementById("eventPlayerSelect").value);
    const event_type = document.getElementById("eventTypeSelect").value;
    const count = parseInt(document.getElementById("eventCount").value) || 1;

    // Find team for this player
    const player = currentTournamentData.players.find(p => p.id === player_id);
    if (!player) return;

    try {
      const res = await fetch("/api/match-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match_id,
          team_id: player.team_id,
          player_id,
          event_type,
          count
        })
      });
      const data = await res.json();
      if (data.status === "ok") {
        await loadMatchEvents(match_id);
        await loadTournamentFull();
        showToast("Statistique ajoutée !");
      }
    } catch (err) {
      showToast("Erreur événement", "error");
    }
  });

  // Weekly Award Form
  document.getElementById("formAward").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentTournamentId) return;

    const week_label = document.getElementById("awardWeek").value.trim();
    const player_id = parseInt(document.getElementById("awardPlayerSelect").value);
    const title = document.getElementById("awardTitle").value.trim();
    const description = document.getElementById("awardDesc").value.trim();

    try {
      const res = await fetch("/api/awards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournament_id: currentTournamentId,
          week_label,
          player_id,
          title,
          description
        })
      });
      const data = await res.json();
      if (data.status === "ok") {
        closeModal("modalAward");
        await loadTournamentFull();
        showToast("Joueur de la semaine enregistré !");
      }
    } catch (err) {
      showToast("Erreur distinction", "error");
    }
  });

  // Highlight Form
  document.getElementById("formHighlight").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentTournamentId) return;

    const title = document.getElementById("hlTitle").value.trim();
    const action_type = document.getElementById("hlActionType").value;
    const player_id = document.getElementById("hlPlayerSelect").value ? parseInt(document.getElementById("hlPlayerSelect").value) : null;
    const match_id = document.getElementById("hlMatchSelect").value ? parseInt(document.getElementById("hlMatchSelect").value) : null;
    const media_type = document.getElementById("hlMediaType").value;
    const description = document.getElementById("hlDescription").value.trim();

    let media_url = "";
    if (media_type === "embed") {
      media_url = document.getElementById("hlMediaUrl").value.trim();
    } else {
      const fileInput = document.getElementById("hlFileInput");
      if (fileInput.files && fileInput.files[0]) {
        showToast("Téléversement du média en cours...", "info");
        media_url = await uploadImageFile(fileInput.files[0]);
      }
    }

    try {
      const res = await fetch("/api/highlights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournament_id: currentTournamentId,
          title,
          description,
          action_type,
          media_type,
          media_url,
          match_id,
          player_id
        })
      });
      const data = await res.json();
      if (data.status === "ok") {
        closeModal("modalHighlight");
        await loadTournamentFull();
        showToast("Belle action mise en ligne avec succès !");
      }
    } catch (err) {
      showToast("Erreur lors de la publication", "error");
    }
  });
}

// ---------------- Load Tournaments ----------------
async function loadTournaments(selectedId = null) {
  try {
    const res = await fetch("/api/tournaments");
    const tournaments = await res.json();
    const select = document.getElementById("selectTournament");
    select.innerHTML = "";

    if (tournaments.length === 0) {
      select.innerHTML = `<option value="">Aucun tournoi</option>`;
      return;
    }

    tournaments.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = `${t.name} (${t.sport.toUpperCase()}) — ${t.year}`;
      select.appendChild(opt);
    });

    if (selectedId) {
      select.value = selectedId;
    }

    currentTournamentId = parseInt(select.value);
    await loadTournamentFull();
  } catch (err) {
    showToast("Erreur lors du chargement des tournois", "error");
  }
}

// ---------------- Load Full Tournament Data ----------------
async function loadTournamentFull() {
  if (!currentTournamentId) return;
  try {
    const res = await fetch(`/api/tournament/${currentTournamentId}/full`);
    const data = await res.json();
    currentTournamentData = data;

    renderTournamentHeader();
    renderStandings();
    renderMatches();
    renderTeamsAndPlayers();
    renderLeaderboards();
    renderAwards();
    renderHighlights();
    renderShareInfo();
  } catch (err) {
    showToast("Erreur de récupération des données", "error");
  }
}

function renderTournamentHeader() {
  const t = currentTournamentData.tournament;
  document.getElementById("displayTournamentName").textContent = t.name;
  document.getElementById("displayTournamentSport").textContent = `Discipline : ${t.sport.toUpperCase()}`;
  document.getElementById("displayTournamentYear").textContent = `Édition : ${t.year}`;

  const link = `${window.location.origin}/public?t=${t.id}`;
  document.getElementById("publicLinkPreview").textContent = link;
  document.getElementById("btnOpenPublic").href = `/public?t=${t.id}`;
}

// ---------------- Standings ----------------
function renderStandings() {
  const t = currentTournamentData.tournament;
  const standings = currentTournamentData.standings || [];
  const tbody = document.getElementById("tableBodyStandings");
  const thead = document.getElementById("tableHeadStandings");
  tbody.innerHTML = "";

  const isBasket = t.sport === "basketball";

  // Dynamic headers depending on sport
  thead.innerHTML = `
    <tr>
      <th style="width: 50px;">Pos</th>
      <th>Équipe</th>
      <th>Filière</th>
      <th style="text-align: center;">J</th>
      <th style="text-align: center;">G</th>
      ${!isBasket ? '<th style="text-align: center;">N</th>' : ''}
      <th style="text-align: center;">P</th>
      <th style="text-align: center;">${isBasket ? 'PF' : 'BP'}</th>
      <th style="text-align: center;">${isBasket ? 'PA' : 'BC'}</th>
      <th style="text-align: center;">Diff</th>
      <th class="col-pts">PTS</th>
    </tr>
  `;

  if (standings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: var(--text-muted); padding: 2rem;">Aucune équipe dans ce tournoi. Ajoutez des équipes dans l'onglet "Équipes & Joueurs".</td></tr>`;
    return;
  }

  standings.forEach(row => {
    const tr = document.createElement("tr");

    let rankClass = "rank-other";
    if (row.rank === 1) rankClass = "rank-1";
    else if (row.rank === 2) rankClass = "rank-2";
    else if (row.rank === 3) rankClass = "rank-3";

    const logoHtml = row.logo_url
      ? `<img src="${row.logo_url}" class="team-logo-small" alt="${row.name}">`
      : `<div class="team-logo-placeholder" style="background-color: ${row.color};">${row.short_name}</div>`;

    tr.innerHTML = `
      <td style="text-align: center;"><span class="rank-badge ${rankClass}">${row.rank}</span></td>
      <td>
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          ${logoHtml}
          <strong>${row.name}</strong>
        </div>
      </td>
      <td><span style="color: var(--text-muted); font-size: 0.85rem;">${row.filiere || '—'}</span></td>
      <td style="text-align: center;">${row.played}</td>
      <td style="text-align: center; font-weight: 700; color: #16a34a;">${row.won}</td>
      ${!isBasket ? `<td style="text-align: center; color: var(--text-muted);">${row.drawn}</td>` : ''}
      <td style="text-align: center; color: #dc2626;">${row.lost}</td>
      <td style="text-align: center;">${row.scored}</td>
      <td style="text-align: center;">${row.conceded}</td>
      <td style="text-align: center; font-weight: 700; color: ${row.diff > 0 ? '#16a34a' : row.diff < 0 ? '#dc2626' : 'inherit'};">
        ${row.diff > 0 ? '+' : ''}${row.diff}
      </td>
      <td class="col-pts">${row.points}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ---------------- Matches ----------------
function renderMatches() {
  const matches = currentTournamentData.matches || [];
  const container = document.getElementById("matchesContainer");
  container.innerHTML = "";

  if (matches.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 2.5rem; background: #fff; border-radius: var(--radius-md); border: 1px dashed var(--border);">
        <p style="color: var(--text-muted); margin-bottom: 1rem;">Aucun match programmé.</p>
        <button class="btn btn-primary" onclick="openModal('modalMatch')">➕ Programmer une rencontre</button>
      </div>
    `;
    return;
  }

  matches.forEach(m => {
    const card = document.createElement("div");
    card.className = "match-card";

    const isFinished = m.status === "finished";
    const scoreText = isFinished ? `${m.score_home} - ${m.score_away}` : "VS";

    const homeLogo = m.team_home_logo
      ? `<img src="${m.team_home_logo}" class="team-logo-small" alt="${m.team_home_name}">`
      : `<div class="team-logo-placeholder" style="background-color: ${m.team_home_color};">${m.team_home_short}</div>`;

    const awayLogo = m.team_away_logo
      ? `<img src="${m.team_away_logo}" class="team-logo-small" alt="${m.team_away_name}">`
      : `<div class="team-logo-placeholder" style="background-color: ${m.team_away_color};">${m.team_away_short}</div>`;

    let mvpHtml = "";
    if (m.mvp_name) {
      mvpHtml = `
        <div style="margin-top: 0.6rem; font-size: 0.8rem; background: #fef3c7; color: #92400e; padding: 0.35rem 0.65rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 0.4rem; font-weight: 700;">
          ⭐ Homme du match : ${m.mvp_name}
        </div>
      `;
    }

    card.innerHTML = `
      <div class="match-header">
        <span>${m.round_name}</span>
        <span>${m.match_date || ''} ${m.match_time ? 'à ' + m.match_time : ''}</span>
      </div>
      <div class="match-body">
        <div class="match-teams">
          <div class="match-team">
            ${homeLogo}
            <strong>${m.team_home_name}</strong>
          </div>
          <div class="match-score-box">
            <span class="score-display">${scoreText}</span>
            <span class="status-badge ${isFinished ? 'status-finished' : 'status-scheduled'}">
              ${isFinished ? 'Terminé' : 'À venir'}
            </span>
          </div>
          <div class="match-team">
            ${awayLogo}
            <strong>${m.team_away_name}</strong>
          </div>
        </div>
        ${m.venue ? `<div style="text-align: center; font-size: 0.8rem; color: var(--text-muted);">📍 ${m.venue}</div>` : ''}
        ${m.sets_detail ? `<div style="text-align: center; font-size: 0.8rem; color: var(--primary); margin-top: 0.25rem;">Sets : ${m.sets_detail}</div>` : ''}
        <div style="text-align: center;">${mvpHtml}</div>
      </div>
      <div class="match-footer">
        <button class="btn btn-secondary btn-sm" onclick="openScoreModal(${m.id})">
          📝 ${isFinished ? 'Modifier Score / MVP' : 'Saisir Score'}
        </button>
        <button class="btn btn-primary btn-sm" onclick="openEventModal(${m.id})">
          📊 Stats & Buteurs
        </button>
        <button class="btn btn-danger btn-sm" onclick="deleteMatch(${m.id})">🗑️</button>
      </div>
    `;
    container.appendChild(card);
  });
}

// ---------------- Teams & Players ----------------
function renderTeamsAndPlayers() {
  const teams = currentTournamentData.teams || [];
  const players = currentTournamentData.players || [];
  const container = document.getElementById("teamsContainer");
  container.innerHTML = "";

  // Populate Team Select in Player Modal and Match Modal
  const playerTeamSelect = document.getElementById("playerTeamSelect");
  const matchHomeTeam = document.getElementById("matchHomeTeam");
  const matchAwayTeam = document.getElementById("matchAwayTeam");

  playerTeamSelect.innerHTML = "";
  matchHomeTeam.innerHTML = "";
  matchAwayTeam.innerHTML = "";

  teams.forEach(t => {
    playerTeamSelect.innerHTML += `<option value="${t.id}">${t.name} (${t.filiere || 'Général'})</option>`;
    matchHomeTeam.innerHTML += `<option value="${t.id}">${t.name}</option>`;
    matchAwayTeam.innerHTML += `<option value="${t.id}">${t.name}</option>`;
  });

  if (teams.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2.5rem; background: #fff; border-radius: var(--radius-md); border: 1px dashed var(--border);">
        <p style="color: var(--text-muted); margin-bottom: 1rem;">Aucune équipe créée.</p>
        <button class="btn btn-primary" onclick="openModal('modalTeam')">➕ Créer une Équipe</button>
      </div>
    `;
    return;
  }

  teams.forEach(t => {
    const teamPlayers = players.filter(p => p.team_id === t.id);
    const card = document.createElement("div");
    card.className = "card";

    const logoHtml = t.logo_url
      ? `<img src="${t.logo_url}" class="team-logo-small" style="width: 52px; height: 52px;" alt="${t.name}">`
      : `<div class="team-logo-placeholder" style="width: 52px; height: 52px; background-color: ${t.color}; font-size: 1.1rem;">${t.short_name}</div>`;

    let playersHtml = "";
    if (teamPlayers.length === 0) {
      playersHtml = `<p style="color: var(--text-muted); font-size: 0.85rem; font-style: italic;">Aucun joueur dans l'effectif.</p>`;
    } else {
      playersHtml = `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 0.75rem; margin-top: 1rem;">
      `;
      teamPlayers.forEach(p => {
        const photoHtml = p.photo_url
          ? `<img src="${p.photo_url}" class="player-avatar" alt="${p.name}">`
          : `<div class="player-avatar-placeholder">#${p.number || p.name.substring(0, 2).toUpperCase()}</div>`;

        playersHtml += `
          <div style="background: #f8fafc; border: 1px solid var(--border); padding: 0.6rem 0.85rem; border-radius: 8px; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              ${photoHtml}
              <div>
                <div style="font-weight: 700; font-size: 0.9rem;">${p.name}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${p.position || 'Joueur'} • N°${p.number}</div>
              </div>
            </div>
            <button class="btn btn-danger btn-sm" onclick="deletePlayer(${p.id})">🗑️</button>
          </div>
        `;
      });
      playersHtml += `</div>`;
    }

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 1rem;">
        <div style="display: flex; align-items: center; gap: 1rem;">
          ${logoHtml}
          <div>
            <h3 style="font-size: 1.2rem; font-weight: 800;">${t.name} (${t.short_name})</h3>
            <div style="font-size: 0.85rem; color: var(--text-muted);">${t.filiere} • ${teamPlayers.length} joueur(s)</div>
          </div>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-secondary btn-sm" onclick="openAddPlayerForTeam(${t.id})">➕ Ajouter Joueur</button>
          <button class="btn btn-danger btn-sm" onclick="deleteTeam(${t.id})">🗑️ Supprimer</button>
        </div>
      </div>
      ${playersHtml}
    `;

    container.appendChild(card);
  });
}

// ---------------- Leaderboards (Stats / Scorers / MVPs) ----------------
function renderLeaderboards() {
  const t = currentTournamentData.tournament;
  const leaders = currentTournamentData.leaders || {};
  const isBasket = t.sport === "basketball";

  // Scorers Table
  const tableScorers = document.getElementById("tableBodyScorers");
  tableScorers.innerHTML = "";
  const scorers = leaders.scorers || [];
  if (scorers.length === 0) {
    tableScorers.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Aucune statistique enregistrée.</td></tr>`;
  } else {
    scorers.forEach(s => {
      tableScorers.innerHTML += `
        <tr>
          <td style="font-weight: 800; text-align: center;">#${s.rank}</td>
          <td><strong>${s.player_name}</strong> (N°${s.player_number})</td>
          <td><span style="color: var(--text-muted);">${s.team_name}</span></td>
          <td style="text-align: center; font-weight: 800; color: var(--primary);">${s.total} ${isBasket ? 'pts' : 'buts'}</td>
        </tr>
      `;
    });
  }

  // Basketball Extra Stats Container
  const extraStatsContainer = document.getElementById("basketExtraStatsContainer");
  if (isBasket) {
    extraStatsContainer.style.display = "block";

    // 3-Pointers
    const table3pts = document.getElementById("tableBody3pts");
    table3pts.innerHTML = "";
    (leaders.three_pointers || []).forEach(p => {
      table3pts.innerHTML += `
        <tr>
          <td style="font-weight: 800; text-align: center;">#${p.rank}</td>
          <td><strong>${p.player_name}</strong></td>
          <td style="text-align: center; font-weight: 800; color: #ea580c;">${p.total} tirs</td>
        </tr>
      `;
    });

    // Assists
    const tableAssists = document.getElementById("tableBodyAssists");
    tableAssists.innerHTML = "";
    (leaders.assists || []).forEach(p => {
      tableAssists.innerHTML += `
        <tr>
          <td style="font-weight: 800; text-align: center;">#${p.rank}</td>
          <td><strong>${p.player_name}</strong></td>
          <td style="text-align: center; font-weight: 800; color: #2563eb;">${p.total} ast</td>
        </tr>
      `;
    });

    // Rebounds
    const tableRebounds = document.getElementById("tableBodyRebounds");
    tableRebounds.innerHTML = "";
    (leaders.rebounds || []).forEach(p => {
      tableRebounds.innerHTML += `
        <tr>
          <td style="font-weight: 800; text-align: center;">#${p.rank}</td>
          <td><strong>${p.player_name}</strong></td>
          <td style="text-align: center; font-weight: 800; color: #16a34a;">${p.total} reb</td>
        </tr>
      `;
    });
  } else {
    extraStatsContainer.style.display = "none";
  }

  // MVPs Table
  const tableMvp = document.getElementById("tableBodyMvps");
  tableMvp.innerHTML = "";
  const mvps = leaders.mvps || [];
  if (mvps.length === 0) {
    tableMvp.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Aucun MVP désigné sur les matchs terminés.</td></tr>`;
  } else {
    mvps.forEach(m => {
      tableMvp.innerHTML += `
        <tr>
          <td style="font-weight: 800; text-align: center;">#${m.rank}</td>
          <td><strong>${m.player_name}</strong></td>
          <td style="text-align: center; font-weight: 800; color: #d97706;">⭐ ${m.total} fois</td>
        </tr>
      `;
    });
  }
}

// ---------------- Weekly Awards ----------------
function renderAwards() {
  const awards = currentTournamentData.awards || [];
  const container = document.getElementById("awardsContainer");
  container.innerHTML = "";

  // Populate Player Select in Award Modal
  const awardPlayerSelect = document.getElementById("awardPlayerSelect");
  awardPlayerSelect.innerHTML = "";
  (currentTournamentData.players || []).forEach(p => {
    awardPlayerSelect.innerHTML += `<option value="${p.id}">${p.name} (${p.team_name} - N°${p.number})</option>`;
  });

  if (awards.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2.5rem; background: #fff; border-radius: var(--radius-md); border: 1px dashed var(--border);">
        <p style="color: var(--text-muted); margin-bottom: 1rem;">Aucun joueur de la semaine désigné.</p>
        <button class="btn btn-primary" onclick="openModal('modalAward')">⭐ Nommer un Joueur</button>
      </div>
    `;
    return;
  }

  awards.forEach(aw => {
    const card = document.createElement("div");
    card.className = "card";
    card.style.borderLeft = "4px solid #f59e0b";

    const photoHtml = aw.player_photo
      ? `<img src="${aw.player_photo}" class="player-avatar" style="width: 60px; height: 60px;" alt="${aw.player_name}">`
      : `<div class="player-avatar-placeholder" style="width: 60px; height: 60px; font-size: 1.2rem;">#${aw.player_number}</div>`;

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div style="display: flex; gap: 1.25rem; align-items: center;">
          ${photoHtml}
          <div>
            <div style="font-size: 0.8rem; font-weight: 800; color: #d97706; text-transform: uppercase;">
              ${aw.week_label} — ${aw.title}
            </div>
            <h3 style="font-size: 1.3rem; font-weight: 900; margin: 0.2rem 0;">${aw.player_name}</h3>
            <div style="font-size: 0.85rem; color: var(--text-muted);">${aw.team_name} • N°${aw.player_number}</div>
            <p style="margin-top: 0.5rem; font-size: 0.95rem; color: var(--text-main); font-style: italic;">
              « ${aw.description || 'Excellente prestation sur l ensemble des rencontres.'} »
            </p>
          </div>
        </div>
        <button class="btn btn-danger btn-sm" onclick="deleteAward(${aw.id})">🗑️</button>
      </div>
    `;
    container.appendChild(card);
  });
}

// ---------------- Highlights & Belles Actions ----------------
function getActionBadgeInfo(actionType) {
  const map = {
    dunk: { label: "Dunk / Smash", icon: "🏀", color: "#ea580c", bg: "#ffedd5" },
    three_pointer: { label: "Tir à 3-Points", icon: "🎯", color: "#d97706", bg: "#fef3c7" },
    goal: { label: "But d'Anthologie", icon: "⚽", color: "#16a34a", bg: "#dcfce7" },
    save: { label: "Arrêt Décisif", icon: "🧤", color: "#0284c7", bg: "#e0f2fe" },
    assist: { label: "Caviar / Passe D.", icon: "👟", color: "#7c3aed", bg: "#f3e8ff" },
    skill: { label: "Geste Technique", icon: "🤾", color: "#db2777", bg: "#fce7f3" },
    celebration: { label: "Célébration", icon: "🎉", color: "#e11d48", bg: "#ffe4e6" },
    action: { label: "Moment Fort", icon: "🔥", color: "#ea580c", bg: "#ffedd5" }
  };
  return map[actionType] || map.action;
}

function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderMediaElement(mediaType, mediaUrl, title) {
  if (!mediaUrl) {
    return `
      <div class="hl-media-placeholder">
        <span>⚡ Belle Action Sportive</span>
      </div>
    `;
  }

  if (mediaType === "video") {
    return `
      <div class="hl-media-wrapper">
        <video controls playsinline preload="metadata" src="${mediaUrl}" class="hl-video-element"></video>
      </div>
    `;
  }

  if (mediaType === "embed") {
    const ytMatch = mediaUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
    if (ytMatch && ytMatch[1]) {
      return `
        <div class="hl-video-iframe-box">
          <iframe src="https://www.youtube.com/embed/${ytMatch[1]}" frameborder="0" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
        </div>
      `;
    }
    return `
      <div class="hl-external-link-box">
        <a href="${mediaUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 0.5rem;">
          ▶️ Visionner la vidéo externe 🔗
        </a>
      </div>
    `;
  }

  return `
    <div class="hl-media-wrapper">
      <img src="${mediaUrl}" alt="${escapeHtml(title)}" class="hl-photo-element">
    </div>
  `;
}

function renderHighlights() {
  const highlights = currentTournamentData.highlights || [];
  const container = document.getElementById("highlightsContainer");
  if (!container) return;
  container.innerHTML = "";

  if (highlights.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1.5rem; background: #fff; border-radius: var(--radius-md); border: 1px dashed var(--border);">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">⚡</div>
        <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.35rem;">Aucune belle action publiée</h3>
        <p style="color: var(--text-muted); font-size: 0.9rem; max-width: 500px; margin: 0 auto 1.25rem;">
          Capturez et partagez les dunks, les tirs clutch, les buts et les arrêts mémorables du tournoi avec photos ou vidéos.
        </p>
        <button class="btn btn-primary" onclick="openModalHighlight()">➕ Publier une Belle Action</button>
      </div>
    `;
    return;
  }

  highlights.forEach(h => {
    const badge = getActionBadgeInfo(h.action_type);
    const mediaHtml = renderMediaElement(h.media_type, h.media_url, h.title);
    
    let playerChip = "";
    if (h.player_name) {
      const avatar = h.player_photo
        ? `<img src="${h.player_photo}" class="player-avatar" style="width: 32px; height: 32px;" alt="${h.player_name}">`
        : `<div class="player-avatar-placeholder" style="width: 32px; height: 32px; font-size: 0.75rem;">#${h.player_number || '⭐'}</div>`;
      playerChip = `
        <div style="display: inline-flex; align-items: center; gap: 0.5rem; background: #f1f5f9; padding: 0.25rem 0.6rem; border-radius: 9999px; margin-top: 0.5rem;">
          ${avatar}
          <span style="font-size: 0.8rem; font-weight: 700; color: #1e293b;">${h.player_name} (${h.team_name || ''} - N°${h.player_number || 0})</span>
        </div>
      `;
    }

    let matchChip = "";
    if (h.match_round) {
      matchChip = `
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">
          📅 ${h.match_round} : ${h.home_team_name} vs ${h.away_team_name}
        </div>
      `;
    }

    const comments = h.comments || [];
    let commentsListHtml = "";
    if (comments.length > 0) {
      commentsListHtml = `
        <div class="admin-hl-comments-box">
          <div style="font-size: 0.8rem; font-weight: 800; color: #475569; margin-bottom: 0.4rem;">
            💬 Commentaires des supporters (${comments.length}) :
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.4rem; max-height: 180px; overflow-y: auto;">
            ${comments.map(c => `
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.4rem 0.6rem; font-size: 0.8rem;">
                <div style="display: flex; justify-content: space-between; font-weight: 700; color: #1e3a8a;">
                  <span>${escapeHtml(c.author_name)} ${c.author_filiere ? `<span style="font-weight: normal; color: #64748b;">(${escapeHtml(c.author_filiere)})</span>` : ''}</span>
                  <span style="font-size: 0.7rem; color: #94a3b8;">${c.created_at ? c.created_at.substring(0, 16) : ''}</span>
                </div>
                <div style="color: #334155; margin-top: 0.2rem;">${escapeHtml(c.comment_text)}</div>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    }

    const card = document.createElement("div");
    card.className = "card highlight-card-admin";
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <span class="action-type-badge" style="background: ${badge.bg}; color: ${badge.color};">
          ${badge.icon} ${badge.label}
        </span>
        <button class="btn btn-danger btn-sm" onclick="deleteHighlight(${h.id})" title="Supprimer">🗑️</button>
      </div>

      ${mediaHtml}

      <div style="padding-top: 0.75rem;">
        <h3 style="font-size: 1.05rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.25rem;">${escapeHtml(h.title)}</h3>
        ${playerChip}
        ${matchChip}
        ${h.description ? `<p style="font-size: 0.85rem; color: #475569; margin-top: 0.5rem; line-height: 1.4;">${escapeHtml(h.description)}</p>` : ''}
        
        <div style="display: flex; gap: 1rem; align-items: center; margin-top: 0.75rem; padding-top: 0.5rem; border-top: 1px solid var(--border); font-size: 0.85rem; font-weight: 700; color: #64748b;">
          <span>🔥 ${h.likes_count} réactions</span>
          <span>💬 ${comments.length} commentaires</span>
        </div>

        ${commentsListHtml}
      </div>
    `;

    container.appendChild(card);
  });
}

function openModalHighlight() {
  const form = document.getElementById("formHighlight");
  if (form) form.reset();

  const playerSelect = document.getElementById("hlPlayerSelect");
  playerSelect.innerHTML = `<option value="">-- Aucun joueur spécifique --</option>`;
  (currentTournamentData.players || []).forEach(p => {
    playerSelect.innerHTML += `<option value="${p.id}">${p.name} (${p.team_name || ''} - N°${p.number})</option>`;
  });

  const matchSelect = document.getElementById("hlMatchSelect");
  matchSelect.innerHTML = `<option value="">-- Non rattaché à un match précis --</option>`;
  (currentTournamentData.matches || []).forEach(m => {
    matchSelect.innerHTML += `<option value="${m.id}">${m.round_name} : ${m.team_home_name} vs ${m.team_away_name} (${m.match_date || ''})</option>`;
  });

  toggleHighlightMediaInputs();
  openModal("modalHighlight");
}

function toggleHighlightMediaInputs() {
  const type = document.getElementById("hlMediaType").value;
  const groupFile = document.getElementById("groupHlFile");
  const groupUrl = document.getElementById("groupHlUrl");
  if (type === "embed") {
    groupFile.style.display = "none";
    groupUrl.style.display = "block";
  } else {
    groupFile.style.display = "block";
    groupUrl.style.display = "none";
  }
}

// ---------------- Public Sharing & WhatsApp Recap ----------------
function renderShareInfo() {
  const t = currentTournamentData.tournament;
  const link = `${window.location.origin}/public?t=${t.id}`;
  document.getElementById("shareLinkInput").value = link;
}

function copyPublicLink() {
  const input = document.getElementById("shareLinkInput");
  input.select();
  document.execCommand("copy");
  showToast("Lien public copié dans le presse-papiers !");
}

function generateWhatsAppRecap() {
  const t = currentTournamentData.tournament;
  const standings = currentTournamentData.standings || [];
  const matches = currentTournamentData.matches || [];
  const awards = currentTournamentData.awards || [];
  const isBasket = t.sport === "basketball";

  let msg = `🏆 *${t.name.toUpperCase()}* (${t.year})\n`;
  msg += `📍 Institut Universitaire Saint Jérôme\n\n`;

  // Standings
  msg += `📊 *CLASSEMENT OFFICIEL :*\n`;
  standings.forEach(s => {
    msg += `#${s.rank} ${s.name} — *${s.points} pts* (${s.played}J, ${s.won}V, ${s.diff > 0 ? '+' : ''}${s.diff})\n`;
  });

  // Recent Finished Matches
  const finished = matches.filter(m => m.status === "finished");
  if (finished.length > 0) {
    msg += `\n⚽ *DERNIERS RÉSULTATS :*\n`;
    finished.slice(-4).forEach(m => {
      msg += `• ${m.team_home_name} ${m.score_home} - ${m.score_away} ${m.team_away_name}`;
      if (m.mvp_name) msg += ` (⭐ MVP: ${m.mvp_name})`;
      msg += `\n`;
    });
  }

  // Player of the week
  if (awards.length > 0) {
    const latestAward = awards[0];
    msg += `\n🌟 *JOUEUR DE LA SEMAINE :*\n`;
    msg += `${latestAward.player_name} (${latestAward.team_name}) — ${latestAward.week_label}\n`;
  }

  msg += `\n🔗 *Suivre les scores et stats en direct sur :*\n${window.location.origin}/public?t=${t.id}\n`;

  navigator.clipboard.writeText(msg).then(() => {
    showToast("Résumé WhatsApp copié ! Collez-le directement dans votre groupe WhatsApp.");
  });
}

// ---------------- Modals & Action Helpers ----------------
function openModal(id) {
  document.getElementById(id).classList.add("active");
}

function closeModal(id) {
  document.getElementById(id).classList.remove("active");
}

function openAddPlayerForTeam(teamId) {
  document.getElementById("playerTeamSelect").value = teamId;
  document.getElementById("playerName").value = "";
  document.getElementById("playerNumber").value = "";
  document.getElementById("playerPosition").value = "";
  uploadedPlayerPhotoUrl = "";
  document.getElementById("playerPhotoPreview").style.display = "none";
  openModal("modalPlayer");
}

function openScoreModal(matchId) {
  const m = currentTournamentData.matches.find(item => item.id === matchId);
  if (!m) return;

  document.getElementById("scoreMatchId").value = m.id;
  document.getElementById("scoreHomeLabel").textContent = m.team_home_name;
  document.getElementById("scoreAwayLabel").textContent = m.team_away_name;
  document.getElementById("scoreHome").value = m.score_home !== null ? m.score_home : "";
  document.getElementById("scoreAway").value = m.score_away !== null ? m.score_away : "";
  document.getElementById("setsDetail").value = m.sets_detail || "";

  // Populate MVP select with players from both teams
  const mvpSelect = document.getElementById("scoreMvpSelect");
  mvpSelect.innerHTML = `<option value="">-- Aucun MVP sélectionné --</option>`;

  const matchPlayers = currentTournamentData.players.filter(p => p.team_id === m.team_home_id || p.team_id === m.team_away_id);
  matchPlayers.forEach(p => {
    const isSelected = m.mvp_player_id === p.id ? "selected" : "";
    mvpSelect.innerHTML += `<option value="${p.id}" ${isSelected}>${p.name} (${p.team_name} - N°${p.number})</option>`;
  });

  openModal("modalScore");
}

async function openEventModal(matchId) {
  const m = currentTournamentData.matches.find(item => item.id === matchId);
  if (!m) return;

  document.getElementById("eventMatchId").value = m.id;
  document.getElementById("eventMatchTitle").textContent = `${m.team_home_name} vs ${m.team_away_name}`;

  // Populate player select
  const playerSelect = document.getElementById("eventPlayerSelect");
  playerSelect.innerHTML = "";
  const matchPlayers = currentTournamentData.players.filter(p => p.team_id === m.team_home_id || p.team_id === m.team_away_id);
  matchPlayers.forEach(p => {
    playerSelect.innerHTML += `<option value="${p.id}">${p.name} (${p.team_name} - N°${p.number})</option>`;
  });

  // Adapt event types to sport
  const typeSelect = document.getElementById("eventTypeSelect");
  const isBasket = currentTournamentData.tournament.sport === "basketball";

  if (isBasket) {
    typeSelect.innerHTML = `
      <option value="point">Points Marqués</option>
      <option value="three_pointer">Panier à 3-Points</option>
      <option value="assist">Passe Décisive (Assist)</option>
      <option value="rebound">Rebond</option>
    `;
  } else {
    typeSelect.innerHTML = `
      <option value="goal">But</option>
      <option value="assist">Passe Décisive</option>
      <option value="yellow_card">Carton Jaune</option>
      <option value="red_card">Carton Rouge</option>
    `;
  }

  await loadMatchEvents(m.id);
  openModal("modalEvent");
}

async function loadMatchEvents(matchId) {
  try {
    const res = await fetch(`/api/match/${matchId}/events`);
    const events = await res.json();
    const list = document.getElementById("matchEventsList");
    list.innerHTML = "";

    if (events.length === 0) {
      list.innerHTML = `<li style="color: var(--text-muted); font-size: 0.85rem;">Aucune statistique individuelle saisie sur ce match.</li>`;
      return;
    }

    events.forEach(ev => {
      list.innerHTML += `
        <li style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid var(--border); font-size: 0.85rem;">
          <span><strong>${ev.player_name}</strong> (${ev.team_name}) : <strong>${ev.count}</strong> ${ev.event_type}</span>
          <button class="btn btn-danger btn-sm" onclick="deleteEvent(${ev.id}, ${matchId})">✖</button>
        </li>
      `;
    });
  } catch (err) {
    console.error(err);
  }
}

// ---------------- Deletes ----------------
async function deleteMatch(matchId) {
  if (!confirm("Supprimer ce match ?")) return;
  await fetch(`/api/matches/${matchId}`, { method: "DELETE" });
  await loadTournamentFull();
  showToast("Match supprimé");
}

async function deleteTeam(teamId) {
  if (!confirm("Supprimer cette équipe et tous ses joueurs ?")) return;
  await fetch(`/api/teams/${teamId}`, { method: "DELETE" });
  await loadTournamentFull();
  showToast("Équipe supprimée");
}

async function deletePlayer(playerId) {
  if (!confirm("Supprimer ce joueur ?")) return;
  await fetch(`/api/players/${playerId}`, { method: "DELETE" });
  await loadTournamentFull();
  showToast("Joueur supprimé");
}

async function deleteEvent(eventId, matchId) {
  await fetch(`/api/match-events/${eventId}`, { method: "DELETE" });
  await loadMatchEvents(matchId);
  await loadTournamentFull();
  showToast("Statistique retirée");
}

async function deleteAward(awardId) {
  if (!confirm("Supprimer cette distinction ?")) return;
  await fetch(`/api/awards/${awardId}`, { method: "DELETE" });
  await loadTournamentFull();
  showToast("Distinction supprimée");
}

async function deleteHighlight(highlightId) {
  if (!confirm("Supprimer cette belle action ?")) return;
  try {
    const res = await fetch(`/api/highlights/${highlightId}`, { method: "DELETE" });
    const data = await res.json();
    if (data.status === "ok") {
      await loadTournamentFull();
      showToast("Action supprimée");
    }
  } catch (err) {
    showToast("Erreur lors de la suppression", "error");
  }
}

// ---------------- Upload Helper ----------------
async function uploadImageFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target.result;
      try {
        const res = await fetch("/api/upload-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, data: base64Data })
        });
        const data = await res.json();
        if (data.status === "ok") resolve(data.url);
        else resolve("");
      } catch (err) {
        resolve("");
      }
    };
    reader.readAsDataURL(file);
  });
}

function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = "toast";
  if (type === "error") toast.style.backgroundColor = "#dc2626";
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
