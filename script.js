/* ==========================================================================
   Palette Forge
   Advanced color palette generator — color science, harmony modes,
   live UI preview, contrast checking, code export, and local persistence.
   No dependencies.
   ========================================================================== */

(() => {
  "use strict";

  /* ------------------------------------------------------------------ *
   *  Color math
   * ------------------------------------------------------------------ */

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = clamp(s, 0, 100) / 100;
    l = clamp(l, 0, 100) / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60)       { r = c; g = x; b = 0; }
    else if (h < 120)  { r = x; g = c; b = 0; }
    else if (h < 180)  { r = 0; g = c; b = x; }
    else if (h < 240)  { r = 0; g = x; b = c; }
    else if (h < 300)  { r = x; g = 0; b = c; }
    else               { r = c; g = 0; b = x; }
    const toHex = (v) => {
      const n = Math.round((v + m) * 255);
      return clamp(n, 0, 255).toString(16).padStart(2, "0");
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  }

  function hexToRgb(hex) {
    const clean = hex.replace("#", "");
    const bigint = parseInt(clean, 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255,
    };
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s;
    const l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        default: h = (r - g) / d + 4;
      }
      h *= 60;
    }
    return { h, s: s * 100, l: l * 100 };
  }

  function hexToHsl(hex) {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHsl(r, g, b);
  }

  // WCAG relative luminance
  function relativeLuminance(hex) {
    const { r, g, b } = hexToRgb(hex);
    const channel = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  }

  function contrastRatio(hexA, hexB) {
    const lA = relativeLuminance(hexA) + 0.05;
    const lB = relativeLuminance(hexB) + 0.05;
    return lA > lB ? lA / lB : lB / lA;
  }

  // Pick readable foreground (black/white) for a given background
  function idealTextColor(hex) {
    return contrastRatio(hex, "#FFFFFF") >= contrastRatio(hex, "#000000") ? "#FFFFFF" : "#0E0F13";
  }

  function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  /* ------------------------------------------------------------------ *
   *  Named color lookup (approximate nearest match)
   * ------------------------------------------------------------------ */

  const NAMED_COLORS = [
    ["Coal","#1B1B1E"],["Charcoal","#36454F"],["Slate","#708090"],["Graphite","#3A3B3C"],
    ["Ink","#0B0C10"],["Onyx","#0F0F0F"],["Smoke","#848884"],["Ash","#B2BEB5"],
    ["Cloud","#DDE3EA"],["Fog","#EDEDED"],["Snow","#FFFAFA"],["Ivory","#FFFFF0"],
    ["Bone","#E3DAC9"],["Sand","#C2B280"],["Wheat","#F5DEB3"],["Khaki","#C3B091"],
    ["Olive","#808000"],["Moss","#8A9A5B"],["Fern","#4F7942"],["Forest","#228B22"],
    ["Emerald","#50C878"],["Jade","#00A86B"],["Mint","#3EB489"],["Seafoam","#93E9BE"],
    ["Teal","#008080"],["Cyan","#00CFFF"],["Turquoise","#40E0D0"],["Aqua","#7FFFD4"],
    ["Sky","#87CEEB"],["Cerulean","#007BA7"],["Cobalt","#0047AB"],["Sapphire","#0F52BA"],
    ["Navy","#000080"],["Indigo","#4B0082"],["Denim","#1560BD"],["Periwinkle","#CCCCFF"],
    ["Lavender","#B57EDC"],["Violet","#8F00FF"],["Amethyst","#9966CC"],["Plum","#8E4585"],
    ["Orchid","#DA70D6"],["Magenta","#FF00FF"],["Fuchsia","#C154C1"],["Mauve","#E0B0FF"],
    ["Rose","#FF007F"],["Blush","#DE5D83"],["Crimson","#DC143C"],["Ruby","#E0115F"],
    ["Scarlet","#FF2400"],["Vermilion","#E34234"],["Coral","#FF7F50"],["Salmon","#FA8072"],
    ["Terracotta","#E2725B"],["Rust","#B7410E"],["Sienna","#A0522D"],["Umber","#635147"],
    ["Brick","#CB4154"],["Clay","#B66A50"],["Mahogany","#4A0000"],["Maroon","#800000"],
    ["Wine","#722F37"],["Burgundy","#800020"],["Amber","#FFBF00"],["Honey","#EBA937"],
    ["Gold","#D4AF37"],["Mustard","#FFDB58"],["Marigold","#EAA221"],["Saffron","#F4C430"],
    ["Butter","#FFF275"],["Lemon","#FFF44F"],["Citrine","#E4D00A"],["Chartreuse","#DFFF00"],
    ["Lime","#BFFF00"],["Pistachio","#93C572"],["Sage","#9CAF88"],["Basil","#4E6E5D"],
    ["Peach","#FFE5B4"],["Apricot","#FBCEB1"],["Tangerine","#F28500"],["Papaya","#FFEFD5"],
    ["Blossom","#F9C0C4"],["Cotton Candy","#FFBCD9"],["Bubblegum","#FFC1CC"],["Flamingo","#FC8EAC"],
    ["Cherry","#D2042D"],["Merlot","#732E42"],["Espresso","#4B3621"],["Cocoa","#6B4226"],
    ["Taupe","#483C32"],["Fawn","#E5AA70"],["Camel","#C19A6B"],["Latte","#D2B48C"],
    ["Cream","#FFFDD0"],["Pearl","#EAE0C8"],["Silver","#C0C0C0"],["Platinum","#E5E4E2"],
    ["Steel","#71797E"],["Gunmetal","#2A3439"],["Midnight","#191970"],["Void","#0A0A0F"],
  ];

  function nearestColorName(hex) {
    const { r, g, b } = hexToRgb(hex);
    let best = NAMED_COLORS[0], bestDist = Infinity;
    for (const [name, swatchHex] of NAMED_COLORS) {
      const c = hexToRgb(swatchHex);
      const dist = (r - c.r) ** 2 + (g - c.g) ** 2 + (b - c.b) ** 2;
      if (dist < bestDist) { bestDist = dist; best = [name, swatchHex]; }
    }
    return best[0];
  }

  /* ------------------------------------------------------------------ *
   *  Harmony generation
   * ------------------------------------------------------------------ */

  const MODES = [
    { id: "random", label: "Random" },
    { id: "analogous", label: "Analogous" },
    { id: "monochromatic", label: "Monochromatic" },
    { id: "complementary", label: "Complementary" },
    { id: "triadic", label: "Triadic" },
  ];

  function generateHue(mode, baseHue, index, count) {
    const mid = (count - 1) / 2;
    switch (mode) {
      case "analogous":
        return baseHue + (index - mid) * 18;
      case "monochromatic":
        return baseHue;
      case "complementary":
        return index % 2 === 0 ? baseHue : baseHue + 180;
      case "triadic": {
        const step = index % 3;
        return baseHue + step * 120;
      }
      default: // random
        return randomInt(0, 359);
    }
  }

  function generateColorAt(mode, baseHue, index, count) {
    const hue = generateHue(mode, baseHue, index, count);
    let sat, light;
    if (mode === "monochromatic") {
      sat = randomInt(45, 75);
      light = clamp(20 + (index / Math.max(count - 1, 1)) * 60, 12, 88);
    } else if (mode === "random") {
      sat = randomInt(50, 88);
      light = randomInt(32, 70);
    } else {
      sat = randomInt(55, 82);
      light = randomInt(38, 66);
      // slight per-index jitter so a palette doesn't look too uniform
      light += randomInt(-6, 6);
      light = clamp(light, 20, 82);
    }
    return hslToHex(hue, sat, light);
  }

  function generatePalette(mode, count, current, locked) {
    // pick a base hue: reuse hue of first locked color if present, else random
    let baseHue = randomInt(0, 359);
    const lockedIdx = locked.findIndex((v) => v);
    if (lockedIdx !== -1 && current[lockedIdx]) {
      baseHue = hexToHsl(current[lockedIdx]).h;
    }
    const result = [];
    for (let i = 0; i < count; i++) {
      if (locked[i] && current[i]) {
        result.push(current[i]);
      } else {
        result.push(generateColorAt(mode, baseHue, i, count));
      }
    }
    return result;
  }

  /* ------------------------------------------------------------------ *
   *  Application state
   * ------------------------------------------------------------------ */

  const state = {
    mode: "random",
    count: 5,
    colors: [],
    locked: [],
    selected: 0,
    history: [],
    future: [],
    exportFormat: "css",
  };

  let draggingIndex = null;

  function snapshot() {
    return { colors: [...state.colors], locked: [...state.locked] };
  }

  function pushHistory() {
    state.history.push(snapshot());
    if (state.history.length > 50) state.history.shift();
    state.future = [];
  }

  /* ------------------------------------------------------------------ *
   *  DOM refs
   * ------------------------------------------------------------------ */

  const $ = (sel) => document.querySelector(sel);
  const paletteStrip = $("#paletteStrip");
  const modeSelect = $("#modeSelect");
  const countValue = $("#countValue");
  const generateBtn = $("#generateBtn");
  const undoBtn = $("#undoBtn");
  const redoBtn = $("#redoBtn");
  const saveBtn = $("#saveBtn");
  const previewCard = $("#previewCard");
  const inspectorName = $("#inspectorName");
  const shadeRamp = $("#shadeRamp");
  const contrastBlock = $("#contrastBlock");
  const exportTabs = $("#exportTabs");
  const exportCode = $("#exportCode");
  const copyExportBtn = $("#copyExportBtn");
  const savedList = $("#savedList");
  const savedSub = $("#savedSub");
  const toastEl = $("#toast");

  /* ------------------------------------------------------------------ *
   *  Toast
   * ------------------------------------------------------------------ */

  let toastTimer = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1800);
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) { /* noop */ }
    document.body.removeChild(ta);
  }

  /* ------------------------------------------------------------------ *
   *  Rendering: mode pills
   * ------------------------------------------------------------------ */

  function renderModePills() {
    modeSelect.innerHTML = "";
    MODES.forEach((m) => {
      const btn = document.createElement("button");
      btn.className = "mode-pill" + (state.mode === m.id ? " active" : "");
      btn.textContent = m.label;
      btn.addEventListener("click", () => {
        state.mode = m.id;
        renderModePills();
        shuffle();
      });
      modeSelect.appendChild(btn);
    });
  }

  /* ------------------------------------------------------------------ *
   *  Rendering: palette strip
   * ------------------------------------------------------------------ */

  function renderSwatches() {
    paletteStrip.innerHTML = "";
    state.colors.forEach((hex, i) => {
      const fg = idealTextColor(hex);
      const el = document.createElement("div");
      el.className = "swatch" + (state.selected === i ? " selected" : "");
      el.style.background = hex;
      el.style.color = fg;
      el.tabIndex = 0;
      el.draggable = true;
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", `Color ${i + 1}, ${hex}. Click to inspect, click the hex code to copy, drag to reorder.`);

      el.innerHTML = `
        <span class="swatch-position">${i + 1}</span>
        <span class="swatch-lock ${state.locked[i] ? "locked" : ""}" data-lock="${i}" title="${state.locked[i] ? "Unlock" : "Lock"} this color">${state.locked[i] ? "🔒" : "🔓"}</span>
        <span class="swatch-copied" id="copied-${i}">Copied</span>
        <span class="swatch-name">${nearestColorName(hex)}</span>
        <span class="swatch-hex" data-copy="${i}" title="Copy ${hex}">${hex}</span>
      `;

      el.addEventListener("click", (e) => {
        if (e.target.closest(".swatch-lock")) return;
        if (e.target.closest(".swatch-hex")) {
          copyToClipboard(hex);
          flashCopied(i);
          return;
        }
        state.selected = i;
        renderSwatches();
        renderInspector();
      });

      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          el.click();
        }
      });

      const lockEl = el.querySelector(".swatch-lock");
      lockEl.draggable = false;
      lockEl.addEventListener("click", (e) => {
        e.stopPropagation();
        state.locked[i] = !state.locked[i];
        renderSwatches();
      });

      el.addEventListener("dragstart", (e) => {
        draggingIndex = i;
        el.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(i));
      });
      el.addEventListener("dragend", () => {
        el.classList.remove("dragging");
      });
      el.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        el.classList.add("drag-over");
      });
      el.addEventListener("dragleave", () => {
        el.classList.remove("drag-over");
      });
      el.addEventListener("drop", (e) => {
        e.preventDefault();
        el.classList.remove("drag-over");
        const from = draggingIndex;
        const to = i;
        draggingIndex = null;
        if (from === null || from === to) return;
        pushHistory();
        const [movedColor] = state.colors.splice(from, 1);
        const [movedLock] = state.locked.splice(from, 1);
        state.colors.splice(to, 0, movedColor);
        state.locked.splice(to, 0, movedLock);
        state.selected = to;
        renderAll();
      });

      paletteStrip.appendChild(el);
    });
  }

  function flashCopied(i) {
    const el = document.getElementById(`copied-${i}`);
    if (!el) return;
    el.classList.add("show");
    showToast(`Copied ${state.colors[i]}`);
    setTimeout(() => el.classList.remove("show"), 900);
  }

  /* ------------------------------------------------------------------ *
   *  Rendering: live UI preview
   * ------------------------------------------------------------------ */

  function renderPreview() {
    const c = state.colors;
    const at = (i) => c[i % c.length];

    const bg = at(1);
    const topbar = at(0);
    const btnBg = at(3);
    const accentDot = at(4);
    const cardBg = shade(at(1), -8);
    const border = shade(at(1), -18);

    previewCard.style.background = bg;
    previewCard.innerHTML = `
      <div class="mock-topbar" style="background:${topbar};color:${idealTextColor(topbar)}">
        <span class="mock-brand">Nova</span>
        <span class="mock-nav"><span>Product</span><span>Pricing</span><span>Docs</span></span>
      </div>
      <div class="mock-body" style="background:${bg};color:${idealTextColor(bg)}">
        <p class="mock-eyebrow" style="color:${at(2)}">Now in beta</p>
        <h3 class="mock-heading">Design with your own palette</h3>
        <p class="mock-copy">This card re-skins itself with every shuffle, so you can judge a
          palette by how it behaves on real UI — not just as flat swatches.</p>
        <div class="mock-row">
          <button class="mock-btn" style="background:${btnBg};color:${idealTextColor(btnBg)}">Get started</button>
          <button class="mock-btn-outline" style="border-color:${at(2)};color:${idealTextColor(bg)}">Learn more</button>
        </div>
        <div class="mock-card" style="background:${cardBg};border-color:${border}">
          <span class="mock-dot" style="background:${accentDot}"></span>
          <span class="mock-card-text" style="color:${idealTextColor(cardBg)}">
            <strong>Accent in context</strong>
            Badges, avatars, and highlights inherit color ${state.colors.length >= 5 ? "5" : c.length}.
          </span>
        </div>
      </div>
    `;
  }

  function shade(hex, amount) {
    const { h, s, l } = hexToHsl(hex);
    return hslToHex(h, s, clamp(l + amount, 4, 96));
  }

  /* ------------------------------------------------------------------ *
   *  Rendering: inspector (shade ramp + contrast)
   * ------------------------------------------------------------------ */

  const RAMP_STEPS = [
    { label: "50", light: 95 }, { label: "100", light: 88 }, { label: "200", light: 78 },
    { label: "300", light: 66 }, { label: "400", light: 55 }, { label: "500", light: 46 },
    { label: "600", light: 37 }, { label: "700", light: 28 }, { label: "800", light: 19 },
    { label: "900", light: 11 },
  ];

  function applyShadeToSelected(hex) {
    const i = state.selected;
    if (i == null || !state.colors[i]) return;
    if (state.colors[i] === hex) return; // no-op, avoid empty history entries
    pushHistory();
    state.colors[i] = hex;
    renderAll();
    showToast(`Applied ${hex} to swatch ${i + 1}`);
  }

  function renderInspector() {
    const hex = state.colors[state.selected] || state.colors[0];
    if (!hex) return;
    inspectorName.textContent = `— ${nearestColorName(hex)} (${hex})`;

    const { h, s } = hexToHsl(hex);
    shadeRamp.innerHTML = "";
    RAMP_STEPS.forEach((step) => {
      const stepHex = hslToHex(h, clamp(s, 12, 92), step.light);
      const fg = idealTextColor(stepHex);
      const el = document.createElement("div");
      el.className = "shade-step";
      el.style.background = stepHex;
      el.style.color = fg;
      el.innerHTML = `<span>${step.label}</span>`;
      el.title = `Apply ${stepHex} to swatch ${state.selected + 1}`;
      el.addEventListener("click", () => {
        applyShadeToSelected(stepHex);
      });
      shadeRamp.appendChild(el);
    });

    const pairs = [
      { label: "On white", bg: "#FFFFFF", fg: hex, chipBg: hex },
      { label: "On black", bg: "#0E0F13", fg: hex, chipBg: hex },
      { label: "White on this", bg: hex, fg: "#FFFFFF", chipBg: hex },
      { label: "Black on this", bg: hex, fg: "#0E0F13", chipBg: hex },
    ];

    contrastBlock.innerHTML = "";
    pairs.forEach((p) => {
      const ratio = p.label.startsWith("On")
        ? contrastRatio(p.bg, p.fg)
        : contrastRatio(p.bg, p.fg);
      const aa = ratio >= 4.5;
      const aaa = ratio >= 7;
      const row = document.createElement("div");
      row.className = "contrast-row";
      row.innerHTML = `
        <span class="contrast-label">
          <span class="contrast-chip" style="background:${p.bg};color:${p.fg}">Aa</span>
          ${p.label}
        </span>
        <span>
          <span class="contrast-ratio">${ratio.toFixed(2)}:1</span>
          <span class="badge ${aa ? "badge-pass" : "badge-fail"}">${aa ? "AA" : "FAIL"}</span>
          <span class="badge ${aaa ? "badge-pass" : "badge-fail"}">${aaa ? "AAA" : "—"}</span>
        </span>
      `;
      contrastBlock.appendChild(row);
    });
  }

  /* ------------------------------------------------------------------ *
   *  Export
   * ------------------------------------------------------------------ */

  const EXPORT_FORMATS = [
    { id: "css", label: "CSS Variables" },
    { id: "scss", label: "SCSS" },
    { id: "tailwind", label: "Tailwind Config" },
    { id: "json", label: "JSON" },
    { id: "svg", label: "SVG" },
  ];

  function slug(name) { return name.toLowerCase().replace(/\s+/g, "-"); }

  function buildExport(format) {
    const colors = state.colors;
    switch (format) {
      case "css":
        return `:root {\n${colors.map((c, i) => `  --color-${i + 1}-${slug(nearestColorName(c))}: ${c};`).join("\n")}\n}`;
      case "scss":
        return colors.map((c, i) => `$color-${i + 1}-${slug(nearestColorName(c))}: ${c};`).join("\n");
      case "tailwind":
        return `// tailwind.config.js\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: {\n        palette: {\n${colors.map((c, i) => `          ${i + 1}: "${c}", // ${nearestColorName(c)}`).join("\n")}\n        }\n      }\n    }\n  }\n};`;
      case "json":
        return JSON.stringify(colors.map((c) => ({ hex: c, name: nearestColorName(c) })), null, 2);
      case "svg": {
        const w = 80;
        const rects = colors.map((c, i) => `  <rect x="${i * w}" y="0" width="${w}" height="80" fill="${c}" />`).join("\n");
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${w * colors.length}" height="80">\n${rects}\n</svg>`;
      }
      default:
        return "";
    }
  }

  function renderExportTabs() {
    exportTabs.innerHTML = "";
    EXPORT_FORMATS.forEach((f) => {
      const btn = document.createElement("button");
      btn.className = "export-tab" + (state.exportFormat === f.id ? " active" : "");
      btn.textContent = f.label;
      btn.setAttribute("role", "tab");
      btn.addEventListener("click", () => {
        state.exportFormat = f.id;
        renderExportTabs();
        renderExportCode();
      });
      exportTabs.appendChild(btn);
    });
  }

  function renderExportCode() {
    exportCode.textContent = buildExport(state.exportFormat);
  }

  /* ------------------------------------------------------------------ *
   *  Saved palettes (localStorage)
   * ------------------------------------------------------------------ */

  const STORAGE_KEY = "palette-forge:saved";

  function loadSaved() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function writeSaved(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      showToast("Couldn't save — storage unavailable");
    }
  }

  function savePalette() {
    const list = loadSaved();
    list.unshift({ id: Date.now(), colors: [...state.colors], mode: state.mode, savedAt: new Date().toISOString() });
    writeSaved(list.slice(0, 24));
    renderSaved();
    showToast("Palette saved");
  }

  function deleteSaved(id) {
    const list = loadSaved().filter((p) => p.id !== id);
    writeSaved(list);
    renderSaved();
  }

  function renderSaved() {
    const list = loadSaved();
    savedSub.textContent = list.length
      ? "Palettes you save stay in this browser."
      : "Nothing saved yet — shuffle something you like, then hit “Save palette”.";
    savedList.innerHTML = "";
    if (!list.length) return;

    list.forEach((p) => {
      const item = document.createElement("div");
      item.className = "saved-item";
      const dateStr = new Date(p.savedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      item.innerHTML = `
        <div class="saved-swatches">${p.colors.map((c) => `<span style="background:${c}"></span>`).join("")}</div>
        <div class="saved-meta">
          <span class="saved-date">${dateStr} · ${MODES.find((m) => m.id === p.mode)?.label || "Custom"}</span>
          <button class="saved-delete" title="Delete" data-id="${p.id}">✕</button>
        </div>
      `;
      item.addEventListener("click", (e) => {
        if (e.target.closest(".saved-delete")) return;
        pushHistory();
        state.count = p.colors.length;
        state.colors = [...p.colors];
        state.locked = new Array(state.count).fill(false);
        state.selected = 0;
        countValue.textContent = state.count;
        renderAll();
        showToast("Palette loaded");
      });
      item.querySelector(".saved-delete").addEventListener("click", (e) => {
        e.stopPropagation();
        deleteSaved(p.id);
      });
      savedList.appendChild(item);
    });
  }

  /* ------------------------------------------------------------------ *
   *  Theme (light / dark)
   * ------------------------------------------------------------------ */

  const THEME_KEY = "palette-forge:theme";

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* noop */ }
    const btn = $("#themeToggle");
    if (btn) btn.textContent = theme === "light" ? "☀️" : "🌙";
  }

  function initTheme() {
    let saved = "dark";
    try { saved = localStorage.getItem(THEME_KEY) || "dark"; } catch (e) { /* noop */ }
    applyTheme(saved);
    $("#themeToggle").addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || "dark";
      applyTheme(current === "dark" ? "light" : "dark");
    });
  }

  /* ------------------------------------------------------------------ *
   *  Shareable URL
   * ------------------------------------------------------------------ */

  function updateURL() {
    const params = new URLSearchParams();
    params.set("colors", state.colors.map((c) => c.replace("#", "")).join("-"));
    params.set("mode", state.mode);
    const newUrl = `${location.pathname}?${params.toString()}`;
    history.replaceState(null, "", newUrl);
  }

  function loadFromURL() {
    const params = new URLSearchParams(location.search);
    const colorsParam = params.get("colors");
    if (!colorsParam) return false;
    const hexes = colorsParam
      .split("-")
      .map((h) => `#${h.toUpperCase()}`)
      .filter((h) => /^#[0-9A-F]{6}$/.test(h));
    if (!hexes.length) return false;

    state.colors = hexes.slice(0, 8);
    state.count = state.colors.length;
    state.locked = new Array(state.count).fill(false);
    const mode = params.get("mode");
    if (mode && MODES.some((m) => m.id === mode)) state.mode = mode;
    return true;
  }

  /* ------------------------------------------------------------------ *
   *  Colorblindness simulation (visual filter only — underlying hex
   *  values are unchanged, so export/copy always reflect true colors)
   * ------------------------------------------------------------------ */

  function applyCVDFilter(mode) {
    const filterValue = mode === "normal" ? "" : `url(#cvd-${mode})`;
    paletteStrip.style.filter = filterValue;
    previewCard.style.filter = filterValue;
    shadeRamp.style.filter = filterValue;
  }

  /* ------------------------------------------------------------------ *
   *  Image → palette extraction (k-means clustering)
   * ------------------------------------------------------------------ */

  function dist2(a, b) {
    return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  }

  // Farthest-point (maximin) seeding: after an initial random pick, each
  // further centroid is the pixel that is farthest from every centroid
  // chosen so far. This spreads seeds across distinct clusters instead of
  // risking two seeds landing in the same color region, which is what
  // plain random seeding does often enough to produce muddy results.
  function seedCentroids(pixels, k) {
    const centroids = [pixels[randomInt(0, pixels.length - 1)]];
    const minDist = new Array(pixels.length).fill(Infinity);

    while (centroids.length < k) {
      const last = centroids[centroids.length - 1];
      let farthestIdx = 0, farthestDist = -1;
      for (let p = 0; p < pixels.length; p++) {
        const d = dist2(pixels[p], last);
        if (d < minDist[p]) minDist[p] = d;
        if (minDist[p] > farthestDist) { farthestDist = minDist[p]; farthestIdx = p; }
      }
      centroids.push(pixels[farthestIdx]);
    }
    return centroids.map((c) => [...c]);
  }

  function kMeans(pixels, k, iterations = 10) {
    k = Math.max(1, Math.min(k, pixels.length));
    let centroids = seedCentroids(pixels, k);

    let assignments = new Array(pixels.length).fill(0);

    for (let iter = 0; iter < iterations; iter++) {
      for (let p = 0; p < pixels.length; p++) {
        let best = 0, bestDist = Infinity;
        for (let c = 0; c < centroids.length; c++) {
          const d = dist2(pixels[p], centroids[c]);
          if (d < bestDist) { bestDist = d; best = c; }
        }
        assignments[p] = best;
      }
      const sums = centroids.map(() => [0, 0, 0, 0]);
      for (let p = 0; p < pixels.length; p++) {
        const c = assignments[p];
        sums[c][0] += pixels[p][0];
        sums[c][1] += pixels[p][1];
        sums[c][2] += pixels[p][2];
        sums[c][3] += 1;
      }
      centroids = centroids.map((old, c) =>
        sums[c][3] ? [sums[c][0] / sums[c][3], sums[c][1] / sums[c][3], sums[c][2] / sums[c][3]] : old
      );
    }

    const counts = new Array(centroids.length).fill(0);
    assignments.forEach((c) => { counts[c] += 1; });

    return centroids
      .map((c, i) => ({ c, count: counts[i] }))
      .sort((a, b) => b.count - a.count)
      .map((x) => x.c);
  }

  function rgbToHex(r, g, b) {
    const toHex = (v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  }

  function extractPaletteFromImage(img, k) {
    const canvas = document.createElement("canvas");
    const maxDim = 120;
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    let data;
    try {
      data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    } catch (e) {
      return []; // e.g. tainted canvas from a cross-origin image
    }

    const pixels = [];
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;
      pixels.push([data[i], data[i + 1], data[i + 2]]);
    }
    if (!pixels.length) return [];

    return kMeans(pixels, k).map(([r, g, b]) => rgbToHex(r, g, b));
  }

  function handleImageFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const extracted = extractPaletteFromImage(img, state.count);
        if (!extracted.length) {
          showToast("Couldn't read colors from that image");
          return;
        }
        pushHistory();
        let ei = 0;
        state.colors = state.colors.map((c, i) => {
          if (state.locked[i]) return c;
          const next = extracted[ei % extracted.length];
          ei += 1;
          return next;
        });
        renderAll();
        showToast("Palette extracted from image");
      };
      img.onerror = () => showToast("Couldn't load that image");
      img.src = ev.target.result;
    };
    reader.onerror = () => showToast("Couldn't read that file");
    reader.readAsDataURL(file);
  }

  /* ------------------------------------------------------------------ *
   *  Undo / redo
   * ------------------------------------------------------------------ */

  function updateHistoryButtons() {
    undoBtn.disabled = state.history.length === 0;
    redoBtn.disabled = state.future.length === 0;
  }

  function undo() {
    if (!state.history.length) return;
    state.future.push(snapshot());
    const prev = state.history.pop();
    state.colors = prev.colors;
    state.locked = prev.locked;
    state.selected = clamp(state.selected, 0, state.colors.length - 1);
    countValue.textContent = state.colors.length;
    state.count = state.colors.length;
    renderAll();
  }

  function redo() {
    if (!state.future.length) return;
    state.history.push(snapshot());
    const next = state.future.pop();
    state.colors = next.colors;
    state.locked = next.locked;
    state.selected = clamp(state.selected, 0, state.colors.length - 1);
    countValue.textContent = state.colors.length;
    state.count = state.colors.length;
    renderAll();
  }

  /* ------------------------------------------------------------------ *
   *  Shuffle / count controls
   * ------------------------------------------------------------------ */

  function shuffle() {
    pushHistory();
    state.colors = generatePalette(state.mode, state.count, state.colors, state.locked);
    renderAll();
  }

  function setCount(next) {
    next = clamp(next, 3, 8);
    if (next === state.count) return;
    pushHistory();
    const oldColors = state.colors;
    const oldLocked = state.locked;
    state.count = next;
    if (next > oldColors.length) {
      const extra = generatePalette(state.mode, next - oldColors.length, [], []);
      state.colors = [...oldColors, ...extra];
      state.locked = [...oldLocked, ...new Array(next - oldColors.length).fill(false)];
    } else {
      state.colors = oldColors.slice(0, next);
      state.locked = oldLocked.slice(0, next);
    }
    state.selected = clamp(state.selected, 0, state.count - 1);
    countValue.textContent = state.count;
    renderAll();
  }

  /* ------------------------------------------------------------------ *
   *  Wire up + render orchestration
   * ------------------------------------------------------------------ */

  function renderAll() {
    renderSwatches();
    renderPreview();
    renderInspector();
    renderExportCode();
    updateHistoryButtons();
    updateURL();
  }

  function init() {
    initTheme();

    const loadedFromURL = loadFromURL();
    if (!loadedFromURL) {
      state.colors = generatePalette(state.mode, state.count, [], new Array(state.count).fill(false));
      state.locked = new Array(state.count).fill(false);
    }
    countValue.textContent = state.count;

    renderModePills();
    renderExportTabs();
    renderSaved();
    renderAll();

    generateBtn.addEventListener("click", shuffle);
    undoBtn.addEventListener("click", undo);
    redoBtn.addEventListener("click", redo);
    saveBtn.addEventListener("click", savePalette);

    $("#countDown").addEventListener("click", () => setCount(state.count - 1));
    $("#countUp").addEventListener("click", () => setCount(state.count + 1));

    copyExportBtn.addEventListener("click", () => {
      copyToClipboard(buildExport(state.exportFormat));
      showToast("Export copied");
    });

    $("#shareBtn").addEventListener("click", () => {
      updateURL();
      copyToClipboard(location.href);
      showToast("Link copied — paste it anywhere");
    });

    $("#imageInput").addEventListener("change", (e) => {
      handleImageFile(e.target.files[0]);
      e.target.value = "";
    });

    $("#cvdSelect").addEventListener("change", (e) => applyCVDFilter(e.target.value));

    document.addEventListener("keydown", (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || e.metaKey || e.ctrlKey) return;

      if (e.code === "Space") {
        e.preventDefault();
        shuffle();
        return;
      }
      if (e.key >= "1" && e.key <= "8") {
        const idx = parseInt(e.key, 10) - 1;
        if (idx < state.colors.length) {
          state.locked[idx] = !state.locked[idx];
          renderSwatches();
        }
      }
      if ((e.key === "z" || e.key === "Z") && e.shiftKey) { redo(); }
      else if (e.key === "z" || e.key === "Z") { undo(); }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
