// ═══════════════════════════════════════════════════════
//  OKAPI — WEATHER
//  Sunset line + every-3rd-hour weather stamps.
//  Requires config.js loaded first.
//  Render functions called from app.js after DOM is ready;
//  START, END, SLOT_H, viewDate must be in global scope by then.
// ═══════════════════════════════════════════════════════

// Versioned key — changing this busts any old cached format.
const LS_WEATHER = "okapi_weather_v2";

// ── Module state ──────────────────────────────────────
// _weatherByDate: { "YYYY-MM-DD": { 0..23: { temp, code, gust, isDay } } }
// Weather is shown for any date present in this map (today + tomorrow
// when fetched with forecast_days=2; absent dates silently show nothing).
let _weatherByDate = {};
let _sunsetData    = null;   // full "MM-DD" → "HH:MM" table from JSON


// ─────────────────────────────────────────────────────
//  Public init — awaited by app.js, triggers a re-render
// ─────────────────────────────────────────────────────
async function initWeather() {
  if (!OKAPI_CONFIG.weather?.enabled) return;
  await Promise.all([_loadSunset(), _fetchWeather()]);
}


// ─────────────────────────────────────────────────────
//  Sunset — load full year JSON into module var
// ─────────────────────────────────────────────────────
async function _loadSunset() {
  try {
    const resp = await fetch("okapi-sunset.json");
    if (!resp.ok) {
      console.error("[okapi-weather] okapi-sunset.json not found (" + resp.status + "). Make sure the file is in the project root.");
      return;
    }
    _sunsetData = await resp.json();
  } catch (err) {
    console.error("[okapi-weather] Failed to load okapi-sunset.json:", err);
  }
}

// Return sunset in minutes-from-midnight for a "YYYY-MM-DD" string, or null.
function _sunsetMinFor(dateStr) {
  if (!_sunsetData) return null;
  const parts = dateStr.split("-");           // ["2026","05","05"]
  const key   = parts[1] + "-" + parts[2];   // "05-05"
  const val   = _sunsetData[key];
  if (!val) return null;
  const [h, m] = val.split(":").map(Number);
  return h * 60 + m;
}


// ─────────────────────────────────────────────────────
//  Weather — 2-day Open-Meteo fetch, stale-cache fallback
// ─────────────────────────────────────────────────────
async function _fetchWeather() {
  const cfg = OKAPI_CONFIG.weather;
  try {
    const url =
      "https://api.open-meteo.com/v1/forecast" +
      "?latitude="  + cfg.latitude +
      "&longitude=" + cfg.longitude +
      "&hourly=temperature_2m,weather_code,wind_gusts_10m,is_day" +
      "&timezone="  + encodeURIComponent(cfg.timezone) +
      "&forecast_days=2";

    const resp = await fetch(url);
    if (!resp.ok) {
      console.error("[okapi-weather] Open-Meteo fetch failed:", resp.status);
    } else {
      const json   = await resp.json();
      const parsed = _parseHourly(json);
      const keys   = Object.keys(parsed);
      if (keys.length === 0) {
        console.error("[okapi-weather] _parseHourly returned empty — unexpected API shape:", json);
      } else {
        localStorage.setItem(LS_WEATHER, JSON.stringify({ ts: Date.now(), data: parsed }));
        _weatherByDate = parsed;
        console.log("[okapi-weather] Fetched weather for:", keys.join(", "));
        return;
      }
    }
  } catch (err) {
    console.error("[okapi-weather] Fetch threw:", err);
  }

  // Live fetch failed — try cached data (any age beats nothing)
  try {
    const raw = localStorage.getItem(LS_WEATHER);
    if (raw) {
      const cached = JSON.parse(raw);
      if (cached?.data && Object.keys(cached.data).length > 0) {
        _weatherByDate = cached.data;
        console.log("[okapi-weather] Using cached weather data from", new Date(cached.ts).toLocaleString());
        return;
      }
    }
  } catch (err) {
    console.error("[okapi-weather] Cache read failed:", err);
  }

  console.warn("[okapi-weather] No weather data available — stamps will be hidden.");
}

