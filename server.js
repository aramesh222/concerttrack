require("dotenv").config();
const express = require("express");
const fetch = require("node-fetch");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Middleware
app.use(express.json());
app.use(express.static("public"));

// ─────────────────────────────────────────────
// ENDPOINT 1: GET events from Ticketmaster
// Used by: Home page search
// ─────────────────────────────────────────────
app.get("/api/events", async (req, res) => {
  const { keyword, city, startDateTime, endDateTime } = req.query;

  if (!keyword && !city) {
    return res.status(400).json({ error: "Please provide a keyword or city." });
  }

  const params = new URLSearchParams({
    apikey: process.env.TICKETMASTER_API_KEY,
    locale: "*",
    size: 20,
    sort: "date,asc",
    classificationName: "music",
  });

  if (keyword) params.append("keyword", keyword);
  if (city) params.append("city", city);
  if (startDateTime) params.append("startDateTime", startDateTime + "T00:00:00Z");
  if (endDateTime) params.append("endDateTime", endDateTime + "T23:59:59Z");

  try {
    const tmRes = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?${params}`
    );
    const data = await tmRes.json();

    // Handle no results
    if (!data._embedded || !data._embedded.events) {
      return res.json({ events: [] });
    }

    // Format only what the frontend needs
    const events = data._embedded.events.map((e) => ({
      id: e.id,
      name: e.name,
      url: e.url,
      date: e.dates?.start?.localDate || "TBD",
      time: e.dates?.start?.localTime || null,
      venue: e._embedded?.venues?.[0]?.name || "Unknown Venue",
      city: e._embedded?.venues?.[0]?.city?.name || "Unknown City",
      state: e._embedded?.venues?.[0]?.state?.stateCode || "",
      image: e.images?.find((img) => img.ratio === "16_9" && img.width > 500)?.url
        || e.images?.[0]?.url
        || null,
      genre: e.classifications?.[0]?.genre?.name || "Music",
      subGenre: e.classifications?.[0]?.subGenre?.name || null,
    }));

    res.json({ events, total: data.page?.totalElements || events.length });
  } catch (err) {
    console.error("Ticketmaster fetch error:", err);
    res.status(500).json({ error: "Failed to fetch events from Ticketmaster." });
  }
});

// ─────────────────────────────────────────────
// ENDPOINT 2: GET watchlist from Supabase
// Used by: Watchlist page on load
// ─────────────────────────────────────────────
app.get("/api/watchlist", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("watchlist")
      .select("*")
      .order("saved_at", { ascending: false });

    if (error) throw error;
    res.json({ watchlist: data });
  } catch (err) {
    console.error("Supabase GET error:", err);
    res.status(500).json({ error: "Failed to fetch watchlist." });
  }
});

// ─────────────────────────────────────────────
// ENDPOINT 3: POST save event to Supabase
// Used by: "Save to Watchlist" button on Home page
// ─────────────────────────────────────────────
app.post("/api/watchlist", async (req, res) => {
  const { event_id, name, venue, city, state, event_date, image_url, tm_url, genre } =
    req.body;

  if (!event_id || !name) {
    return res.status(400).json({ error: "event_id and name are required." });
  }

  try {
    // Check for duplicate
    const { data: existing } = await supabase
      .from("watchlist")
      .select("id")
      .eq("event_id", event_id)
      .single();

    if (existing) {
      return res.status(409).json({ error: "Event already in watchlist." });
    }

    const { data, error } = await supabase
      .from("watchlist")
      .insert([{ event_id, name, venue, city, state, event_date, image_url, tm_url, genre }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ saved: data });
  } catch (err) {
    console.error("Supabase POST error:", err);
    res.status(500).json({ error: "Failed to save event." });
  }
});

// ─────────────────────────────────────────────
// ENDPOINT 4: DELETE event from Supabase
// Used by: Remove button on Watchlist page
// ─────────────────────────────────────────────
app.delete("/api/watchlist/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from("watchlist")
      .delete()
      .eq("id", id);

    if (error) throw error;
    res.json({ deleted: true });
  } catch (err) {
    console.error("Supabase DELETE error:", err);
    res.status(500).json({ error: "Failed to remove event." });
  }
});

// ─────────────────────────────────────────────
// Catch-all: serve index.html for unknown routes
// ─────────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

app.listen(PORT, () => {
  console.log(`ConcertTrack server running on http://localhost:${PORT}`);
});
