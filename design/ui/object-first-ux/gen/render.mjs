// render(spec) -> html. One screen of the round-2 object-first mocks from a
// plain object. Every shared part of the chrome (file header, Views list,
// tree rows, count text, state glyphs, chips, canvas, toolbar, flyout,
// secondary bar, popover, legend, dock, transport bar, inspector header
// block, tabs, rows, status bar, caption) is drawn by exactly one function
// here, so no two screens can differ in a shared part. All CSS is in
// design/ui/object-first-ux/mocks/kit.css; a screen adds no <style>.
//
// The spec format is documented in README.md beside this file.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as karate from "./karate.mjs";
import * as football from "./football.mjs";
import * as email from "./email.mjs";
import * as emailAll from "./email-all.mjs";
import { TOOLS, MODES, SECONDARY, FACES, MOVED, MOVED_FACE, geometry } from "./toolbar.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(here, "../../../..");
export const MOCKS = path.join(REPO, "design/ui/object-first-ux/mocks");
export const OUT = path.join(MOCKS, "v2");

// The graph drawings a screen may name with canvas.graph ("email-all" is
// the Email network's whole year, for time mode off). Each module
// exports NODES (id, x, y, label?), EDGES, DEGREE, COMMUNITIES and BOX.
export const GRAPHS = { karate, football, email, "email-all": emailAll };

// The icon sprite comes from kit.html, the one source of glyphs.
const kitHtml = readFileSync(path.join(MOCKS, "kit.html"), "utf8");
// Four glyphs the round-3 screens need that the kit has not drawn: a
// microphone (the composer), a Focus target, a formula column and a
// collapsed group, in the kit's 24 px, 1.25 stroke style.
const EXTRA_SYMBOLS = [
  `<symbol id="i-mic" viewBox="0 0 24 24"><rect x="9.5" y="5.5" width="5" height="8" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.25"/><path d="M7.5 11.5a4.5 4.5 0 0 0 9 0M12 16v2.5" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></symbol>`,
  `<symbol id="i-focus" viewBox="0 0 24 24"><path d="M6.5 9.5v-3h3M14.5 6.5h3v3M17.5 14.5v3h-3M9.5 17.5h-3v-3" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></symbol>`,
  `<symbol id="i-formula" viewBox="0 0 24 24"><path d="M13.5 6.5h-1a2 2 0 0 0-2 2V16a2 2 0 0 1-2 2h-1M8 11h5M13.5 12l4 5M17.5 12l-4 5" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></symbol>`,
  // Round 4: the Objects rail icon (stacked layers), the Styles rail icon (a
  // paint swatch) and the toolbar's Actions button (four dots and a plus).
  `<symbol id="i-layers" viewBox="0 0 24 24"><path d="M12 6l6 3.25-6 3.25-6-3.25z" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/><path d="M6 12.25l6 3.25 6-3.25M6 15.25l6 3.25 6-3.25" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></symbol>`,
  `<symbol id="i-swatch" viewBox="0 0 24 24"><rect x="6.5" y="6.5" width="5" height="11" rx="1" fill="none" stroke="currentColor" stroke-width="1.25"/><path d="M11.5 9.5l3-3 3.5 3.5-6.5 6.5M11.5 17.5h6v-4.5" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/><circle cx="9" cy="15" r=".9" fill="currentColor"/></symbol>`,
  `<symbol id="i-actions" viewBox="0 0 24 24"><circle cx="8.5" cy="8.5" r="1.6" fill="none" stroke="currentColor" stroke-width="1.25"/><circle cx="15.5" cy="8.5" r="1.6" fill="none" stroke="currentColor" stroke-width="1.25"/><circle cx="8.5" cy="15.5" r="1.6" fill="none" stroke="currentColor" stroke-width="1.25"/><path d="M15.5 13v5M13 15.5h5" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></symbol>`,
  `<symbol id="i-collapse" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5.5" fill="none" stroke="currentColor" stroke-width="1.25"/><circle cx="10.5" cy="11" r="1" fill="currentColor"/><circle cx="13.5" cy="11" r="1" fill="currentColor"/><circle cx="12" cy="13.8" r="1" fill="currentColor"/></symbol>`,
];
const SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">\n${(kitHtml.match(/<symbol [\s\S]*?<\/symbol>/g) || []).join("\n")}\n${EXTRA_SYMBOLS.join("\n")}\n</svg>`;

// The frame (round 4; visual-language.md section 2.1). A spec may set
// frame: { w, h }; the default is 1440 x 900: the rail 56 plus its 1 px edge
// (57), the left panel 240, the canvas (902 at 1440), the inspector 240 plus
// its 1 px edge (241), a 24 px status bar and a 32 px dock handle.
export const FRAME = { w: 1440, h: 900, rail: 57, panel: 240, status: 24, handle: 32, transport: 40, caption: 60 };
// Where the stage (the canvas column) starts, in frame x.
export const STAGE_X = FRAME.rail + FRAME.panel;
// Explicit frame x of a float (an inset, a menu, a tooltip) written for the
// round-2/3 frame, which had no rail: everything left of the old stage's
// middle (x 720) moved right with the rail, so such an x is shifted by the
// rail's 57 px; an x further right keeps its place (the inspector did not
// move). Anchors are preferred to explicit x in new specs.
export const shiftX = (x) => (x != null && x < 720 ? x + FRAME.rail : x);

// ---------------------------------------------------------------- helpers

export const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const n = (v) => (typeof v === "number" ? v.toLocaleString("en-US") : String(v ?? ""));
// icon(id, size, extra): extra is a string of attributes; a class="..." in
// it is merged with the size class (an element keeps only its first class
// attribute, so two of them lost the second).
export const icon = (id, size = 24, extra = "") => {
  let cls = size === 16 ? "k-icon-16" : "k-icon", rest = extra;
  const m = /\s*class="([^"]*)"/.exec(extra);
  if (m) { cls += " " + m[1]; rest = extra.replace(m[0], ""); }
  return `<svg class="${cls}"${rest ? " " + rest.trim() : ""}><use href="#i-${id}"/></svg>`;
};
const cls = (...xs) => xs.filter(Boolean).join(" ");
const attr = (k, v) => (v == null ? "" : ` ${k}="${esc(v)}"`);
// "ink" is the theme's outline and label colour (#1e1e1e light, #ffffff
// dark), so one spec serves both themes.
export const col = (c) => (c === "ink" ? "var(--k-canvas-ink)" : c);

// The one count format. A dataset: "34 nodes  78 edges"; a Set or a Path:
// "5 nodes", "4 edges" or both; a Measure: "34 values"; a Grouping: "4
// groups"; a Group: "12" (its unit is the parent's). Parts sit 5px apart and
// drop from the right when the row is too narrow (kit.css .k-count).
// A count and its unit, singular for one ("1 node", "2 nodes").
export const unit = (v, one) => `${n(v)} ${one}${v === 1 ? "" : "s"}`;
export function countHtml(o) {
  const parts = [];
  if (o.kind === "dataset" || o.kind === "set") {
    if (o.nodes != null) parts.push(unit(o.nodes, "node"));
    if (o.edges != null) parts.push(unit(o.edges, "edge"));
  } else if (o.kind === "path") parts.push(unit(o.edges, "edge")); // an edge Set counts its edges
  else if (o.kind === "measure") { if (o.values != null) parts.push(unit(o.values, "value")); }
  else if (o.kind === "grouping") parts.push(unit(o.groups, "group"));
  else if (o.kind === "group" || o.kind === "more") { if (o.members !== "" && o.members != null) parts.push(n(o.members)); }
  else if (o.kind === "heading" && o.count != null) parts.push(String(o.count));
  if (o.approximate) parts[0] = "~ " + parts[0];
  return parts.length ? `<span class="k-count">${parts.map((p) => `<span>${esc(p)}</span>`).join("")}</span>` : "";
}

// The kind icon: the glyph a tree row, a flyout row and a header share.
export const KIND_ICON = { dataset: "data", set: "set", path: "path", measure: "measure", grouping: "group", group: "node", finding: "flag", node: "node", view: "camera", more: "more" };

// A name "Communities (Louvain)" is a plain name and a technical name; the
// tree row and the inspector header draw them apart. r.tech overrides.
export function splitName(name, tech) {
  if (tech != null) return { plain: name, tech };
  const m = /^(.*?)\s+\(([^()]+)\)$/.exec(name || "");
  return m ? { plain: m[1], tech: m[2] } : { plain: name, tech: "" };
}

// The one state glyph. Returns what follows the name (a dot) and what fills
// the count slot (a ring, a Run button) per revision.md section 4.
export function stateHtml(o) {
  const s = o.state || "current";
  if (s === "computing") {
    const p = o.progress ?? 0, r = 5, c = 2 * Math.PI * r;
    const ring = `<svg class="k-ring" viewBox="0 0 12 12"><circle class="k-ring-track" cx="6" cy="6" r="${r}"/><circle class="k-ring-bar" cx="6" cy="6" r="${r}" stroke-dasharray="${(c * p / 100).toFixed(2)} ${c.toFixed(2)}"/></svg>`;
    return { after: "", slot: `${ring}<span class="k-secondary">${o.queued ? esc(o.queued) : p + "%"}</span>` };
  }
  if (s === "waiting") return { after: "", slot: `${icon("circle", 16, 'class="k-state-glyph"')}<button class="k-btn k-btn-secondary k-run-mini">${esc(o.runLabel || "Run")}</button>` };
  if (s === "stale") return { after: `<span class="k-state-dot is-stale"></span>`, slot: countHtml(o) };
  if (s === "failed") return { after: `<span class="k-state-dot is-failed"></span>`, slot: countHtml(o) };
  if (s === "frozen") return { after: icon("snowflake", 16, 'class="k-state-glyph"'), slot: countHtml(o) };
  return { after: "", slot: countHtml(o) };
}

// The one Style chip (14 x 14). chip: { type, color, colors, width, dash,
// locked, override, faded }. A colour may be "ink".
export function chipHtml(chip) {
  if (!chip) return "";
  const faded = chip.faded ? " is-faded" : "";
  const dot = chip.override ? `<i class="k-override-dot"></i>` : "";
  switch (chip.type) {
    case "swatch": return `<i class="k-chip-swatch${faded}" style="--swatch:${esc(col(chip.color))}">${dot}</i>`;
    case "ring": return `<i class="k-chip-swatch is-ring${faded}" style="--swatch:${esc(col(chip.color))}">${dot}</i>`;
    case "locked": return `<i class="k-chip-swatch is-locked${faded}" style="--swatch:${esc(chip.color || "#b3b3b3")}">${icon("lock", 16)}</i>`;
    case "ramp": return `<i class="k-chip-swatch is-ramp${faded}" style="--stops:${chip.colors.map(esc).join(",")}">${dot}</i>`;
    case "strip": {
      const k = chip.colors.length, stops = chip.colors.map((c, i) => `${esc(c)} ${(100 * i / k).toFixed(1)}% ${(100 * (i + 1) / k).toFixed(1)}%`).join(",");
      return `<i class="k-chip-swatch is-strip${faded}" style="--stops:${stops}">${dot}</i>`;
    }
    case "size": return `<svg class="k-chip-svg${faded}" viewBox="0 0 14 14"><circle cx="3" cy="9" r="1.5" fill="currentColor"/><circle cx="7.5" cy="8" r="2.5" fill="currentColor"/><circle cx="11" cy="7" r="3" fill="currentColor" opacity=".9"/></svg>`;
    case "line": return `<svg class="k-chip-svg${faded}" viewBox="0 0 14 14"><line x1="1" y1="7" x2="13" y2="7" stroke="${esc(col(chip.color))}" stroke-width="${chip.width || 2}"${chip.dash ? ` stroke-dasharray="${esc(chip.dash)}"` : ""}/></svg>`;
    default: return "";
  }
}

// A chit: the 14 x 14 colour button of a paint row, which may carry the
// override dot.
const chitHtml = (color, override) => `<button class="k-chit">${chipHtml({ type: "swatch", color, override })}</button>`;

const iconBtn = (id, o = {}) => `<button class="${cls("k-icon-btn", o.cls, o.on && "k-toggle-btn is-on", o.disabled && "is-disabled", o.pressed && "is-pressed", o.open && "is-open")}"${attr("title", o.title)}${attr("style", o.style)}>${icon(o.icon ?? id, o.size ?? 24)}</button>`;

// ---------------------------------------------------------------- left panel

// The file header: the dataset name and its chevron (the file menu). st:
// { unsaved (a 6 px dot after the name), menuOpen (the chevron pressed),
// loading (the pending name in secondary text) }.
export function fileHeader(file, st = {}) {
  const name = file ? `<span class="k-heading${st.loading ? " k-secondary" : ""}">${esc(file)}</span>` : `<span class="k-heading k-secondary">graphty</span>`;
  const dot = st.unsaved ? `<span class="k-unsaved-dot" title="Unsaved changes"></span>` : "";
  return `<div class="k-panel-file${st.menuOpen ? " is-open" : ""}" data-anchor="file"><span class="k-file-name">${name}${dot}</span><span class="k-file-chevron-box">${icon("chevron-down", 24, 'class="k-icon k-file-chevron"')}</span></div>`;
}

// A saved view in the Views panel's list: its name, and a drift dot when the
// camera has moved off it. { name, current, drift, hover, selected (the
// View inspector shows it: the blue selected pill) }.
export const viewRow = (r) => `<div class="${cls("k-list-row", r.current && "is-current", r.hover && "is-hover", r.selected && "is-selected")}"${attr("data-row", r.name)}><div class="k-list-pill"><span>${esc(r.name)}</span>${r.drift ? `<span class="k-state-dot is-drift" title="The camera has moved"></span>` : ""}</div></div>`;

// A tree row: caret, kind icon, the plain name, the state dot, the technical
// name (shown when it fits; it also fills the slack so the count sits at the
// right), the count slot, the chip, the actions. The yield order is in
// kit.css. The eye and the lock are drawn on hover and when they carry
// state (hidden, locked); the Dataset row's lock is its chip.
export function treeRow(r, depth = 0) {
  const anchor = attr("data-row", r.name);
  if (r.kind === "suggestion") {
    return `<div class="k-tree-row is-suggestion is-leaf" style="--depth:${depth}"${anchor}><span class="k-tree-caret"></span><span class="k-tree-icon">${icon(r.icon, 16)}</span><span class="k-tree-name">${esc(r.name)}${r.key ? ` (${esc(r.key)})` : ""}</span></div>`;
  }
  if (r.kind === "verb") {
    return `<div class="k-list-row"${anchor}><div class="k-list-pill k-secondary">${esc(r.name)}</div></div>`;
  }
  // A result-section header inside the tree while Find is open ("Nodes  24"),
  // with an optional select for its scope.
  if (r.kind === "heading") {
    return `<div class="k-tree-heading"${anchor}><span>${esc(r.name)}</span>${r.select ? `<button class="k-select k-select-sm"><span>${esc(r.select)}</span>${icon("chevron-down")}</button>` : ""}<span class="k-tree-heading-count">${esc(r.count ?? "")}</span></div>`;
  }
  // A node found by Find: its label, its id in secondary text, its paint.
  if (r.kind === "node") {
    return `<div class="${cls("k-tree-row is-leaf is-node", r.selected && "is-selected", r.hover && "is-hover")}" style="--depth:${depth}"${anchor}><span class="k-tree-caret"></span><span class="k-tree-icon">${icon("node", 16)}</span><span class="k-tree-name">${esc(r.name)}</span><span class="k-tree-id">${esc(r.id != null ? `id ${r.id}` : "")}</span><span class="k-tree-meta"></span>${r.chip ? `<span class="k-tree-chip">${chipHtml(r.chip)}</span>` : ""}</div>`;
  }
  const kids = r.children || [];
  const expanded = r.expanded ?? kids.length > 0;
  const st = stateHtml(r);
  const { plain, tech } = splitName(r.name, r.tech);
  const showActions = r.hover || r.eye === false || (r.locked && r.kind !== "dataset");
  const actions = showActions ? `<span class="k-tree-actions is-shown">${iconBtn("lock", { icon: r.locked ? "lock" : "unlock", size: 24, on: !!r.locked, cls: "k-toggle-btn k-eye" })}${iconBtn("eye", { icon: r.eye === false ? "eye-off" : "eye", on: r.eye !== false, cls: "k-toggle-btn k-eye" })}</span>` : "";
  const caret = kids.length || r.kind === "grouping" || r.kind === "more" ? icon("caret", 16) : "";
  // The root row carries no count (the status bar and the Overview tab do),
  // but a pending root shows its progress ring.
  const slot = r.kind === "dataset" ? (r.state === "computing" ? st.slot : "") : st.slot;
  const name = r.rename ? `<span class="k-tree-name is-rename"><span class="k-rename-field"><span class="k-rename-sel">${esc(plain)}</span></span></span>` : `<span class="k-tree-name">${esc(plain)}</span>`;
  const glyph = r.glyph ? `<span class="k-tree-glyph" title="${esc(r.glyphTitle || r.glyph)}">${icon(r.glyph, 16)}</span>` : "";
  const badge = r.badge ? `<span class="k-tree-badge">${esc(r.badge)}</span>` : "";
  const active = r.active ? `<span class="k-tree-active" title="The graph on the canvas"></span>` : "";
  const insert = r.insertBefore ? `<div class="k-tree-insert" style="--depth:${depth}"></div>` : "";
  const own = `${insert}<div class="${cls("k-tree-row", r.kind === "dataset" && "is-top", r.kind === "more" && "is-more", kids.length ? (expanded ? "is-expanded" : "") : (caret ? "" : "is-leaf"), r.selected && "is-selected", r.childSelected && "is-child-selected", r.hover && "is-hover", r.eye === false && "is-hidden", r.locked && "is-locked", r.state && `is-${r.state}`, r.last && "is-last", r.dragging && "is-dragging", r.system && "is-system", r.active && "is-active", r.badge && "is-new")}" style="--depth:${depth}"${anchor}${attr("title", tech ? `${plain} (${tech})` : null)}>${active}<span class="k-tree-caret">${caret}</span><span class="k-tree-icon">${icon(KIND_ICON[r.kind] || "node", 16)}</span>${name}${st.after}${glyph}${badge}<span class="k-tree-tech"><i></i></span><span class="k-tree-meta">${slot}</span>${r.chip ? `<span class="k-tree-chip">${chipHtml(r.chip)}</span>` : ""}${actions}</div>`;
  return own + (expanded ? kids.map((k, i) => treeRow({ ...k, last: i === kids.length - 1, childSelected: k.childSelected ?? (r.selected && !k.selected) }, depth + 1)).join("") : "");
}

