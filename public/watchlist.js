const notyf = new Notyf({
  duration: 3000,
  position: { x: "right", y: "top" },
});

let cityChartInstance = null;

function formatDate(dateStr) {
  if (!dateStr || dateStr === "TBD") return "Date TBD";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function formatSavedAt(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function buildCard(item) {
  const card = document.createElement("div");
  card.className = "event-card";
  card.dataset.dbId = item.id;

  const imgHTML = item.image_url
    ? `<img class="card-img" src="${item.image_url}" alt="${item.name}" loading="lazy" />`
    : `<div class="card-img-placeholder">🎤</div>`;

  card.innerHTML = `
    ${imgHTML}
    <div class="card-body">
      <span class="card-genre">${item.genre || "Music"}</span>
      <div class="card-name">${item.name}</div>
      <div class="card-meta">📍 ${item.venue}, ${item.city}${item.state ? ", " + item.state : ""}</div>
      <div class="card-meta">📅 ${formatDate(item.event_date)}</div>
    </div>
    <div class="card-actions">
      ${item.tm_url ? `<a href="${item.tm_url}" target="_blank" rel="noopener" class="btn btn-ghost" style="font-size:0.78rem;padding:0.45rem 0.9rem;">View on TM ↗</a>` : ""}
      <button class="btn btn-remove" data-id="${item.id}">Remove</button>
      <span class="saved-badge">Saved ${formatSavedAt(item.saved_at)}</span>
    </div>
  `;

  card.querySelector(".btn-remove").addEventListener("click", () => removeEvent(item.id, card));

  return card;
}

function renderCityChart(items) {
  const counts = {};
  items.forEach((item) => {
    const c = item.city || "Unknown";
    counts[c] = (counts[c] || 0) + 1;
  });

  const labels = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  const data = labels.map((l) => counts[l]);

  const ctx = document.getElementById("cityChart").getContext("2d");

  if (cityChartInstance) cityChartInstance.destroy();

  cityChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Saved Events",
        data,
        backgroundColor: "#e8ff47",
        borderRadius: 4,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#1f1f1f",
          titleColor: "#e8ff47",
          bodyColor: "#f0f0f0",
          borderColor: "#2a2a2a",
          borderWidth: 1,
        }
      },
      scales: {
        x: {
          ticks: { color: "#777", font: { family: "DM Sans" } },
          grid: { color: "#1f1f1f" }
        },
        y: {
          ticks: { color: "#777", stepSize: 1, font: { family: "DM Sans" } },
          grid: { color: "#1f1f1f" }
        }
      }
    }
  });
}

async function loadWatchlist() {
  const loader = document.getElementById("loader");
  const emptyState = document.getElementById("emptyState");
  const grid = document.getElementById("watchlistGrid");
  const chartSection = document.getElementById("chartSection");

  loader.style.display = "flex";
  emptyState.style.display = "none";
  grid.style.display = "none";
  chartSection.style.display = "none";

  try {
    const res = await fetch("/api/watchlist");
    const data = await res.json();

    loader.style.display = "none";

    if (!res.ok) {
      notyf.error(data.error || "Failed to load watchlist.");
      emptyState.style.display = "block";
      return;
    }

    if (!data.watchlist || data.watchlist.length === 0) {
      emptyState.style.display = "block";
      return;
    }

    grid.style.display = "grid";
    grid.innerHTML = "";

    data.watchlist.forEach((item, i) => {
      const card = buildCard(item);
      card.style.animationDelay = `${i * 0.05}s`;
      grid.appendChild(card);
    });

   
    if (data.watchlist.length >= 2) {
      chartSection.style.display = "block";
      renderCityChart(data.watchlist);
    }

  } catch (err) {
    loader.style.display = "none";
    emptyState.style.display = "block";
    notyf.error("Network error. Is the server running?");
    console.error(err);
  }
}


async function removeEvent(id, cardEl) {
  try {
    const res = await fetch(`/api/watchlist/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (!res.ok) {
      notyf.error(data.error || "Failed to remove event.");
      return;
    }

    cardEl.style.animation = "fadeUp 0.2s ease reverse both";
    setTimeout(() => {
      cardEl.remove();

      
      const remaining = document.querySelectorAll(".event-card");
      if (remaining.length === 0) {
        document.getElementById("watchlistGrid").style.display = "none";
        document.getElementById("chartSection").style.display = "none";
        document.getElementById("emptyState").style.display = "block";
      } else {
        
        const remainingData = Array.from(remaining).map((c) => ({
          city: c.querySelector(".card-meta")?.textContent?.split(",")?.[1]?.trim() || "Unknown"
        }));
        if (cityChartInstance && remaining.length >= 2) renderCityChart(remainingData);
        else if (cityChartInstance) {
          cityChartInstance.destroy();
          document.getElementById("chartSection").style.display = "none";
        }
      }
    }, 200);

    notyf.success("Removed from watchlist.");

  } catch (err) {
    notyf.error("Network error while removing.");
    console.error(err);
  }
}


loadWatchlist();
