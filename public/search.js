
const notyf = new Notyf({
  duration: 3000,
  position: { x: "right", y: "top" },
  types: [
    { type: "success", background: "#e8ff47", icon: false,
      className: "notyf-success-dark" },
    { type: "error", background: "#ff4f4f", icon: false }
  ]
});

flatpickr("#dateRange", {
  mode: "range",
  minDate: "today",
  dateFormat: "Y-m-d",
  allowInput: false,
});

let genreChartInstance = null;


const savedIds = new Set();

function formatDate(dateStr) {
  if (!dateStr || dateStr === "TBD") return "Date TBD";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function buildCard(event) {
  const card = document.createElement("div");
  card.className = "event-card";
  card.dataset.id = event.id;

  const imgHTML = event.image
    ? `<img class="card-img" src="${event.image}" alt="${event.name}" loading="lazy" />`
    : `<div class="card-img-placeholder">🎤</div>`;

  const alreadySaved = savedIds.has(event.id);

  card.innerHTML = `
    ${imgHTML}
    <div class="card-body">
      <span class="card-genre">${event.genre}${event.subGenre && event.subGenre !== event.genre ? " · " + event.subGenre : ""}</span>
      <div class="card-name">${event.name}</div>
      <div class="card-meta">📍 ${event.venue}, ${event.city}${event.state ? ", " + event.state : ""}</div>
      <div class="card-meta">📅 ${formatDate(event.date)}${event.time ? " at " + formatTime(event.time) : ""}</div>
    </div>
    <div class="card-actions">
      <a href="${event.url}" target="_blank" rel="noopener" class="btn btn-ghost" style="font-size:0.78rem;padding:0.45rem 0.9rem;">View on TM ↗</a>
      <button
        class="btn btn-save ${alreadySaved ? "saved" : ""}"
        data-event='${JSON.stringify(event).replace(/'/g, "&#39;")}'
        ${alreadySaved ? "disabled" : ""}
      >${alreadySaved ? "✓ Saved" : "+ Watchlist"}</button>
    </div>
  `;

  const saveBtn = card.querySelector(".btn-save");
  if (!alreadySaved) {
    saveBtn.addEventListener("click", () => saveEvent(event, saveBtn));
  }

  return card;
}

function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${m} ${ampm}`;
}

function renderGenreChart(events) {
  const counts = {};
  events.forEach((e) => {
    const g = e.genre || "Other";
    counts[g] = (counts[g] || 0) + 1;
  });

  const labels = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  const data = labels.map((l) => counts[l]);

  const ctx = document.getElementById("genreChart").getContext("2d");

  if (genreChartInstance) genreChartInstance.destroy();

  genreChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Events",
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

async function searchEvents(keyword, city, startDate, endDate) {
  const grid = document.getElementById("eventsGrid");
  const emptyState = document.getElementById("emptyState");
  const resultsSection = document.getElementById("resultsSection");
  const loader = document.getElementById("loader");
  const chartSection = document.getElementById("chartSection");

  emptyState.style.display = "none";
  resultsSection.style.display = "none";
  chartSection.style.display = "none";
  loader.style.display = "flex";
  grid.innerHTML = "";

  const params = new URLSearchParams();
  if (keyword) params.append("keyword", keyword);
  if (city) params.append("city", city);
  if (startDate) params.append("startDateTime", startDate);
  if (endDate) params.append("endDateTime", endDate);

  try {
    const res = await fetch(`/api/events?${params}`);
    const data = await res.json();

    loader.style.display = "none";

    if (!res.ok) {
      notyf.error(data.error || "Search failed.");
      emptyState.style.display = "block";
      return;
    }

    if (!data.events || data.events.length === 0) {
      emptyState.style.display = "block";
      emptyState.innerHTML = `<span class="big">🔍</span>No events found. Try a different search.`;
      return;
    }

    resultsSection.style.display = "block";
    document.getElementById("resultsTitle").textContent = keyword
      ? `Results for "${keyword}"`
      : `Events in ${city}`;
    document.getElementById("resultsCount").textContent = `${data.events.length} events`;

    data.events.forEach((event, i) => {
      const card = buildCard(event);
      card.style.animationDelay = `${i * 0.04}s`;
      grid.appendChild(card);
    });


    chartSection.style.display = "block";
    renderGenreChart(data.events);

  } catch (err) {
    loader.style.display = "none";
    emptyState.style.display = "block";
    notyf.error("Network error. Is the server running?");
    console.error(err);
  }
}

async function saveEvent(event, btn) {
  btn.disabled = true;
  btn.textContent = "Saving…";

  const payload = {
    event_id: event.id,
    name: event.name,
    venue: event.venue,
    city: event.city,
    state: event.state,
    event_date: event.date,
    image_url: event.image,
    tm_url: event.url,
    genre: event.genre,
  };

  try {
    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (res.status === 409) {
      notyf.error("Already in your watchlist.");
      btn.textContent = "✓ Saved";
      btn.classList.add("saved");
      return;
    }

    if (!res.ok) {
      notyf.error(data.error || "Could not save event.");
      btn.disabled = false;
      btn.textContent = "+ Watchlist";
      return;
    }

    savedIds.add(event.id);
    btn.textContent = "✓ Saved";
    btn.classList.add("saved");
    notyf.success("Saved to watchlist!");

  } catch (err) {
    notyf.error("Network error while saving.");
    btn.disabled = false;
    btn.textContent = "+ Watchlist";
    console.error(err);
  }
}

document.getElementById("searchForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const keyword = document.getElementById("keyword").value.trim();
  const city = document.getElementById("city").value.trim();
  const dateRaw = document.getElementById("dateRange").value.trim();

  if (!keyword && !city) {
    notyf.error("Enter an artist name or city to search.");
    return;
  }

  let startDate = null, endDate = null;
  if (dateRaw.includes(" to ")) {
    [startDate, endDate] = dateRaw.split(" to ").map((s) => s.trim());
  } else if (dateRaw) {
    startDate = endDate = dateRaw.trim();
  }

  searchEvents(keyword, city, startDate, endDate);
});

document.getElementById("clearBtn").addEventListener("click", () => {
  document.getElementById("keyword").value = "";
  document.getElementById("city").value = "";
  document.getElementById("dateRange")._flatpickr?.clear();
  document.getElementById("eventsGrid").innerHTML = "";
  document.getElementById("resultsSection").style.display = "none";
  document.getElementById("chartSection").style.display = "none";
  document.getElementById("emptyState").style.display = "block";
  document.getElementById("emptyState").innerHTML = `<span class="big">🎵</span>Search for an artist or city above to discover events.`;
  if (genreChartInstance) { genreChartInstance.destroy(); genreChartInstance = null; }
});
