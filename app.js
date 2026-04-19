// ═══════════════════════════════════════════════════════
//  OKAPI — APP
//  Daily scheduler. Requires config.js to be loaded first.
// ═══════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────
const SLOT_H   = 44;       // px — must match --slot-h in CSS
const LS_SCHED = () => `okapi_schedule_${todayStr()}`;
const LS_CUSTOM = "okapi_custom_templates";

const PALETTE = [
  "#4a8ff0", "#a855f7", "#d4b878", "#3a9a5c",
  "#e04040", "#f5a623", "#06b6d4", "#ec4899",
  "#84cc16", "#fb923c",
];

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

// Generate slot keys: ["06:00", "06:30", ..., "21:30"]
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
//  Schedule storage
// ─────────────────────────────────────────────────────
function loadSchedule() {
  try {
    const raw = localStorage.getItem(LS_SCHED());
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure every slot exists (guards against day-range changes)
      const sched = {};
      SLOTS.forEach(s => { sched[s] = (s in parsed) ? parsed[s] : null; });
      return sched;
    }
  } catch (_) {}
  // Fresh day
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
    const activity = sched[SLOTS[i]];
    let j = i + 1;
    while (j < SLOTS.length && sched[SLOTS[j]] === activity) j++;
    groups.push({
      slots:    SLOTS.slice(i, j),
      activity,
      idxStart: i,
    });
    i = j;
  }
  return groups;
}

// ─────────────────────────────────────────────────────
//  App state
// ─────────────────────────────────────────────────────
let schedule       = loadSchedule();
let sheetTarget    = null;   // { slots: [...], isAssigned: bool }
let selectedColor  = PALETTE[0];
let hasAutoScrolled = false;

// ─────────────────────────────────────────────────────
//  Render
// ─────────────────────────────────────────────────────
function render() {
  renderHeader();
  renderTimeline();
}