// The Objects header, or (while Find is open) the find field in its place:
// find: { query, scope, count }.
export function objectsSection(o = {}) {
  const rows = (o.rows || []).map((r) => treeRow(r, 0)).join("");
  const head = o.find
    ? `<div class="k-panel-header k-find-head"><div class="k-input k-find-input is-focus"><span class="k-input-slot">${icon("search", 16)}</span><span class="k-input-value">${esc(o.find.query)}<i class="k-caret-bar"></i></span>${o.find.count ? `<span class="k-find-count">${esc(o.find.count)}</span>` : ""}</div>${iconBtn("close", { title: "Close Find (Esc)" })}</div>`
    : `<div class="k-panel-header"><span class="k-panel-title">Objects</span><div class="k-section-actions">${iconBtn("search", { disabled: o.disabled, title: "Find an object or a node (Ctrl+F)" })}<span data-anchor="objectsMore">${iconBtn("more", { disabled: o.disabled })}</span></div></div>`;
  return `${head}<div class="k-tree show-carets">${rows}</div>`;
}

// ---------------------------------------------------------------- rail

// The rail (round-4 section 2.2 and 2.3): Objects, Data, Styles, Views, a
// separator, AI; Settings and Help at its foot. The active item is the open
// left panel. rail: { dots: ["objects"] (the notification dot), hover: id,
// pressed: id, open: "help" | "settings" (a foot button whose menu or dialog
// is open), tip: id (its tooltip, drawn to the right) }.
export const RAIL = [
  { id: "objects", label: "Objects", icon: "layers", key: "Alt+1" },
  { id: "data", label: "Data", icon: "data", key: "Alt+2" },
  { id: "styles", label: "Styles", icon: "swatch", key: "Alt+3" },
  { id: "views", label: "Views", icon: "camera", key: "Alt+4" },
  { sep: true },
  { id: "ai", label: "AI", icon: "sparkle", key: "Alt+5" },
];
export const RAIL_FOOT = [
  { id: "settings", label: "Settings", icon: "settings", key: "Ctrl+," },
  { id: "help", label: "Help", icon: "question", key: "" },
];
export const panelOf = (spec) => spec.left?.panel || "objects";

export function railHtml(spec) {
  const r = spec.rail || {}, active = panelOf(spec), dots = new Set(r.dots || []);
  const items = RAIL.map((it) => it.sep ? `<div class="k-rail-sep"></div>` : `<button class="${cls("k-rail-btn", it.id === active && "is-active", r.hover === it.id && "is-hover", r.pressed === it.id && "is-pressed")}" data-anchor="rail-${it.id}" aria-label="${esc(it.label)}"${attr("aria-expanded", it.id === active ? "true" : null)}><span class="k-rail-pill">${icon(it.icon)}${dots.has(it.id) ? `<i class="k-dot"></i>` : ""}</span><span class="k-rail-label">${esc(it.label)}</span></button>`).join("");
  const foot = RAIL_FOOT.map((it) => `<span data-anchor="rail-${it.id}">${iconBtn(it.icon, { cls: "k-icon-btn-32", title: it.key ? `${it.label}  ${it.key}` : it.label, open: r.open === it.id })}</span>`).join("");
  return `<nav class="k-rail">${items}<div class="k-rail-spacer"></div><div class="k-rail-foot">${foot}</div></nav>`;
}

// A rail panel's title row (40): its name and at most two 24 px icon buttons,
// the second of which ("...") is the anchor "<panel>More" (e.g. "viewsMore").
function panelTitle(title, id, p = {}) {
  const acts = p.actions || ["plus", "more"];
  const btns = acts.map((a) => `<span data-anchor="${id}${a === "more" ? "More" : "Plus"}">${iconBtn(a, { disabled: p.disabled, open: a === "more" ? p.menuOpen : p.plusOpen })}</span>`).join("");
  return `<div class="k-panel-header"><span class="k-panel-title">${esc(title)}</span><div class="k-section-actions">${btns}</div></div>`;
}
// A pinned foot bar: foot: [{ label, key }] (secondary buttons, "Open table
// Shift+T").
const panelFoot = (f) => (f ? `<div class="k-panel-foot">${[].concat(f).map((b) => `<button class="k-btn k-btn-secondary">${esc(b.label)}${b.key ? `<span class="k-shortcut">${esc(b.key)}</span>` : ""}</button>`).join("")}</div>` : "");

// The AI panel (round-4 section 2.7): the scope, the conversation, the line
// about what is sent, the composer. ai: { scope, turns, composer, privacy,
// empty: true (before a provider is set) }.
function aiPanel(a = {}) {
  if (a.empty) return `${panelTitle("AI", "ai", { actions: ["more"] })}<div class="k-empty"><div class="k-heading-md">No provider yet</div><p>${esc(a.empty === true ? "The assistant needs a provider: Anthropic with your key, or a model that runs in this browser." : a.empty)}</p><button class="k-btn">Choose a provider...</button></div>`;
  const scope = a.scope ? rowHtml({ type: "select", label: "On", value: a.scope }) : "";
  return `${panelTitle("AI", "ai", a)}${scope}${assistantHtml({ turns: [], ...a })}`;
}

// The left panel: the file header, then the panel the rail's active item
// shows. left: { panel: "objects" (default) | "data" | "styles" | "views" |
// "ai", objects: {...}, data: { rows, foot }, styles: { rows, foot }, views:
// { rows (view rows, then any row types), foot }, ai: {...} }.
export function leftPanel(spec) {
  const L = spec.left || {}, panel = panelOf(spec);
  let body;
  if (panel === "objects") body = objectsSection(L.objects);
  else if (panel === "ai") body = aiPanel(L.ai);
  else {
    const p = L[panel] || {}, title = { data: "Data", styles: "Styles", views: "Views" }[panel];
    if (!title) throw new Error("render.mjs: unknown left panel " + panel);
    const rows = (p.rows || []).map((r) => (r.type ? rowHtml(r) : viewRow(r))).join("");
    body = `${panelTitle(title, panel, p)}<div class="k-panel-rows">${rows}</div>${panelFoot(p.foot)}`;
  }
  // A panel taller than the frame scrolls under its pinned header and foot;
  // the placing script draws the overlay scroll thumb whenever it overflows,
  // and scroll: px (on the panel's object) draws it scrolled that far.
  const scroll = (L[panel] || {}).scroll;
  return `<aside class="${cls("k-panel k-panel-left", `is-${panel}`)}"${attr("data-scroll", scroll)}>${fileHeader(spec.file, spec.fileState)}${body}</aside>`;
}

// ---------------------------------------------------------------- canvas

