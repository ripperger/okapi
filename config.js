// ═══════════════════════════════════════════════════════
//  OKAPI — CONFIG
//  Edit templates here. This file lives on GitHub Pages
//  so changes are shared across all your devices.
// ═══════════════════════════════════════════════════════

const OKAPI_CONFIG = {

  // ── Day bounds ────────────────────────────────────────
  dayStart: "06:00",   // first slot
  dayEnd:   "22:00",   // last slot ends here (32 × 30 min)

  // ── Activity templates ────────────────────────────────
  // These are your reusable building blocks.
  // Custom activities created on-the-fly are saved in
  // localStorage and merged with these at runtime.
  templates: [
    { name: "Deep work",  color: "#4a8ff0" },
    { name: "Meeting",    color: "#a855f7" },
    { name: "Admin",      color: "#d4b878" },
    { name: "Learning",   color: "#f5a623" },
    { name: "Exercise",   color: "#e04040" },
    { name: "Break",      color: "#3a9a5c" },
    { name: "Planning",   color: "#06b6d4" },
    { name: "Personal",   color: "#fb923c" },
  ],

};
