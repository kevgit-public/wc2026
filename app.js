const STANDINGS_URL = "data/standings.json";
const PLAYERS_URL = "data/players.json";

let playersById = {};

document.addEventListener("DOMContentLoaded", () => {
  loadData();

  document.getElementById("modalClose").addEventListener("click", closeModal);
  document.getElementById("modalBackdrop").addEventListener("click", closeModal);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
    }
  });
});

async function loadData() {
  try {
    const [standingsResponse, playersResponse] = await Promise.all([
      fetch(STANDINGS_URL, { cache: "no-store" }),
      fetch(PLAYERS_URL, { cache: "no-store" })
    ]);

    if (!standingsResponse.ok) {
      throw new Error(
        `Could not load ${STANDINGS_URL}. Status: ${standingsResponse.status} ${standingsResponse.statusText}`
      );
    }

    if (!playersResponse.ok) {
      throw new Error(
        `Could not load ${PLAYERS_URL}. Status: ${playersResponse.status} ${playersResponse.statusText}`
      );
    }

    const standingsData = await standingsResponse.json();
    const playersData = await playersResponse.json();

    playersById = {};
    (playersData.players || []).forEach((player) => {
      playersById[player.id] = player;
    });

    renderStandings(standingsData);
  } catch (error) {
    renderError(error);
  }
}

function renderStandings(data) {
  document.getElementById("lastUpdated").textContent =
    `Last updated: ${formatDate(data.lastUpdated)}`;

  document.getElementById("scoringMode").textContent =
    formatStageLabel(data.scoringMode || "-");

  document.getElementById("completedThrough").textContent =
    formatStageLabel(data.stageCompletedThrough || "-");

  document.getElementById("maxPoints").textContent =
    data.maxPossiblePointsSoFar ?? "-";

  renderScoringLegend(data.scoringRules || {});

  const standings = data.standings || [];
  const tournamentComplete = data.stageCompletedThrough === "final";

  renderLeaderboard(standings);
  renderPlayerCards(standings, tournamentComplete);
}

function renderScoringLegend(scoringRules) {
  document.getElementById("scoreRoundOf32").textContent =
    `${safeValue(scoringRules.roundOf32)} pt`;

  document.getElementById("scoreRoundOf16").textContent =
    `${safeValue(scoringRules.roundOf16)} pts`;

  document.getElementById("scoreQuarterfinal").textContent =
    `${safeValue(scoringRules.quarterfinal)} pts`;

  document.getElementById("scoreSemifinal").textContent =
    `${safeValue(scoringRules.semifinal)} pts`;

  document.getElementById("scoreThirdPlace").textContent =
    `${safeValue(scoringRules.thirdPlace)} pts`;

  document.getElementById("scoreFinal").textContent =
    `${safeValue(scoringRules.final)} pts`;

  document.getElementById("scoreChampionBonus").textContent =
    `${safeValue(scoringRules.championBonus)} pts`;
}

