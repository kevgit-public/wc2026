const STANDINGS_URL = "data/standings.json";

document.addEventListener("DOMContentLoaded", () => {
  loadStandings();
});

async function loadStandings() {
  try {
    const response = await fetch(STANDINGS_URL, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(
        `Could not load ${STANDINGS_URL}. Status: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    renderStandings(data);
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
      <td>${safeValue(player.displayName)}</td>
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
      <h3>#${safeValue(player.rank)} ${safeValue(player.displayName)}</h3>
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
}

function renderError(error) {
  console.error(error);

  const container = document.querySelector(".container");
  container.innerHTML = `
    <div class="error">
      <strong>Could not load standings.</strong>
      <p>${error.message}</p>
      <p>Make sure <code>data/standings.json</code> exists and is valid JSON.</p>
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

  return String(value);
}