// A colour on a ramp: t in 0..1 between the stops.
export function rampAt(colors, t) {
  const hex2 = (v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0");
  const p = Math.max(0, Math.min(1, t)) * (colors.length - 1), i = Math.min(Math.floor(p), colors.length - 2), f = p - i;
  const c = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
  const a = c(colors[i]), b = c(colors[i + 1]);
  return "#" + a.map((x, k) => hex2(x + (b[k] - x) * f)).join("");
}

// The graph SVG. canvas.graph names the drawing ("karate", "football",
// "email"). canvas.nodes: { default: {fill}, sizeBy: "degree" | { values,
// from, to }, colorBy: { values, colors }, byId: { id: {fill, r, outline:
// {color,width} | [..], halo, label} }; canvas.edges: { default: {width},
// byPair: { "3-33": {stroke, width, dash, arrow} } }; canvas.labels: [ids].
// Positions come from the module and never vary. With a legend on, the
// drawing keeps clear of the card (the right padding grows).
// The drawing a canvas spec shows: the module's nodes with canvas.positions
// ({ id: { x, y } } in the module's 1000 x 760 box) applied, plus
// canvas.extraNodes ([{ id, x, y, links: [ids], label }]) and their edges.
export function drawingOf(c = {}) {
  const G = GRAPHS[c.graph || "karate"];
  if (!G) throw new Error("render.mjs: unknown graph " + c.graph);
  const pos = c.positions || {}, extra = c.extraNodes || [];
  if (!extra.length && !Object.keys(pos).length) return G;
  const NODES = G.NODES.map((nd) => (pos[nd.id] ? { ...nd, ...pos[nd.id] } : nd)).concat(extra.map((x) => ({ id: x.id, x: x.x, y: x.y, label: x.label })));
  const EDGES = G.EDGES.concat(extra.flatMap((x) => (x.links || []).map((t) => [t, x.id])));
  const DEGREE = { ...G.DEGREE };
  for (const x of extra) { DEGREE[x.id] = (x.links || []).length || 1; for (const t of x.links || []) DEGREE[t] = (DEGREE[t] || 0) + 1; }
  return { ...G, NODES, EDGES, DEGREE };
}

// The fit: where every node lands on a stage of w x h. With a legend on,
// the drawing keeps clear of the card. canvas.camera: { zoom, center: id |
// { x, y } (box units), pitch (degrees, 3D tilt: rows nearer the viewer are
// lower and larger) } moves the camera off the fit. Returns { P: { id: [x, y] },
// depth: { id: factor }, s }.
export function fitOf(c = {}, w = 959, h = 852, o = {}) {
  const G = drawingOf(c);
  const pad = o.legend ? { l: 24, r: 184, t: 50, b: 150 } : { l: 60, r: 60, t: 50, b: 150 };
  if (o.insetRight) pad.l = Math.max(pad.l, o.insetRight + 24);
  let s = Math.min((w - pad.l - pad.r) / G.BOX.w, (h - pad.t - pad.b) / G.BOX.h);
  let ox = pad.l + ((w - pad.l - pad.r) - G.BOX.w * s) / 2, oy = pad.t + ((h - pad.t - pad.b) - G.BOX.h * s) / 2;
  const cam = c.camera || {};
  let cx = G.BOX.w / 2, cy = G.BOX.h / 2;
  if (cam.center != null) {
    const ctr = typeof cam.center === "object" ? cam.center : G.NODES.find((x) => x.id === cam.center);
    cx = ctr.x; cy = ctr.y;
  }
  if (cam.zoom || cam.center != null) {
    const z = cam.zoom || 1;
    const midX = pad.l + (w - pad.l - pad.r) / 2, midY = pad.t + (h - pad.t - pad.b) / 2;
    s *= z; ox = midX - cx * s; oy = midY - cy * s;
  }
  const P = {}, depth = {};
  const tilt = cam.pitch ? Math.cos((cam.pitch * Math.PI) / 180) : 1;
  for (const nd of G.NODES) {
    let x = nd.x, y = nd.y, f = 1;
    if (cam.pitch) { f = 0.7 + 0.6 * (nd.y / G.BOX.h); x = cx + (nd.x - cx) * f; y = cy + (nd.y - cy) * tilt; }
    P[nd.id] = [Math.round(ox + x * s), Math.round(oy + y * s)];
    depth[nd.id] = f;
  }
  return { G, P, depth, s };
}

// Where a node lands on a spec's stage (px from the stage's top left), so a
// spec can put a cursor, a marquee or a rubber band on it.
// Insets at the stage's left (frame x below the stage's middle) push the
// drawing right, as the legend card does on the other side, unless a dialog
// is open (then the drawing is only the dimmed backdrop).
export function insetRight(spec) {
  if (!spec.insets || spec.canvas?.overlays?.dialog) return 0;
  const { w } = stageSize(spec);
  return Math.max(0, ...[].concat(spec.insets).map((s) => ({ ...s, left: shiftX(s.left) })).filter((s) => s.left != null && s.left < STAGE_X + w / 2).map((s) => s.left + (s.width || 256) - STAGE_X));
}

export function nodeAt(spec, id) {
  const { w, h } = stageSize(spec);
  const c = spec.canvas || {};
  const { P } = fitOf(c, w, h, { legend: !!c.overlays?.legend, insetRight: insetRight(spec) });
  return { x: P[id][0], y: P[id][1] };
}
// Every node whose centre falls inside a stage rectangle { x, y, w, h }.
export function nodesIn(spec, r) {
  const G = drawingOf(spec.canvas);
  return G.NODES.map((nd) => nd.id).filter((id) => { const p = nodeAt(spec, id); return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; });
}

// A 2D silhouette for a node shape (the element's meshes drawn flat).
function shapeSvg(shape, x, y, r, attrs) {
  const p = (pts) => `<polygon points="${pts.map(([a, b]) => `${(x + a * r).toFixed(1)},${(y + b * r).toFixed(1)}`).join(" ")}"${attrs}/>`;
  switch (shape) {
    case "box": return `<rect x="${(x - r * 0.9).toFixed(1)}" y="${(y - r * 0.9).toFixed(1)}" width="${(r * 1.8).toFixed(1)}" height="${(r * 1.8).toFixed(1)}"${attrs}/>`;
    case "diamond": return p([[0, -1.2], [1.2, 0], [0, 1.2], [-1.2, 0]]);
    case "cone": return p([[0, -1.2], [1.1, 1], [-1.1, 1]]);
    case "cylinder": return `<rect x="${(x - r * 0.8).toFixed(1)}" y="${(y - r * 1.1).toFixed(1)}" width="${(r * 1.6).toFixed(1)}" height="${(r * 2.2).toFixed(1)}" rx="${(r * 0.8).toFixed(1)}" ry="${(r * 0.35).toFixed(1)}"${attrs}/>`;
    default: return `<circle cx="${x}" cy="${y}" r="${r.toFixed(1)}"${attrs}/>`;
  }
}

export function graphSvg(c = {}, w = 959, h = 852, o = {}) {
  const { G, P, depth } = fitOf(c, w, h, o);
  const nodeSpec = (id) => ({ ...(c.nodes?.default || {}), ...((c.nodes?.byId || {})[id] || {}) });
  // Summary nodes: canvas.nodes.meta [{ members, label, fill, r }] hide their
  // members and draw one node at the members' centre; canvas.edges.merged
  // [{ from, to, width }] joins them ("m0" is meta node 0, a number a node).
  const metas = (c.nodes?.meta || []).map((m) => {
    const xs = m.members.map((id) => P[id]);
    return { ...m, x: Math.round(xs.reduce((t, p) => t + p[0], 0) / xs.length), y: Math.round(xs.reduce((t, p) => t + p[1], 0) / xs.length) };
  });
  const inMeta = new Set(metas.flatMap((m) => m.members));
  const hidden = (id) => inMeta.has(id) || nodeSpec(id).hidden;
  const sizeBy = c.nodes?.sizeBy;
  const zoomR = c.camera?.zoom ? Math.sqrt(c.camera.zoom) : 1;
  const radius0 = (id, ns) => {
    if (ns.r != null) return ns.r;
    if (sizeBy === "degree") return 6 * (0.8 + 1.2 * (Math.min(G.DEGREE[id] ?? 1, 17) - 1) / 16);
    if (sizeBy && sizeBy.values) {
      const vals = Object.values(sizeBy.values), lo = Math.min(...vals), hi = Math.max(...vals);
      const t = hi > lo ? ((sizeBy.values[id] ?? lo) - lo) / (hi - lo) : 0;
      return 6 * ((sizeBy.from ?? 0.8) + ((sizeBy.to ?? 2.2) - (sizeBy.from ?? 0.8)) * t);
    }
    return 6;
  };
  const radius = (id, ns) => radius0(id, ns) * (depth[id] ?? 1) * (ns.r != null ? 1 : zoomR);
  const colorBy = c.nodes?.colorBy;
  const fillOf = (id, ns) => {
    if (ns.fill) return col(ns.fill);
    if (colorBy && colorBy.values) {
      const vals = Object.values(colorBy.values), lo = Math.min(...vals), hi = Math.max(...vals);
      return rampAt(colorBy.colors, hi > lo ? (colorBy.values[id] - lo) / (hi - lo) : 0);
    }
    return "var(--k-canvas-node)";
  };
  const outer = (id, ns) => { // the node's outer radius: disc plus outlines
    const outlines = Array.isArray(ns.outline) ? ns.outline : ns.outline ? [ns.outline] : [];
    return radius(id, ns) + outlines.reduce((t, x) => t + x.width, 0);
  };
  const edgeDefault = { width: 1, ...(c.edges?.default || {}) };
  const edgeSpec = (a, b) => ({ ...edgeDefault, ...((c.edges?.byPair || {})[`${Math.min(a, b)}-${Math.max(a, b)}`] || {}) });
  const markers = new Map();
  let edges = "", styled = "";
  for (const [a, b] of G.EDGES) {
    if (hidden(a) || hidden(b)) continue;
    const e = edgeSpec(a, b);
    let [x1, y1] = P[a], [x2, y2] = P[b];
    let mk = "";
    if (e.arrow) {
      const id = "arrow-" + String(e.stroke).replace(/[^a-z0-9]/gi, "");
      markers.set(id, col(e.stroke));
      mk = ` marker-end="url(#${id})"`;
      // Stop the line at the target's edge so the arrowhead is not under the disc.
      const rt = outer(b, nodeSpec(b)) + 1.5, d = Math.hypot(x2 - x1, y2 - y1) || 1;
      x2 = +(x2 - (x2 - x1) / d * rt).toFixed(1); y2 = +(y2 - (y2 - y1) / d * rt).toFixed(1);
    }
    const line = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${esc(e.stroke ? col(e.stroke) : "var(--k-canvas-edge)")}" stroke-width="${e.width}"${e.dash ? ` stroke-dasharray="${esc(e.dash)}"` : ""}${e.opacity != null ? ` opacity="${e.opacity}"` : ""}${mk}/>`;
    if (e.stroke) styled += line; else edges += line;
  }
  // Merged edges between summary nodes (width = how many edges they stand for).
  const endOf = (k) => (typeof k === "string" && k[0] === "m" ? [metas[+k.slice(1)].x, metas[+k.slice(1)].y] : P[k]);
  for (const m of c.edges?.merged || []) {
    const [x1, y1] = endOf(m.from), [x2, y2] = endOf(m.to);
    styled += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${esc(col(m.stroke || "#8c8c8c"))}" stroke-width="${m.width}" stroke-linecap="round" opacity="${m.opacity ?? 0.9}"/>`;
  }
  let halos = "", nodes = "", labels = "", marks = "";
  const labelSet = new Set(c.labels || []);
  for (const nd of G.NODES) {
    if (hidden(nd.id)) continue;
    const ns = nodeSpec(nd.id), r = radius(nd.id, ns), [x, y] = P[nd.id];
    const outlines = Array.isArray(ns.outline) ? ns.outline : ns.outline ? [ns.outline] : [];
    let ring = r;
    let out = "";
    for (const ol of outlines) { out += shapeSvg(ns.shape, x, y, ring + ol.width / 2, ` fill="none" stroke="${esc(col(ol.color))}" stroke-width="${ol.width}"`); ring += ol.width; }
    // The keyboard focus ring: 2 px brand outside every outline, with a
    // canvas-coloured gap, never the gold selection halo.
    if (ns.focus) { out += `<circle cx="${x}" cy="${y}" r="${(ring + 2).toFixed(1)}" fill="none" stroke="var(--k-canvas)" stroke-width="2"/><circle cx="${x}" cy="${y}" r="${(ring + 4).toFixed(1)}" fill="none" stroke="var(--k-border-selected)" stroke-width="2"/>`; ring += 4; }
    if (ns.halo) halos += `<circle cx="${x}" cy="${y}" r="${(ring + 3.5).toFixed(1)}" fill="none" stroke="var(--k-halo)" stroke-width="2"/>`;
    nodes += shapeSvg(ns.shape, x, y, r, ` fill="${esc(fillOf(nd.id, ns))}"${ns.opacity != null ? ` opacity="${ns.opacity}"` : ""} data-node="${esc(nd.id)}"`) + out;
    // A pin marker (a dragged, pinned node) and a note marker sit at the node's top right.
    if (ns.pin) marks += `<g transform="translate(${(x + ring * 0.7 - 2).toFixed(1)},${(y - ring * 0.7 - 12).toFixed(1)})"><circle cx="6" cy="6" r="7" fill="var(--k-bg)" stroke="var(--k-canvas-ink)" stroke-width="1"/><path d="M6 2.5v4.5M3.6 7h4.8M6 7v2.8" stroke="var(--k-canvas-ink)" stroke-width="1.4" stroke-linecap="round"/></g>`;
    if (ns.marker) marks += `<g transform="translate(${(x - ring * 0.7 - 12).toFixed(1)},${(y - ring * 0.7 - 13).toFixed(1)})"><path d="M1.5 1.5h11v8h-6l-3 3v-3h-2z" fill="var(--k-bg)" stroke="var(--k-canvas-ink)" stroke-width="1.2" stroke-linejoin="round"/></g>`;
    if (labelSet.has(nd.id) || ns.label) labels += `<text x="${(x + ring + 6).toFixed(1)}" y="${y + 4}"${ns.opacity != null && ns.opacity < 1 ? ` opacity="${Math.max(ns.opacity, 0.5)}"` : ""}>${esc(ns.label === true || ns.label == null ? (nd.label ?? nd.id) : ns.label)}</text>`;
    // A callout: a note's text in a box with a leader line to the node.
    if (ns.callout) {
      const lines = [].concat(ns.callout), bw = Math.max(...lines.map((t) => t.length)) * 6 + 16, bh = lines.length * 14 + 10;
      const dir = ns.calloutAt || { dx: 40, dy: -56 };
      const bx = x + dir.dx, by = y + dir.dy - bh / 2;
      marks += `<line x1="${x}" y1="${y}" x2="${bx}" y2="${by + bh / 2}" stroke="var(--k-canvas-ink)" stroke-width="1"/><rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="5" fill="var(--k-bg)" stroke="var(--k-canvas-ink)" stroke-width="1"/>${lines.map((t, i) => `<text class="k-callout-text" x="${bx + 8}" y="${by + 17 + i * 14}">${esc(t)}</text>`).join("")}`;
    }
  }
  for (const m of metas) {
    const r = m.r ?? 16;
    nodes += `<circle cx="${m.x}" cy="${m.y}" r="${r}" fill="${esc(col(m.fill))}" stroke="var(--k-canvas-ink)" stroke-width="2"/>`;
    if (m.label) labels += `<text x="${m.x + r + 6}" y="${m.y + 4}" class="k-meta-label">${esc(m.label)}</text>`;
  }
  const defs = markers.size ? `<defs>${[...markers].map(([id, c2]) => `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M0 0L10 5 0 10z" fill="${esc(c2)}"/></marker>`).join("")}</defs>` : "";
  return `<svg class="k-graph" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">${defs}<g>${edges}</g><g>${styled}</g><g>${halos}</g><g>${nodes}</g><g>${marks}</g><g>${labels}</g></svg>`;
}

// A minimap card: the same drawing at 160 x 120 with the viewport box.
// minimap: { viewport: { x, y, w, h } (box units), zoom }.
export function minimapHtml(m, c) {
  if (!m) return "";
  const G = drawingOf(c);
  const W = 160, H = 120, s = Math.min((W - 12) / G.BOX.w, (H - 12) / G.BOX.h);
  const ox = (W - G.BOX.w * s) / 2, oy = (H - G.BOX.h * s) / 2;
  const nodeSpec = (id) => ({ ...(c.nodes?.default || {}), ...((c.nodes?.byId || {})[id] || {}) });
  const dots = G.NODES.map((nd) => `<circle cx="${(ox + nd.x * s).toFixed(1)}" cy="${(oy + nd.y * s).toFixed(1)}" r="1.4" fill="${esc(col(nodeSpec(nd.id).fill || "var(--k-canvas-node)"))}"/>`).join("");
  const v = m.viewport;
  const box = v ? `<rect x="${(ox + v.x * s).toFixed(1)}" y="${(oy + v.y * s).toFixed(1)}" width="${(v.w * s).toFixed(1)}" height="${(v.h * s).toFixed(1)}" fill="#0d99ff1f" stroke="var(--k-border-selected)" stroke-width="1.5"/>` : "";
  return `<div class="k-minimap"><div class="k-minimap-head"><span>Minimap</span><span class="k-secondary">${esc(m.zoom || "")}</span>${iconBtn("close", { title: "Hide the minimap (M)" })}</div><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${dots}${box}</svg></div>`;
}

// The legend card. legend: { blocks: [{ title, note, rows: [{chip, label,
// count} | {line: {color,width,dash}, label, count} | {more}], more, ramp:
// {colors, from, to}, size: {from, to}, line: {...} }] }. o: { secondary }
// lifts the card above the secondary bar.
export function legendCard(l, o = {}) {
  if (!l) return "";
  const lineSvg = (ln) => `<svg class="k-legend-line" viewBox="0 0 28 14"><line x1="1" y1="7" x2="27" y2="7" stroke="${esc(col(ln.color))}" stroke-width="${ln.width}"${ln.dash ? ` stroke-dasharray="${esc(ln.dash)}"` : ""}/></svg>`;
  const item = (r) => {
    if (r.more) return `<div class="k-legend-item"><span class="k-legend-label k-secondary">${esc(r.more)}</span></div>`;
    const shape = r.shape ? `<svg class="k-legend-shape" viewBox="0 0 14 14">${shapeSvg(r.shape, 7, 7, 5, ' fill="none" stroke="currentColor" stroke-width="1.3"')}</svg>` : "";
    return `<div class="k-legend-item">${r.line ? lineSvg(r.line) : chipHtml(r.chip)}${shape}<span class="k-legend-label">${esc(r.label)}</span>${r.count != null ? `<span class="k-legend-count">${esc(r.count)}</span>` : ""}</div>`;
  };
  const block = (b) => {
    let body = "";
    if (b.note) body += `<div class="k-legend-note">${esc(b.note)}</div>`;
    for (const r of b.rows || []) body += item(r);
    if (b.more) body += item({ more: b.more });
    // widths: [{ width, label }]: an edge-width key, one line per step.
    for (const x of b.widths || []) body += item({ line: { color: x.color || "#5a5a5a", width: x.width }, label: x.label });
    if (b.ramp) body += `<div class="k-legend-ramp" style="--stops:${b.ramp.colors.map(esc).join(",")}">${b.ramp.mid != null ? `<i class="k-legend-mid" style="left:${((b.ramp.midAt ?? 0.5) * 100).toFixed(1)}%"></i>` : ""}</div><div class="k-legend-ramp-ends"><span>${esc(b.ramp.from)}</span>${b.ramp.mid != null ? `<span class="k-legend-mid-label" style="left:${((b.ramp.midAt ?? 0.5) * 100).toFixed(1)}%">${esc(b.ramp.mid)}</span>` : ""}<span>${esc(b.ramp.to)}</span></div>`;
    if (b.size) body += `<div class="k-legend-item">${chipHtml({ type: "size" })}<span class="k-legend-label">${esc(b.size.from)} to ${esc(b.size.to)}</span></div>`;
    if (b.line) body += item(b.line);
    return `<div class="k-legend-block"><div class="k-legend-title">${esc(b.title)}</div>${body}</div>`;
  };
  return `<div class="k-legend-card${o.secondary ? " has-secondary" : ""}${o.pane ? " is-pane" : ""}">${(l.blocks || []).map(block).join("")}</div>`;
}

// The Welcome sheet (screen 1). welcome: { samples: [{name, nodes, edges, note}], recent }
// The Welcome sheet (screen 1). welcome: { samples: [{name, nodes, edges,
// note}], recent: "text" | [{ name, note, selected }], error: { title, text,
// buttons: [{label, primary}], details: [[label, value]] } }. An error block
// takes the drop zone's place: a load that failed is said where it started.
export function welcomeSheet(wl) {
  if (!wl) return "";
  const rows = (wl.samples || []).map((s) => `<div class="k-list-row"><div class="k-list-pill"><span>${esc(s.name)}</span><span class="k-sample-size">${countHtml({ kind: "dataset", nodes: s.nodes, edges: s.edges })}${s.note ? `<span class="k-count"><span>${esc(s.note)}</span></span>` : ""}</span>${icon("chevron-right")}</div></div>`).join("");
  const rec = wl.recent == null ? [] : Array.isArray(wl.recent) ? wl.recent : [{ name: wl.recent }];
  const recent = rec.length ? `<div class="k-sample-heading">Recent</div>` + rec.map((r) => `<div class="k-list-row${r.selected ? " is-current" : ""}"><div class="k-list-pill"><span>${esc(r.name)}</span>${r.note ? `<span class="k-sample-size">${esc(r.note)}</span>` : ""}${icon(r.more ? "more" : "chevron-right")}</div></div>`).join("") : "";
  const e = wl.error;
  const drop = e
    ? `<div class="k-welcome-error"><div class="k-welcome-error-title">${icon("warning", 16)}<span>${esc(e.title)}</span></div><p>${esc(e.text)}</p>${e.details ? `<div class="k-welcome-error-details">${e.details.map(([k, v]) => `<span class="k-secondary">${esc(k)}</span><span>${esc(v)}</span>`).join("")}</div>` : ""}<div class="k-welcome-error-buttons">${(e.buttons || []).map((b) => `<button class="k-btn${b.primary ? "" : " k-btn-secondary"}">${esc(b.label)}</button>`).join("")}</div></div>`
    : `<div class="k-dropzone">Drop a file here</div><div><button class="k-btn">Choose a file</button></div>`;
  return `<div class="k-scrim"></div><div class="k-welcome"><h2 class="k-heading-md">${esc(wl.heading || "Open a graph")}</h2>${drop}<div class="k-sample-list">${rows}${recent}</div></div>`;
}

// ---------------------------------------------------------------- toolbar

// toolbar: { active: "select", armed: "rank", disabled: false, openFlyout:
// "rank", flyoutPressed: "Bridges", faces: {rank: "Bridges"}, costs: {Bridges:
// "about 2 s"}, mode: "2D", xr: true, modeMenu: true (the view-mode menu
// open), modePressed, disabledTools: { VR: "reason" }, time: false | true |
// "on" | { on, columns: true } (the Time button; see timeOf), palette: {...}
// (the command palette open), tip: "rank" (that control's tooltip drawn),
// secondary: {tool, ...} }. Round 4 (section 3): icon-only 32 px tools, each
// with at most one chevron, the Time and Actions buttons, and one view-mode
// button whose face is the mode. A spec that names a tool that left the bar
// (hand, neighbours, note, ask) is drawn with its new home (toolbar.mjs
// MOVED): Hand is Select's variant, Neighbours is Filter's "Around a node".
export function timeOf(t = {}, spec = {}) {
  const auto = spec.canvas?.overlays?.transport ? "on" : spec.file === "Email network";
  const v = t.time ?? auto;
  if (!v) return null;
  return typeof v === "object" ? v : { on: v === "on" };
}
export function toolbarHtml(t = {}, spec = {}) {
  const moved = (id) => MOVED[id] || id;
  const armed = t.armed ? moved(t.armed) : null;
  const pressed = armed || moved(t.active || "select");
  const faces = { ...FACES, ...(t.armed && MOVED_FACE[t.armed] ? { [moved(t.armed)]: MOVED_FACE[t.armed] } : {}), ...(t.active && MOVED_FACE[t.active] ? { [moved(t.active)]: MOVED_FACE[t.active] } : {}), ...(t.faces || {}) };
  const time = timeOf(t, spec);
  const parts = [];
  for (const tool of TOOLS) {
    if (tool.timeOnly && !time) continue;
    if (tool.divider) { parts.push(`<div class="k-toolbar-divider"></div>`); continue; }
    if (tool.mode) {
      const dis = t.disabled;
      parts.push(`<button class="${cls("k-mode-btn", (t.modeMenu || t.modePressed) && "is-open", t.mode === "VR" || t.mode === "AR" ? "is-xr" : "", dis && "is-disabled")}" data-anchor="mode" title="View mode  5">${esc(t.mode || "2D")}${icon("chevron-down", 16, 'class="k-mode-caret"')}</button>`);
      continue;
    }
    const dis = (t.disabled && tool.id !== "select") || (t.disabledTools || {})[tool.id];
    let sel = tool.id === pressed || (tool.id === "time" && time?.on) || (tool.id === "actions" && t.palette);
    if (tool.id === "select" && t.palette) sel = false;
    // Hand is drawn as Select's face while it is the chosen variant.
    const ic = tool.id === "select" && faces.select === "Hand" ? "hand" : tool.icon;
    const title = `${tool.tip}  ${tool.key}`;
    const btn = `<button class="${cls("k-tool", sel && "is-selected", dis && "is-disabled", t.hover === tool.id && "is-hover")}" title="${esc(title)}" aria-label="${esc(tool.tip)}" data-anchor="tool-${tool.id}">${icon(ic)}</button>`;
    const chev = tool.chevron || (tool.id === "time" && time?.columns);
    if (chev) {
      const open = t.openFlyout === tool.id;
      parts.push(`<div class="k-tool-group">${btn}<button class="${cls("k-tool-chevron", dis && "is-disabled", open && "is-open")}" title="${esc(tool.menuTip || tool.tip)}" data-anchor="chevron-${tool.id}">${icon("chevron-down", 16)}</button></div>`);
    } else parts.push(btn);
  }
  return `<div class="k-toolbar k-toolbar-float">${parts.join("")}</div>`;
}

// A toolbar control's tooltip (round-4 section 3.1: the tooltip is the
// label): the name and the key, then the one sentence; drawn above the bar.
export function toolTipHtml(id, spec = {}) {
  const tool = TOOLS.find((x) => x.id === id);
  if (id === "mode") return tooltipHtml({ name: "View mode", key: "5", say: "2D or 3D; VR and AR from its menu", anchor: { el: "mode", side: "above", align: "center" }, arrow: "above" });
  if (!tool) throw new Error("render.mjs: no toolbar control " + id);
  let say = tool.say;
  if (id === "time") { const tm = timeOf(spec.toolbar, spec); if (tm?.say) say = tm.say; }
  return tooltipHtml({ name: tool.tip, key: tool.key, say, anchor: { el: `tool-${id}`, side: "above", align: "center", dy: -8 }, arrow: "above" });
}

// The view-mode menu (round-4 section 3.4): the dark menu above the mode
// button: 2D and 3D with the 5 key, VR and AR with "Showing >"; a check on
// the current mode; a mode the browser cannot start dimmed with its reason
// (disabledTools). xr: false leaves VR and AR out.
export function modeMenu(t = {}) {
  const cur = t.mode || "2D", dt = t.disabledTools || {};
  const xr = t.mode === "VR" || t.mode === "AR";
  const rows = (t.xr === false ? MODES.slice(0, 2) : MODES).map((m) => ({ label: m, checked: m === cur, key: m === "2D" || m === "3D" ? "5" : "", sub: (m === "VR" || m === "AR") && !dt[m] ? true : undefined, note: (m === "VR" || m === "AR") && !dt[m] ? "Showing" : undefined, disabled: !!dt[m], reason: dt[m], highlighted: t.modePressed === m }));
  if (xr) rows.unshift({ label: `Exit ${t.mode}`, checked: false }, { divider: true });
  return { anchor: { el: "mode", side: "above", align: "end", dy: -8 }, width: 280, rows, ...(t.modeSubmenu ? { submenu: { of: t.modePressed || "VR", rows: t.modeSubmenu } } : {}) };
}

// The command palette (round-4 section 4; compact-mantine QuickActions):
// 529 x 354, light, radius 13, 8 px above the toolbar and centred on it.
// palette: { query (typed text; empty shows the placeholder), scope: "All",
// sections: [{ title, rows: [{ icon, label, note, key, active }] }] }.
export function paletteHtml(p) {
  if (!p) return "";
  const tabs = ["All", "Commands", "Objects", "Nodes"].map((x) => `<button class="k-tab${x === (p.scope || "All") ? " is-selected" : ""}">${x}</button>`).join("");
  const secs = (p.sections || []).map((sec) => `${sec.title ? `<div class="k-palette-head">${esc(sec.title)}</div>` : ""}${sec.rows.map((r) => `<div class="${cls("k-palette-row", r.active && "is-active")}"><span class="k-palette-icon">${r.icon ? icon(r.icon, 16) : ""}</span><span class="k-palette-label">${esc(r.label)}${r.note ? `<span class="k-palette-note">${esc(r.note)}</span>` : ""}</span>${r.key ? `<span class="k-palette-key">${esc(r.key)}</span>` : ""}</div>`).join("")}`).join("");
  return `<div class="k-palette" role="dialog" aria-label="Actions"><div class="k-palette-search">${icon("search", 16)}<span class="${p.query ? "" : "k-tertiary"}">${esc(p.query || "Search commands, objects and nodes")}</span>${p.query ? `<i class="k-caret-bar"></i>` : ""}</div><div class="k-palette-tabs k-tabs">${tabs}</div><div class="k-palette-body">${secs}</div></div>`;
}

// A flyout, drawn open above its tool's chevron (or static on the reference
// page). o: { tool, pressed (row name with "..." pressed), faces, costs,
// place: true|false, hasSecondary, reference }. In the app frame a proposed
// row is absent (it appears when its capability is registered); the
// reference page draws it at 50 percent with its issue number.
export function flyoutHtml(o) {
  const tool = TOOLS.find((x) => x.id === o.tool);
  if (!tool?.flyout) return "";
  const face = { ...FACES, ...(o.faces || {}) }[tool.id];
  let rows = "";
  if (tool.target) rows += `<div class="k-menu-target"><span>Target</span><div class="k-seg">${tool.target.map((x, i) => `<button class="k-seg-opt has-text${i === 0 ? " is-checked" : ""}">${x}</button>`).join("")}</div></div>`;
  for (const r of tool.flyout) {
    if (r.divider) { rows += `<div class="k-menu-sep"></div>`; continue; }
    if (r.proposed && !o.reference) continue;
    if (r.icon && !r.kind) { // a variant that is a mode of its tool (Hand), with its key
      rows += `<div class="${cls("k-menu-item", r.name === face && "is-face")}"><span class="k-tree-icon">${icon(r.icon, 16)}</span><span class="k-menu-label">${esc(r.name)}</span><span class="k-menu-cost">${esc(r.key || "")}</span></div>`;
      continue;
    }
    const cost = (o.costs || {})[r.name] ?? r.cost;
    const isFace = r.name === face;
    if (r.check) {
      rows += `<div class="k-menu-item k-menu-check-row${r.proposed ? " is-proposed" : ""}"><span class="k-tree-icon"></span><label class="k-check"><span class="k-check-box">${icon("check-16", 16, 'class="k-check-tick"')}</span><span>${esc(r.name)}</span></label><span class="k-menu-tech">${esc(r.tech)}</span></div>`;
      continue;
    }
    rows += `<div class="${cls("k-menu-item", isFace && "is-face", r.proposed && "is-proposed")}"${attr("data-flyrow", r.name)}><span class="k-tree-icon">${r.kind ? icon(KIND_ICON[r.kind], 16) : r.name === "Select" ? icon("cursor", 16) : ""}</span><span class="k-menu-label">${esc(r.name)}${r.tech ? `<span class="k-menu-tech">${esc(r.tech)}</span>` : ""}</span>${r.key && !cost ? `<span class="k-menu-cost">${esc(r.key)}</span>` : ""}${cost ? `<span class="k-menu-cost">${esc(cost)}${r.key ? `  ${esc(r.key)}` : ""}</span>` : ""}${r.issue ? `<span class="k-menu-issue">${esc(r.issue)}</span>` : ""}${r.dots ? `<span class="k-menu-dots${o.pressed === r.name ? " is-pressed" : ""}">${icon("more")}</span>` : ""}</div>`;
  }
  if (tool.foot && o.reference) rows += `<div class="k-menu-foot">${esc(tool.foot)}</div>`;
  // In the app frame the flyout opens above its tool, its left edge on the
  // tool's, 8 px above the bar (or above the secondary bar), kept inside the
  // stage by the placing script (data-clamp).
  const place = o.place !== false && !o.reference
    ? ` data-anchor-to="[data-anchor=&quot;tool-${tool.id}&quot;]" data-side="above" data-align="start" data-dx="0" data-dy="${-12 - (o.hasSecondary ? 48 : 0)}" data-clamp="stage"`
    : "";
  return `<div class="k-menu k-flyout${place ? " is-placed" : ""}${o.hasSecondary ? " has-secondary" : ""}"${place}>${rows}</div>`;
}

// The secondary bar: one sentence per tool from toolbar.mjs.
// The secondary bar: one sentence per tool from toolbar.mjs, or free parts
// (s.parts) for a bar that is not a tool's (Find, the keyboard caption, an
// empty result, Present). Parts: "text", { text, secondary }, { select },
// { ghost, disabled }, { button, disabled } (the one light control),
// { cancel: true | "label" }, { field, caret, width } (a dark text field),
// { chip, removable } (a picked node), { count } (a live count in bold).
// o.dimPrimary dims the light button while a popover carries the primary.
export function secondaryBarHtml(s, o = {}) {
  if (!s) return "";
  const raw = s.parts || SECONDARY[s.tool]?.(s) || [s.text];
  // Round 4 (section 3.5): Options is the gear, Cancel is the X, and
  // "Create and focus" is the second row of the Create split button.
  const parts = [];
  for (const p of raw) {
    if (p && p.ghost === "Options") { parts.push({ gear: true }); continue; }
    if (p && p.ghost === "Create and focus") { const k = parts.findLastIndex((x) => x && x.button); if (k >= 0) parts[k] = { split: parts[k].button, disabled: parts[k].disabled }; continue; }
    parts.push(p);
  }
  const html = parts.map((p) => {
    if (typeof p === "string") return `<span>${esc(p)}</span>`;
    if (p.text != null) return `<span class="${p.secondary ? "k-bar-secondary" : ""}">${esc(p.text)}</span>`;
    if (p.count != null) return `<span class="k-bar-count">${esc(p.count)}</span>`;
    if (p.select) return `<button class="k-select"><span>${esc(p.select)}</span>${icon("chevron-down")}</button>`;
    if (p.gear) return iconBtn("settings", { title: "Options", pressed: p.pressed });
    if (p.ghost) return `<button class="k-btn k-btn-ghost${p.disabled ? " is-disabled" : ""}">${esc(p.ghost)}</button>`;
    if (p.button) return `<button class="k-btn${p.disabled || o.dimPrimary ? " is-disabled" : ""}">${esc(p.button)}</button>`;
    if (p.split) return `<span class="k-split${p.disabled || o.dimPrimary ? " is-disabled" : ""}"><button class="k-btn">${esc(p.split)}</button><button class="k-btn k-split-caret" title="Create and focus">${icon("chevron-down", 16)}</button></span>`;
    if (p.cancel) return p.cancel === true ? iconBtn("close", { title: "Cancel  Esc" }) : `<button class="k-btn k-btn-ghost k-cancel">${esc(p.cancel)}</button>`;
    if (p.field != null) return `<span class="k-bar-field"${p.width ? ` style="width:${p.width}px"` : ""}><span>${esc(p.field)}</span>${p.caret ? `<i class="k-caret-bar"></i>` : ""}</span>`;
    if (p.chip) return `<span class="k-bar-chip">${esc(p.chip)}${p.removable ? icon("close", 16) : ""}</span>`;
    return "";
  }).join("");
  return `<div class="k-secondary-bar${s.caption ? " is-caption" : ""}">${html}</div>`;
}

// An anchored light popover. p: { title, rows, footer: [{label, primary}],
// left|right, top|bottom, caret: "bottom"|"left"|"right", caretAt }. With
// anchorRow: "Bridges" the popover opens beside the open flyout's row, to its
// left (a caret pointing right at the row) because the flyouts of the
// right-hand tools leave no room on the right.
// A footer button: { label, primary, disabled, danger, ghost }.
const footBtn = (b) => `<button class="${cls("k-btn", b.danger ? (b.primary ? "k-btn-danger" : "k-btn-danger-secondary") : b.ghost ? "k-btn-ghost" : !b.primary && "k-btn-secondary", b.disabled && "is-disabled")}">${esc(b.label)}</button>`;

// Where a float (a popover, a menu, an inset, a tooltip) is placed: explicit
// left|right|top|bottom px, or anchor: { el | row | node | inspectorRow |
// column, side: "below"|"above"|"left"|"right", align: "start"|"end"|"center",
// dx, dy }, resolved in the browser by the positioning script at the foot of
// the page against the element that carries the matching data attribute.
function placeAttrs(p) {
  const pos = ["left", "right", "top", "bottom"].filter((k) => p[k] != null).map((k) => `${k}:${p[k]}px`).join(";");
  const a = p.anchor;
  if (!a) return { pos, data: "" };
  const sel = a.sel ? a.sel : a.el ? `[data-anchor="${a.el}"]` : a.row ? `.k-panel-left [data-row="${a.row}"]` : a.node != null ? `[data-node="${a.node}"]` : a.inspectorRow != null ? `.k-insp-body > :nth-child(${a.inspectorRow + 1})` : a.column ? `[data-column="${a.column}"]` : a.dialogRow != null ? `.k-dialog .k-popover-body > :nth-child(${a.dialogRow + 1})` : "";
  return { pos, data: ` data-anchor-to="${esc(sel)}" data-side="${a.side || "below"}" data-align="${a.align || "start"}" data-dx="${a.dx || 0}" data-dy="${a.dy || 0}"${p.clamp ? ` data-clamp="${p.clamp}"` : ""}` };
}

export function popoverHtml(p, ctx = {}) {
  if (!p) return "";
  if (p.anchorRow && ctx.toolbar?.openFlyout) {
    p = { ...p, left: undefined, right: undefined, top: undefined, bottom: undefined, anchor: { sel: `.k-flyout [data-flyrow="${p.anchorRow}"]`, side: "left", align: "start", dx: -4, dy: -8 }, caret: "right", clamp: "stage" };
  }
  const { pos, data } = placeAttrs(p);
  const anchored = pos || data ? " is-anchored" : ""; // no position given: drawn in flow (the reference page)
  const caret = p.caret ? ` k-caret-${p.caret}` : "";
  const caretVar = p.caretAt != null ? `;--caret-x:${p.caretAt}px;--caret-y:${p.caretAt}px` : "";
  const width = p.width ? `;width:${p.width}px` : "";
  const foot = p.footer ? `<div class="k-popover-foot">${p.footer.map(footBtn).join("")}</div>` : "";
  const head = p.title == null ? "" : `<div class="k-popover-header"><span class="k-title">${esc(p.title)}</span>${p.headNote ? `<span class="k-secondary">${esc(p.headNote)}</span>` : ""}${p.noClose ? "" : iconBtn("close")}</div>`;
  return `<div class="k-popover${anchored}${caret}${p.card ? " is-card" : ""}${p.aboveScrim ? " is-above-scrim" : ""}" style="${pos}${caretVar}${width}"${data}>${head}<div class="k-popover-body">${(p.rows || []).map(rowHtml).join("")}${foot}</div></div>`;
}

// A modal dialog centred on the stage over a scrim (the Import dialog, the
// reload dialog). dialog: { title, size: "sm" (the kit's 320 px
// confirmation), tabs: [..], tab, rows: [row types], footer: [{label,
// primary, disabled, danger}], note (a line at the footer's left) }
export function dialogHtml(d) {
  if (!d) return "";
  const foot = d.footer ? `<div class="k-dialog-footer">${d.note ? `<span class="k-dialog-foot-note">${esc(d.note)}</span>` : ""}${d.footer.map(footBtn).join("")}</div>` : "";
  const tabs = d.tabs ? `<div class="k-dialog-tabs"><div class="k-seg k-seg-fill">${d.tabs.map((t) => `<button class="k-seg-opt has-text${t === d.tab ? " is-checked" : ""}">${esc(t)}</button>`).join("")}</div></div>` : "";
  return `<div class="k-scrim"></div><div class="k-dialog${d.size === "sm" ? " k-dialog-sm" : ""}"${d.top != null || d.left != null ? ` style="${d.top != null ? `top:${d.top}px;` : ""}${d.left != null ? `left:${d.left}px;` : ""}transform:translate(${d.left != null ? "0" : "-50%"},${d.top != null ? "0" : "-50%"})"` : ""}><div class="k-dialog-header"><span class="k-title">${esc(d.title)}</span>${iconBtn("close")}</div>${tabs}<div class="k-popover-body">${(d.rows || []).map(rowHtml).join("")}</div>${foot}</div>`;
}

// The dock handle (closed) or the open dock. dock: { open: false, tab:
// "Table", disabled, height, table: { tabs, showing, columns: [{label, width,
// sorted, chip}], rows, selectedRow, scrolled } }
// A table cell: a string, or { text, link, icon, chip, buttons: [labels],
// secondary, strong }. Links and buttons are per-row actions.
function cellHtml(v) {
  if (v == null || typeof v !== "object") return esc(v);
  const parts = [];
  if (v.icon) parts.push(icon(v.icon, 16, 'class="k-cell-icon"'));
  if (v.chip) parts.push(chipHtml(v.chip));
  if (v.text != null) parts.push(`<span class="${cls(v.secondary && "k-secondary", v.strong && "k-strong", v.tone && `k-tone-${v.tone}`)}">${esc(v.text)}</span>`);
  if (v.link) parts.push(`<span class="k-link">${esc(v.link)}</span>`);
  for (const b of v.buttons || []) parts.push(`<button class="k-btn k-btn-secondary k-cell-btn">${esc(b)}</button>`);
  return `<span class="k-cell-in">${parts.join("")}</span>`;
}

// A chart drawn above the dock's table (the Findings tab). chart: { type:
// "line", series: [{ values, color, label }], labels, window: [i0, i1], height }
// or { type: "alluvial", steps: [labels], groups: [{ color, sizes: [per step],
// from, into, label }], window: [i0, i1], height }.
export function chartSvg(ch, W = 900) {
  const H = ch.height || 96, padL = 40, padR = 16, padT = 8, padB = 18;
  const n = (ch.labels || ch.steps).length;
  const X = (i) => padL + ((W - padL - padR) * i) / (n - 1);
  const labels = (ch.labels || ch.steps).map((t, i) => `<text x="${X(i).toFixed(1)}" y="${H - 4}" text-anchor="middle">${esc(t)}</text>`).join("");
  const win = ch.window ? `<rect x="${X(ch.window[0]) - 6}" y="${padT}" width="${X(ch.window[1]) - X(ch.window[0]) + 12}" height="${H - padT - padB}" fill="#0d99ff1f"/>` : "";
  let body = "";
  if (ch.type === "line") {
    const all = ch.series.flatMap((s) => s.values), lo = Math.min(...all), hi = Math.max(...all);
    const Y = (v) => padT + (H - padT - padB) * (1 - (v - lo) / (hi - lo || 1));
    body = ch.series.map((s) => `<polyline fill="none" stroke="${esc(s.color || "var(--k-bg-brand)")}" stroke-width="1.5" points="${s.values.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ")}"/>${s.values.map((v, i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="2" fill="${esc(s.color || "var(--k-bg-brand)")}"/>`).join("")}<text x="${padL - 6}" y="${Y(hi) + 4}" text-anchor="end">${esc(s.hiLabel ?? hi)}</text><text x="${padL - 6}" y="${Y(lo) + 4}" text-anchor="end">${esc(s.loLabel ?? lo)}</text>`).join("");
  } else {
    // Alluvial: at each step the groups stack from the top; a group's band
    // runs to the next step; a group that starts with `from` forks out of
    // that group's band, one that ends with `into` flows into that group.
    const tot = Math.max(...Array.from({ length: n }, (_, i) => ch.groups.reduce((t, g) => t + (g.sizes[i] || 0), 0)));
    const gap = 3, k = (H - padT - padB - gap * ch.groups.length) / tot;
    const y0 = ch.groups.map(() => []);
    for (let i = 0; i < n; i++) { let y = padT; ch.groups.forEach((g, gi) => { y0[gi][i] = y; if (g.sizes[i]) y += g.sizes[i] * k + gap; }); }
    const band = (xa, ya, ha, xb, yb, hb, color) => { const m = (xa + xb) / 2; return `<path d="M${xa},${ya} C${m},${ya} ${m},${yb} ${xb},${yb} L${xb},${yb + hb} C${m},${yb + hb} ${m},${ya + ha} ${xa},${ya + ha} Z" fill="${esc(color)}" opacity=".75"/>`; };
    ch.groups.forEach((g, gi) => {
      for (let i = 0; i < n; i++) {
        const s = g.sizes[i] || 0;
        if (s) body += `<rect x="${X(i) - 4}" y="${y0[gi][i].toFixed(1)}" width="8" height="${(s * k).toFixed(1)}" fill="${esc(g.color)}"/>`;
        if (i < n - 1 && s && g.sizes[i + 1]) body += band(X(i) + 4, y0[gi][i], s * k, X(i + 1) - 4, y0[gi][i + 1], g.sizes[i + 1] * k, g.color);
        if (i < n - 1 && !s && g.sizes[i + 1] && g.from != null) { const p = g.from; body += band(X(i) + 4, y0[p][i] + (ch.groups[p].sizes[i] - g.sizes[i + 1]) * k, g.sizes[i + 1] * k, X(i + 1) - 4, y0[gi][i + 1], g.sizes[i + 1] * k, g.color); }
        if (i < n - 1 && s && !g.sizes[i + 1] && g.into != null) body += band(X(i) + 4, y0[gi][i], s * k, X(i + 1) - 4, y0[g.into][i + 1] + (ch.groups[g.into].sizes[i + 1] - s) * k, s * k, g.color);
      }
    });
  }
  return `<svg class="k-dock-chart" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${win}${body}${labels}</svg>`;
}

// The History dock: one row per step, oldest first. history: { rows: [{
// icon, step, object, by, when, state: "current" | "undone", actions: [..] }],
// hover (row index), note }.
function historyHtml(hs) {
  const rows = hs.rows.map((r, i) => `<div class="${cls("k-hist-row", r.state === "current" && "is-current", r.state === "undone" && "is-undone", hs.hover === i && "is-hover")}"><span class="k-hist-icon">${icon(r.icon || "history", 16)}</span><span class="k-hist-step">${esc(r.step)}</span><span class="k-hist-object">${esc(r.object || "")}</span><span class="k-hist-by">${r.by === "Assistant" ? icon("sparkle", 16) : ""}${esc(r.by || "")}</span><span class="k-hist-when">${esc(r.when || "")}${r.state === "current" ? `<span class="k-hist-tag">now</span>` : r.state === "undone" ? `<span class="k-hist-tag">undone</span>` : ""}</span><span class="k-hist-actions">${(r.actions || []).map((a) => `<button class="k-btn k-btn-secondary k-cell-btn">${esc(a)}</button>`).join("")}</span></div>`).join("");
  return `<div class="k-hist">${rows}${hs.note ? `<div class="k-hist-note">${esc(hs.note)}</div>` : ""}</div>`;
}

// The Assistant tab: assistant: { scope, turns: [{ who, text, tool, made: {
// name, action, state } }], composer, privacy }.
function assistantHtml(a) {
  const turns = a.turns.map((t) => {
    const made = t.made ? `<div class="k-as-made">${icon("sparkle", 16)}<span>Made</span><span class="k-link">${esc(t.made.name)}</span>${t.made.state ? `<span class="k-secondary">${esc(t.made.state)}</span>` : ""}${t.made.action ? `<button class="k-btn k-btn-secondary k-cell-btn">${esc(t.made.action)}</button>` : ""}</div>` : "";
    const tool = t.tool ? `<div class="k-as-tool">${icon("chevron-right", 16)}<span>${esc(t.tool)}</span><span class="k-spacer"></span><span class="k-link">Copy command</span></div>` : "";
    return `<div class="k-as-turn is-${t.who === "You" ? "you" : "assistant"}"><span class="k-as-who">${t.who === "You" ? "" : icon("sparkle", 16)}${esc(t.who)}</span><div class="k-as-body"><div class="k-as-text">${esc(t.text)}</div>${tool}${made}</div></div>`;
  }).join("");
  const composer = `<div class="k-as-composer"><div class="k-input k-as-input"><span class="k-input-value k-tertiary">${esc(a.composer || "Ask about this graph")}</span>${iconBtn("mic", { title: "Speak" })}</div><button class="k-btn">Send</button></div>`;
  return `<div class="k-as">${turns}</div>${a.privacy ? `<div class="k-as-privacy">${icon("info", 16)}<span>${esc(a.privacy)}</span><span class="k-link">Settings</span></div>` : ""}${composer}`;
}

export function dockHtml(d = {}) {
  const tabs = ["Table", "History"]; // round 4: the Assistant is the AI rail panel
  const strip = tabs.map((x) => `<button class="k-tab${d.open && d.tab === x ? " is-selected" : ""}">${x}</button>`).join("");
  if (!d.open) return `<div class="k-dock-handle${d.disabled ? " is-disabled" : ""}">${strip}</div>`;
  const tb = d.table || {};
  const h = d.height || 320;
  // Per-tab header: the sub-tabs, Showing (a table tab), the search field
  // (with typed text and a count), the close button.
  const sub = (tb.tabs || []).map((x) => `<button class="k-tab${x.selected ? " is-selected" : ""}">${esc(x.label)}</button>`).join("");
  if (d.assistant) throw new Error("render.mjs: the Assistant left the dock in round 4; use left: { panel: \"ai\", ai: {...} }");
  const showing = d.history ? "" : tb.showing === false ? "" : `<span class="k-secondary">Showing</span><button class="k-select" style="width:auto"><span>${esc(tb.showing || "Everything")}</span>${icon("chevron-down")}</button>`;
  const scope = d.assistant ? `<span class="k-secondary">On</span><button class="k-select" style="width:auto"><span>${esc(d.assistant.scope)}</span>${icon("chevron-down")}</button>` : d.history ? `<span class="k-secondary">Showing</span><button class="k-select" style="width:auto"><span>${esc(d.history.showing || "All objects")}</span>${icon("chevron-down")}</button>` : "";
  const search = tb.search === false || d.assistant ? "" : `<div class="k-input k-search${tb.search ? " is-focus" : ""}"><span class="k-input-slot">${icon("search", 16)}</span><span class="k-input-value${tb.search ? "" : " k-tertiary"}">${esc(tb.search || "Search")}</span>${tb.searchCount ? `<span class="k-find-count">${esc(tb.searchCount)}</span>` : ""}</div>`;
  const head = `<div class="k-dock-head"><div class="k-tabs">${strip}</div>${sub ? `<div class="k-status-sep"></div><div class="k-tabs">${sub}</div>` : ""}${showing}${scope}<span class="k-spacer"></span>${search}${iconBtn("close")}</div>`;
  if (d.history) return `<div class="k-dock" style="height:${h}px">${head}${historyHtml(d.history)}</div>`;
  if (d.assistant) return `<div class="k-dock is-assistant" style="height:${h}px">${head}${assistantHtml(d.assistant)}</div>`;
  const cols = tb.columns || [];
  const grid = `grid-template-columns:16px ${cols.map((c) => c.width || "1fr").join(" ")}`;
  let cells = `<span class="k-cell is-handle"></span>` + cols.map((c) => `<span class="k-cell is-head"${attr("data-column", c.label)}>${c.chip ? chipHtml(c.chip) : ""}${esc(c.label)}${c.sorted ? icon("chevron-down", 16, 'style="display:inline;vertical-align:middle"') : ""}${c.menuOpen ? `<span class="k-cell-menu is-open">${icon("more", 16)}</span>` : ""}</span>`).join("");
  const ed = tb.editCell;
  (tb.rows || []).forEach((r, i) => {
    const sel = i === tb.selectedRow ? " is-selected" : "";
    cells += `<span class="k-cell is-handle${sel}">${icon("grip", 16)}</span>` + r.map((v, j) => (ed && ed.row === i && ed.col === j
      ? `<span class="k-cell${sel} is-editing"><span class="k-cell-edit${ed.error ? " is-invalid" : ""}">${esc(ed.value)}<i class="k-caret-bar"></i></span>${ed.error ? `<span class="k-cell-error">${esc(ed.error)}</span>` : ""}</span>`
      : `<span class="k-cell${sel}">${cellHtml(v)}</span>`)).join("");
  });
  const chart = d.chart ? `<div class="k-dock-chart-box">${d.chart.title ? `<div class="k-dock-chart-title">${esc(d.chart.title)}</div>` : ""}${chartSvg(d.chart)}</div>` : "";
  const foot = d.footer ? `<div class="k-dock-foot">${d.footer.link ? `<span class="k-link">${esc(d.footer.link)}</span>` : ""}${d.footer.text ? `<span class="k-secondary">${esc(d.footer.text)}</span>` : ""}</div>` : "";
  // A scrolled table shows a thumb whose position says where the page is (0..1).
  const thumb = tb.scrolled != null ? `<div class="k-dock-scroll" style="top:${Math.round(36 + (h - 40 - 60) * (tb.scrolled === true ? 0.8 : tb.scrolled))}px;height:60px"></div>` : "";
  return `<div class="k-dock" style="height:${h}px">${head}${chart}<div class="k-dock-table" style="${grid}">${cells}</div>${foot}${thumb}</div>`;
}

// The time transport bar. t: { window, speed, from, to, ticks: [pos 0..1],
// changes: [pos], band: [a, b] (0..1), counts, gearPressed }. The band is
// drawn first so the marks stay visible over it.
export function transportHtml(t) {
  if (!t) return "";
  const ticks = (t.ticks || []).map((p) => `<span class="k-slider-tick" style="left:${(p * 100).toFixed(2)}%"></span>`).join("");
  const changes = (t.changes || []).map((p) => `<span class="k-slider-tick is-change" style="left:${(p * 100).toFixed(2)}%"></span>`).join("");
  const band = t.band ? `<span class="k-slider-band" style="left:${(t.band[0] * 100).toFixed(2)}%;width:${((t.band[1] - t.band[0]) * 100).toFixed(2)}%"></span>` : "";
  return `<div class="k-transport"><span class="k-window">${esc(t.window)}</span>${iconBtn("step-back")}${iconBtn(t.playing ? "pause" : "play")}${iconBtn("step-fwd")}<span class="k-secondary">Speed</span><button class="k-select" style="width:56px"><span>${esc(t.speed || "1x")}</span>${icon("chevron-down")}</button><div class="k-slider"><div class="k-slider-track"></div>${band}${ticks}${changes}<span class="k-slider-end">${esc(t.from)}</span><span class="k-slider-end is-right">${esc(t.to)}</span></div><span class="k-counts"><span class="k-count">${[].concat(t.counts || []).map((c) => `<span>${esc(c)}</span>`).join("")}</span></span>${iconBtn("settings", { pressed: t.gearPressed })}${iconBtn("close")}</div>`;
}

// The stage size for a frame: the canvas column minus the status bar, the
// transport bar and the dock (open) or its handle.
export function stageSize(spec) {
  const f = { ...FRAME, ...(spec.frame || {}) };
  const ov = spec.canvas?.overlays || {};
  const w = f.w - f.rail - f.panel - (f.panel + 1);
  const h = f.h - f.status - (ov.transport ? f.transport : 0) - (ov.dock?.open ? (ov.dock.height || 320) : f.handle);
  return { w, h };
}

// The dark tooltip. t: { text | lines: [..], left, top } or with anchor.
export function tooltipHtml(t) {
  if (!t) return "";
  const { pos, data } = placeAttrs(t);
  // { name, key, say }: the name and its key on one line, the sentence under it.
  if (t.name) return `<div class="k-tooltip is-wrap k-float-tip k-tip-rich${t.arrow ? ` k-tip-${t.arrow}` : ""}" style="${pos}"${data}><div><span class="k-tip-title">${esc(t.name)}</span>${t.key ? `<span class="k-shortcut">${esc(t.key)}</span>` : ""}</div>${t.say ? `<div class="k-tip-say">${esc(t.say)}</div>` : ""}</div>`;
  const body = t.lines ? t.lines.map((l, i) => `<div class="${i === 0 ? "k-tip-title" : "k-tip-line"}">${Array.isArray(l) ? `<span class="k-tip-key">${esc(l[0])}</span><span>${esc(l[1])}</span>` : esc(l)}</div>`).join("") : esc(t.text);
  return `<div class="k-tooltip is-wrap k-float-tip${t.lines ? " is-multi" : ""}${t.arrow ? ` k-tip-${t.arrow}` : ""}" style="${pos}"${data}>${body}</div>`;
}

// Canvas overlays drawn over the graph (stage coordinates).
function stageOverlays(ov, c) {
  let out = "";
  // A line from a node to the pointer (the Path start, Connect to...).
  if (ov.rubberBand) {
    const r = ov.rubberBand;
    out += `<svg class="k-rubber"><line x1="${r.from.x}" y1="${r.from.y}" x2="${r.to.x}" y2="${r.to.y}" stroke="var(--k-border-selected)" stroke-width="1.5" stroke-dasharray="5 4"/><circle cx="${r.to.x}" cy="${r.to.y}" r="3" fill="var(--k-border-selected)"/></svg>`;
  }
  // The export frame: the picture's edges, dashed, with its size.
  if (ov.exportFrame) {
    const f = ov.exportFrame;
    out += `<div class="k-export-frame" style="left:${f.x}px;top:${f.y}px;width:${f.w}px;height:${f.h}px"><span>${esc(f.label || "")}</span></div>`;
  }
  // The drop overlay: a dashed brand outline over the whole stage and one line.
  if (ov.drop) out += `<div class="k-drop"><span>${icon("data", 16)}${esc(ov.drop.text)}</span></div>`;
  // A centred card with no close button (a load in progress).
  if (ov.stageCard) out += `<div class="k-stage-card">${popoverHtml({ ...ov.stageCard, noClose: true, card: true })}</div>`;
  if (ov.minimap) out += minimapHtml(ov.minimap, c);
  return out;
}

// Two panes side by side (Compare): canvas.panes: [{ title, nodes, edges,
// labels, legend }, ...], each drawn on half the stage with its own legend.
function panesHtml(c, w, h) {
  const pw = Math.floor((w - 1) / 2);
  return `<div class="k-panes">${c.panes.map((p, i) => `<div class="k-pane" style="width:${pw}px"><div class="k-pane-title">${esc(p.title)}</div>${graphSvg({ ...c, ...p, camera: p.camera || c.camera }, pw, h, {})}${p.legend ? legendCard(p.legend, { pane: true }) : ""}</div>${i === 0 ? `<div class="k-pane-divider"></div>` : ""}`).join("")}</div>`;
}

export function canvasColumn(spec) {
  const c = spec.canvas || {};
  const tb = spec.toolbar || {};
  const overlays = c.overlays || {};
  const { w, h } = stageSize(spec);
  const pops = [].concat(overlays.popover || [], overlays.popovers || []);
  // With insets at the stage's left, the dialog moves right of them so both
  // read at full strength.
  let dialog = overlays.dialog;
  if (dialog && dialog.left == null && spec.insets) {
    const right = insetRight(spec);
    if (right) dialog = { ...dialog, left: Math.min(right + 16, w - (dialog.size === "sm" ? 320 : 480) - 8) };
  }
  // The legend hides while a flyout or a popover is open: the transient
  // overlay wins the corner, unless the popover says keepLegend. It lifts
  // while the secondary bar shows.
  const legendOn = !!overlays.legend && !tb.openFlyout && pops.every((p) => p.keepLegend) && !overlays.dialog;
  const graph = c.graph === false ? "" : c.panes ? panesHtml(c, w, h) : graphSvg(c, w, h, { legend: !!overlays.legend, insetRight: insetRight(spec) });
  const stage = [
    graph,
    stageOverlays(overlays, c),
    welcomeSheet(overlays.welcome),
    overlays.marquee ? `<div class="k-marquee-box" style="left:${overlays.marquee.x}px;top:${overlays.marquee.y}px;width:${overlays.marquee.w}px;height:${overlays.marquee.h}px"></div>` : "",
    overlays.cursor ? `<div class="k-tool-cursor" style="left:${overlays.cursor.x}px;top:${overlays.cursor.y}px">${icon(overlays.cursor.icon || "cursor")}</div>` : "",
    legendOn ? legendCard(overlays.legend, { secondary: !!tb.secondary }) : "",
    toolbarHtml(tb, spec),
    secondaryBarHtml(tb.secondary, { dimPrimary: pops.some((p) => p.carriesPrimary) }),
    paletteHtml(tb.palette),
    tb.openFlyout ? flyoutHtml({ tool: tb.openFlyout, pressed: tb.flyoutPressed, faces: tb.faces, costs: tb.costs, hasSecondary: !!tb.secondary, time: !!timeOf(tb, spec) }) : "",
    pops.filter((p) => !p.aboveScrim).map((p) => popoverHtml(p, { toolbar: tb, stageH: h, stageW: w, time: !!timeOf(tb, spec) })).join(""),
    tooltipHtml(overlays.tooltip),
    dialogHtml(dialog),
    pops.filter((p) => p.aboveScrim).map((p) => popoverHtml(p, { toolbar: tb, stageH: h, stageW: w, time: !!timeOf(tb, spec) })).join(""),
  ].join("");
  return `<main class="k-canvas"><div class="k-canvas-stage">${stage}</div>${transportHtml(overlays.transport)}${dockHtml(overlays.dock)}</main>`;
}

// ---------------------------------------------------------------- inspector

const selectHtml = (r) => {
  const face = r.ramp || r.strip
    ? `<span class="k-select-strip" style="--stops:${r.ramp ? r.ramp.map(esc).join(",") : r.strip.map((c2, i, a) => `${esc(c2)} ${(100 * i / a.length).toFixed(1)}% ${(100 * (i + 1) / a.length).toFixed(1)}%`).join(",")}"></span>`
    : `<span>${esc(r.value)}</span>`;
  return `<button class="${cls("k-select", (r.ramp || r.strip) && "has-strip", r.note && "k-fixed", r.disabled && "is-disabled")}"${attr("title", r.ramp || r.strip ? r.value : null)}>${face}${icon("chevron-down")}</button>`;
};
const rowActions = (as) => (as && as.length ? `<span class="k-row-actions">${as.map((a) => iconBtn(a)).join("")}</span>` : "");
const propCls = (r) => cls("k-prop", r.wideLabel && "k-label-wide", r.wide && "k-label-fill");

// The row vocabulary. Every row is 32px unless noted.
export function rowHtml(r) {
  switch (r.type) {
    case "keyValue": { // { pairs: [{label, value, note, action, info, chevron, secondary, wide}] }
      const one = r.pairs.length === 1 && r.pairs[0];
      const wide = one && (one.action || one.wide || one.chevron || one.note);
      // was: the old value, struck through before the new one (an edit, a changed option).
      const pair = (p) => `<span class="${cls("k-kv", wide && "k-kv-wide", p.secondary && "is-secondary")}"><span class="k-secondary">${esc(p.label)}</span>${p.was != null ? `<s class="k-was">${esc(p.was)}</s>` : ""}<span${p.tone ? ` class="k-tone-${p.tone}"` : ""}>${esc(p.value)}</span>${p.note ? `<span class="k-kv-note">${esc(p.note)}</span>` : ""}${p.info ? icon("info", 16, 'class="k-info"') : ""}${p.action ? `<span class="k-link">${esc(p.action)}</span>` : ""}${p.chevron ? icon("chevron-right", 24, 'class="k-kv-chevron"') : ""}</span>`;
      return `<div class="k-row${wide ? " is-wide" : ""}">${r.pairs.map(pair).join("")}</div>`;
    }
    case "field": { // { label, value, placeholder, suffix, error, focus, caret, mono, icon, button, wideLabel }
      const input = `<div class="${cls("k-input k-field-fill", r.focus && "is-focus", r.error && "is-invalid", r.mono && "k-mono")}">${r.icon ? `<span class="k-input-slot">${icon(r.icon, 16)}</span>` : ""}<span class="k-input-value${r.value ? "" : " k-tertiary"}">${esc(r.value || r.placeholder || "")}${r.caret ? `<i class="k-caret-bar"></i>` : ""}</span>${r.suffix ? `<span class="k-input-suffix is-text">${esc(r.suffix)}</span>` : ""}</div>${r.note ? `<span class="k-note">${esc(r.note)}</span>` : ""}${r.button ? `<button class="k-btn k-btn-secondary">${esc(r.button)}</button>` : ""}`;
      const row = r.label != null ? `<div class="${propCls(r)} k-field-row"><span class="k-label">${esc(r.label)}</span><span class="k-ctl">${input}</span></div>` : `<div class="k-row-flex k-field-row">${input}</div>`;
      return row + (r.error ? `<div class="k-row-error${r.label != null ? " is-indented" : ""}">${icon("warning", 16)}<span>${esc(r.error)}</span></div>` : "");
    }
    case "radio": // { label, items: [{ label, note, checked, disabled }] } -- one item per row
      return (r.label ? `<div class="k-row-text is-row k-radio-label">${esc(r.label)}</div>` : "") + r.items.map((i) => `<div class="${cls("k-radio-row", i.checked && "is-checked", i.disabled && "is-disabled")}"><span class="k-radio"></span><span class="k-radio-text">${esc(i.label)}</span>${i.note ? `<span class="k-radio-note">${esc(i.note)}</span>` : ""}</div>`).join("");
    case "textarea": { // { label, lines: [..], mono, rows, caret: true, error: { line, from, to, text }, suggest: [{ label, note, highlighted }] }
      const lines = r.lines.map((l, i) => {
        const e = r.error && r.error.line === i ? r.error : null;
        const body = e ? `${esc(l.slice(0, e.from))}<span class="k-squiggle">${esc(l.slice(e.from, e.to))}</span>${esc(l.slice(e.to))}` : esc(l);
        return `<div class="k-ta-line">${body || "&nbsp;"}${r.caret && i === r.lines.length - 1 ? `<i class="k-caret-bar"></i>` : ""}</div>`;
      }).join("");
      const minH = (r.rows || r.lines.length) * 16 + 8;
      const suggest = r.suggest ? `<div class="k-ta-suggest">${r.suggest.map((s) => `<div class="k-ta-sug${s.highlighted ? " is-active" : ""}"><span>${esc(s.label)}</span><span class="k-ta-sug-note">${esc(s.note || "")}</span></div>`).join("")}</div>` : "";
      return `${r.label ? `<div class="k-row-text is-row k-ta-label">${esc(r.label)}</div>` : ""}<div class="k-ta-wrap"><div class="${cls("k-textarea", r.mono && "k-mono", r.focus !== false && "is-focus", r.error && "is-invalid")}" style="min-height:${minH}px">${lines}</div>${suggest}</div>` + (r.error?.text ? `<div class="k-row-error">${icon("warning", 16)}<span>${esc(r.error.text)}</span></div>` : "");
    }
    case "ruleLine": // { not, field, op, value, remove } -- [Not] [field v] [op v] [value] [x]
      return `<div class="k-rule-line"><button class="k-rule-not${r.not ? " is-on" : ""}">Not</button><button class="k-select k-rule-field"><span>${esc(r.field)}</span>${icon("chevron-down")}</button><button class="k-select k-rule-op"><span>${esc(r.op)}</span>${icon("chevron-down")}</button><div class="k-input k-rule-value"><span class="k-input-value">${esc(r.value)}</span></div>${r.remove !== false ? iconBtn("close", { title: "Remove this rule" }) : ""}</div>`;
    case "pattern": { // { slots: [{ id, x, y, label }], edges: [[a, b]], note } -- a 208 x 72 slot diagram
      const slots = r.slots || [{ id: "a", x: 30, y: 52 }, { id: "b", x: 104, y: 14 }, { id: "c", x: 178, y: 52 }];
      const at = Object.fromEntries(slots.map((s) => [s.id, s]));
      const lines = (r.edges || [["a", "b"], ["b", "c"], ["a", "c"]]).map(([a, b]) => `<line x1="${at[a].x}" y1="${at[a].y}" x2="${at[b].x}" y2="${at[b].y}" stroke="var(--k-text-secondary)" stroke-width="1.5"/>`).join("");
      const dots = slots.map((s) => `<circle cx="${s.x}" cy="${s.y}" r="10" fill="var(--k-bg)" stroke="${s.selected ? "var(--k-border-selected)" : "var(--k-text)"}" stroke-width="${s.selected ? 2 : 1.25}"/><text x="${s.x}" y="${s.y + 4}" text-anchor="middle">${esc(s.label || s.id)}</text>`).join("");
      return `<div class="k-pattern-row"><svg width="208" height="68" viewBox="0 0 208 68">${lines}${dots}</svg></div>`;
    }
    case "scatter": { // { points: [{ x, y, color, hl }] (0..1), xLabel, yLabel, xEnds, yEnds, brush: { x0, x1, y0, y1 }, w, h }
      const W = r.w || 448, H = r.h || 240, L = 40, B = 28, T = 8, R = 8;
      const X = (v) => L + (W - L - R) * v, Y = (v) => T + (H - T - B) * (1 - v);
      const dots = r.points.map((p) => `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${p.hl ? 4.5 : 3.5}" fill="${esc(col(p.color || "var(--k-canvas-node)"))}"${p.hl ? ' stroke="var(--k-halo)" stroke-width="2"' : ""}/>`).join("");
      const b = r.brush ? `<rect x="${X(r.brush.x0)}" y="${Y(r.brush.y1)}" width="${X(r.brush.x1) - X(r.brush.x0)}" height="${Y(r.brush.y0) - Y(r.brush.y1)}" fill="#0d99ff1f" stroke="var(--k-border-selected)" stroke-dasharray="4 3"/>` : "";
      const axes = `<line x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}" stroke="var(--k-border)"/><line x1="${L}" y1="${T}" x2="${L}" y2="${H - B}" stroke="var(--k-border)"/>`;
      const ends = (r.xEnds ? `<text x="${L}" y="${H - B + 14}">${esc(r.xEnds[0])}</text><text x="${W - R}" y="${H - B + 14}" text-anchor="end">${esc(r.xEnds[1])}</text>` : "") + (r.yEnds ? `<text x="${L - 4}" y="${H - B}" text-anchor="end">${esc(r.yEnds[0])}</text><text x="${L - 4}" y="${T + 8}" text-anchor="end">${esc(r.yEnds[1])}</text>` : "");
      const labels = `<text x="${(L + W - R) / 2}" y="${H - 4}" text-anchor="middle" class="k-axis-label">${esc(r.xLabel || "")}</text><text x="12" y="${(T + H - B) / 2}" text-anchor="middle" class="k-axis-label" transform="rotate(-90 12 ${(T + H - B) / 2})">${esc(r.yLabel || "")}</text>`;
      return `<div class="k-scatter-row"><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${axes}${b}${dots}${ends}${labels}</svg></div>`;
    }
    case "select": // { label, value, ramp | strip: [colors], note, gear, disabled, actions, wideLabel }
      return `<div class="${propCls(r)}"><span class="k-label">${esc(r.label)}</span><span class="k-ctl${r.gear ? " k-gap-1" : ""}">${selectHtml(r)}${r.note ? `<span class="k-note">${esc(r.note)}</span>` : ""}${r.gear ? iconBtn("settings") : ""}${rowActions(r.actions)}</span></div>`;
    case "number": { // { label, fields: [{caption, value, suffix, disabled, button}], actions, wideLabel }
      const captions = r.fields.some((f) => f.caption);
      const field = (f) => `<div class="k-field">${f.caption ? `<span class="k-caption">${esc(f.caption)}</span>` : ""}<div class="k-input${f.disabled ? " is-disabled" : ""}"><span class="k-input-value">${esc(f.value)}</span>${f.suffix ? `<span class="k-input-suffix">${esc(f.suffix)}</span>` : ""}</div></div>` + (f.button ? iconBtn(f.button) : "");
      if (r.label) return `<div class="${propCls(r)}${captions ? " k-row-2" : ""}"><span class="k-label">${esc(r.label)}</span><span class="k-ctl">${r.fields.map(field).join("")}${rowActions(r.actions)}</span></div>`;
      return `<div class="k-row${captions ? " k-row-2" : ""}">${r.fields.map(field).join("")}</div>`;
    }
    case "swatchHex": { // { label, color, hex, opacity, value, override, inherited: "Communities", lock, actions: ["eye","minus"] }
      if (r.inherited) return `<div class="k-paint-row is-inherited"><span class="k-paint-label">${esc(r.label)}</span>${chitHtml(r.color)}<span class="k-paint-value">From ${esc(r.inherited)}</span>${r.lock ? `<span class="k-lock-12">${icon("lock")}</span>` : ""}</div>`;
      if (r.hex) return `<div class="k-paint-row"><span class="k-paint-label">${esc(r.label)}</span><div class="k-paint">${chitHtml(r.color, r.override)}<span class="k-paint-hex">${esc(r.hex.replace("#", ""))}</span>${r.opacity != null ? `<span class="k-paint-divider"></span><span class="k-paint-opacity">${esc(r.opacity)}</span><span class="k-input-suffix">%</span>` : ""}</div>${rowActions(r.actions)}</div>`;
      return `<div class="k-paint-row"><span class="k-paint-label">${esc(r.label)}</span>${chitHtml(r.color, r.override)}<span class="k-paint-value">${esc(r.value || "")}</span>${rowActions(r.actions)}</div>`;
    }
    case "groupSwatch": // { name, count, color, override } -- "[chit] 4  12"
      return `<div class="k-group-swatch">${chitHtml(r.color, r.override)}<span class="k-gs-name">${esc(r.name)}</span><span class="k-gs-count">${esc(r.count)}</span></div>`;
    case "attribute": { // { dtype: "text"|"number"|"time"|"formula", name, filled, role (true, or a role's name drawn as a chip), complete (0..100: a bar and the percentage), pressed, edited }
      const glyph = r.dtype === "time" ? (r.role ? "clock-filled" : "clock") : r.dtype === "number" ? "number" : r.dtype === "formula" ? "formula" : "text";
      const chip = typeof r.role === "string" ? `<span class="k-role-chip">${esc(r.role)}</span>` : "";
      const filled = r.complete != null ? `<span class="k-attr-bar"><i style="width:${r.complete}%"></i></span><span class="k-attr-filled">${esc(r.complete)}%</span>` : `<span class="k-attr-filled">${esc(r.filled)}</span>`;
      return `<div class="${cls("k-attr-row", r.pressed && "is-pressed", r.hover && "is-hover")}"${attr("data-attr", r.name)}>${icon(glyph, 16, `class="k-attr-type${r.role || r.dtype === "formula" ? " is-role" : ""}"`)}<span class="k-attr-name">${esc(r.name)}</span>${chip}${r.note ? `<span class="k-attr-note">${esc(r.note)}</span>` : ""}${filled}${iconBtn("more", { pressed: r.pressed })}</div>`;
    }
    case "dataset": { // Data panel: { name, source, glyph, nodes, edges, hover, selected, menuOpen } -- the name row (its count yields at 240 px) and the source row
      const acts = r.hover || r.menuOpen ? `<span class="k-tree-actions is-shown">${iconBtn("refresh", { title: "Reload" })}<span data-anchor="datasetMore">${iconBtn("more", { pressed: r.menuOpen })}</span></span>` : "";
      return `<div class="${cls("k-tree-row is-leaf k-ds-row", r.selected && "is-selected", (r.hover || r.menuOpen) && "is-hover")}" style="--depth:0"${attr("data-row", r.name)}><span class="k-tree-caret"></span><span class="k-tree-icon">${icon(r.glyph || "data", 16)}</span><span class="k-tree-name">${esc(r.name)}</span><span class="k-tree-tech"><i></i></span><span class="k-tree-meta">${acts ? "" : countHtml({ kind: "dataset", nodes: r.nodes, edges: r.edges })}</span>${acts}</div><div class="k-ds-source">${esc(r.source || "")}</div>`;
    }
    case "paintOrder": { // Styles panel: { kind, name, chip, channels: ["Colour", { name: "Size", lost: true }], eye, locked, selected, hover } -- top row wins
      const ch = (r.channels || []).map((c) => (typeof c === "string" ? esc(c) : c.lost ? `<s>${esc(c.name)}</s>` : esc(c.name))).join(", ");
      const tail = r.locked ? `<span class="k-lock-12">${icon("lock")}</span>` : iconBtn(r.eye === false ? "eye-off" : "eye", { cls: "k-toggle-btn k-eye", on: r.eye !== false });
      return `<div class="${cls("k-tree-row is-leaf k-po-row", r.selected && "is-selected", r.hover && "is-hover", r.eye === false && "is-hidden")}" style="--depth:0"${attr("data-row", r.name)}><span class="k-tree-caret"></span><span class="k-tree-icon">${icon(KIND_ICON[r.kind] || "data", 16)}</span><span class="k-tree-name">${esc(r.name)}</span><span class="k-po-ch">${ch}</span>${r.chip ? `<span class="k-tree-chip">${chipHtml(r.chip)}</span>` : ""}${tail}</div>`;
    }
    case "view": // Views panel: { name, current, drift, hover }
      return viewRow(r);
    case "segmented": // { label, options, value, fill } -- fill: the control spans label and control (dialog tabs)
      if (r.fill) return `<div class="k-row-flex k-seg-row"><div class="k-seg k-seg-fill">${r.options.map((o) => `<button class="k-seg-opt has-text${o === r.value ? " is-checked" : ""}">${esc(o)}</button>`).join("")}</div></div>`;
      return `<div class="${propCls(r)}"><span class="k-label">${esc(r.label)}</span><span class="k-ctl"><div class="k-seg k-w-fill">${r.options.map((o) => `<button class="k-seg-opt has-text${o === r.value ? " is-checked" : ""}">${esc(o)}</button>`).join("")}</div></span></div>`;
    case "checkbox": // { items: [{label, checked}], button } -- the button is a text button
      return `<div class="k-row-flex k-row-checks">${r.items.map((i) => `<label class="k-check${i.checked ? " is-checked" : ""}"><span class="k-check-box">${icon("check-16", 16, 'class="k-check-tick"')}</span><span>${esc(i.label)}</span></label>`).join("")}${r.button ? `<span class="k-link">${esc(r.button)}</span>` : ""}</div>`;
    case "switch": { // { label, on, note, wide, caption, second: {label, on} | {label, select} }
      // A switch beside a select does not fit one 32px row (label, switch, label, an 88px select
      // is 244px), so that pair is the kit's captioned two-column row, 50px tall.
      if (r.second && r.second.select != null) return `<div class="k-row k-row-2"><div class="k-field"><span class="k-caption">${esc(r.label)}</span><div class="k-field-ctl"><span class="k-switch${r.on ? " is-on" : ""}"></span></div></div><div class="k-field"><span class="k-caption">${esc(r.second.label)}</span>${selectHtml({ value: r.second.select })}</div></div>`;
      const second = r.second ? `<span class="k-label k-secondary" style="margin-left:auto">${esc(r.second.label)}</span><span class="k-switch${r.second.on ? " is-on" : ""}"></span>` : "";
      const row = `<div class="${propCls(r)}"><span class="k-label">${esc(r.label)}</span><span class="k-ctl"${r.wide ? ' style="justify-content:flex-end"' : ""}><span class="k-switch${r.on ? " is-on" : ""}"></span>${r.note ? `<span class="k-note">${esc(r.note)}</span>` : ""}${second}</span></div>`;
      return row + (r.caption ? `<div class="k-row-note is-caption">${esc(r.caption)}</div>` : "");
    }
    case "button": { // { label, buttons: [{label, primary, ghost, focus, disabled, danger}], wrap }
      // Buttons that would overflow the row wrap onto a second line (wrap: true
      // forces it); each button keeps its own width.
      const est = r.buttons.reduce((t, b) => t + b.label.length * 6.3 + 24, 0) + (r.label ? r.label.length * 6 + 8 : 0);
      const wrap = r.wrap ?? est > 216;
      return `<div class="k-row-flex${wrap ? " is-wrap" : ""}">${r.label ? `<span class="k-secondary k-grow">${esc(r.label)}</span>` : ""}${r.buttons.map((b) => `<button class="${cls("k-btn", b.danger ? (b.primary ? "k-btn-danger" : "k-btn-danger-secondary") : b.primary ? "" : b.ghost ? "k-btn-ghost" : "k-btn-secondary", b.focus && "is-focus", b.disabled && "is-disabled")}">${esc(b.label)}</button>`).join("")}</div>`;
    }
    case "link": // { text, chevron, secondary }
      return `<div class="k-row-disclose"><span${r.secondary ? ' class="k-secondary"' : ""}>${esc(r.text)}</span>${r.chevron !== false ? icon("chevron-right") : ""}</div>`;
    case "table": { // { columns: ["1fr", "40px"], head: [], rows: [[]], selected }
      const grid = `grid-template-columns:${(r.columns || r.rows[0].map(() => "1fr")).join(" ")}`;
      const head = r.head ? `<div class="k-table-row is-head" style="${grid}">${r.head.map((h) => `<span>${esc(h)}</span>`).join("")}</div>` : "";
      return head + r.rows.map((row, i) => `<div class="k-table-row${i === r.selected ? " is-selected" : ""}${(r.muted || []).includes(i) ? " is-muted" : ""}" style="${grid}">${row.map((v) => `<span>${cellHtml(v)}</span>`).join("")}</div>`).join("");
    }
    case "emptyPlus": // { title, summary } -- a section header whose only action is "+"
      return `<div class="k-section-header is-empty"><span class="k-section-title">${esc(r.title)}${r.summary ? `<span class="k-section-count">${esc(r.summary)}</span>` : ""}</span><div class="k-section-actions">${iconBtn("plus")}</div></div>`;
    case "section": // { title, count, plus, actions: ["more"] }
      return `<div class="k-section-header"><span class="k-section-title">${esc(r.title)}${r.count != null ? `<span class="k-section-count">${esc(r.count)}</span>` : ""}</span><div class="k-section-actions">${(r.actions || []).map((a) => iconBtn(a)).join("")}${r.plus ? iconBtn("plus") : ""}</div></div>`;
    case "disclosure": // { title, summary, open }
      return `<div class="k-row-disclose"><span style="flex:none">${esc(r.title)}</span><span class="k-disclose-summary">${esc(r.summary || "")}</span>${icon(r.open ? "chevron-down" : "chevron-right")}</div>`;
    case "text": // { text, secondary: true, tone: "error"|"warning"|"success" } -- one 32px line
      return `<div class="k-row-text is-row${r.tone ? ` k-tone-${r.tone}` : ""}"${r.secondary === false && !r.tone ? ' style="color:var(--k-text)"' : ""}>${r.tone === "error" || r.tone === "warning" ? icon("warning", 16) : ""}${esc(r.text)}</div>`;
    case "note": // { text, tone } -- a wrapping paragraph of secondary text; a tone draws it as a callout
      return `<div class="k-row-note${r.tone ? ` k-tone-${r.tone} is-toned` : ""}">${r.tone === "error" || r.tone === "warning" ? icon("warning", 16) : ""}<span>${esc(r.text)}</span></div>`;
    case "progress": // { label, value, cancel }
      return `<div class="k-row-progress"><span class="k-secondary" style="flex:none">${esc(r.label)}</span><div class="k-progress"><div class="k-progress-bar" style="--value:${r.value}%"></div></div>${r.cancel ? `<button class="k-btn k-btn-ghost">Cancel</button>` : ""}</div>`;
    case "legend": // { label, colors, from, to } -- a 208 x 14 preview strip with end labels
      return `<div class="k-legend-row"><span class="k-secondary" style="width:68px;flex:none">${esc(r.label || "Legend")}</span><div class="k-legend-strip" style="--stops:${r.colors.map(esc).join(",")}"></div></div><div class="k-legend-ends" style="padding-left:92px"><span>${esc(r.from)}</span><span>${esc(r.to)}</span></div>`;
    case "histogram": { // { bars: [0..1 values], scale: "linear"|"log", band: [from, to] (0..1), ends: [lo, hi] } -- two rows tall
      const k = r.bars.length, bw = 208 / k;
      const inBand = (i) => !r.band || ((i + 0.5) / k >= r.band[0] && (i + 0.5) / k <= r.band[1]);
      const bars = r.bars.map((v, i) => `<rect x="${i * bw}" y="${40 - v * 40}" width="${bw - 1}" height="${v * 40}" fill="${inBand(i) ? "var(--k-bg-brand)" : "var(--k-bg-tertiary)"}"/>`).join("");
      const band = r.band ? `<rect x="${r.band[0] * 208}" y="0" width="${(r.band[1] - r.band[0]) * 208}" height="40" fill="#0d99ff1a"/><rect x="${r.band[0] * 208 - 2}" y="4" width="4" height="36" rx="2" fill="var(--k-bg-brand)"/><rect x="${r.band[1] * 208 - 2}" y="4" width="4" height="36" rx="2" fill="var(--k-bg-brand)"/>` : "";
      const ends = r.ends ? `<div class="k-hist-ends"><span>${esc(r.ends[0])}</span><span>${esc(r.ends[1])}</span></div>` : "";
      return `<div class="k-histogram-row"><div><svg width="160" height="40" viewBox="0 0 208 40" preserveAspectRatio="none">${band}${bars}</svg>${ends}</div><div class="k-seg" style="width:56px;margin-top:8px"><button class="k-seg-opt has-text${r.scale !== "log" ? " is-checked" : ""}">lin</button><button class="k-seg-opt has-text${r.scale === "log" ? " is-checked" : ""}">log</button></div></div>`;
    }
    case "block": // { label, chip, summary, open, actions } -- an encoding block header
      return `<div class="k-paint-row"><span class="k-paint-label">${esc(r.label)}</span>${chipHtml(r.chip)}${r.summary ? `<span class="k-paint-value k-secondary">${esc(r.summary)}</span>` : `<span class="k-paint-value"></span>`}<span class="k-row-actions">${(r.actions || ["eye", "minus"]).map((a) => iconBtn(a)).join("")}${icon(r.open ? "chevron-down" : "chevron-right", 24, 'style="color:var(--k-text-tertiary)"')}</span></div>`;
    case "chips": // { title, chips: [{chip, label}] } -- a header row carrying chips inline
      return `<div class="k-section-header"><span class="k-section-title">${esc(r.title)}</span><div class="k-section-actions" style="gap:8px">${r.chips.map((c) => `<span class="k-chip">${chipHtml(c.chip)}${esc(c.label)}${c.removable ? `<span class="k-chip-x">${icon("close", 16)}</span>` : ""}</span>`).join("")}</div></div>`;
    default:
      throw new Error("render.mjs: unknown row type " + r.type);
  }
}

