/**
 * Public Spectator Portal Logic
 * Mobile-first, responsive viewer for live standings, scores, and leaders.
 */

let currentTournamentId = null;
let currentTournamentData = null;

document.addEventListener("DOMContentLoaded", async () => {
  setupTabs();
  setupShareButton();
  await loadPublicTournaments();
});

function setupTabs() {
  document.querySelectorAll(".p-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".p-tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".p-pane").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      const tabId = btn.getAttribute("data-tab");
      document.getElementById(tabId).classList.add("active");
    });
  });
}

function setupShareButton() {
  document.getElementById("btnShareLink").addEventListener("click", async () => {
    const url = window.location.href;
    const title = currentTournamentData ? currentTournamentData.tournament.name : "Tournoi Sportif Saint Jérôme";
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: `Suivez les résultats et le classement en direct du ${title} !`,
          url: url
        });
      } catch (err) {
        // User cancelled or share failed, fallback to copy
        copyToClipboard(url);
      }
    } else {
      copyToClipboard(url);
    }
  });

  document.getElementById("pSelectTournament").addEventListener("change", (e) => {
    currentTournamentId = parseInt(e.target.value);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set("t", currentTournamentId);
    window.history.pushState({}, "", newUrl);
    loadTournamentDetails();
  });
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert("Lien du tournoi copié ! Vous pouvez le partager.");
  });
}

async function loadPublicTournaments() {
  try {
    const res = await fetch("/api/tournaments");
    const tournaments = await res.json();
    const select = document.getElementById("pSelectTournament");
    select.innerHTML = "";

    if (tournaments.length === 0) {
      select.innerHTML = `<option value="">Aucun tournoi</option>`;
      return;
    }

    tournaments.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = `${t.name} (${t.sport.toUpperCase()})`;
      select.appendChild(opt);
    });

    // Check URL param ?t=
    const params = new URLSearchParams(window.location.search);
    const paramT = params.get("t");
    if (paramT && tournaments.some(t => t.id === parseInt(paramT))) {
      currentTournamentId = parseInt(paramT);
      select.value = currentTournamentId;
    } else {
      currentTournamentId = parseInt(select.value);
    }

    await loadTournamentDetails();
  } catch (err) {
    console.error(err);
  }
}

async function loadTournamentDetails() {
  if (!currentTournamentId) return;

  try {
    const res = await fetch(`/api/tournament/${currentTournamentId}/full`);
    const data = await res.json();
    currentTournamentData = data;

    renderPublicHeader();
    renderPublicStandings();
    renderPublicMatches();
    renderPublicStats();
    renderPublicAwards();
    renderPublicHighlights();
  } catch (err) {
    console.error(err);
  }
}

function renderPublicHeader() {
  const t = currentTournamentData.tournament;
  document.getElementById("pTournamentTitle").textContent = `${t.name} (${t.year})`;
  document.getElementById("pSportBadge").textContent = t.sport.toUpperCase();
}

