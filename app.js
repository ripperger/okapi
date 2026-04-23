// ═══════════════════════════════════════════════════════
//  OKAPI — APP
//  Requires config.js to be loaded first.
// ═══════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────
const SLOT_H    = 44;        // px — must match --slot-h in CSS
const LS_CUSTOM = "okapi_custom_templates";

// Derive flat palette array + named list from config
const PALETTE       = OKAPI_CONFIG.palette.map(p => p.color);
const PALETTE_NAMED = OKAPI_CONFIG.palette;   // [{ name, color }, ...]

// ─────────────────────────────────────────────────────
//  Time utilities
// ─────────────────────────────────────────────────────
function parseMin(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function fmtMin(totalMin) {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const START = parseMin(OKAPI_CONFIG.dayStart);
const END   = parseMin(OKAPI_CONFIG.dayEnd);

const SLOTS = [];
for (let m = START; m < END; m += 30) SLOTS.push(fmtMin(m));

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function currentMin() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

// ─────────────────────────────────────────────────────
//  Slot value helpers
//  Slots can be: null | "Activity" (legacy) | { activity, detail }
// ─────────────────────────────────────────────────────
function slotActivity(val) {
  if (!val) return null;
  if (typeof val === "string") return val;
  return val.activity || null;
}
function slotDetail(val) {
  if (!val || typeof val === "string") return "";
  return val.detail || "";
}

// ─────────────────────────────────────────────────────
//  App state
// ─────────────────────────────────────────────────────
let viewDate        = todayStr();
let schedule        = {};           // loaded below after helpers defined
let sheetTarget     = null;
let selectedColor   = PALETTE[0];
let hasAutoScrolled = false;

// ─────────────────────────────────────────────────────
//  Storage key — depends on viewDate
// ─────────────────────────────────────────────────────
function LS_SCHED() { return `okapi_schedule_${viewDate}`; }

// ─────────────────────────────────────────────────────
//  Schedule storage
// ─────────────────────────────────────────────────────
function loadSchedule() {
  try {
    const raw = localStorage.getItem(LS_SCHED());
    if (raw) {
      const parsed = JSON.parse(raw);
      const sched = {};
      SLOTS.forEach(s => { sched[s] = (s in parsed) ? parsed[s] : null; });
      return sched;
    }
  } catch (_) {}
  const sched = {};
  SLOTS.forEach(s => { sched[s] = null; });
  return sched;
}
function saveSchedule(sched) {
  localStorage.setItem(LS_SCHED(), JSON.stringify(sched));
}

// ─────────────────────────────────────────────────────
//  Custom template storage
// ─────────────────────────────────────────────────────
function loadCustomTemplates() {
  try {
    const raw = localStorage.getItem(LS_CUSTOM);
    return raw ? JSON.parse(raw) : [];
  } catch (_) { return []; }
}
function saveCustomTemplate(name, color) {
  const customs = loadCustomTemplates();
  if (!customs.find(t => t.name === name)) {
    customs.push({ name, color });
    localStorage.setItem(LS_CUSTOM, JSON.stringify(customs));
  }
}
function allTemplates() {
  const customs   = loadCustomTemplates();
  const configSet = new Set(OKAPI_CONFIG.templates.map(t => t.name));
  return [
    ...OKAPI_CONFIG.templates,
    ...customs.filter(t => !configSet.has(t.name)),
  ];
}
function colorOf(name) {
  const t = allTemplates().find(t => t.name === name);
  return t ? t.color : "#4a6a8a";
}

// ─────────────────────────────────────────────────────
//  Grouping — merge consecutive same-activity slots
// ─────────────────────────────────────────────────────
function groupSlots(sched) {
  const groups = [];
  let i = 0;
  while (i < SLOTS.length) {
    const activity = slotActivity(sched[SLOTS[i]]);
    let j = i + 1;
    while (j < SLOTS.length && slotActivity(sched[SLOTS[j]]) === activity) j++;
    groups.push({
      slots:    SLOTS.slice(i, j),
      activity,
      detail:   slotDetail(sched[SLOTS[i]]),   // detail from first slot
      idxStart: i,
    });
    i = j;
  }
  return groups;
}

// ─────────────────────────────────────────────────────
//  Initialise schedule
// ─────────────────────────────────────────────────────
schedule = loadSchedule();

// ─────────────────────────────────────────────────────
//  Render
// ─────────────────────────────────────────────────────
function render() {
  renderHeader();
  renderTimeline();
}

function renderHeader() {
  const d       = new Date(viewDate + "T00:00:00");
  const isToday = viewDate === todayStr();

  document.getElementById("header-date").textContent =
    d.toLocaleDateString("en-GB", {
      weekday: "short", day: "numeric", month: "short",
    }).toUpperCase();

  document.getElementById("header-date").classList.toggle("is-today", isToday);

  // Dim the next arrow when on today (future scheduling still allowed; just a visual hint)
  document.getElementById("btn-next").classList.toggle("nav-at-edge", isToday);
}

function renderTimeline() {
  const blocksArea = document.getElementById("blocks-area");
  const timeLabels = document.getElementById("time-labels");
  blocksArea.innerHTML = "";
  timeLabels.innerHTML = "";

  const totalH = SLOTS.length * SLOT_H;
  blocksArea.style.height  = totalH + "px";
  timeLabels.style.height  = totalH + "px";

  // ── Time labels (every hour) + hour lines ──
  for (let m = START; m <= END; m += 60) {
    const y = ((m - START) / 30) * SLOT_H;

    const lbl = document.createElement("div");
    lbl.className   = "time-label";
    lbl.textContent = fmtMin(m);
    lbl.style.top   = y + "px";
    timeLabels.appendChild(lbl);

    if (m < END) {
      const line = document.createElement("div");
      line.className = "hour-line";
      line.style.top = y + "px";
      blocksArea.appendChild(line);
    }
  }

  // ── Half-hour lines ──
  for (let idx = 0; idx < SLOTS.length; idx++) {
    const slotM = START + idx * 30;
    if (slotM % 60 === 0) continue;
    const line = document.createElement("div");
    line.className = "half-line";
    line.style.top = (idx * SLOT_H) + "px";
    blocksArea.appendChild(line);
  }

  // ── Activity blocks ──
  const groups = groupSlots(schedule);

  groups.forEach(group => {
    const y = group.idxStart * SLOT_H;
    const h = group.slots.length * SLOT_H;

    if (group.activity) {
      const color = colorOf(group.activity);
      const sm    = START + group.idxStart * 30;
      const em    = sm + group.slots.length * 30;
      const dur   = group.slots.length * 30;

      const el = document.createElement("div");
      el.className = "block assigned";
      el.style.cssText = `top:${y + 1}px;height:${h - 1}px;border-left-color:${color}`;
      el.innerHTML = `
        <span class="block-name" style="color:${color}">${group.activity}${group.detail ? `<span class="block-detail"> · ${group.detail}</span>` : ""}</span>
        <span class="block-time">${fmtMin(sm)} – ${fmtMin(em)}${dur > 30 ? ` · ${dur}m` : ""}</span>
      `;
      el.addEventListener("click", () => openSheet(group.slots, true));
      blocksArea.appendChild(el);
    } else {
      group.slots.forEach((slot, i) => {
        const idx = group.idxStart + i;
        const el  = document.createElement("div");
        el.className = "block empty";
        el.style.cssText = `top:${idx * SLOT_H}px;height:${SLOT_H}px`;
        el.addEventListener("click", () => openSheet([slot], false));
        blocksArea.appendChild(el);
      });
    }
  });

  renderTimeIndicator();
}

function renderTimeIndicator() {
  if (viewDate !== todayStr()) return;   // only show indicator on today

  const blocksArea = document.getElementById("blocks-area");
  const nm = currentMin();
  if (nm < START || nm > END) return;

  const y   = ((nm - START) / 30) * SLOT_H;
  const ind = document.createElement("div");
  ind.id        = "time-ind";
  ind.style.top = y + "px";
  blocksArea.appendChild(ind);

  if (!hasAutoScrolled) {
    hasAutoScrolled = true;
    requestAnimationFrame(() => {
      const wrap     = document.getElementById("timeline-wrap");
      const scrollTo = Math.max(0, y - wrap.clientHeight * 0.35);
      wrap.scrollTop = scrollTo;
    });
  }
}

// Refresh time indicator every minute
setInterval(() => {
  const old = document.getElementById("time-ind");
  if (old) old.remove();
  renderTimeIndicator();
}, 60_000);

// ─────────────────────────────────────────────────────
//  Day navigation
// ─────────────────────────────────────────────────────
function navigate(delta) {
  const d = new Date(viewDate + "T00:00:00");
  d.setDate(d.getDate() + delta);
  viewDate        = d.toISOString().slice(0, 10);
  schedule        = loadSchedule();
  hasAutoScrolled = false;
  render();
}

document.getElementById("btn-prev").addEventListener("click", () => navigate(-1));
document.getElementById("btn-next").addEventListener("click", () => navigate(+1));

// ─────────────────────────────────────────────────────
//  Bottom sheet
// ─────────────────────────────────────────────────────
function openSheet(slots, isAssigned) {
  sheetTarget   = { slots, isAssigned };
  selectedColor = PALETTE[0];

  const sm          = START + SLOTS.indexOf(slots[0]) * 30;
  const em          = sm + slots.length * 30;
  const rawVal      = isAssigned ? schedule[slots[0]] : null;
  const act         = slotActivity(rawVal);
  const existDetail = slotDetail(rawVal);

  document.getElementById("sheet-title").textContent =
    act ? `${act}  ·  ${fmtMin(sm)} – ${fmtMin(em)}` : `${fmtMin(sm)} – ${fmtMin(em)}`;

  // Pre-fill detail input with existing note
  document.getElementById("sheet-detail").value = existDetail;

  // ── Build options ──
  const opts = document.getElementById("sheet-options");
  opts.innerHTML = "";

  if (isAssigned) {
    const clearBtn = document.createElement("button");
    clearBtn.className   = "sheet-opt clear";
    clearBtn.textContent = "✕  clear block";
    clearBtn.addEventListener("click", () => {
      slots.forEach(s => { schedule[s] = null; });
      saveSchedule(schedule);
      closeSheet();
      render();
    });
    opts.appendChild(clearBtn);
  }

  // 3-column grid of templates
  const grid = document.createElement("div");
  grid.className = "sheet-grid";

  allTemplates().forEach(tmpl => {
    const btn = document.createElement("button");
    btn.className = "sheet-opt template" + (act === tmpl.name ? " active" : "");
    btn.style.setProperty("--tmpl-color", tmpl.color);
    btn.style.borderLeftColor = tmpl.color;
    btn.style.color           = tmpl.color;
    btn.textContent           = tmpl.name;
    btn.title                 = tmpl.name;
    btn.addEventListener("click", () => {
      const detail = document.getElementById("sheet-detail").value.trim();
      slots.forEach(s => { schedule[s] = { activity: tmpl.name, detail }; });
      saveSchedule(schedule);
      closeSheet();
      render();
    });
    grid.appendChild(btn);
  });

  opts.appendChild(grid);

  // Reset new-activity fields
  document.getElementById("new-name").value = "";
  renderColorSwatches();

  document.getElementById("sheet").classList.add("open");
  document.getElementById("backdrop").classList.add("open");
}

function closeSheet() {
  document.getElementById("sheet").classList.remove("open");
  document.getElementById("backdrop").classList.remove("open");
  sheetTarget = null;
}

function renderColorSwatches() {
  const row = document.getElementById("color-swatches");
  row.innerHTML = "";
  PALETTE_NAMED.forEach(({ name, color }) => {
    const sw = document.createElement("div");
    sw.className = "color-swatch" + (color === selectedColor ? " selected" : "");
    sw.style.background = color;
    sw.title            = name;
    sw.addEventListener("click", () => {
      selectedColor = color;
      renderColorSwatches();
    });
    row.appendChild(sw);
  });
}

// ── Add custom activity ──
document.getElementById("add-custom-btn").addEventListener("click", () => {
  const name = document.getElementById("new-name").value.trim();
  if (!name || !sheetTarget) return;
  const detail = document.getElementById("sheet-detail").value.trim();

  saveCustomTemplate(name, selectedColor);
  sheetTarget.slots.forEach(s => { schedule[s] = { activity: name, detail }; });
  saveSchedule(schedule);
  closeSheet();
  render();
});

document.getElementById("new-name").addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("add-custom-btn").click();
});