// The framing readout: the framing name in 3D ("Fit", "Isometric") or the
// zoom percentage in 2D; the status bar mirrors the pill (revision.md 1.5).
// inspector.framing may be { text, close: true } for a stoppable state
// ("Following BrighamYoung x").
export const framingOf = (spec) => { const f = spec.inspector?.framing ?? spec.status?.zoom ?? "100%"; return typeof f === "object" ? f.text : f; };

export function panelTop(spec) {
  const loaded = !!spec.file && !spec.fileState?.loading;
  const f = spec.inspector?.framing;
  const framing = framingOf(spec);
  const close = typeof f === "object" && f.close ? `<span class="k-framing-x" title="Stop">${icon("close", 16)}</span>` : "";
  return `<div class="k-panel-top"><button class="k-select k-framing${loaded ? "" : " is-disabled"}${spec.pillOpen ? " is-open" : ""}" data-anchor="pill"><span>${esc(framing)}</span>${close}${icon("chevron-down")}</button><span class="k-spacer"></span><button class="k-btn${loaded ? "" : " is-disabled"}${spec.exportOpen ? " is-pressed" : ""}" data-anchor="export">Export</button></div>`;
}

// The header block (144px): title, summary, reading, tabs. i: { kind, name,
// sub, actions: [{icon, on, title}], chip, summary: "text" | { text, cancel,
// note }, reading, tabs, tab }. A name "Bridges (Betweenness)" puts its
// technical part on the secondary line beside the kind ("Measure
// Betweenness" over "Bridges"), as the tree row does when it runs short.
// summary: "text" | { text, nodes, edges, cancel, note, action, tone:
// "failed" | "stale" } -- a failed or stale summary is drawn red or amber
// with its dot, and `action` is its link ("Retry", "Re-run (about 3 s)").
export function inspectorHeader(i) {
  const actions = (i.actions || [{ icon: "eye", on: true }, { icon: "unlock" }, { icon: "more" }]).map((a) => (a.icon === "more" ? `<span data-anchor="inspectorMore">${iconBtn(a.icon, { title: a.title, pressed: a.pressed })}</span>` : iconBtn(a.icon, { on: a.on, cls: a.on != null ? "k-toggle-btn k-eye" : "", title: a.title }))).join("");
  const reading = i.reading == null ? `<div class="k-insp-reading"></div>` : `<div class="k-insp-reading"><span>${esc(i.reading)}</span>${iconBtn("question")}</div>`;
  const tabs = (i.tabs || []).map((t) => `<button class="k-tab${t === i.tab ? " is-selected" : ""}${i.tabsDisabled ? " is-disabled" : ""}">${esc(t)}</button>`).join("");
  const { plain, tech } = splitName(i.name, i.tech);
  const sub = i.sub || tech;
  const s = typeof i.summary === "string" || i.summary == null ? { text: i.summary } : i.summary;
  const dot = s.tone === "failed" ? `<span class="k-state-dot is-failed"></span>` : s.tone === "stale" ? `<span class="k-state-dot is-stale"></span>` : "";
  const summary = `${chipHtml(i.chip)}${dot}${s.nodes != null || s.edges != null ? countHtml({ kind: "set", nodes: s.nodes, edges: s.edges }) : ""}<span class="${s.tone ? `k-summary-${s.tone}` : ""}">${esc(s.text || "")}</span>${s.cancel ? `<span class="k-link">Cancel</span>` : ""}${s.action ? `<span class="k-link">${esc(s.action)}</span>` : ""}${s.note ? `<span class="k-secondary">${esc(s.note)}</span>` : ""}`;
  return `<div class="k-insp-head"><div class="k-insp-title"><div class="k-title2"><span class="k-secondary">${esc(i.kind)}${sub ? `  ${esc(sub)}` : ""}</span><span class="k-heading">${esc(plain)}</span></div>${actions}</div><div class="k-insp-summary">${summary}</div>${reading}<div class="k-insp-tabs${i.tabsDisabled ? " is-disabled" : ""}">${tabs}</div></div>`;
}