function renderLeaderboard(standings) {
  const tbody = document.getElementById("standingsBody");
  tbody.innerHTML = "";

  if (standings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11">No standings available yet.</td></tr>`;
    return;
  }

  standings.forEach((player) => {
    const breakdown = player.pointsBreakdown || {};
    const remaining = player.remainingPotential || {};

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>
        <span class="rank-badge ${player.rank === 1 ? "first" : ""}">
          ${safeValue(player.rank)}
        </span>
      </td>
      <td>${renderPlayerButton(player.playerId, player.displayName)}</td>
      <td class="total-points">${safeValue(player.totalPoints)}</td>
      <td>${safeValue(breakdown.roundOf32)}</td>
      <td>${safeValue(breakdown.roundOf16)}</td>
      <td>${safeValue(breakdown.quarterfinal)}</td>
      <td>${safeValue(breakdown.semifinal)}</td>
      <td>${safeValue(breakdown.thirdPlace)}</td>
      <td>${safeValue(breakdown.final)}</td>
      <td>${safeValue(breakdown.championBonus)}</td>
      <td>${safeValue(remaining.championPick)}</td>
    `;

    tbody.appendChild(row);
  });

  attachPlayerClickHandlers();
}

function renderPlayerCards(standings, tournamentComplete) {
  const container = document.getElementById("playerCards");
  container.innerHTML = "";

  standings.forEach((player) => {
    const breakdown = player.pointsBreakdown || {};
    const counts = player.correctCounts || {};
    const remaining = player.remainingPotential || {};

    let championStatusClass;
    let championStatusText;
    let championStatusLabel;

    if (tournamentComplete) {
      const championCorrect = counts.champion === 1;
      championStatusClass = championCorrect ? "alive" : "eliminated";
      championStatusText = championCorrect ? "Correct" : "Incorrect";
      championStatusLabel = "Champion Result";
    } else {
      championStatusClass = remaining.championStillAlive ? "alive" : "eliminated";
      championStatusText = remaining.championStillAlive ? "Still alive" : "Eliminated";
      championStatusLabel = "Champion Status";
    }

    const card = document.createElement("article");
    card.className = "player-card";

    card.innerHTML = `
      <h3>#${safeValue(player.rank)} ${renderPlayerButton(player.playerId, player.displayName)}</h3>
      <div class="points">${safeValue(player.totalPoints)} pts</div>

      <div class="card-row">
        <span>Champion Pick</span>
        <strong>${safeValue(remaining.championPick)}</strong>
      </div>

      <div class="card-row">
        <span>${championStatusLabel}</span>
        <strong class="${championStatusClass}">${championStatusText}</strong>
      </div>

      <div class="card-row">
        <span>Runner-up Pick</span>
        <strong>${safeValue(remaining.runnerUpPick)}</strong>
      </div>

      <div class="card-row">
        <span>Third Place Pick</span>
        <strong>${safeValue(remaining.thirdPlacePick)}</strong>
      </div>

      <div class="card-row">
        <span>R32 Slot Points</span>
        <strong>${safeValue(breakdown.roundOf32)}</strong>
      </div>

      <div class="card-row">
        <span>R16 Slot Points</span>
        <strong>${safeValue(breakdown.roundOf16)}</strong>
      </div>

      <div class="card-row">
        <span>Correct R32 Slots</span>
        <strong>${safeValue(counts.roundOf32Slots)}</strong>
      </div>

      <div class="card-row">
        <span>Correct R16 Slots</span>
        <strong>${safeValue(counts.roundOf16Slots)}</strong>
      </div>
    `;

    container.appendChild(card);
  });

  attachPlayerClickHandlers();
}

function renderPlayerButton(playerId, displayName) {
  if (!playersById[playerId]) {
    return safeValue(displayName);
  }

  return `
    <button class="player-link" type="button" data-player-id="${escapeHtml(playerId)}">
      ${escapeHtml(displayName)}
    </button>
  `;
}

function attachPlayerClickHandlers() {
  document.querySelectorAll(".player-link").forEach((button) => {
    button.addEventListener("click", () => {
      const playerId = button.getAttribute("data-player-id");
      openPlayerBracket(playerId);
    });
  });
}

function openPlayerBracket(playerId) {
  const player = playersById[playerId];

  if (!player) {
    return;
  }

  const summary = player.reviewSummary || {};
  const modalContent = document.getElementById("modalContent");

  modalContent.innerHTML = `
    <div class="bracket-view">
      <h2>${escapeHtml(player.displayName)}'s Bracket</h2>
      <p class="scoring-note">Filled-out bracket summary from this player's picks.</p>

      <div class="bracket-summary">
        <div class="bracket-summary-item">
          <span>Champion</span>
          <strong>${safeValue(summary.champion)}</strong>
        </div>
        <div class="bracket-summary-item">
          <span>Runner-up</span>
          <strong>${safeValue(summary.runnerUp)}</strong>
        </div>
        <div class="bracket-summary-item">
          <span>Third Place</span>
          <strong>${safeValue(summary.thirdPlaceWinner)}</strong>
        </div>
        <div class="bracket-summary-item">
          <span>Fourth Place</span>
          <strong>${safeValue(summary.fourthPlace)}</strong>
        </div>
      </div>

      ${renderFinalSection(summary)}
      ${renderRoundSection("Third Place Game", summary.thirdPlaceGame)}
      ${renderMatchListSection("Semifinals", summary.semifinals)}
      ${renderMatchListSection("Quarterfinals", summary.quarterfinals)}
      ${renderMatchListSection("Round of 16", summary.roundOf16)}
      ${renderMatchListSection("Round of 32", summary.roundOf32)}
      ${renderOcrNotes(player.ocrNotes || [])}
    </div>
  `;

  document.getElementById("bracketModal").classList.remove("hidden");
}

function renderFinalSection(summary) {
  const final = summary.final || {};

  return `
    <section class="bracket-round">
      <h3>Final</h3>
      <div class="bracket-match-grid">
        <div class="bracket-match">
          <div class="bracket-match-id">Match 104</div>
          <div class="bracket-match-result">
            ${safeValue(final.winner)} over ${safeValue(getFinalOpponent(final.match, final.winner))}
          </div>
          <div>${safeValue(final.match)}</div>
          <div>Score: ${safeValue(final.score)}</div>
        </div>
      </div>
    </section>
  `;
}

function renderRoundSection(title, matchObject) {
  if (!matchObject) {
    return "";
  }

  return `
    <section class="bracket-round">
      <h3>${escapeHtml(title)}</h3>
      <div class="bracket-match-grid">
        <div class="bracket-match">
          <div class="bracket-match-result">
            ${safeValue(matchObject.winner)} over ${safeValue(getFinalOpponent(matchObject.match, matchObject.winner))}
          </div>
          <div>${safeValue(matchObject.match)}</div>
        </div>
      </div>
    </section>
  `;
}

function renderMatchListSection(title, matches) {
  if (!matches) {
    return "";
  }

  const cards = Object.entries(matches)
    .map(([matchId, result]) => {
      return `
        <div class="bracket-match">
          <div class="bracket-match-id">Match ${escapeHtml(matchId)}</div>
          <div class="bracket-match-result">${escapeHtml(result)}</div>
        </div>
      `;
    })
    .join("");

  return `
    <section class="bracket-round">
      <h3>${escapeHtml(title)}</h3>
      <div class="bracket-match-grid">
        ${cards}
      </div>
    </section>
  `;
}

function renderOcrNotes(notes) {
  if (!notes.length) {
    return "";
  }

  const listItems = notes
    .map((note) => `<li>${escapeHtml(note)}</li>`)
    .join("");

  return `
    <section class="ocr-notes">
      <h3>OCR Notes</h3>
      <ul>${listItems}</ul>
    </section>
  `;
}

function closeModal() {
  document.getElementById("bracketModal").classList.add("hidden");
}

function getFinalOpponent(matchText, winner) {
  if (!matchText || !winner || !matchText.includes(" vs ")) {
    return "-";
  }

  const teams = matchText.split(" vs ").map((team) => team.trim());
  const opponent = teams.find((team) => team !== winner);

  return opponent || "-";
}

function renderError(error) {
  console.error(error);

  const container = document.querySelector(".container");
  container.innerHTML = `
    <div class="error">
      <strong>Could not load standings.</strong>
      <p>${error.message}</p>
      <p>Make sure <code>data/standings.json</code> and <code>data/players.json</code> exist and are valid JSON.</p>
    </div>
  `;
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function formatStageLabel(value) {
  const labels = {
    "slot-based": "Slot Based",
    "notStarted": "Not Started",
    "roundOf32": "Round of 32",
    "roundOf16": "Round of 16",
    "quarterfinal": "Quarterfinals",
    "semifinal": "Semifinals",
    "thirdPlace": "Third Place",
    "final": "Final"
  };

  return labels[value] || "-";
}

function safeValue(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return escapeHtml(String(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
