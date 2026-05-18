# ConcertTrack

**A live event discovery and personal watchlist app powered by the Ticketmaster API and Supabase.**

## Project Description

ConcertTrack is a web application that helps music fans discover and organize upcoming live events. Users can search for concerts by artist name or city, browse event results, and save shows they are interested in to a personal watchlist. The application is built on a Node.js and Express backend, uses the Ticketmaster Discovery API to retrieve live event data, and stores watchlist entries in a Supabase PostgreSQL database. The goal of the project is to give users a clean, focused interface for tracking concerts they want to attend without having to navigate cluttered ticketing platforms.

## Target Browsers

The primary target browser for this application is Google Chrome on desktop. The application has also been tested on Mozilla Firefox, Microsoft Edge, and Safari on macOS. Mobile browsers including Chrome and Safari on iOS and Android are supported through responsive CSS layout adjustments.

## Link to Developer Manual

See the [Developer Manual](#developer-manual) section below.

---

# Developer Manual

## Audience

This document is written for future developers who will continue working on ConcertTrack after the original development team. It assumes that the reader is familiar with JavaScript, Node.js, REST APIs, and basic terminal usage, but does not assume any prior knowledge of how this specific application is structured.

---

## 1. Prerequisites

Before setting up the project, the following tools and accounts need to be in place. Node.js version 18 or higher is required and can be downloaded at https://nodejs.org. The npm package manager is included with Node.js and does not need to be installed separately. A Ticketmaster Developer account and API key are required, which can be created at https://developer.ticketmaster.com. A Supabase account with a project already created is also needed, available at https://supabase.com. Finally, a GitHub account and a Vercel account connected to GitHub are needed for deployment. Vercel can be accessed at https://vercel.com.

---

## 2. Installation

To get a local copy of the project running, start by cloning the repository and navigating into the project folder.

```bash
git clone https://github.com/YOUR_USERNAME/concerttrack.git
cd concerttrack
```

Next, install all required dependencies by running the following command.

```bash
npm install
```

After the dependencies are installed, the environment variables need to be configured. Copy the example environment file and rename it.

```bash
cp .env.example .env
```

Open the `.env` file and fill in the three required values as shown below.

```
TICKETMASTER_API_KEY=your_ticketmaster_api_key_here
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
PORT=3000
```

The `TICKETMASTER_API_KEY` value can be found in the Ticketmaster Developer portal under My Apps, then selecting your app and copying the Consumer Key. The `SUPABASE_URL` is built from your project ID, which is found under Project Settings and then General in the Supabase dashboard. It follows the format `https://your-project-id.supabase.co`. The `SUPABASE_ANON_KEY` is found under Project Settings, then API Keys, then the Legacy anon key tab.

---

## 3. Supabase Database Setup

Before running the application, the watchlist table needs to be created in Supabase. In your Supabase project, open the SQL Editor and run the following query. When prompted about Row Level Security, select "Run without RLS" since this application does not use authentication.

```sql
create table watchlist (
  id uuid default gen_random_uuid() primary key,
  event_id text,
  name text,
  venue text,
  city text,
  state text,
  event_date text,
  image_url text,
  tm_url text,
  genre text,
  saved_at timestamptz default now()
);
```

No additional Supabase configuration is needed after this step. The application accesses the table using the anon key with public table access.

---

## 4. Running the Application Locally

To start the server, run the following command in the project root directory.

```bash
npm start
```

For development with automatic server restarts when files change, use the following command instead.

```bash
npm run dev
```

Once the server is running, open a browser and navigate to http://localhost:3000. The terminal should display the message "ConcertTrack server running on http://localhost:3000" to confirm the server started correctly. The browser must be pointed to this localhost address rather than opening the HTML files directly from the file system, otherwise the fetch calls will not be able to reach the backend.

---

## 5. Running Tests

There is no automated test suite currently implemented for this project. The following manual testing procedure can be used to verify that all core functionality is working correctly.

Start the server with `npm start` and open http://localhost:3000. Search for an artist name such as "Taylor Swift" and verify that event cards appear with the correct name, venue, city, and date information. Click the "+ Watchlist" button on one of the event cards and verify that a success notification appears in the top right corner. Navigate to `/watchlist.html` and verify that the saved event appears. Click the "Remove" button on that event and verify that it disappears from the list and is no longer in the Supabase table. Finally, navigate to `/about.html` and verify that the page loads without errors.

Backend endpoints can also be tested directly using a tool like Insomnia or the curl commands below.

```bash
# Test Ticketmaster endpoint
curl "http://localhost:3000/api/events?keyword=Drake"

# Test watchlist GET
curl "http://localhost:3000/api/watchlist"

# Test watchlist POST
curl -X POST "http://localhost:3000/api/watchlist" \
  -H "Content-Type: application/json" \
  -d '{"event_id":"test123","name":"Test Concert","venue":"Test Venue","city":"Washington","state":"DC","event_date":"2026-08-01","genre":"Rock"}'
```

---

## 6. API Endpoints

### `GET /api/events`

This endpoint fetches upcoming music events from the Ticketmaster Discovery API and returns a formatted list to the frontend. At least one of the `keyword` or `city` parameters must be provided.

| Parameter | Required | Description |
|---|---|---|
| `keyword` | Optional* | Artist name, band name, or search keyword |
| `city` | Optional* | City name to filter events by location |
| `startDateTime` | Optional | Start of a date range filter in YYYY-MM-DD format |
| `endDateTime` | Optional | End of a date range filter in YYYY-MM-DD format |

The response returns an `events` array where each object contains the event ID, name, Ticketmaster URL, date, time, venue, city, state, image URL, genre, and subgenre. A `total` field is also included reflecting the number of results returned.

---

### `GET /api/watchlist`

This endpoint retrieves all saved events from the Supabase watchlist table, ordered by the most recently saved first. The response returns a `watchlist` array where each object contains the database row ID, event ID, name, venue, city, state, event date, image URL, Ticketmaster URL, genre, and the timestamp of when the event was saved.

---

### `POST /api/watchlist`

This endpoint saves a new event to the Supabase watchlist table. If the same event ID has already been saved, the server returns a 409 status to prevent duplicate entries. The request body should be JSON and include the following fields: `event_id`, `name`, `venue`, `city`, `state`, `event_date`, `image_url`, `tm_url`, and `genre`. On success, the server returns a 201 status and the full saved row from Supabase.

---

### `DELETE /api/watchlist/:id`

This endpoint deletes a watchlist entry from Supabase using the row's UUID, which is passed as a URL parameter. On success, the server returns `{ "deleted": true }`.

---

## 7. Deployment to Vercel

Deploying the application to Vercel requires the project to first be pushed to a public GitHub repository. Once the code is on GitHub, log in to Vercel and click "Add New Project." Import the GitHub repository from the list. Before clicking Deploy, scroll down to find the Environment Variables section and add the three required variables: `TICKETMASTER_API_KEY`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY`. After those are added, click Deploy and Vercel will automatically detect the Node.js application and build it.

The `.env` file is listed in `.gitignore` and will not be pushed to GitHub, which means the environment variables must always be added manually through the Vercel dashboard. Any future changes pushed to the GitHub repository will trigger an automatic redeployment on Vercel without any additional steps.

---

## 8. Known Bugs

The duplicate event check is handled server-side only. If a user refreshes the page after saving an event, the in-session saved ID tracker resets and the Save button will display "+ Watchlist" again. Clicking it will still be blocked by the server with a 409 response, but the button feedback is lost on refresh.

The date range filter depends on the quality of date data provided by Ticketmaster. Some events have incomplete date information and may not appear in filtered searches even if their actual date falls within the selected range.

Search results are capped at 20 events per search because pagination has not been implemented. This is the default page size returned by the Ticketmaster API.

---

## 9. Future Development Roadmap

One area for future development is adding pagination controls so that users can browse beyond the first 20 search results. Another improvement would be adding sorting and filtering options to the watchlist page so that users can organize their saved events by city, date, or genre. User accounts could also be added using Supabase Auth, which would allow multiple users to each maintain their own personal watchlist rather than sharing a single global one. An event detail page is another possible addition that would let users click through to a dedicated page showing all available Ticketmaster metadata for a specific event. Email or push notifications could also be implemented to alert users when a saved event is approaching. On the frontend side, the existing responsive CSS provides a foundation that could be extended into a more complete mobile experience.
