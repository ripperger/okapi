// ═══════════════════════════════════════════════════════
//  OKAPI — CONFIG
//  Edit templates and palette here.
// ═══════════════════════════════════════════════════════

const OKAPI_CONFIG = {

  // ── Day bounds ────────────────────────────────────────
  dayStart: "07:00",   // first slot
  dayEnd:   "23:00",   // last slot ends here (32 × 30 min)


  // ── Weather ───────────────────────────────────────────
  weather: {
    enabled:          true,

    // Open-Meteo location (Budapest)
    latitude:         47.4979,
    longitude:        19.0402,
    timezone:         "Europe/Budapest",

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
    { name: "Purple", color: "#a855f7" },	// Olvasás
    { name: "Gold",   color: "#d4b878" },	// Fixált programok
    { name: "Green",  color: "#3a9a5c" },	// Házimunka
    { name: "Red",    color: "#e04040" },	// Étkezés
    { name: "Orange", color: "#f5a623" },	// Mozgás
    { name: "Cyan",   color: "#06b6d4" },	// Projektek
    { name: "Pink",   color: "#ec4899" },	// Szórakozás
    { name: "Lime",   color: "#84cc16" },	// 
    { name: "Peach",  color: "#fb923c" },	// 
  ],


  // ── Activity templates ────────────────────────────────
  // Reusable building blocks shown in the sheet grid.
  // Custom activities created on-the-fly are saved in
  // localStorage and merged with these at runtime.
  templates: [
    { name: "Jóga",		color: "#f5a623" },
    { name: "Séta",		color: "#f5a623" },
    { name: "Biciklizés",	color: "#f5a623" },
    { name: "Étkezés",    	color: "#e04040" },
    { name: "Olvasás",   	color: "#a855f7" },
    { name: "Fürdés",      	color: "#3a9a5c" },
    { name: "Mosogatás",      	color: "#3a9a5c" },
    { name: "Főzés",   		color: "#3a9a5c" },
    { name: "Vasalás",   	color: "#3a9a5c" },
    { name: "Zeneszerzés",   	color: "#4a8ff0" },
    { name: "Zongora",   	color: "#4a8ff0" },
    { name: "Ukulele",   	color: "#4a8ff0" },
    { name: "DINGO",   		color: "#06b6d4" },
    { name: "MOMENTS",      	color: "#06b6d4" },
    { name: "ITSM",      	color: "#06b6d4" },
    { name: "Anyu",   		color: "#d4b878" },
    { name: "Impró",   		color: "#d4b878" },
    { name: "Próba",   		color: "#d4b878" },
    { name: "Szórakozás",   	color: "#ec4899" },
    { name: "Sanyipinyó",   	color: "#ec4899" },
    { name: "Joci",   		color: "#ec4899" },
  ],

};
