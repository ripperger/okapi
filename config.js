// ═══════════════════════════════════════════════════════
//  OKAPI — CONFIG
//  Edit templates and palette here.
// ═══════════════════════════════════════════════════════

const OKAPI_CONFIG = {

  // ── Day bounds ────────────────────────────────────────
  dayStart: "06:00",   // first slot
  dayEnd:   "22:00",   // last slot ends here (34 × 30 min)


  // ── Weather ───────────────────────────────────────────
  weather: {
    enabled:          true,

    // OpenWeatherMap — free API key from openweathermap.org
    apiKey:           "a99aa4b33b757c99deea998a43c4deb0",

    // Location (Budapest)
    latitude:         47.4979,
    longitude:        19.0402,

    // Wind gust above this value shows km/h indicator on stamp
    windThresholdKmh: 40,

    // Opened in new tab when any weather stamp is clicked
    radarUrl: "https://www.met.hu/idojaras/aktualis_idojaras/radar/index.php",
  },


  // ── Colour palette ────────────────────────────────────
  // Used by custom activity creator and color swatches.
  // Add, remove, or rename entries freely.
  palette: [
    { name: "Blue",   color: "#4a8ff0" },	// Zenélés
    { name: "Purple", color: "#a855f7" },	// Kiengedés
    { name: "Gold",   color: "#d4b878" },	// Programok
    { name: "Green",  color: "#3a9a5c" },	// Doki
    { name: "Red",    color: "#e04040" },	// Étkezés
    { name: "Orange", color: "#f5a623" },	// Mozgás
    { name: "Cyan",   color: "#06b6d4" },	// Projektek
    { name: "Pink",   color: "#ec4899" },	// 
    { name: "Lime",   color: "#84cc16" },	// Házimunka
    { name: "Peach",  color: "#fb923c" },	// Utazás
  ],


  // ── Activity templates ────────────────────────────────
  // Reusable building blocks shown in the sheet grid.
  // Custom activities created on-the-fly are saved in
  // localStorage and merged with these at runtime.
  templates: [
    { name: "Jóga",		color: "#f5a623" },
    { name: "Séta",		color: "#f5a623" },
    { name: "Biciklizés",	color: "#f5a623" },
    { name: "Utazás",		color: "#fb923c" },
    { name: "Étkezés",    	color: "#e04040" },
    { name: "Fürdés",      	color: "#84cc16" },
    { name: "Mosogatás",      	color: "#84cc16" },
    { name: "Főzés",   		color: "#84cc16" },
    { name: "Vasalás",   	color: "#84cc16" },
    { name: "Vásárlás",      	color: "#84cc16" },
    { name: "Porszívózás",   	color: "#84cc16" },
    { name: "Felmosás",   	color: "#84cc16" },
    { name: "Olvasás",   	color: "#a855f7" },
    { name: "Reset",   		color: "#a855f7" },
    { name: "Szórakozás",   	color: "#a855f7" },
    { name: "Zeneszerzés",   	color: "#4a8ff0" },
    { name: "Zongora",   	color: "#4a8ff0" },
    { name: "Ukulele",   	color: "#4a8ff0" },
    { name: "DINGO",   		color: "#06b6d4" },
    { name: "MOMENTS",      	color: "#06b6d4" },
    { name: "ITSM",      	color: "#06b6d4" },
    { name: "Anyu",   		color: "#d4b878" },
    { name: "Impró",   		color: "#d4b878" },
    { name: "Próba",   		color: "#d4b878" },
    { name: "Sanyi",   		color: "#d4b878" },
    { name: "Joci",   		color: "#d4b878" },
    { name: "Színház",   	color: "#d4b878" },
    { name: "Doki",   		color: "#3a9a5c" },
  ],

};
