# Okapi

A personal daily scheduler. Plan your day in 30-minute slots, navigate between days, and see the weather alongside your timeline.

Built for one person's use. No accounts, no sync, no server — everything lives in your browser's localStorage.

---

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure + script load order |
| `style.css` | All visual design and layout |
| `app.js` | Scheduling logic — slots, groups, sheet, navigation |
| `config.js` | **Edit this one** — day bounds, weather settings, templates, palette |
| `okapi-weather.js` | Sunset line + weather stamps (Open-Meteo, no key required) |
| `okapi-sunset.json` | Pre-computed Budapest sunset times for all 365 days |

---

## Setup

### GitHub Pages (recommended — accessible on any device)

1. Create a new GitHub repository (e.g. `okapi`)
2. Upload all six files to the root of the repo
3. Go to **Settings → Pages → Branch: main → / (root)** → Save
4. Your scheduler is live at `https://YOUR_USERNAME.github.io/okapi/`
5. On Android (Brave or Chrome): tap the menu → **Add to Home Screen**

### Local (PC only)

```
python -m http.server 8080
```

Then open `http://localhost:8080`. Do not open `index.html` directly as a `file://` URL — fonts and the weather fetch will both fail without a server.

---

## How it works

The day is divided into 30-minute slots between `dayStart` and `dayEnd` (configured in `config.js`). Tapping any empty slot opens the bottom sheet where you pick an activity and optionally add a short note. Consecutive slots with the same activity are merged into one visual block on the timeline.

Each day's schedule is stored separately in `localStorage` under `okapi_schedule_YYYY-MM-DD`, so past days are preserved as long as you don't clear browser storage.

---

## Features

**Assigning a slot** — tap any empty block, pick an activity from the grid. Optionally type a note in the "note" field before tapping the activity.

**Editing a block** — tap any assigned block to reassign or clear it. The existing note is pre-filled.

**Custom activities** — type a name at the bottom of the sheet, pick a colour, press Add. Saved to `localStorage` and available from then on.

**Day navigation** — `‹` and `›` arrows move between days. Empty days load blank; filled days reload from storage. The date turns blue when viewing today.

**Push +30** — shifts all assignments from the current time slot onward by one slot. Useful when your day is running late.

**Export JSON** — downloads the current day's schedule as structured JSON, including a `blocks` array with start, end, duration, activity name, note, and colour.

**Sunset line** — a thin sunset-orange line drawn across the timeline at today's local sunset time. Only visible on today's view. Hidden if sunset falls outside the configured day range (common in winter when sunset is before `dayEnd` is also before `dayStart` — or vice versa). No API call — read from the pre-computed `okapi-sunset.json`.

**Weather stamps** — at every 3rd hour from `dayStart` (e.g. 07:00, 10:00, 13:00, 16:00, 19:00, 22:00), a small stamp appears in the time label column showing:
- An SVG weather icon with a day/night variant
- Temperature in °C (rounded to whole number)
- Wind gusts in km/h if above the configured threshold (orange)

Clicking any weather stamp opens the radar URL in a new tab (configurable). Only visible on today's view. Weather data is fetched fresh on each load from Open-Meteo; if the fetch fails, the last cached result is shown silently.

---

## Configuration (`config.js`)

### Day bounds
```js
dayStart: "07:00",
dayEnd:   "22:00",
```

### Weather
```js
weather: {
  enabled:          true,     // set false to hide all weather features
  latitude:         47.4979,  // change if you move
  longitude:        19.0402,
  timezone:         "Europe/Budapest",
  windThresholdKmh: 40,       // gust above this → km/h shown in orange
  radarUrl:         "https://www.met.hu/idojaras/aktualis_idojaras/radar/index.php",
},
```

### Activity templates
```js
templates: [
  { name: "Deep work", color: "#4a8ff0" },
  { name: "Meeting",   color: "#a855f7" },
],
```

### Colour palette
Colours available in the custom activity picker.
```js
palette: [
  { name: "Blue",   color: "#4a8ff0" },
  { name: "Purple", color: "#a855f7" },
],
```

---

## Data & storage

| Key | Contents |
|---|---|
| `okapi_schedule_YYYY-MM-DD` | One entry per calendar day |
| `okapi_custom_templates` | Activities added at runtime |
| `okapi_weather_cache` | Last successful Open-Meteo response (stale fallback) |

No data is ever sent anywhere. Clearing browser site data will erase all schedules and custom templates. The weather cache is safe to clear — it refills on the next load.

---

## Weather data sources

**Sunset times** — `okapi-sunset.json`, generated once with Python's `astral` library for Budapest (47.4979°N, 19.0402°E). Covers all 365 days; does not include leap day (02-29). Valid indefinitely — astronomical drift is under 2 minutes per year. To regenerate for a different city, see `Okapi-summaries.md`.

**Hourly weather** — [Open-Meteo](https://open-meteo.com/). Free, no API key, CORS-safe. Fetches `temperature_2m`, `weather_code`, `wind_gusts_10m`, and `is_day` for the current day. No rate-limiting concern at personal use frequency.

**Radar** — configurable URL in `config.js`. Default points to the Hungarian Meteorological Service (OMSZ) radar.

---

## Timezone note

All date keys use local calendar dates, never UTC. `toISOString()` is intentionally avoided throughout — it would shift the date backward in UTC+1/+2 timezones. Navigating to "yesterday" or "tomorrow" always matches the date shown on your system clock.

---

## Technical reference

For a full file-by-file breakdown of logic, data flow, and implementation decisions, see **`Okapi-summaries.md`**. Attach that file when resuming development on this project.