// inspector.footer: [{ label, primary }] pins a footer bar to the panel's
// foot (a sheet that takes the right panel's place, such as Export).
export function rightPanel(spec) {
  const i = spec.inspector;
  let body;
  if (!i || i.empty) body = `<div class="k-row-flex k-secondary">${esc(i?.empty || "Nothing loaded")}</div>`;
  else body = inspectorHeader(i) + `<div class="k-insp-body">${(i.rows || []).map(rowHtml).join("")}</div>`;
  const foot = i?.footer ? `<div class="k-sheet-foot">${i.footerNote ? `<span class="k-secondary k-grow">${esc(i.footerNote)}</span>` : ""}${i.footer.map(footBtn).join("")}</div>` : "";
  return `<aside class="k-panel k-panel-right${foot ? " has-sheet-foot" : ""}">${panelTop(spec)}${body}${foot}</aside>`;
}

// ---------------------------------------------------------------- status bar

// status: { counts: {nodes, edges}, mask, computing, stale, layout, tool,
// selection, xr, zoom }. Drawn in priority order (revision.md 1.6).
// status: { counts: {nodes, edges}, mask, limit: { text, link } (amber),
// error: { text, links } (red), computing, notice: { text, links, tone:
// "info" | "success" | "error" | "warning" } (a short message such as
// "Deleted X [Undo]"), stale, layout, tool, selection, xr: "VR" | { text,
// exit: false } }. Drawn in priority order (revision.md 1.6).
export function statusBar(s = {}, framing = "100%") {
  const item = (html, ic) => `<span class="k-status-item">${ic ? icon(ic, 16) : ""}${html}</span>`;
  const links = (ls) => [].concat(ls || []).map((l) => ` <span class="k-link">${esc(l)}</span>`).join("");
  const chip = (o, tone) => `<span class="k-status-item k-status-chip is-${tone}">${tone === "error" || tone === "warning" ? icon("warning", 16) : tone === "success" ? icon("check-16", 16) : ""}<span>${esc(o.text)}</span>${links(o.links ?? o.link)}</span>`;
  const items = [];
  if (s.counts) items.push(item(countHtml({ kind: "dataset", ...s.counts })));
  if (s.mask) items.push(item(`${esc(s.mask.text)}${s.mask.exit ? ` <span class="k-link">Exit</span>` : ""}${links(s.mask.link)}`));
  if (s.limit) items.push(chip(s.limit, "warning"));
  if (s.error) items.push(chip(s.error, "error"));
  if (s.computing) items.push(item(`${esc(s.computing.text)}${s.computing.cancel ? ` <span class="k-link">${esc(s.computing.cancel)}</span>` : ""}`, s.computing.gpu ? "gpu" : null));
  if (s.notice) items.push(chip(s.notice, s.notice.tone || "info"));
  if (s.stale) items.push(item(`${esc(s.stale)} <span class="k-link">Re-run all</span>`));
  if (s.layout) items.push(item(esc(s.layout), "pause"));
  if (s.tool) items.push(item(esc(s.tool)));
  if (s.selection) items.push(item(esc(s.selection)));
  if (s.xr) { const x = typeof s.xr === "object" ? s.xr : { text: s.xr }; items.push(item(`${esc(x.text)}${x.exit === false ? "" : ` <span class="k-link">Exit</span>`}`)); }
  return `<footer class="k-statusbar">${items.join(`<span class="k-status-sep"></span>`)}<span class="k-statusbar-spacer"></span><span class="k-status-item">${esc(framing)}</span></footer>`;
}

