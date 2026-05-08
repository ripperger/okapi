// ═══════════════════════════════════════════════════════
//  OKAPI — WEATHER
//  Sunset line + every-3rd-hour weather stamps.
//  Data source: OpenWeatherMap (current + 5-day/3h forecast).
//  Requires config.js + app.js constants (START, END, SLOT_H,
//  todayStr, viewDate) to be available at call time.
//  Supports today AND tomorrow views.
// ═══════════════════════════════════════════════════════

const LS_WEATHER = "okapi_weather_cache";

// ── Module state ─────────────────────────────────────
// Keyed by "today" | "tomorrow"
// Each value: { hour → { temp, code, gust, isDay } }
let _weatherData = { today: null, tomorrow: null };
let _sunset      = { today: null, tomorrow: null };  // minutes from midnight

// ─────────────────────────────────────────────────────
//  Date helpers (local — never toISOString)
// ─────────────────────────────────────────────────────
function _tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

// Returns "today" | "tomorrow" | null for the current viewDate
function _dayKey() {
  if (viewDate === todayStr())     return "today";
  if (viewDate === _tomorrowStr()) return "tomorrow";
  return null;
}

function _mmdd(dateObj) {
  return (
    String(dateObj.getMonth() + 1).padStart(2, "0") + "-" +
    String(dateObj.getDate()).padStart(2, "0")
  );
}

// ─────────────────────────────────────────────────────
//  Public init — called by app.js after first render
// ─────────────────────────────────────────────────────
async function initWeather() {
  const cfg = OKAPI_CONFIG.weather;
  if (!cfg || !cfg.enabled) return;

  await Promise.all([_loadSunset(), _fetchWeather()]);
}

// ─────────────────────────────────────────────────────
//  Sunset — static JSON lookup for today + tomorrow
// ─────────────────────────────────────────────────────
async function _loadSunset() {
  try {
    const resp = await fetch("okapi-sunset.json");
    if (!resp.ok) return;
    const data = await resp.json();

    const td = new Date();
    if (data[_mmdd(td)]) {
      const [h, m] = data[_mmdd(td)].sunset.split(":").map(Number);
      _sunset.today = h * 60 + m;
    }

    const tm = new Date();
    tm.setDate(tm.getDate() + 1);
    if (data[_mmdd(tm)]) {
      const [h, m] = data[_mmdd(tm)].sunset.split(":").map(Number);
      _sunset.tomorrow = h * 60 + m;
    }
  } catch (_) {}
}

// ─────────────────────────────────────────────────────
//  Weather — OWM fetch with stale-cache fallback
//  Two calls in parallel:
//    /weather  → current conditions (observation-based)
//    /forecast → 3-hour slots for next 5 days
// ─────────────────────────────────────────────────────
async function _fetchWeather() {
  const cfg  = OKAPI_CONFIG.weather;
  const base = `https://api.openweathermap.org/data/2.5`;
  const loc  = `lat=${cfg.latitude}&lon=${cfg.longitude}&appid=${cfg.apiKey}&units=metric`;

  try {
    const [curResp, fcResp] = await Promise.all([
      fetch(`${base}/weather?${loc}`),
      fetch(`${base}/forecast?${loc}`),
    ]);

    if (curResp.ok && fcResp.ok) {
      const curRaw = await curResp.json();
      const fcRaw  = await fcResp.json();

      const parsed = _parseOwmData(curRaw, fcRaw);
      localStorage.setItem(LS_WEATHER, JSON.stringify({ ts: Date.now(), data: parsed }));
      _weatherData = parsed;
      return;
    }
  } catch (_) {}

  // Fetch failed → use whatever is cached (any age is better than nothing)
  try {
    const cached = JSON.parse(localStorage.getItem(LS_WEATHER) || "null");
    if (cached?.data) _weatherData = cached.data;
  } catch (_) {}
}

// ─────────────────────────────────────────────────────
//  Parse OWM responses
// ─────────────────────────────────────────────────────

// Builds { today: { hour → entry }, tomorrow: { hour → entry } }
// Forecast provides 3-hour slots; current overrides the current hour in today.
function _parseOwmData(cur, fc) {
  const result    = { today: {}, tomorrow: {} };
  const todayDate = todayStr();
  const tomDate   = _tomorrowStr();

  // ── Forecast slots ───────────────────────────────
  // dt_txt looks like "2026-05-07 16:00:00"
  for (const slot of fc.list) {
    const datePart = slot.dt_txt.substring(0, 10);
    const hour     = parseInt(slot.dt_txt.substring(11, 13), 10);

    const entry = {
      temp:  Math.round(slot.main.temp),
      code:  slot.weather[0].id,
      gust:  Math.round(slot.wind.gust ?? slot.wind.speed),
      isDay: slot.sys.pod === "d",
    };

    if (datePart === todayDate) result.today[hour]    = entry;
    if (datePart === tomDate)   result.tomorrow[hour] = entry;
  }

  // ── Current conditions override ──────────────────
  // OWM /weather is observation-based — overrides the current hour in today.
  const nowHour = new Date().getHours();
  const isDay   = cur.dt >= cur.sys.sunrise && cur.dt < cur.sys.sunset;

  result.today[nowHour] = {
    temp:  Math.round(cur.main.temp),
    code:  cur.weather[0].id,
    gust:  Math.round(cur.wind.gust ?? cur.wind.speed),
    isDay,
  };

  return result;
}