// Open-Meteo hourly array → { "YYYY-MM-DD": { hour: { temp, code, gust, isDay } } }
// t format: "2026-05-05T07:00"  — substring avoids any Date/UTC ambiguity.
function _parseHourly(raw) {
  const result = {};
  const h = raw && raw.hourly;
  if (!h || !h.time) return result;

  for (let i = 0; i < h.time.length; i++) {
    const t    = h.time[i];
    const date = t.substring(0, 10);               // "2026-05-05"
    const hour = parseInt(t.substring(11, 13), 10); // 7
    if (!result[date]) result[date] = {};
    result[date][hour] = {
      temp:  Math.round(h.temperature_2m[i]),
      code:  h.weather_code[i],
      gust:  Math.round(h.wind_gusts_10m[i]),
      isDay: h.is_day[i] === 1,
    };
  }
  return result;
}


// ─────────────────────────────────────────────────────
//  Render — sunset line
//  Works for any date in the sunset JSON (all 365 days).
//  Hidden when sunset falls outside dayStart–dayEnd window.
// ─────────────────────────────────────────────────────
function renderSunsetLine() {
  if (!OKAPI_CONFIG.weather?.enabled) return;

  const sunsetMin = _sunsetMinFor(viewDate);
  if (sunsetMin === null) return;                      // data not loaded
  if (sunsetMin <= START || sunsetMin >= END) return;  // outside visible range

  const y    = ((sunsetMin - START) / 30) * SLOT_H;
  const line = document.createElement("div");
  line.className = "sunset-line";
  line.style.top = y + "px";
  document.getElementById("blocks-area").appendChild(line);
}


// ─────────────────────────────────────────────────────
//  Render — weather stamps
//  Every 3rd hour from dayStart to dayEnd (inclusive).
//  Only renders if _weatherByDate has an entry for viewDate,
//  so no explicit date-range guard is needed.
// ─────────────────────────────────────────────────────
function renderWeatherStamps() {
  if (!OKAPI_CONFIG.weather?.enabled) return;

  const hourData = _weatherByDate[viewDate];
  if (!hourData) return;   // no data for this date → silently skip

  const cfg       = OKAPI_CONFIG.weather;
  const container = document.getElementById("time-labels");

  // m <= END so the closing hour (e.g. 22:00) gets a stamp too
  for (let m = START; m <= END; m += 60) {
    const offsetHours = (m - START) / 60;
    if (offsetHours % 3 !== 0) continue;

    const hour = Math.floor(m / 60);
    const w    = hourData[hour];
    if (!w) continue;

    const y     = ((m - START) / 30) * SLOT_H;
    const stamp = document.createElement("div");
    stamp.className = "weather-stamp";
    stamp.style.top = (y + 13) + "px";
    stamp.title     = "Radar megnyitása";
    stamp.addEventListener("click", function (e) {
      e.stopPropagation();
      window.open(cfg.radarUrl, "_blank", "noopener");
    });

    const icon = document.createElement("div");
    icon.className = "weather-icon";
    icon.innerHTML = _getWeatherSVG(w.code, w.isDay);
    stamp.appendChild(icon);

    const temp = document.createElement("div");
    temp.className   = "weather-temp";
    temp.textContent = w.temp + "\u00b0";
    stamp.appendChild(temp);

    if (w.gust >= cfg.windThresholdKmh) {
      const wind = document.createElement("div");
      wind.className   = "weather-wind";
      wind.textContent = w.gust + " km/h";
      stamp.appendChild(wind);
    }

    container.appendChild(stamp);
  }
}


// ─────────────────────────────────────────────────────
//  WMO code → visual category
// ─────────────────────────────────────────────────────
function _wmoCategory(code) {
  if (code === 0)                                                 return "clear";
  if (code <= 2)                                                  return "partlyCloudy";
  if (code === 3)                                                 return "overcast";
  if (code === 45 || code === 48)                                 return "fog";
  if (code >= 51 && code <= 57)                                   return "drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82))  return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86)  return "snow";
  if (code >= 95)                                                 return "thunder";
  return "overcast";
}