// ---------------------------------------------------------------- page

export function captionBar(spec) {
  const c = spec.caption || {};
  return `<div class="k-mock-caption"><b>${esc(c.title || spec.title)}</b> <span>${esc(c.text || "")}</span></div>`;
}

// The screenshot size of a spec: the frame plus the caption bar.
export function viewportOf(spec) {
  const f = { ...FRAME, ...(spec.frame || {}) };
  return { width: f.w, height: f.h + f.caption };
}

// ---------------------------------------------------------------- frame layer

// A dark menu (Figma's): rows { label, key, note, disabled, reason, danger,
// checked, sub, highlighted, icon } | { divider: true } | { heading }. A
// submenu { of: "<row label>", rows } opens beside its row. Menus sit in the
// frame layer, above panels, dialogs and their scrims, so they can hang from
// any control: the file header, the pill, a tree row, an inspector row, a
// node, a table header, the mode switch.
export function menuHtml(m, id = "m") {
  const checks = m.rows.some((r) => r.checked != null);
  const rows = m.rows.map((r) => {
    if (r.divider) return `<div class="k-menu-sep"></div>`;
    if (r.heading) return `<div class="k-menu-heading">${esc(r.heading)}</div>`;
    const reason = r.disabled && r.reason ? `<span class="k-menu-reason">${esc(r.reason)}</span>` : "";
    return `<div class="${cls("k-menu-item", r.highlighted && "is-active", r.disabled && "is-disabled", r.danger && "is-danger", r.checked && "is-checked")}" data-anchor="${id}-${esc(r.label)}">${checks ? `<span class="k-menu-check">${icon("check-16", 16)}</span>` : ""}${r.icon ? icon(r.icon, 16, 'class="k-menu-icon"') : ""}<span class="k-menu-label">${esc(r.label)}${r.note ? `<span class="k-menu-note">${esc(r.note)}</span>` : ""}${reason}</span>${r.key ? `<span class="k-menu-shortcut">${esc(r.key)}</span>` : ""}${r.sub ? `<span class="k-menu-sub">${icon("chevron-right", 16)}</span>` : ""}</div>`;
  }).join("");
  const { pos, data } = placeAttrs(m);
  // tag: a small label above the menu when it is a second moment of the
  // screen ("Before: ATTRIBUTES +").
  const own = `<div class="k-float-menu" style="${pos}"${data}>${m.tag ? `<div class="k-inset-tag">${esc(m.tag)}</div>` : ""}<div class="k-menu"${m.width ? ` style="width:${m.width}px"` : ""}>${rows}</div></div>`;
  const sub = m.submenu ? menuHtml({ ...m.submenu, anchor: { el: `${id}-${m.submenu.of}`, side: m.submenu.side || "right", align: "start", dy: -8, dx: m.submenu.side === "left" ? -4 : 4 } }, id + "s") : "";
  return own + sub;
}

