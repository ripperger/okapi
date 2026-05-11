// ═══════════════════════════════════════════════════════
//  OKAPI — WEATHER ICONS
//  OWM code → SVG lookup.
//  Called exclusively by okapi-weather.js.
// ═══════════════════════════════════════════════════════

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