// Close on backdrop tap
document.getElementById("backdrop").addEventListener("click", closeSheet);

// ─────────────────────────────────────────────────────
//  Push +30
// ─────────────────────────────────────────────────────
document.getElementById("btn-push").addEventListener("click", () => {
  const nm = currentMin();

  let currentIdx = -1;
  for (let i = 0; i < SLOTS.length; i++) {
    const slotStart = START + i * 30;
    if (nm >= slotStart && nm < slotStart + 30) { currentIdx = i; break; }
  }
  if (currentIdx < 0 && nm < START) currentIdx = 0;
  if (currentIdx < 0) return;

  const sched = { ...schedule };
  for (let i = SLOTS.length - 1; i > currentIdx; i--) {
    sched[SLOTS[i]] = sched[SLOTS[i - 1]];
  }
  sched[SLOTS[currentIdx]] = null;

  schedule = sched;
  saveSchedule(sched);
  render();
});

// ─────────────────────────────────────────────────────
//  Export
// ─────────────────────────────────────────────────────
function triggerDownload(filename, content, mimeType) {
  const a    = document.createElement("a");
  a.href     = URL.createObjectURL(new Blob([content], { type: mimeType }));
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

document.getElementById("btn-json").addEventListener("click", () => {
  const data = {
    date:        viewDate,
    generatedAt: new Date().toISOString(),
    slots: Object.fromEntries(SLOTS.map(s => [s, schedule[s]])),
    blocks: groupSlots(schedule)
      .filter(g => g.activity)
      .map(g => ({
        start:    fmtMin(START + g.idxStart * 30),
        end:      fmtMin(START + g.idxStart * 30 + g.slots.length * 30),
        duration: g.slots.length * 30,
        activity: g.activity,
        detail:   g.detail,
        color:    colorOf(g.activity),
      })),
  };
  triggerDownload(`okapi-${viewDate}.json`, JSON.stringify(data, null, 2), "application/json");
});

document.getElementById("btn-csv").addEventListener("click", () => {
  const rows = [
    "time,end,activity,detail,duration_min",
    ...SLOTS.map((s, i) => {
      const sm  = START + i * 30;
      const em  = sm + 30;
      const act = slotActivity(schedule[s]) || "";
      const det = slotDetail(schedule[s]);
      return `${fmtMin(sm)},${fmtMin(em)},"${act}","${det}",${act ? 30 : ""}`;
    }),
  ];
  triggerDownload(`okapi-${viewDate}.csv`, rows.join("\n"), "text/csv");
});

// ─────────────────────────────────────────────────────
//  Init
// ─────────────────────────────────────────────────────
render();