// An inset: a second state of the same screen, drawn above everything at full
// strength with a small tag saying what it is ("Also: after Create"). It is
// the popover card; inset: { tag, title, rows, footer, width, left, top |
// anchor }. Frame coordinates.
export function insetHtml(s) {
  const { pos, data } = placeAttrs(s);
  const card = popoverHtml({ ...s, left: undefined, right: undefined, top: undefined, bottom: undefined, anchor: undefined, noClose: s.noClose ?? true });
  return `<div class="k-inset" style="${pos}${s.width ? `;width:${s.width}px` : ""}"${data}>${s.tag ? `<div class="k-inset-tag">${esc(s.tag)}</div>` : ""}${card}</div>`;
}

// The Help menu at the rail's foot (round-4 section 2.3 and 4).
export const HELP_MENU = { anchor: { el: "rail-help", side: "right", align: "end", dx: 13 }, width: 232, rows: [
  { label: "Search commands...", key: "Ctrl+K", icon: "actions" },
  { divider: true },
  { label: "Help" }, { label: "Keyboard shortcuts", key: "Ctrl+/" }, { label: "Open sample" }, { label: "What's new" },
] };
// The tooltip of a rail item: its name and key, to the right (W7).
export const railTip = (id) => {
  const it = [...RAIL, ...RAIL_FOOT].find((x) => x.id === id);
  if (!it) throw new Error("render.mjs: no rail item " + id);
  return tooltipHtml({ name: it.label, key: it.key, anchor: { el: `rail-${id}`, side: "right", align: "center", dx: 4 }, arrow: "right" });
};