function renderPublicStandings() {
  const t = currentTournamentData.tournament;
  const standings = currentTournamentData.standings || [];
  const thead = document.getElementById("pTableHeadStandings");
  const tbody = document.getElementById("pTableBodyStandings");
  const isBasket = t.sport === "basketball";

  thead.innerHTML = `
    <tr>
      <th style="width: 40px;">#</th>
      <th class="th-left">Équipe</th>
      <th>J</th>
      <th>G</th>
      ${!isBasket ? '<th>N</th>' : ''}
      <th>P</th>
      <th>Diff</th>
      <th style="color: var(--accent);">PTS</th>
    </tr>
  `;

  tbody.innerHTML = "";
  if (standings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="padding: 2rem; color: var(--text-muted);">Aucune équipe enregistrée.</td></tr>`;
    return;
  }

  standings.forEach(row => {
    const tr = document.createElement("tr");

    let rankBadge = `<span style="font-weight: 800; color: var(--text-muted);">${row.rank}</span>`;
    if (row.rank === 1) rankBadge = `<span style="color: #f59e0b; font-weight: 900;">🥇 1</span>`;
    else if (row.rank === 2) rankBadge = `<span style="color: #94a3b8; font-weight: 900;">🥈 2</span>`;
    else if (row.rank === 3) rankBadge = `<span style="color: #ea580c; font-weight: 900;">🥉 3</span>`;

    const logoHtml = row.logo_url
      ? `<img src="${row.logo_url}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover;" alt="${row.name}">`
      : `<div style="width: 28px; height: 28px; border-radius: 50%; background-color: ${row.color}; color: #fff; font-size: 0.75rem; font-weight: 800; display: inline-flex; align-items: center; justify-content: center;">${row.short_name}</div>`;

    tr.innerHTML = `
      <td>${rankBadge}</td>
      <td class="td-left">
        <div style="display: flex; align-items: center; gap: 0.6rem;">
          ${logoHtml}
          <div>
            <div style="font-weight: 700; color: #fff;">${row.name}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${row.filiere || ''}</div>
          </div>
        </div>
      </td>
      <td>${row.played}</td>
      <td style="color: #22c55e; font-weight: 700;">${row.won}</td>
      ${!isBasket ? `<td style="color: var(--text-muted);">${row.drawn}</td>` : ''}
      <td style="color: #ef4444;">${row.lost}</td>
      <td style="font-weight: 700; color: ${row.diff > 0 ? '#22c55e' : row.diff < 0 ? '#ef4444' : 'inherit'};">
        ${row.diff > 0 ? '+' : ''}${row.diff}
      </td>
      <td class="p-pts">${row.points}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderPublicMatches() {
  const matches = currentTournamentData.matches || [];
  const container = document.getElementById("pMatchesList");
  container.innerHTML = "";

  if (matches.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 3rem;">Aucun match au programme.</div>`;
    return;
  }

  matches.forEach(m => {
    const isFinished = m.status === "finished";
    const scoreText = isFinished ? `${m.score_home} - ${m.score_away}` : "VS";

    const homeLogo = m.team_home_logo
      ? `<img src="${m.team_home_logo}" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover;" alt="${m.team_home_name}">`
      : `<div style="width: 38px; height: 38px; border-radius: 50%; background-color: ${m.team_home_color}; color: #fff; font-weight: 800; font-size: 0.85rem; display: flex; align-items: center; justify-content: center;">${m.team_home_short}</div>`;

    const awayLogo = m.team_away_logo
      ? `<img src="${m.team_away_logo}" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover;" alt="${m.team_away_name}">`
      : `<div style="width: 38px; height: 38px; border-radius: 50%; background-color: ${m.team_away_color}; color: #fff; font-weight: 800; font-size: 0.85rem; display: flex; align-items: center; justify-content: center;">${m.team_away_short}</div>`;

    let mvpHtml = "";
    if (m.mvp_name) {
      mvpHtml = `
        <div style="margin-top: 0.5rem; text-align: center;">
          <span class="p-match-mvp-badge">⭐ Homme du match : ${m.mvp_name}</span>
        </div>
      `;
    }

    const card = document.createElement("div");
    card.className = "p-match-card";
    card.innerHTML = `
      <div class="p-match-top">
        <span>${m.round_name}</span>
        <span>${m.match_date ? m.match_date : ''} ${m.match_time ? 'à ' + m.match_time : ''}</span>
      </div>
      <div class="p-match-duel">
        <div class="p-match-team">
          ${homeLogo}
          <div style="font-weight: 800; font-size: 1rem;">${m.team_home_name}</div>
        </div>
        <div class="p-match-score">${scoreText}</div>
        <div class="p-match-team away">
          ${awayLogo}
          <div style="font-weight: 800; font-size: 1rem;">${m.team_away_name}</div>
        </div>
      </div>
      ${m.venue ? `<div style="text-align: center; font-size: 0.75rem; color: var(--text-muted);">📍 ${m.venue}</div>` : ''}
      ${m.sets_detail ? `<div style="text-align: center; font-size: 0.75rem; color: var(--accent-blue);">Sets : ${m.sets_detail}</div>` : ''}
      ${mvpHtml}
    `;
    container.appendChild(card);
  });
}

function renderPublicStats() {
  const t = currentTournamentData.tournament;
  const leaders = currentTournamentData.leaders || {};
  const isBasket = t.sport === "basketball";

  // Scorers
  const tbodyScorers = document.getElementById("pTableScorers");
  tbodyScorers.innerHTML = "";
  const scorers = leaders.scorers || [];
  if (scorers.length === 0) {
    tbodyScorers.innerHTML = `<tr><td colspan="4" style="color: var(--text-muted); padding: 1.5rem;">Aucun point/but pour le moment.</td></tr>`;
  } else {
    scorers.forEach(s => {
      tbodyScorers.innerHTML += `
        <tr>
          <td style="font-weight: 800; color: var(--text-muted);">#${s.rank}</td>
          <td class="td-left"><strong>${s.player_name}</strong> (N°${s.player_number})</td>
          <td>${s.team_name}</td>
          <td style="font-weight: 900; color: var(--accent);">${s.total} ${isBasket ? 'pts' : 'buts'}</td>
        </tr>
      `;
    });
  }

  // MVPs
  const tbodyMvps = document.getElementById("pTableMvps");
  tbodyMvps.innerHTML = "";
  const mvps = leaders.mvps || [];
  if (mvps.length === 0) {
    tbodyMvps.innerHTML = `<tr><td colspan="3" style="color: var(--text-muted); padding: 1.5rem;">Aucun MVP désigné.</td></tr>`;
  } else {
    mvps.forEach(m => {
      tbodyMvps.innerHTML += `
        <tr>
          <td style="font-weight: 800; color: var(--text-muted);">#${m.rank}</td>
          <td class="td-left"><strong>${m.player_name}</strong></td>
          <td style="font-weight: 900; color: var(--accent);">⭐ ${m.total} fois</td>
        </tr>
      `;
    });
  }

  // Basketball Extra
  const basketExtra = document.getElementById("pBasketExtraContainer");
  if (isBasket) {
    basketExtra.style.display = "block";

    // 3-Pointers
    const t3pts = document.getElementById("pTable3pts");
    t3pts.innerHTML = "";
    (leaders.three_pointers || []).forEach(p => {
      t3pts.innerHTML += `
        <tr>
          <td style="font-weight: 800; color: var(--text-muted);">#${p.rank}</td>
          <td class="td-left"><strong>${p.player_name}</strong></td>
          <td style="font-weight: 900; color: #ea580c;">${p.total} tirs</td>
        </tr>
      `;
    });

    // Assists
    const tAssists = document.getElementById("pTableAssists");
    tAssists.innerHTML = "";
    (leaders.assists || []).forEach(p => {
      tAssists.innerHTML += `
        <tr>
          <td style="font-weight: 800; color: var(--text-muted);">#${p.rank}</td>
          <td class="td-left"><strong>${p.player_name}</strong></td>
          <td style="font-weight: 900; color: #38bdf8;">${p.total} ast</td>
        </tr>
      `;
    });

    // Rebounds
    const tRebounds = document.getElementById("pTableRebounds");
    tRebounds.innerHTML = "";
    (leaders.rebounds || []).forEach(p => {
      tRebounds.innerHTML += `
        <tr>
          <td style="font-weight: 800; color: var(--text-muted);">#${p.rank}</td>
          <td class="td-left"><strong>${p.player_name}</strong></td>
          <td style="font-weight: 900; color: #22c55e;">${p.total} reb</td>
        </tr>
      `;
    });
  } else {
    basketExtra.style.display = "none";
  }
}

function renderPublicAwards() {
  const awards = currentTournamentData.awards || [];
  const container = document.getElementById("pAwardsList");
  container.innerHTML = "";

  if (awards.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 3rem;">Aucun joueur de la semaine pour le moment.</div>`;
    return;
  }

  awards.forEach(aw => {
    const avatarHtml = aw.player_photo
      ? `<img src="${aw.player_photo}" class="award-avatar" alt="${aw.player_name}">`
      : `<div class="award-avatar-ph">#${aw.player_number || '⭐'}</div>`;

    const card = document.createElement("div");
    card.className = "award-hero";
    card.innerHTML = `
      ${avatarHtml}
      <div>
        <div style="font-size: 0.8rem; font-weight: 800; color: var(--accent); text-transform: uppercase;">
          ${aw.week_label} — ${aw.title}
        </div>
        <h2 style="font-size: 1.5rem; font-weight: 900; margin: 0.2rem 0; color: #fff;">${aw.player_name}</h2>
        <div style="font-size: 0.9rem; color: var(--text-muted);">${aw.team_name} • N°${aw.player_number}</div>
        <p style="margin-top: 0.75rem; font-size: 1rem; color: #e2e8f0; font-style: italic;">
          « ${aw.description || 'Prestation remarquable et décisive pour son équipe.'} »
        </p>
      </div>
    `;
    container.appendChild(card);
  });
}

// ---------------- Public Highlights & Interactions ----------------
function getActionBadgeInfo(actionType) {
  const map = {
    dunk: { label: "Dunk / Smash", icon: "🏀", color: "#ea580c", bg: "rgba(234, 88, 12, 0.2)" },
    three_pointer: { label: "Tir à 3-Points", icon: "🎯", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.2)" },
    goal: { label: "But d'Anthologie", icon: "⚽", color: "#10b981", bg: "rgba(16, 185, 129, 0.2)" },
    save: { label: "Arrêt Décisif", icon: "🧤", color: "#06b6d4", bg: "rgba(6, 182, 212, 0.2)" },
    assist: { label: "Caviar / Passe D.", icon: "👟", color: "#a855f7", bg: "rgba(168, 85, 247, 0.2)" },
    skill: { label: "Geste Technique", icon: "🤾", color: "#ec4899", bg: "rgba(236, 72, 153, 0.2)" },
    celebration: { label: "Célébration", icon: "🎉", color: "#f43f5e", bg: "rgba(244, 63, 94, 0.2)" },
    action: { label: "Moment Fort", icon: "🔥", color: "#ea580c", bg: "rgba(234, 88, 12, 0.2)" }
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

function renderPublicMediaElement(mediaType, mediaUrl, title) {
  if (!mediaUrl) {
    return `
      <div class="p-hl-media-placeholder">
        <div class="p-hl-ph-icon">⚡</div>
        <div class="p-hl-ph-text">Action Remarquable du Match</div>
      </div>
    `;
  }

  if (mediaType === "video") {
    return `
      <div class="p-hl-media-wrapper">
        <video controls playsinline preload="metadata" class="p-hl-video" src="${mediaUrl}"></video>
      </div>
    `;
  }

  if (mediaType === "embed") {
    const ytMatch = mediaUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
    if (ytMatch && ytMatch[1]) {
      return `
        <div class="p-hl-iframe-wrapper">
          <iframe src="https://www.youtube.com/embed/${ytMatch[1]}" frameborder="0" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
        </div>
      `;
    }
    return `
      <div class="p-hl-ext-link">
        <a href="${mediaUrl}" target="_blank" rel="noopener noreferrer" class="p-hl-link-btn">
          <span>▶️</span> Visionner la vidéo externe (${mediaUrl.length > 45 ? mediaUrl.substring(0, 42) + '...' : mediaUrl})
        </a>
      </div>
    `;
  }

  return `
    <div class="p-hl-media-wrapper">
      <img src="${mediaUrl}" class="p-hl-photo" alt="${escapeHtml(title)}" loading="lazy">
    </div>
  `;
}

function renderPublicHighlights() {
  const highlights = currentTournamentData.highlights || [];
  const feed = document.getElementById("pHighlightsFeed");
  if (!feed) return;
  feed.innerHTML = "";

  if (highlights.length === 0) {
    feed.innerHTML = `
      <div class="standings-card" style="text-align: center; padding: 3.5rem 1.5rem;">
        <div style="font-size: 3rem; margin-bottom: 0.5rem;">⚡</div>
        <h3 style="font-size: 1.25rem; font-weight: 800; color: #fff; margin-bottom: 0.5rem;">Aucune belle action enregistrée</h3>
        <p style="color: var(--text-muted); font-size: 0.9rem; max-width: 480px; margin: 0 auto;">
          Les dunks, tirs clutchs, buts et arrêts de légende apparaîtront ici dès qu'ils seront ajoutés. Revenez vite vibrer !
        </p>
      </div>
    `;
    return;
  }

  const savedAuthor = localStorage.getItem("sports_comment_author") || "";
  const savedFiliere = localStorage.getItem("sports_comment_filiere") || "";

  highlights.forEach(h => {
    const badge = getActionBadgeInfo(h.action_type);
    const mediaHtml = renderPublicMediaElement(h.media_type, h.media_url, h.title);
    const isLiked = localStorage.getItem("liked_hl_" + h.id) === "true";
    const comments = h.comments || [];

    // Player Chip
    let playerChip = "";
    if (h.player_name) {
      const avatarHtml = h.player_photo
        ? `<img src="${h.player_photo}" class="p-hl-player-avatar" alt="${h.player_name}">`
        : `<div class="p-hl-player-avatar-ph">#${h.player_number || '⭐'}</div>`;
      playerChip = `
        <div class="p-hl-player-chip">
          ${avatarHtml}
          <div>
            <div class="p-hl-player-name">${escapeHtml(h.player_name)}</div>
            <div class="p-hl-player-sub">${h.team_name ? escapeHtml(h.team_name) : ''} ${h.position ? '• ' + escapeHtml(h.position) : ''} • N°${h.player_number || 0}</div>
          </div>
        </div>
      `;
    }

    // Match Chip
    let matchChip = "";
    if (h.match_round) {
      matchChip = `
        <div class="p-hl-match-chip">
          <span>📅 ${escapeHtml(h.match_round)}</span>
          <span style="color: rgba(255,255,255,0.4);">•</span>
          <span>${escapeHtml(h.home_team_name)} vs ${escapeHtml(h.away_team_name)}</span>
        </div>
      `;
    }

    // Comments HTML
    let commentsHtml = "";
    comments.forEach(c => {
      commentsHtml += `
        <div class="p-comment-bubble">
          <div class="p-comment-head">
            <span class="p-comment-author">${escapeHtml(c.author_name)}</span>
            ${c.author_filiere ? `<span class="p-comment-filiere">${escapeHtml(c.author_filiere)}</span>` : ''}
            <span class="p-comment-time">${c.created_at ? c.created_at.substring(0, 16) : ''}</span>
          </div>
          <div class="p-comment-body">${escapeHtml(c.comment_text)}</div>
        </div>
      `;
    });

    const card = document.createElement("article");
    card.className = "p-highlight-card";
    card.innerHTML = `
      <div class="p-hl-header">
        <div class="p-hl-badge" style="background: ${badge.bg}; color: ${badge.color}; border-color: ${badge.color};">
          ${badge.icon} ${badge.label}
        </div>
        <div class="p-hl-time">${h.created_at ? h.created_at.substring(0, 10) : ''}</div>
      </div>

      <h3 class="p-hl-title">${escapeHtml(h.title)}</h3>

      ${playerChip}
      ${matchChip}

      ${mediaHtml}

      ${h.description ? `<p class="p-hl-desc">${escapeHtml(h.description)}</p>` : ''}

      <div class="p-hl-actions-bar">
        <button class="p-like-btn ${isLiked ? 'liked' : ''}" id="likeBtn-${h.id}" onclick="toggleLikeHighlight(${h.id})">
          <span class="p-flame-icon">🔥</span>
          <span class="p-like-count" id="likeCount-${h.id}">${h.likes_count}</span>
          <span class="p-like-label">${isLiked ? 'Vous avez aimé !' : 'Féliciter'}</span>
        </button>

        <span class="p-comments-counter-badge" id="commentsCount-${h.id}" data-count="${comments.length}">
          💬 ${comments.length} Réactions
        </span>
      </div>

      <!-- Comments Thread -->
      <div class="p-comments-container">
        <div class="p-comments-list" id="commentsList-${h.id}">
          ${commentsHtml}
        </div>

        <form class="p-comment-form" onsubmit="submitHighlightComment(event, ${h.id})">
          <div class="p-comment-row-top">
            <input type="text" id="cAuthor-${h.id}" class="p-comment-input" placeholder="Ton nom / pseudo" value="${escapeHtml(savedAuthor)}" required>
            <input type="text" id="cFiliere-${h.id}" class="p-comment-input" placeholder="Ta filière (ex: Génie Info)" value="${escapeHtml(savedFiliere)}">
          </div>
          <div class="p-comment-row-bottom">
            <input type="text" id="cText-${h.id}" class="p-comment-input p-comment-input-msg" placeholder="Écris une réaction, un mot d'encouragement..." required>
            <button type="submit" class="p-comment-submit-btn">💬 Publier</button>
          </div>
        </form>
      </div>
    `;

    feed.appendChild(card);
  });
}

async function toggleLikeHighlight(highlightId) {
  const btn = document.getElementById(`likeBtn-${highlightId}`);
  const counter = document.getElementById(`likeCount-${highlightId}`);

  try {
    const res = await fetch(`/api/highlights/${highlightId}/like`, { method: "POST" });
    const data = await res.json();
    if (data.status === "ok") {
      if (counter) counter.textContent = data.likes_count;
      localStorage.setItem("liked_hl_" + highlightId, "true");
      if (btn) {
        btn.classList.add("liked");
        const label = btn.querySelector(".p-like-label");
        if (label) label.textContent = "Vous avez aimé !";
        btn.classList.add("btn-bounce");
        setTimeout(() => btn.classList.remove("btn-bounce"), 400);
      }
    }
  } catch (err) {
    console.error("Error liking highlight:", err);
  }
}

async function submitHighlightComment(event, highlightId) {
  event.preventDefault();
  const authorInput = document.getElementById(`cAuthor-${highlightId}`);
  const filiereInput = document.getElementById(`cFiliere-${highlightId}`);
  const textInput = document.getElementById(`cText-${highlightId}`);

  const author_name = authorInput.value.trim();
  const author_filiere = filiereInput.value.trim();
  const comment_text = textInput.value.trim();

  if (!author_name || !comment_text) return;

  try {
    const res = await fetch(`/api/highlights/${highlightId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        author_name,
        author_filiere,
        comment_text
      })
    });
    const data = await res.json();
    if (data.status === "ok") {
      textInput.value = "";
      localStorage.setItem("sports_comment_author", author_name);
      localStorage.setItem("sports_comment_filiere", author_filiere);

      const commentsList = document.getElementById(`commentsList-${highlightId}`);
      if (commentsList) {
        const bubble = document.createElement("div");
        bubble.className = "p-comment-bubble p-comment-new";
        bubble.innerHTML = `
          <div class="p-comment-head">
            <span class="p-comment-author">${escapeHtml(author_name)}</span>
            ${author_filiere ? `<span class="p-comment-filiere">${escapeHtml(author_filiere)}</span>` : ''}
            <span class="p-comment-time">À l'instant</span>
          </div>
          <div class="p-comment-body">${escapeHtml(comment_text)}</div>
        `;
        commentsList.appendChild(bubble);
        bubble.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }

      const counterBadge = document.getElementById(`commentsCount-${highlightId}`);
      if (counterBadge) {
        const cur = parseInt(counterBadge.getAttribute("data-count") || "0") + 1;
        counterBadge.setAttribute("data-count", cur);
        counterBadge.textContent = `💬 ${cur} Réactions`;
      }
    }
  } catch (err) {
    alert("Impossible d'envoyer votre commentaire. Vérifiez votre connexion.");
  }
}