function renderHeader() {
  const d = new Date();
  document.getElementById("header-date").textContent =
    d.toLocaleDateString("en-GB", {
      weekday: "short", day: "numeric", month: "short",
    }).toUpperCase();
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
    if (slotM % 60 === 0) continue; // already drawn as hour-line
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
        <span class="block-name" style="color:${color}">${group.activity}</span>
        <span class="block-time">${fmtMin(sm)} – ${fmtMin(em)}${dur > 30 ? ` · ${dur}m` : ""}</span>
      `;
      el.addEventListener("click", () => openSheet(group.slots, true));
      blocksArea.appendChild(el);
    } else {
      // Each empty slot is individually tappable
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

  // ── Current time indicator ──
  renderTimeIndicator();
}

function renderTimeIndicator() {
  const blocksArea = document.getElementById("blocks-area");
  const nm = currentMin();

  if (nm < START || nm > END) return;

  const y   = ((nm - START) / 30) * SLOT_H;
  const ind = document.createElement("div");
  ind.id         = "time-ind";
  ind.style.top  = y + "px";
  blocksArea.appendChild(ind);

  // Auto-scroll to current time on first render
  if (!hasAutoScrolled) {
    hasAutoScrolled = true;
    requestAnimationFrame(() => {
      const wrap     = document.getElementById("timeline-wrap");
      const scrollTo = Math.max(0, y - wrap.clientHeight * 0.35);
      wrap.scrollTop = scrollTo;
    });
  }
}

// Update only the time indicator every minute
setInterval(() => {
  const old = document.getElementById("time-ind");
  if (old) old.remove();
  renderTimeIndicator();
}, 60_000);

// ─────────────────────────────────────────────────────
//  Bottom sheet
// ─────────────────────────────────────────────────────
function openSheet(slots, isAssigned) {
  sheetTarget   = { slots, isAssigned };
  selectedColor = PALETTE[0];

  const sm  = START + SLOTS.indexOf(slots[0]) * 30;
  const em  = sm + slots.length * 30;
  const act = isAssigned ? schedule[slots[0]] : null;

  document.getElementById("sheet-title").textContent =
    act
      ? `${act}  ·  ${fmtMin(sm)} – ${fmtMin(em)}`
      : `${fmtMin(sm)} – ${fmtMin(em)}`;

  // ── Options ──
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

  allTemplates().forEach(tmpl => {
    const btn = document.createElement("button");
    btn.className = "sheet-opt template" + (act === tmpl.name ? " active" : "");
    btn.style.borderLeftColor = tmpl.color;
    btn.style.color           = tmpl.color;
    btn.textContent           = tmpl.name;
    btn.addEventListener("click", () => {
      slots.forEach(s => { schedule[s] = tmpl.name; });
      saveSchedule(schedule);
      closeSheet();
      render();
    });
    opts.appendChild(btn);
  });

  // Reset new-activity input
  document.getElementById("new-name").value = "";
  renderColorSwatches();

  document.getElementById("sheet").classList.add("open");
  document.getElementById("backdrop").classList.add("open");

  // Focus input after transition (desktop)
  setTimeout(() => {
    if (window.matchMedia("(hover: hover)").matches) {
      // Only auto-focus on non-touch devices to avoid keyboard popping up on mobile
    }
  }, 320);
}

function closeSheet() {
  document.getElementById("sheet").classList.remove("open");
  document.getElementById("backdrop").classList.remove("open");
  sheetTarget = null;
}

function renderColorSwatches() {
  const row = document.getElementById("color-swatches");
  row.innerHTML = "";
  PALETTE.forEach(color => {
    const sw = document.createElement("div");
    sw.className = "color-swatch" + (color === selectedColor ? " selected" : "");
    sw.style.background = color;
    sw.title = color;
    sw.addEventListener("click", () => {
      selectedColor = color;
      renderColorSwatches();
    });
    row.appendChild(sw);
  });
}

// Add custom activity
document.getElementById("add-custom-btn").addEventListener("click", () => {
  const name = document.getElementById("new-name").value.trim();
  if (!name || !sheetTarget) return;

  saveCustomTemplate(name, selectedColor);
  sheetTarget.slots.forEach(s => { schedule[s] = name; });
  saveSchedule(schedule);
  closeSheet();
  render();
});

// Enter key in name input
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

  // Find the index of the slot currently containing 'now'
  // (the slot whose window [slotStart, slotStart+30) includes nm)
  let currentIdx = -1;
  for (let i = 0; i < SLOTS.length; i++) {
    const slotStart = START + i * 30;
    if (nm >= slotStart && nm < slotStart + 30) {
      currentIdx = i;
      break;
    }
  }

  // If before start, push from slot 0; if after end, do nothing
  if (currentIdx < 0 && nm < START) currentIdx = 0;
  if (currentIdx < 0) return;

  // Shift everything from currentIdx onward by +1 slot
  // Read from end to avoid overwriting before copying
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
  const date = todayStr();
  const data = {
    date,
    generatedAt: new Date().toISOString(),
    slots: Object.fromEntries(
      SLOTS.map(s => [s, schedule[s]])
    ),
    blocks: groupSlots(schedule)
      .filter(g => g.activity)
      .map(g => ({
        start:    fmtMin(START + g.idxStart * 30),
        end:      fmtMin(START + g.idxStart * 30 + g.slots.length * 30),
        duration: g.slots.length * 30,
        activity: g.activity,
        color:    colorOf(g.activity),
      })),
  };
  triggerDownload(`okapi-${date}.json`, JSON.stringify(data, null, 2), "application/json");
});

document.getElementById("btn-csv").addEventListener("click", () => {
  const date = todayStr();
  const rows = [
    "time,end,activity,duration_min",
    ...SLOTS.map((s, i) => {
      const sm  = START + i * 30;
      const em  = sm + 30;
      const act = schedule[s] || "";
      return `${fmtMin(sm)},${fmtMin(em)},${act},${act ? 30 : ""}`;
    }),
  ];
  triggerDownload(`okapi-${date}.csv`, rows.join("\n"), "text/csv");
});

// ─────────────────────────────────────────────────────
//  Init
// ─────────────────────────────────────────────────────
render();