// ─────────────────────────────────────────────────────
//  Find closest available forecast entry for a stamp hour.
//  OWM forecast uses 3-hour boundaries (0,3,6,9…) which
//  don't align with stamps from dayStart (7,10,13…).
// ─────────────────────────────────────────────────────
function _nearestEntry(data, targetHour) {
  const hours = Object.keys(data).map(Number);
  if (!hours.length) return null;
  const best = hours.reduce((a, b) =>
    Math.abs(a - targetHour) <= Math.abs(b - targetHour) ? a : b
  );
  return data[best];
}

// ─────────────────────────────────────────────────────
//  Render — sunset line
// ─────────────────────────────────────────────────────
function renderSunsetLine() {
  const cfg = OKAPI_CONFIG.weather;
  if (!cfg?.enabled) return;

  const key = _dayKey();
  if (!key) return;

  const sunsetMin = _sunset[key];
  if (sunsetMin === null) return;

  if (sunsetMin <= START || sunsetMin >= END) return;

  const y    = ((sunsetMin - START) / 30) * SLOT_H;
  const line = document.createElement("div");
  line.className = "sunset-line";
  line.style.top = y + "px";
  document.getElementById("blocks-area").appendChild(line);
}

// ─────────────────────────────────────────────────────
//  Render — weather stamps (every 3rd hour from dayStart)
// ─────────────────────────────────────────────────────
function renderWeatherStamps() {
  const cfg = OKAPI_CONFIG.weather;
  if (!cfg?.enabled) return;

  const key = _dayKey();
  if (!key) return;

  const hourlyData = _weatherData[key];
  if (!hourlyData) return;

  const container = document.getElementById("time-labels");
  const nowHour   = new Date().getHours();

  for (let m = START; m <= END; m += 60) {
    const offsetHours = (m - START) / 60;
    if (offsetHours % 3 !== 0) continue;

    const stampHour = Math.floor(m / 60);

    // For today's stamp that falls on the current hour: use live data.
    // For all others: find nearest forecast slot.
    const isCurrentStamp = key === "today" && stampHour === nowHour;
    const w = isCurrentStamp
      ? (hourlyData[nowHour] ?? _nearestEntry(hourlyData, stampHour))
      : _nearestEntry(hourlyData, stampHour);

    if (!w) continue;

    const y = ((m - START) / 30) * SLOT_H;

    const stamp = document.createElement("div");
    stamp.className = "weather-stamp";
    stamp.style.top = (y + 13) + "px";
    stamp.title     = "Radar megnyitása";
    stamp.addEventListener("click", e => {
      e.stopPropagation();
      window.open(cfg.radarUrl, "_blank", "noopener");
    });

    const icon = document.createElement("div");
    icon.className = "weather-icon";
    icon.innerHTML = _getWeatherSVG(w.code, w.isDay);
    stamp.appendChild(icon);

    const temp = document.createElement("div");
    temp.className   = "weather-temp";
    temp.textContent = `${w.temp}°`;
    stamp.appendChild(temp);

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
//  OWM code → icon category
//  2xx thunder · 3xx drizzle · 5xx rain · 6xx snow
//  7xx fog/mist · 800 clear · 801-802 partlyCloudy · 803+ overcast
// ─────────────────────────────────────────────────────
function _owmCategory(code) {
  if (code >= 200 && code < 300)    return "thunder";
  if (code >= 300 && code < 400)    return "drizzle";
  if (code >= 500 && code < 600)    return "rain";
  if (code >= 600 && code < 700)    return "snow";
  if (code >= 700 && code < 800)    return "fog";
  if (code === 800)                 return "clear";
  if (code === 801 || code === 802) return "partlyCloudy";
  if (code >= 803)                  return "overcast";
  return "overcast";
}

function _getWeatherSVG(code, isDay) {
  const cat   = _owmCategory(code);
  const icons = _SVG_ICONS[cat] ?? _SVG_ICONS.overcast;
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
        <line x1="3"  y1="7"    x2="17" y2="7"/>
        <line x1="5"  y1="10.5" x2="15" y2="10.5"/>
        <line x1="7"  y1="14"   x2="13" y2="14"/>
      </g>
    </svg>`,
    night: `<svg viewBox="0 0 20 20" fill="none">
      <g stroke="#4a6a8a" stroke-width="1.5" stroke-linecap="round">
        <line x1="3"  y1="7"    x2="17" y2="7"/>
        <line x1="5"  y1="10.5" x2="15" y2="10.5"/>
        <line x1="7"  y1="14"   x2="13" y2="14"/>
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
