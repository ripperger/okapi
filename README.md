# Okapi

A personal daily scheduler. Plan your day in 30-minute slots, navigate between days, and export your schedule as JSON.

Built for one person's use. No accounts, no sync, no server — everything lives in your browser's localStorage.

---

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure |
| `style.css` | Visual design |
| `app.js` | All scheduling logic |
| `config.js` | **Edit this one** — day bounds, templates, palette |

---

## Setup

### GitHub Pages (recommended — accessible on any device)

1. Create a new GitHub repository (e.g. `okapi`)
2. Upload all four files to the root of the repo
3. Go to **Settings → Pages → Branch: main → / (root)** → Save
4. Your scheduler is live at `https://YOUR_USERNAME.github.io/okapi/`
5. On Android/iOS: tap the browser menu → **Add to Home Screen**

### Local (PC only)

Open a terminal in the project folder and run:

```
python -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

> Do not open `index.html` directly as a `file://` URL — fonts won't load correctly.

---

## How it works

The day is divided into 30-minute slots between `dayStart` and `dayEnd` (set in `config.js`). Tapping any empty slot opens the bottom sheet where you pick an activity and optionally add a short note. Consecutive slots with the same activity are merged into one block on the timeline.

Each day's schedule is stored separately in localStorage under the key `okapi_schedule_YYYY-MM-DD`, so past days are preserved as long as you don't clear browser storage.

---

## Configuration (`config.js`)

### Day bounds
```js
dayStart: "06:00",
dayEnd:   "22:00",
```

### Activity templates
Pre-defined activities shown in the bottom sheet grid. Each entry needs a `name` and a `color` (hex).

```js
templates: [
  { name: "Deep work", color: "#4a8ff0" },
  { name: "Meeting",   color: "#a855f7" },
  // add more here
],
```

### Colour palette
Colours available in the custom activity creator. Named for readability.

```js
palette: [
  { name: "Blue",   color: "#4a8ff0" },
  { name: "Purple", color: "#a855f7" },
  // ...
],
```

---

## Features

**Assigning a slot** — tap any empty block, pick an activity from the grid. Optionally type a note in the "note" field before tapping the activity (it attaches the note to the block).

**Editing a block** — tap any assigned block to reassign or clear it. The existing note is pre-filled.

**Custom activities** — at the bottom of the sheet, type a name, pick a colour, press Add. The activity is saved to localStorage and appears in the grid from then on.

**Day navigation** — use the `‹` and `›` arrows next to the date to move between days. Empty days load as blank; previously filled days reload their saved schedule. The date turns blue when you're viewing today.

**Push +30** — shifts all assignments from the current time slot onward by one slot (30 min). Useful when your day is running late.

**Export JSON** — downloads the current day's schedule as a structured JSON file, including a `blocks` array with start, end, duration, activity name, note, and colour.

---

## Data & storage

- Schedules are stored in `localStorage` with the key pattern `okapi_schedule_YYYY-MM-DD`
- Custom activity templates are stored under `okapi_custom_templates`
- No data is ever sent anywhere
- Clearing browser site data will erase all schedules

---

## Timezone note

Date keys use local calendar dates, not UTC. Okapi is safe to use in any timezone — navigating to "yesterday" or "tomorrow" will always match the date shown on your system clock.