function _getWeatherSVG(code, isDay) {
  const cat   = _wmoCategory(code);
  const icons = _SVG_ICONS[cat] || _SVG_ICONS.overcast;
  return (isDay ? icons.day : icons.night) || icons.day;
}


// ─────────────────────────────────────────────────────
//  SVG icon definitions  (20×20 viewBox)
// ─────────────────────────────────────────────────────
var _SVG_ICONS = {

  clear: {
    day: '<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="3.4" fill="#f5c842"/><g stroke="#f5c842" stroke-width="1.5" stroke-linecap="round"><line x1="10" y1="2" x2="10" y2="4.4"/><line x1="10" y1="15.6" x2="10" y2="18"/><line x1="2" y1="10" x2="4.4" y2="10"/><line x1="15.6" y1="10" x2="18" y2="10"/><line x1="4.1" y1="4.1" x2="5.8" y2="5.8"/><line x1="14.2" y1="14.2" x2="15.9" y2="15.9"/><line x1="15.9" y1="4.1" x2="14.2" y2="5.8"/><line x1="5.8" y1="14.2" x2="4.1" y2="15.9"/></g></svg>',
    night: '<svg viewBox="0 0 20 20" fill="none"><path d="M14 13.5A6.5 6.5 0 0 1 6.5 6a6 6 0 1 0 7.5 7.5z" fill="#c8d8e8"/></svg>'
  },

  partlyCloudy: {
    day: '<svg viewBox="0 0 20 20" fill="none"><circle cx="7.5" cy="9" r="2.7" fill="#f5c842"/><g stroke="#f5c842" stroke-width="1.2" stroke-linecap="round"><line x1="7.5" y1="4.2" x2="7.5" y2="5.6"/><line x1="7.5" y1="12.4" x2="7.5" y2="13.8"/><line x1="2.5" y1="9" x2="3.9" y2="9"/><line x1="11.1" y1="9" x2="12.5" y2="9"/><line x1="4" y1="5.5" x2="5" y2="6.5"/><line x1="10" y1="11.5" x2="11" y2="12.5"/><line x1="11" y1="5.5" x2="10" y2="6.5"/></g><path d="M9.5 15.5H15a3 3 0 0 0 0-6 3 3 0 0 0-5.5 1.6A2 2 0 0 0 9.5 15.5z" fill="#4a6a8a"/></svg>',
    night: '<svg viewBox="0 0 20 20" fill="none"><path d="M8 9A3.5 3.5 0 0 1 5.5 6a3.5 3.5 0 0 0 3.5 4z" fill="#c8d8e8"/><path d="M9.5 15.5H15a3 3 0 0 0 0-6 3 3 0 0 0-5.5 1.6A2 2 0 0 0 9.5 15.5z" fill="#4a6a8a"/></svg>'
  },

  overcast: {
    day:   '<svg viewBox="0 0 20 20" fill="none"><path d="M5.5 14.5H14a4 4 0 0 0 0-8 4 4 0 0 0-7.8 1.6A2.8 2.8 0 0 0 5.5 14.5z" fill="#5a7a98"/></svg>',
    night: '<svg viewBox="0 0 20 20" fill="none"><path d="M5.5 14.5H14a4 4 0 0 0 0-8 4 4 0 0 0-7.8 1.6A2.8 2.8 0 0 0 5.5 14.5z" fill="#3a5570"/></svg>'
  },

  fog: {
    day:   '<svg viewBox="0 0 20 20" fill="none"><g stroke="#8aaccc" stroke-width="1.5" stroke-linecap="round"><line x1="3" y1="7" x2="17" y2="7"/><line x1="5" y1="10.5" x2="15" y2="10.5"/><line x1="7" y1="14" x2="13" y2="14"/></g></svg>',
    night: '<svg viewBox="0 0 20 20" fill="none"><g stroke="#4a6a8a" stroke-width="1.5" stroke-linecap="round"><line x1="3" y1="7" x2="17" y2="7"/><line x1="5" y1="10.5" x2="15" y2="10.5"/><line x1="7" y1="14" x2="13" y2="14"/></g></svg>'
  },

  drizzle: {
    day:   '<svg viewBox="0 0 20 20" fill="none"><path d="M5 11H13a3.5 3.5 0 0 0 0-7 3.5 3.5 0 0 0-6.8 1.5A2.5 2.5 0 0 0 5 11z" fill="#5a7a98"/><g stroke="#4a8ff0" stroke-width="1.3" stroke-linecap="round"><line x1="7" y1="13.5" x2="6.5" y2="16"/><line x1="10" y1="13.5" x2="9.5" y2="16"/><line x1="13" y1="13.5" x2="12.5" y2="16"/></g></svg>',
    night: '<svg viewBox="0 0 20 20" fill="none"><path d="M5 11H13a3.5 3.5 0 0 0 0-7 3.5 3.5 0 0 0-6.8 1.5A2.5 2.5 0 0 0 5 11z" fill="#3a5570"/><g stroke="#4a8ff0" stroke-width="1.3" stroke-linecap="round"><line x1="7" y1="13.5" x2="6.5" y2="16"/><line x1="10" y1="13.5" x2="9.5" y2="16"/><line x1="13" y1="13.5" x2="12.5" y2="16"/></g></svg>'
  },

  rain: {
    day:   '<svg viewBox="0 0 20 20" fill="none"><path d="M5 11H13a3.5 3.5 0 0 0 0-7 3.5 3.5 0 0 0-6.8 1.5A2.5 2.5 0 0 0 5 11z" fill="#5a7a98"/><g stroke="#4a8ff0" stroke-width="1.5" stroke-linecap="round"><line x1="7" y1="13" x2="5.5" y2="17"/><line x1="10" y1="13" x2="8.5" y2="17"/><line x1="13" y1="13" x2="11.5" y2="17"/></g></svg>',
    night: '<svg viewBox="0 0 20 20" fill="none"><path d="M5 11H13a3.5 3.5 0 0 0 0-7 3.5 3.5 0 0 0-6.8 1.5A2.5 2.5 0 0 0 5 11z" fill="#3a5570"/><g stroke="#4a8ff0" stroke-width="1.5" stroke-linecap="round"><line x1="7" y1="13" x2="5.5" y2="17"/><line x1="10" y1="13" x2="8.5" y2="17"/><line x1="13" y1="13" x2="11.5" y2="17"/></g></svg>'
  },

  snow: {
    day:   '<svg viewBox="0 0 20 20" fill="none"><path d="M5 11H13a3.5 3.5 0 0 0 0-7 3.5 3.5 0 0 0-6.8 1.5A2.5 2.5 0 0 0 5 11z" fill="#5a7a98"/><g fill="#b8d8f8"><circle cx="7" cy="14" r="1.1"/><circle cx="10" cy="15.5" r="1.1"/><circle cx="13" cy="14" r="1.1"/></g></svg>',
    night: '<svg viewBox="0 0 20 20" fill="none"><path d="M5 11H13a3.5 3.5 0 0 0 0-7 3.5 3.5 0 0 0-6.8 1.5A2.5 2.5 0 0 0 5 11z" fill="#3a5570"/><g fill="#b8d8f8"><circle cx="7" cy="14" r="1.1"/><circle cx="10" cy="15.5" r="1.1"/><circle cx="13" cy="14" r="1.1"/></g></svg>'
  },

  thunder: {
    day:   '<svg viewBox="0 0 20 20" fill="none"><path d="M5 11H13a3.5 3.5 0 0 0 0-7 3.5 3.5 0 0 0-6.8 1.5A2.5 2.5 0 0 0 5 11z" fill="#5a7a98"/><path d="M11 11.5 8.5 15.5h2.8L9 19.5" stroke="#f5c842" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>',
    night: '<svg viewBox="0 0 20 20" fill="none"><path d="M5 11H13a3.5 3.5 0 0 0 0-7 3.5 3.5 0 0 0-6.8 1.5A2.5 2.5 0 0 0 5 11z" fill="#3a5570"/><path d="M11 11.5 8.5 15.5h2.8L9 19.5" stroke="#f5c842" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>'
  },
};