function frameLayer(spec) {
  const at = (x) => ({ ...x, left: shiftX(x.left) });
  const tb = spec.present ? {} : spec.toolbar || {};
  const auto = [
    ...(tb.modeMenu ? [modeMenu(tb)] : []),
    ...(spec.rail?.open === "help" ? [HELP_MENU] : []),
  ];
  const menus = [...auto, ...[].concat(spec.menus || [])].map((m, i) => menuHtml(at(m), m === auto[0] && tb.modeMenu ? "mode" : `m${i}`)).join("");
  const insets = [].concat(spec.insets || []).map((x) => insetHtml(at(x))).join("");
  const tips = [].concat(spec.tooltips || []).map((x) => tooltipHtml(at(x))).join("")
    + (tb.tip ? toolTipHtml(tb.tip, spec) : "")
    + (spec.rail?.tip ? railTip(spec.rail.tip) : "");
  return insets || menus || tips ? `<div class="k-frame-layer">${insets}${menus}${tips}</div>` : "";
}

// Places every float that names an anchor next to the element carrying the
// matching data attribute, clamped inside the frame, and points its caret at
// the anchor. Runs once, before the screenshot.
const PLACE_SCRIPT = `<script>
(() => {
  const frame = document.querySelector(".k-frame").getBoundingClientRect();
  for (const el of document.querySelectorAll("[data-anchor-to]")) {
    const t = document.querySelector(el.dataset.anchorTo);
    if (!t) { el.style.outline = "2px solid red"; continue; }
    const r = t.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
    const side = el.dataset.side, align = el.dataset.align, dx = +el.dataset.dx, dy = +el.dataset.dy;
    let x, y;
    const ax = align === "end" ? r.right - w : align === "center" ? r.left + r.width / 2 - w / 2 : r.left;
    const ay = align === "end" ? r.bottom - h : align === "center" ? r.top + r.height / 2 - h / 2 : r.top;
    if (side === "below") { x = ax; y = r.bottom + 4; }
    else if (side === "above") { x = ax; y = r.top - h - 4; }
    else if (side === "right") { x = r.right + 4; y = ay; }
    else { x = r.left - w - 4; y = ay; }
    x += dx; y += dy;
    // data-clamp="stage" keeps a float (a flyout, its popover) inside the canvas.
    const box = el.dataset.clamp === "stage" ? el.closest(".k-canvas-stage").getBoundingClientRect() : frame;
    x = Math.max(box.left + 8, Math.min(x, box.right - w - 8));
    y = Math.max(box.top + 4, Math.min(y, box.bottom - h - 4));
    const p = (el.offsetParent || document.body).getBoundingClientRect();
    el.style.left = (x - p.left) + "px"; el.style.top = (y - p.top) + "px"; el.style.right = "auto"; el.style.bottom = "auto";
    const cy = Math.max(14, Math.min(h - 14, r.top + r.height / 2 - y)), cx = Math.max(14, Math.min(w - 14, r.left + r.width / 2 - x));
    el.style.setProperty("--caret-y", cy + "px"); el.style.setProperty("--caret-x", cx + "px");
  }
  // A float placed by explicit coordinates (a menu with a wide tag, an
  // inset) is kept inside the frame too.
  for (const el of document.querySelectorAll(".k-frame-layer > :not([data-anchor-to])")) {
    const r = el.getBoundingClientRect();
    if (r.right > frame.right - 8) el.style.left = (el.offsetLeft - (r.right - frame.right + 8)) + "px";
  }
  // The left panel, when taller than the frame: scrolled to data-scroll px,
  // with the overlay scroll thumb (4 px, at the panel's right edge).
  for (const p of document.querySelectorAll(".k-panel-left")) {
    if (p.dataset.scroll) p.scrollTop = +p.dataset.scroll;
    if (p.scrollHeight <= p.clientHeight + 1) continue;
    const r = p.getBoundingClientRect(), h = p.clientHeight;
    const t = document.createElement("div");
    t.className = "k-scroll-thumb";
    t.style.left = (r.right - frame.left - 7) + "px";
    t.style.top = (r.top - frame.top + p.scrollTop / p.scrollHeight * h + 2) + "px";
    t.style.height = (h * h / p.scrollHeight - 4) + "px";
    document.querySelector(".k-frame").appendChild(t);
  }
})();
</script>`;

// Present mode: the canvas fills the window, the pill is the only control,
// the legend stays. present: { pill: [secondary-bar parts] }.
function presentApp(spec) {
  const f = { ...FRAME, ...(spec.frame || {}) };
  const c = spec.canvas || {}, ov = c.overlays || {};
  return `<div class="k-app k-present"><main class="k-canvas"><div class="k-canvas-stage">${graphSvg(c, f.w, f.h, { legend: !!ov.legend })}${ov.legend ? legendCard(ov.legend) : ""}${secondaryBarHtml({ parts: spec.present.pill }).replace("k-secondary-bar", "k-secondary-bar k-present-pill")}</div></main></div>`;
}

export function render(spec) {
  if (spec.page === "reference") return renderToolbarReference(spec);
  const f = { ...FRAME, ...(spec.frame || {}) };
  const app = spec.present ? presentApp(spec) : `<div class="k-app has-statusbar">
${railHtml(spec)}
${leftPanel(spec)}
${canvasColumn(spec)}
${rightPanel(spec)}
${statusBar(spec.status, framingOf(spec))}
</div>`;
  return `<!doctype html>
<html lang="en" data-theme="${spec.theme === "dark" ? "dark" : "light"}">
<head>
<meta charset="utf-8">
<title>Screen ${esc(spec.id)}: ${esc(spec.title)}</title>
<link rel="stylesheet" href="../kit.css">
</head>
<body class="k-ui k-mockpage" style="--k-frame-w:${f.w}px;--k-frame-h:${f.h}px">
${SPRITE}
<div class="k-frame">${app}${frameLayer(spec)}</div>
${captionBar(spec)}
${PLACE_SCRIPT}
</body>
</html>
`;
}

// The toolbar reference page (screen 11, round-4 section 3): the bar at 1:1
// with Time shown, a callout per control and the width line; the fit at a
// second window width between the rail, the left panel and the inspector;
// every control's tooltip; every flyout and the view-mode menu open in
// columns; the trimmed secondary bars and a parameters popover. spec: {
// title, heading, intro, fit: { width, text, legend }, stripsText, strips:
// [secondary specs], popover, foot }.
export function renderToolbarReference(spec = {}) {
  const g = geometry({ time: true }), g0 = geometry();
  const T = { time: "on" };
  // Callouts alternate between two heights so the close right-hand ones do not collide.
  const callouts = TOOLS.filter((t) => t.id).map((t, i) => `<div class="k-ref-callout${i % 2 ? " is-low" : ""}" style="left:${24 + g.at[t.id].x + 16}px">${esc(t.tip)}<br>${esc(t.key)}</div>`).join("")
    + `<div class="k-ref-callout" style="left:${24 + g.at.mode + 20}px">View mode<br>5 flips 2D, 3D</div>`;
  const bar = `<div class="k-ref-bar">${toolbarHtml({ active: "select", mode: "3D", time: true }).replace("k-toolbar-float", "")}${callouts}<div class="k-ref-dim" style="left:24px;width:${g.width}px"><span>${g.width} px with Time; ${g0.width} px without</span></div></div>`;
  let fit = "";
  if (spec.fit) {
    const cw = spec.fit.width - FRAME.rail - FRAME.panel - (FRAME.panel + 1);
    fit = `<h2>The fit at ${spec.fit.width} px</h2><p>${esc(spec.fit.text || "")}</p><div class="k-ref-fit" style="width:${spec.fit.width}px"><div class="k-ref-panel k-ref-rail">rail 57</div><div class="k-ref-panel">240 px left panel</div><div class="k-ref-canvas"><span class="k-ref-canvas-label">${cw} px canvas; ${Math.floor((cw - g.width) / 2)} px clear each side of the bar (${Math.floor((cw - g0.width) / 2)} without Time)</span>${toolbarHtml({ active: "select", mode: "3D", time: true })}${legendCard(spec.fit.legend)}</div><div class="k-ref-panel">241 px inspector</div></div>`;
  }
  const tips = `<div class="k-ref-tips">${TOOLS.filter((t) => t.id).map((t) => tooltipHtml({ name: t.tip, key: t.key, say: t.say })).join("")}${tooltipHtml({ name: "View mode", key: "5", say: "2D or 3D; VR and AR from its menu" })}</div>`;
  const cols = TOOLS.filter((t) => t.flyout).map((t) => `<div><div class="k-ref-col-title">${esc(t.tip)} (${esc(t.key)})</div>${flyoutHtml({ tool: t.id, reference: true })}</div>`).join("")
    + `<div><div class="k-ref-col-title">View mode (5)</div>${menuHtml({ ...modeMenu({ mode: "3D", disabledTools: { AR: "this browser cannot start AR" } }), anchor: undefined }, "refmode")}</div>`;
  const strips = `<div class="k-ref-strips">${(spec.strips || []).map((x) => secondaryBarHtml(x)).join("")}${popoverHtml(spec.popover)}</div>`;
  return `<!doctype html>
<html lang="en" data-theme="light">
<head><meta charset="utf-8"><title>${esc(spec.title || "Toolbar reference")}</title><link rel="stylesheet" href="../kit.css"></head>
<body class="k-ui k-refpage">
${SPRITE}
<h1>${esc(spec.heading || "The toolbar, every control and every menu")}</h1>
<p>${esc(spec.intro || "")}</p>
${bar}
${fit}
<h2>The tooltips (the toolbar's labels)</h2>
${tips}
<h2>The flyouts and the view-mode menu</h2>
<div class="k-ref-columns">${cols}</div>
<h2>The secondary bar and the parameters popover</h2>
<p>${esc(spec.stripsText || "")}</p>
${strips}
<p class="k-ref-foot">${esc(spec.foot || "")}</p>
</body></html>
`;
}
