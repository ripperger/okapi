// ═══════════════════════════════════════════════════════
//  OKAPI — WEATHER
//  Sunset line + every-3rd-hour weather stamps.
//  Requires config.js + app.js constants (START, END, SLOT_H,
//  todayStr, viewDate) to be available at call time.
// ═══════════════════════════════════════════════════════

const LS_WEATHER = "okapi_weather_cache";

// ── Module state ─────────────────────────────────────
let _weatherByHour = null;   // { 0..23 → { temp, code, gust, isDay } }
let _sunsetMin     = null;   // minutes from midnight

// ─────────────────────────────────────────────────────
//  Public init — called by app.js after first render
// ─────────────────────────────────────────────────────
async function initWeather() {
  const cfg = OKAPI_CONFIG.weather;
  if (!cfg || !cfg.enabled) return;

  await Promise.all([_loadSunset(), _fetchWeather()]);
}

// ─────────────────────────────────────────────────────
//  Sunset — static JSON lookup
// ─────────────────────────────────────────────────────
async function _loadSunset() {
  try {
    const today = new Date();
    const mm    = String(today.getMonth() + 1).padStart(2, "0");
    const dd    = String(today.getDate()).padStart(2, "0");
    const key   = `${mm}-${dd}`;

    const resp = await fetch("okapi-sunset.json");
    if (!resp.ok) return;
    const data = await resp.json();
    if (!data[key]) return;

    const [h, m]  = data[key].sunset.split(":").map(Number);
    _sunsetMin    = h * 60 + m;
  } catch (_) {}
}

