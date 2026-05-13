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
      localStorage      localStorage.setItem(LS_WEATHER, JSON.stringify({ ts: Date.now(), data: parsed }));
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

  // Forecast slots.
  // dt_txt is UTC ("2026-05-07 16:00:00"). Parse as UTC and convert to local
  // hour so each slot lands at the correct position on the local timeline.
  // datePart stays in UTC — only mismatches at midnight boundaries, which fall
  // outside dayStart/dayEnd anyway.
  for (const slot of fc.list) {
    const localDt  = new Date(slot.dt_txt.replace(" ", "T") + "Z");
    const datePart = slot.dt_txt.substring(0, 10);
    const hour     = localDt.getHours();

    const entry = {
      temp:  Math.round(slot.main.temp),
      code:  slot.weather[0].id,
      gust:  Math.round(slot.wind.gust ?? slot.wind.speed),
      isDay: slot.sys.pod === "d",
    };

    if (datePart === todayDate) result.today[hour]    = entry;
    if (datePart === tomDate)   result.tomorrow[hour] = entry;
  }

  // Current conditions override.
  // OWM /weather is observation-based. Overwrites the current local hour in
  // today; if a forecast slot happens to land on the same hour it gets replaced.
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
  const startHour = START / 60;
  const endHour   = END   / 60;

  // hourlyData keys are local hours (set at parse time by _parseOwmData).
  // Render a stamp for every entry that is within the visible day range and,
  // on today's view, not already in the past.
  for (const [hStr, w] of Object.entries(hourlyData)) {
    const stampHour = Number(hStr);

    if (key === "today" && stampHour < nowHour)       continue;
    if (stampHour < startHour || stampHour > endHour) continue;

    const y = ((stampHour * 60 - START) / 30) * SLOT_H;

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
// Icons: see okapi-weather-icons.js