// ─────────────────────────────────────────────────────
//  Weather — Open-Meteo fetch with stale-cache fallback
// ─────────────────────────────────────────────────────
async function _fetchWeather() {
  const cfg = OKAPI_CONFIG.weather;

  // Always try a fresh fetch first
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${cfg.latitude}&longitude=${cfg.longitude}` +
      `&hourly=temperature_2m,weather_code,wind_gusts_10m,is_day` +
      `&timezone=${encodeURIComponent(cfg.timezone)}` +
      `&forecast_days=1`;

    const resp = await fetch(url);
    if (resp.ok) {
      const raw    = await resp.json();
      const parsed = _parseHourly(raw);
      localStorage.setItem(LS_WEATHER, JSON.stringify({ ts: Date.now(), data: parsed }));
      _weatherByHour = parsed;
      return;
    }
  } catch (_) {}

  // Fetch failed → use whatever is cached (any age is better than nothing)
  try {
    const cached = JSON.parse(localStorage.getItem(LS_WEATHER) || "null");
    if (cached?.data) _weatherByHour = cached.data;
  } catch (_) {}
}

// Open-Meteo hourly array → { hour: { temp, code, gust, isDay } }
function _parseHourly(raw) {
  const result = {};
  const h = raw.hourly;
  if (!h?.time) return result;

  h.time.forEach((t, i) => {
    // Parse hour from "2026-05-04T07:00" — substring avoids any Date/UTC ambiguity
    const hour = parseInt(t.substring(11, 13), 10);
    result[hour] = {
      temp:  Math.round(h.temperature_2m[i]),
      code:  h.weather_code[i],
      gust:  Math.round(h.wind_gusts_10m[i]),
      isDay: h.is_day[i] === 1,
    };
  });
  return result;
}

// ─────────────────────────────────────────────────────
//  Render — sunset line
// ─────────────────────────────────────────────────────
function renderSunsetLine() {
  const cfg = OKAPI_CONFIG.weather;
  if (!cfg?.enabled)       return;
  if (_sunsetMin === null)  return;
  if (viewDate !== todayStr()) return;   // only today

  // Only draw if sunset falls inside the visible day range
  if (_sunsetMin <= START || _sunsetMin >= END) return;

  const y    = ((_sunsetMin - START) / 30) * SLOT_H;
  const line = document.createElement("div");
  line.className   = "sunset-line";
  line.style.top   = y + "px";
  document.getElementById("blocks-area").appendChild(line);
}

// ─────────────────────────────────────────────────────
//  Render — weather stamps (every 3rd hour from dayStart)
// ─────────────────────────────────────────────────────
function renderWeatherStamps() {
  const cfg = OKAPI_CONFIG.weather;
  if (!cfg?.enabled)        return;
  if (!_weatherByHour)      return;
  if (viewDate !== todayStr()) return;   // only today

  const container = document.getElementById("time-labels");

  for (let m = START; m < END; m += 60) {
    // Only stamp every 3rd hour measured from dayStart
    const offsetHours = (m - START) / 60;
    if (offsetHours % 3 !== 0) continue;

    const hour = Math.floor(m / 60);
    const w    = _weatherByHour[hour];
    if (!w) continue;

    const y = ((m - START) / 30) * SLOT_H;

    const stamp = document.createElement("div");
    stamp.className = "weather-stamp";
    stamp.style.top = (y + 13) + "px";   // just below the time label text
    stamp.title     = "Radar megnyitása";
    stamp.addEventListener("click", e => {
      e.stopPropagation();
      window.open(cfg.radarUrl, "_blank", "noopener");
    });

    // SVG icon
    const icon = document.createElement("div");
    icon.className   = "weather-icon";
    icon.innerHTML   = _getWeatherSVG(w.code, w.isDay);
    stamp.appendChild(icon);

    // Temperature
    const temp = document.createElement("div");
    temp.className   = "weather-temp";
    temp.textContent = `${w.temp}°`;
    stamp.appendChild(temp);

    // Wind — only if above threshold
    if (w.gust >= cfg.windThresholdKmh) {
      const wind = document.createElement("div");
      wind.className   = "weather-wind";
      wind.textContent = `${w.gust} km/h`;
      stamp.appendChild(wind);
    }

    container.appendChild(stamp);
  }
}

// ─────────────────────────────────────────────────────
//  WMO code → category
// ─────────────────────────────────────────────────────
function _wmoCategory(code) {
  if (code === 0)                                            return "clear";
  if (code <= 2)                                             return "partlyCloudy";
  if (code === 3)                                            return "overcast";
  if (code === 45 || code === 48)                            return "fog";
  if (code >= 51 && code <= 57)                              return "drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95)                                            return "thunder";
  return "overcast";
}

function _getWeatherSVG(code, isDay) {
  const cat    = _wmoCategory(code);
  const icons  = _SVG_ICONS[cat] ?? _SVG_ICONS.overcast;
  return icons[isDay ? "day" : "night"] ?? icons.day;
}

// ─────────────────────────────────────────────────────
//  SVG icon definitions  (20×20 viewBox)
// ─────────────────────────────────────────────────────
const _SVG_ICONS = {

  clear: {
    day: `<svg viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="3.4" fill="#f5c842"/>
      <g stroke="#f5c842" stroke-width="1.5" stroke-linecap="round">
        <line x1="10" y1="2"    x2="10" y2="4.4"/>
        <line x1="10" y1="15.6" x2="10" y2="18"/>
        <line x1="2"  y1="10"   x2="4.4" y2="10"/>
        <line x1="15.6" y1="10" x2="18"  y2="10"/>
        <line x1="4.1" y1="4.1"   x2="5.8" y2="5.8"/>
        <line x1="14.2" y1="14.2" x2="15.9" y2="15.9"/>
        <line x1="15.9" y1="4.1"  x2="14.2" y2="5.8"/>
        <line x1="5.8"  y1="14.2" x2="4.1"  y2="15.9"/>
      </g>
    </svg>`,
    night: `<svg viewBox="0 0 20 20" fill="none">
      <path d="M14 13.5A6.5 6.5 0 0 1 6.5 6a6 6 0 1 0 7.5 7.5z" fill="#c8d8e8"/>
    </svg>`
  },

  partlyCloudy: {
    day: `<svg viewBox="0 0 20 20" fill="none">
      <circle cx="7.5" cy="9" r="2.7" fill="#f5c842"/>
      <g stroke="#f5c842" stroke-width="1.2" stroke-linecap="round">
        <line x1="7.5" y1="4.2"  x2="7.5" y2="5.6"/>
        <line x1="7.5" y1="12.4" x2="7.5" y2="13.8"/>
        <line x1="2.5" y1="9"    x2="3.9"  y2="9"/>
        <line x1="11.1" y1="9"   x2="12.5" y2="9"/>
        <line x1="4"   y1="5.5"  x2="5"    y2="6.5"/>
        <line x1="10"  y1="11.5" x2="11"   y2="12.5"/>
        <line x1="11"  y1="5.5"  x2="10"   y2="6.5"/>
      </g>
      <path d="M9.5 15.5H15a3 3 0 0 0 0-6 3 3 0 0 0-5.5 1.6A2 2 0 0 0 9.5 15.5z" fill="#4a6a8a"/>
    </svg>`,
    night: `<svg viewBox="0 0 20 20" fill="none">
      <path d="M9.5 8.5A3.8 3.8 0 0 1 6 5a3.8 3.8 0 0 0 4 4.2z" fill="#c8d8e8"/>
      <path d="M9.5 15.5H15a3 3 0 0 0 0-6 3 3 0 0 0-5.5 1.6A2 2 0 0 0 9.5 15.5z" fill="#4a6a8a"/>
    </svg>`
  },

  overcast: {
    day: `<svg viewBox="0 0 20 20" fill="none">
      <path d="M5.5 14.5H14a4 4 0 0 0 0-8 4 4 0 0 0-7.8 1.6A2.8 2.8 0 0 0 5.5 14.5z" fill="#5a7a98"/>
    </svg>`,
    night: `<svg viewBox="0 0 20 20" fill="none">
      <path d="M5.5 14.5H14a4 4 0 0 0 0-8 4 4 0 0 0-7.8 1.6A2.8 2.8 0 0 0 5.5 14.5z" fill="#3a5570"/>
    </svg>`
  },

  fog: {
    day: `<svg viewBox="0 0 20 20" fill="none">
      <g stroke="#8aaccc" stroke-width="1.5" stroke-linecap="round">
        <line x1="3"  y1="7"  x2="17" y2="7"/>
        <line x1="5"  y1="10.5" x2="15" y2="10.5"/>
        <line x1="7"  y1="14" x2="13" y2="14"/>
      </g>
    </svg>`,
    night: `<svg viewBox="0 0 20 20" fill="none">
      <g stroke="#4a6a8a" stroke-width="1.5" stroke-linecap="round">
        <line x1="3"  y1="7"  x2="17" y2="7"/>
        <line x1="5"  y1="10.5" x2="15" y2="10.5"/>
        <line x1="7"  y1="14" x2="13" y2="14"/>
      </g>
    </svg>`
  },

  drizzle: {
    day: `<svg viewBox="0 0 20 20" fill="none">
      <path d="M5 11H13a3.5 3.5 0 0 0 0-7 3.5 3.5 0 0 0-6.8 1.5A2.5 2.5 0 0 0 5 11z" fill="#5a7a98"/>
      <g stroke="#4a8ff0" stroke-width="1.3" stroke-linecap="round">
        <line x1="7"  y1="13.5" x2="6.5" y2="16"/>
        <line x1="10" y1="13.5" x2="9.5" y2="16"/>
        <line x1="13" y1="13.5" x2="12.5" y2="16"/>
      </g>
    </svg>`,
    night: `<svg viewBox="0 0 20 20" fill="none">
      <path d="M5 11H13a3.5 3.5 0 0 0 0-7 3.5 3.5 0 0 0-6.8 1.5A2.5 2.5 0 0 0 5 11z" fill="#3a5570"/>
      <g stroke="#4a8ff0" stroke-width="1.3" stroke-linecap="round">
        <line x1="7"  y1="13.5" x2="6.5" y2="16"/>
        <line x1="10" y1="13.5" x2="9.5" y2="16"/>
        <line x1="13" y1="13.5" x2="12.5" y2="16"/>
      </g>
    </svg>`
  },

  rain: {
    day: `<svg viewBox="0 0 20 20" fill="none">
      <path d="M5 11H13a3.5 3.5 0 0 0 0-7 3.5 3.5 0 0 0-6.8 1.5A2.5 2.5 0 0 0 5 11z" fill="#5a7a98"/>
      <g stroke="#4a8ff0" stroke-width="1.5" stroke-linecap="round">
        <line x1="7"  y1="13" x2="5.5" y2="17"/>
        <line x1="10" y1="13" x2="8.5" y2="17"/>
        <line x1="13" y1="13" x2="11.5" y2="17"/>
      </g>
    </svg>`,
    night: `<svg viewBox="0 0 20 20" fill="none">
      <path d="M5 11H13a3.5 3.5 0 0 0 0-7 3.5 3.5 0 0 0-6.8 1.5A2.5 2.5 0 0 0 5 11z" fill="#3a5570"/>
      <g stroke="#4a8ff0" stroke-width="1.5" stroke-linecap="round">
        <line x1="7"  y1="13" x2="5.5" y2="17"/>
        <line x1="10" y1="13" x2="8.5" y2="17"/>
        <line x1="13" y1="13" x2="11.5" y2="17"/>
      </g>
    </svg>`
  },

  snow: {
    day: `<svg viewBox="0 0 20 20" fill="none">
      <path d="M5 11H13a3.5 3.5 0 0 0 0-7 3.5 3.5 0 0 0-6.8 1.5A2.5 2.5 0 0 0 5 11z" fill="#5a7a98"/>
      <g fill="#b8d8f8">
        <circle cx="7"  cy="14"   r="1.1"/>
        <circle cx="10" cy="15.5" r="1.1"/>
        <circle cx="13" cy="14"   r="1.1"/>
      </g>
    </svg>`,
    night: `<svg viewBox="0 0 20 20" fill="none">
      <path d="M5 11H13a3.5 3.5 0 0 0 0-7 3.5 3.5 0 0 0-6.8 1.5A2.5 2.5 0 0 0 5 11z" fill="#3a5570"/>
      <g fill="#b8d8f8">
        <circle cx="7"  cy="14"   r="1.1"/>
        <circle cx="10" cy="15.5" r="1.1"/>
        <circle cx="13" cy="14"   r="1.1"/>
      </g>
    </svg>`
  },

  thunder: {
    day: `<svg viewBox="0 0 20 20" fill="none">
      <path d="M5 11H13a3.5 3.5 0 0 0 0-7 3.5 3.5 0 0 0-6.8 1.5A2.5 2.5 0 0 0 5 11z" fill="#5a7a98"/>
      <path d="M11 11.5 8.5 15.5h2.8L9 19.5" stroke="#f5c842" stroke-width="1.5"
            stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>`,
    night: `<svg viewBox="0 0 20 20" fill="none">
      <path d="M5 11H13a3.5 3.5 0 0 0 0-7 3.5 3.5 0 0 0-6.8 1.5A2.5 2.5 0 0 0 5 11z" fill="#3a5570"/>
      <path d="M11 11.5 8.5 15.5h2.8L9 19.5" stroke="#f5c842" stroke-width="1.5"
            stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>`
  },
};
