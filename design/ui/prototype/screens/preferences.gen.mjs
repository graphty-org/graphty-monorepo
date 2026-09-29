#!/usr/bin/env node
// Builds screens/preferences.html: Preferences as a submenu of the main menu, as in Figma, in twelve states.
// Run from design/ui/prototype/: node screens/preferences.gen.mjs
// Every graph number comes from kit/fixtures.json.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { toShell } from "../kit/shell.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const fx = JSON.parse(readFileSync(join(here, "../kit/fixtures.json"), "utf8")).datasets;
const tx = fx.transactions;
const ppi = fx.ppi;
const fmt = (n) => n.toLocaleString("en-US");

const I = (name, cls = "") => `<svg class="k-i ${cls}"><use href="../kit/icons.svg#${name}"/></svg>`;
const A = (n) => `<span class="ann k-step">${n}</span>`;
const CHECK = "&#10003;";
const SUB = `<span class="k-sub">${I("chevron-right", "k-i-sm")}</span>`;

// ---------- menus ----------
const item = (label, { check = false, sub = false, desc = "", disabled = false, hover = false, focus = false, ann = "" } = {}) => {
    const attrs = [desc && "data-described", disabled && 'aria-disabled="true"', hover && "data-hover", focus && "data-focus-ring"].filter(Boolean).join(" ");
    const text = desc ? `<span class="k-grow">${label}${ann}<span class="k-menu-desc">${desc}</span></span>` : `${label}${ann}`;
    return `<div class="k-menu-item" ${attrs}><span class="k-check-col">${check ? CHECK : ""}</span>${text}${sub ? SUB : ""}</div>`;
};
const sep = `<div class="k-menu-sep"></div>`;
const note = (html) => `<div class="x-menu-note">${html}</div>`;
const menu = (left, top, width, body) => `<div class="k-menu" style="left:${left}px;top:${top}px;width:${width}px">${body}</div>`;

// The main menu (information-architecture.md 3), Preferences open.
const mainMenu = menu(
    52, 36, 200,
    [item("Quick actions...", { ann: `<span class="k-shortcut">Ctrl+K</span>` }), sep, ...["File", "Edit", "View", "Selection", "Algorithms", "Recipes"].map((s) => item(s, { sub: true })),
        item(`Preferences${A(1)}`, { sub: true, hover: true }), item("Help", { sub: true })].join(""),
);
// Preferences sits at y = 36 + 8 + 24 + 17 + 6 * 24 = 229; its submenu opens 8 above, beside the main menu.
const PREF_TOP = 221;
const PREF_LEFT = 256;

const ENGINE = {
    on: "Engine: WebGPU",
    unavailable: "Engine: CPU; WebGPU not available",
    notInstalled: "Engine: CPU; webgpu-graph-algorithms not installed",
    off: "Engine: CPU; WebGPU turned off",
    lost: "Engine: CPU; WebGPU lost",
};
const NAME = "Sarah Okafor";
function prefsMenu({ open = "", gpu = "on", provider = "", name = NAME, annotate = false } = {}) {
    const a = (n) => (annotate ? A(n) : "");
    const gpuItem = item(`Use WebGPU when available${a(3)}`, {
        check: gpu === "on" || gpu === "lost",
        desc: ENGINE[gpu],
        disabled: gpu === "unavailable" || gpu === "notInstalled",
        focus: gpu === "unavailable" || gpu === "notInstalled",
    });
    return menu(PREF_LEFT, PREF_TOP, 320, [
        item(`Scroll wheel zooms${a(2)}`, { desc: "Off: the wheel pans (orbits in 3D); Ctrl or Cmd with the wheel zooms." }),
        gpuItem,
        sep,
        item(`Theme${a(4)}`, { sub: true, hover: open === "theme" }),
        item(`Reduced motion${a(5)}`, { sub: true, hover: open === "motion" }),
        sep,
        item(`Default overview${a(6)}`, { sub: true, hover: open === "overview" }),
        sep,
        item(`Your name on notes and recipes...${a(9)}`, { desc: name || "Not set: notes and recipes record no name" }),
        item(`AI provider...${a(8)}`, provider ? { desc: provider } : {}),
    ].join(""));
}
// y of each Preferences item's top edge, for placing its nested submenu (menu padding 8, a described row 44, the wheel's two-line row 60).
const ROW_Y = { theme: PREF_TOP + 8 + 60 + 44 + 17, motion: PREF_TOP + 8 + 60 + 44 + 17 + 24, overview: PREF_TOP + 8 + 60 + 44 + 17 + 48 + 17 };
const NEST_LEFT = PREF_LEFT + 320 + 4;

const themeMenu = menu(NEST_LEFT, ROW_Y.theme - 8, 220, [
    item("Light"), item("Dark"),
    item(`System theme <span class="x-resolved k-light-only">(light)</span><span class="x-resolved k-dark-only">(dark)</span>`, { check: true }),
].join(""));
const motionMenu = menu(NEST_LEFT, ROW_Y.motion - 8, 300, [
    item(`System <span class="x-resolved">(not reducing)</span>`, { check: true }),
    item("Reduce", { desc: "The camera cuts instead of flying, a layout shows where nodes settle, and edge flow stops." }),
    item("Don't reduce", { desc: "Motion plays even when this computer asks to reduce it." }),
].join(""));
function overviewMenu({ current = "Flow", project = "Payments review", own = "", annotate = false }) {
    const who = own
        ? `For projects that choose no overview of their own. This project keeps its own: ${own} overview.`
        : `For projects that choose no overview of their own, ${project} among them.`;
    return menu(NEST_LEFT, ROW_Y.overview - 8 - 52, 300, [
        note(who + (annotate ? A(7) : "")),
        item("General overview <span class=\"x-resolved\">(default)</span>", { check: current === "General" }),
        item("Flow overview", { check: current === "Flow" }),
        item("Community overview", { check: current === "Community" }),
        sep,
        note("At open it fills only the quick counts; the rest waits until you ask. It never colors the graph."),
    ].join(""));
}
const tooltip = (left, top, html) => `<div class="k-tooltip" style="left:${left}px;top:${top}px;max-width:260px">${html}</div>`;

// ---------- the app frame ----------
const rail = ({ menuOpen = true, assistant = false } = {}) => `<nav class="k-rail" aria-label="Main">
    <div class="k-rail-btn"${menuOpen ? ' aria-pressed="true"' : ""}><span class="k-rail-pill">${I("menu")}</span></div>
    <div class="k-rail-sep"></div>
    <div class="k-rail-btn"${menuOpen ? "" : ' aria-pressed="true"'}><span class="k-rail-pill">${I("network")}</span>Graph</div>
    ${assistant ? `<div class="k-rail-btn"><span class="k-rail-pill">${I("sparkles")}</span>Assistant</div>` : `<div class="k-rail-btn k-asst-off" title="Assistant: off until you set a provider in Preferences">Assistant<span class="k-asst-cap">Off. Nothing is sent.</span></div>`}
    <div class="k-rail-btn"><span class="k-rail-pill">${I("flask-conical")}</span>Results</div>
    <div class="k-rail-btn"><span class="k-rail-pill">${I("sticky-note")}</span>Notes</div>
  </nav>`;
const leftPanel = (project, graph, nodes, setName, setCount) => `<aside class="k-panel" aria-label="Graph">
    <div class="k-panel-head">
      <div class="k-title-line"><span class="k-project">${project}</span>${I("chevron-down", "k-i-sm k-secondary")}</div>
      <span class="k-chip">${I("funnel", "k-i-sm")}Full graph</span>
    </div>
    <div class="k-scroll">
      <section class="k-section"><div class="k-section-head">Graphs<span class="k-grow"></span><span class="k-icon-btn">${I("plus")}</span></div>
        <ul class="k-list"><li class="k-item" aria-selected="true">${I("network")}<span class="k-grow k-ellipsis">${graph}</span><span class="k-trail k-num">${fmt(nodes)} nodes</span></li></ul></section>
      <section class="k-section"><div class="k-section-head">Sets and paths<span class="k-grow"></span><span class="k-icon-btn">${I("plus")}</span></div>
        <ul class="k-list"><li class="k-item">${I("group")}<span class="k-ellipsis">${setName}</span><span class="k-kind">frozen</span><span class="k-trail"><span class="k-paint-slot"></span><span class="k-num">${setCount}</span></span></li></ul></section>
      <section class="k-section"><div class="k-section-head">Styles<span class="k-grow"></span><span class="k-icon-btn">${I("plus")}</span></div>
        <ul class="k-list"><li class="k-item"><span class="k-chit" style="background:#808080"></span><span class="k-ellipsis">Base style</span></li></ul></section>
      <section class="k-section" data-empty><div class="k-section-head">Views</div></section>
    </div>
  </aside>`;
const canvas = (drawing, alt) => `<main class="k-main"><div class="k-canvas">
      <div class="k-stage"><img class="k-light-only" src="../kit/canvas/${drawing}-light.svg" alt="${alt}"><img class="k-dark-only" src="../kit/canvas/${drawing}-dark.svg" alt="${alt}"></div>
      <div class="k-toolbar-dock"><div class="k-toolbar" role="toolbar">
        <span class="k-tool" aria-pressed="true">${I("mouse-pointer-2", "k-i-lg")}</span><span class="k-tool-caret">${I("chevron-down", "k-i-sm")}</span>
        <span class="k-tool">${I("route", "k-i-lg")}</span>
        <span class="k-toolbar-sep"></span><span class="k-tool">${I("zap", "k-i-lg")}</span>
      </div></div>
      <span class="k-help">${I("circle-help")}</span>
    </div></main>`;
const data = (name, value) => `<div class="k-data"><span class="k-name">${name}</span><span class="k-value k-num">${value}</span></div>`;
const notComputed = (name, band) => `<div class="k-data x-nc"><span class="k-name">${name}</span><span class="k-secondary">Not computed: ${band}</span><span class="k-link">Run</span></div>`;
const rightPanel = (graph, overview, rows) => `<aside class="k-right" aria-label="Inspector">
    <div class="k-header1"><span class="k-grow"></span><span class="k-btn k-btn-ghost k-num">100%${I("chevron-down", "k-i-sm")}</span></div>
    <div class="k-typerow">${I("network")}<span class="k-name">${graph}</span><span class="k-secondary">Graph</span></div>
    <div class="k-scroll"><section class="k-section"><div class="k-section-head">Statistics</div>
      <div class="k-row"><span class="k-grow"${overview.length > 8 ? "" : ' style="white-space:nowrap"'}>Overview: ${overview}</span><span class="k-btn k-btn-ghost" style="padding-inline:4px">Change overview...</span></div>
      ${rows}
    </section></div>
  </aside>`;

// The transfer graph's quick counts: the floor every overview keeps on a directed graph (files-and-recipes.md 2).
const s = tx.stats;
const txFloor = `<div class="k-metrics"><div class="k-metric"><span class="k-secondary">nodes</span><span class="k-big k-num">${fmt(tx.nodes)}</span></div><div class="k-metric"><span class="k-secondary">edges</span><span class="k-big k-num">${fmt(tx.edges)}</span></div></div>
      ${data("direction", "directed")}${data("weak components", s.components)}${data("isolated nodes", s.isolated)}${data("self-loops", s.selfLoops)}${data("parallel edges", s.parallelEdges)}${data("reciprocity", s.reciprocity)}${data("density", s.density)}${data("average total degree", s.averageDegree)}${data("max total degree", fmt(s.maxDegree))}`;
const txFlowRows = txFloor + notComputed("PageRank, highest", "a few seconds");
const txGeneralRows = txFloor + notComputed("average clustering", "a few seconds") + notComputed("diameter", "a few seconds");
const p = ppi.stats;
const ppiRows = `<div class="k-metrics"><div class="k-metric"><span class="k-secondary">nodes</span><span class="k-big k-num">${fmt(ppi.nodes)}</span></div><div class="k-metric"><span class="k-secondary">edges</span><span class="k-big k-num">${fmt(ppi.edges)}</span></div></div>
      ${data("direction", "undirected")}${data("components", p.components)}${data("isolated nodes", p.isolated)}${data("density", p.density)}${data("average degree", p.averageDegree)}${data("max degree", p.maxDegree)}${notComputed("modularity of Louvain communities", "a few seconds")}`;

const txApp = ({ overview = "Flow", rows = txFlowRows, menuOpen = true, assistant = false } = {}) =>
    `<div class="k-app">${rail({ menuOpen, assistant })}${leftPanel("Payments review", "March transfers", tx.nodes, "Flagged accounts", 14)}${canvas("transactions-density", `${fmt(tx.nodes)} accounts drawn as density, all gray`)}${rightPanel("March transfers", overview, rows)}</div>`;

let frameNo = 0;
const frame = (id, title, caption, inner) => `
<div class="x-state-h" id="${id}"><h2>${++frameNo}. ${title}</h2><p>${caption}</p></div>
<div class="x-frame">${inner}</div>`;
const annNote = (left, top, width, html) => `<span class="k-annot-note" style="left:${left}px;top:${top}px;max-width:${width}px">${html}</span>`;

// ---------- the states ----------
const states = [
    frame("default", "Preferences, with Theme open",
        "Sarah, a fraud analyst, opens the main menu and points at Preferences. Her Payments review project, which holds the March transfers graph, names no overview of its own, so its Statistics read &quot;Overview: Flow&quot;, the default she chose last week. Her computer is in light mode by day, so System theme resolves to light; WebGPU is working. Choosing Light or Dark changes the panels and the canvas background at once, with nothing covering the canvas. Near the bottom, the name she set is the one her notes and recipes record; there is no avatar or account anywhere in the window.",
        txApp() + mainMenu + prefsMenu({ open: "theme", annotate: true }) + themeMenu),
    frame("your-name", "Your name on notes and recipes",
        "The one Preferences item that takes typing, so it opens a small dialog, as AI provider... does. Sarah types her name as she wants colleagues to read it. There is no account and no sign-in: the name is kept in this browser like her other preferences, and each note and recipe she saves from now on records it as typed. Notes she already wrote keep the name they were saved with. The name is shown on a note or recipe only when the project holds work by more than one person.",
        txApp({ menuOpen: false }) + `<div class="k-backdrop" data-clear style="position:absolute"><div class="k-modal x-provider" role="dialog" aria-label="Your name on notes and recipes">
  <div class="k-modal-head">Your name on notes and recipes<span class="k-grow"></span><span role="button" class="k-icon-btn" aria-label="Close">${I("x")}</span></div>
  <div class="k-modal-body">
    <div class="k-fieldrow"><span class="k-legend">Name${A(9)}</span><div class="k-fields"><span class="k-field k-span" data-focus>${NAME}</span></div></div>
    <div class="k-prose k-secondary x-name-help">Saved with each note and recipe you make from now on, exactly as typed. Shown only when a project holds work by more than one person. Leave blank to record no name.</div>
  </div>
  <div class="k-modal-foot"><span class="k-btn k-btn-secondary">Cancel</span><span class="k-btn">Save</span></div>
</div></div>`),
    frame("motion", "Reduced motion",
        "Each choice says what it does to the graph. System follows this computer's setting, which is not asking to reduce motion.",
        txApp() + mainMenu + prefsMenu({ open: "motion" }) + motionMenu),
    frame("overview", "Default overview",
        "Sarah is about to switch her default back from Flow to General. The top line names the open project, so she knows the change reaches it. General is marked as the built-in default; choosing it is how the default is reset.",
        txApp() + mainMenu + prefsMenu({ open: "overview" }) + overviewMenu({ annotate: true }).replace('<div class="k-menu-item" ><span class="k-check-col"></span>General overview', '<div class="k-menu-item" data-hover><span class="k-check-col"></span>General overview')),
    frame("overview-changed", "After choosing General overview",
        "The menu closes on the choice. Statistics now read &quot;Overview: General&quot;. The quick counts were already there and stay; the rows General adds read &quot;Not computed&quot; with how long they take, and run only when she clicks Run. The canvas is the same gray drawing: nothing was colored.",
        txApp({ overview: "General", rows: txGeneralRows, menuOpen: false })
            + annNote(1210, 560, 220, "The rows General adds wait for Run; the quick counts are unchanged. Nothing on the canvas changed.")),
    frame("own-overview", "A project that chooses its own overview, with General as the default",
        `Tom's Stress response study was saved with Community overview as its own, so the reader's default does not reach it: the top line says so before he changes anything. His default is General, the built-in one.`,
        `<div class="k-app">${rail()}${leftPanel("Stress response study", "Human protein interactions", ppi.nodes, "DNA repair hits", 30)}${canvas("ppi-plain", `${ppi.nodes} proteins, all gray`)}${rightPanel("Human protein interactions", "Community", ppiRows)}</div>`
            + mainMenu + prefsMenu({ open: "overview" }) + overviewMenu({ current: "General", own: "Community", project: "Stress response study" })),
    frame("no-adapter", "No WebGPU in this browser",
        "The browser offers graphty no WebGPU adapter. Use WebGPU is shown, disabled, so the reader learns the option exists; its line names the CPU path, and keyboard focus shows the reason. Measures and layouts still run, on the CPU.",
        txApp() + mainMenu + prefsMenu({ gpu: "unavailable" }) + tooltip(PREF_LEFT + 324, PREF_TOP + 52, "This browser offers no WebGPU adapter, so measures and layouts run on the CPU. A browser with WebGPU turned on can use the graphics card.")),
    frame("not-installed", "The WebGPU package is not installed",
        "A site that embeds graphty-element without its optional WebGPU package. The row reads the same way, with the other reason.",
        txApp() + mainMenu + prefsMenu({ gpu: "notInstalled" }) + tooltip(PREF_LEFT + 324, PREF_TOP + 52, "This copy of graphty was built without webgpu-graph-algorithms, so measures and layouts run on the CPU.")),
    frame("gpu-off", "The reader turned WebGPU off",
        "Unchecked by the reader, for example to compare with a colleague's CPU run. The next run takes the CPU.",
        txApp() + mainMenu + prefsMenu({ gpu: "off" })),
    frame("gpu-lost", "WebGPU lost during the session",
        "The graphics driver reset. The choice stays checked, because it is still what the reader wants; the line says the engine is the CPU until WebGPU comes back. The notice about the lost run is in Notices and errors.",
        txApp() + mainMenu + prefsMenu({ gpu: "lost" })),
    frame("provider-invalid", "AI provider: a key the provider refuses",
        "AI provider... opens its own dialog, because a key is a commit that cannot be left half set. Save checked the key; the provider refused it. The field keeps what was typed, with one line under it; nothing is dimmed behind the dialog.",
        txApp({ menuOpen: false }) + `<div class="k-backdrop" data-clear style="position:absolute"><div class="k-modal x-provider" role="dialog" aria-label="AI provider">
  <div class="k-modal-head">AI provider<span class="k-grow"></span><span role="button" class="k-icon-btn" aria-label="Close">${I("x")}</span></div>
  <div class="k-modal-body">
    <div class="k-fieldrow"><span class="k-legend">Provider</span><div class="k-fields"><span class="k-field k-span">Anthropic${I("chevron-down", "k-i-sm k-caret")}</span></div></div>
    <div class="k-fieldrow"><span class="k-legend">API key</span><div class="k-fields"><span class="k-field k-span k-id" data-error data-focus>sk-ant-api03-7Hq...Wv2x</span></div>
      <div class="x-err k-danger">Anthropic did not accept this key</div></div>
    <div class="k-fieldrow"><span class="k-legend">Model</span><div class="k-fields"><span class="k-field k-span">claude-sonnet-4-5${I("chevron-down", "k-i-sm k-caret")}</span></div></div>
  </div>
  <div class="k-modal-foot"><span class="k-btn k-btn-secondary">Cancel</span><span class="k-btn">Save</span></div>
</div></div>`),
    frame("provider-set", "A provider is set",
        "After a key is accepted, the AI provider item names the provider and model, and the Assistant on the rail is enabled.",
        txApp({ assistant: true }) + mainMenu + prefsMenu({ provider: "Anthropic, claude-sonnet-4-5" })),
];

const annRows = [
    ["Preferences is a submenu of the main menu, as in Figma: check items, radio submenus, and one item that opens a dialog. Every choice applies at once and the menu closes, so the canvas is never covered while its theme changes.", "information-architecture.md 3 (the main menu tree); interface-templates.md 20 (Preferences: Figma source, Preferences submenu); glossary.md (the main menu's submenus); research/figma.md", "Mantine <code>Menu</code> with nested <code>Menu</code> submenus"],
    ["Scroll wheel zooms, off by default, as Figma's Use scroll wheel zoom. The line under it covers both modes and both platforms' zoom key.", "interaction-pattern-entries.md 5 (the canvas input map)", "<code>Menu.Item</code> with a check, and a description line (proposed)"],
    ["Use WebGPU when available: the reader's GPU policy, handed to the element's <code>acceleration</code>. The line under it is the cataloged engine line, read from the element: WebGPU, or CPU with one of four reasons. Disabled, with its reason on focus, when there is no adapter or no WebGPU package (states 7 and 8).", "state-matrix.md 3 (Preferences, GPU policy, Unsupported); message-catalog.md <code>graphty.capability.engine</code>; interaction-patterns.md 3.7 (a disabled item states its reason on focus); element-needs.md (The GPU policy)", "<code>Menu.Item</code> with a check and a description line; <code>Tooltip</code> for the reason"],
    ["Theme: Light, Dark, System theme, Figma's own words, handed to the element's <code>colorScheme</code>. System theme names what it resolves to on this computer. Theme is already a reader preference; only the menu tree leaves it out.", "implementation-mapping.md (reader preferences); glossary.md (the reader's theme in Preferences); element-contract.md 15; canvas-drawing.md 1", "radio <code>Menu</code> submenu"],
    ["Reduced motion: System, Reduce, Don't reduce, the element's <code>reducedMotion</code> values auto, reduce and no-preference behind plain words. Reduce says what it does to the graph.", "element-contract.md 15; canvas-drawing.md 10 (graph motion honors reduced motion); implementation-mapping.md (reader preferences)", "radio <code>Menu</code> submenu with description lines"],
    ["Default overview: one radio list of the recipes the element registers. General is marked as the default, and choosing it is the reset, so there is no separate Reset to default.", "files-and-recipes.md 2 (Which overview is in force); output-homes.md 3.1 (Use as default overview); information-architecture.md 3 (Recipes available)", "radio <code>Menu</code> submenu; <code>Menu.Label</code> for the two lines"],
    ["The two lines are the only graph-specific text here: which projects the default reaches (naming the open one, or saying it keeps its own), and that at open it fills only the quick counts and never colors the graph.", "files-and-recipes.md 2 (What runs at Load; An overview never paints)", "<code>Menu.Label</code>, wrapping"],
    ["AI provider... opens its own dialog (provider, key, model). It is the one real commit here, so it is a dialog, with nothing dimmed behind it. Without a provider the Assistant's rail button is disabled with a reason naming this item.", "interface-templates.md 20 (AI provider); state-matrix.md 3 (Assistant, Unsupported; Preferences, Assistant provider, Error)", "<code>Modal</code> with <code>FieldRow</code>s and <code>ModalFooter</code>"],
    ["Your name on notes and recipes: the author each note and recipe records, as typed, blank if unset. A reader preference kept in this browser, not an account: there is no sign-in, no avatar and no picture. Typing needs a field, so the item opens a small dialog; its line shows the name, or that none is set. Changing it does not rewrite notes already saved.", "owner decision of 2026-09-28 on authorship (framework-changes.md, the authorship entry); conceptual-model.md (a note and a recipe); implementation-mapping.md (reader preferences)", "<code>Menu.Item</code> with a description line; <code>Modal</code> with a <code>FieldRow</code> + <code>TextInput</code> and <code>ModalFooter</code>"],
];

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Preferences</title>
<!-- Built by screens/preferences.gen.mjs; edit that and run: node screens/preferences.gen.mjs -->
<link rel="stylesheet" href="../kit/cm.css">
<link rel="stylesheet" href="../kit/kit.css"><script src="../kit/kit.js" defer></script>
<style>
.x-top { max-width: 1440px; margin: 0 auto; padding: 24px 24px 8px; box-sizing: border-box; }
.x-top h1 { font-size: 24px; line-height: 32px; font-weight: 600; margin: 0 0 4px; }
.x-top p { max-width: 80ch; color: var(--cm-text-secondary); margin: 4px 0; }
.x-top a { color: var(--cm-text-brand); text-decoration: underline; text-underline-offset: 2px; }
.x-toggle { display: inline-flex; align-items: center; gap: 6px; margin-top: 4px; }
.x-state-h { width: 1440px; margin: 32px auto 8px; padding: 0 24px; box-sizing: border-box; }
.x-state-h h2 { font-size: 15px; line-height: 25px; margin: 0; }
.x-state-h p { margin: 0; max-width: 110ch; color: var(--cm-text-secondary); }
.x-frame { position: relative; width: 1440px; height: 900px; margin: 0 auto; overflow: hidden; box-shadow: 0 0 0 1px var(--cm-border); }
.x-frame .k-app { height: 900px; }
.x-frame .k-annot-note { position: absolute; }
.x-menu-note { padding: 4px 16px 4px 40px; color: var(--k-menu-ink2); font-size: 11px; line-height: 16px; }
.x-resolved { color: var(--k-menu-ink2); }
.k-menu-item[aria-disabled="true"] .k-menu-desc { color: var(--k-menu-ink3); }
.x-provider { width: 400px; }
.x-provider .k-fields { grid-template-columns: 1fr; }
.x-provider .k-fields > .k-span { grid-column: 1; }
.x-nc { flex-wrap: wrap; }
.x-nc .k-name { flex-basis: 100%; }
.x-nc .k-secondary { flex: 1 1 auto; }
.x-name-help { padding: 4px 16px 0; font-size: 11px; line-height: 16px; }
.x-err { padding: 4px 0 0; font-size: 11px; line-height: 16px; }
/* annotation layer: off by default; the checkbox, or #annotated in the address, turns it on */
.ann, .x-annkey { display: none; }
body:has(#ann-toggle:checked) .ann, body:has(#annotated:target) .ann { display: inline-grid; margin-left: 6px; vertical-align: middle; }
body:has(#ann-toggle:checked) .x-annkey, body:has(#annotated:target) .x-annkey { display: block; }
.x-annkey { max-width: 1440px; margin: 24px auto; padding: 0 24px; box-sizing: border-box; }
.x-annkey table { border-collapse: collapse; }
.x-annkey td, .x-annkey th { border-bottom: 1px solid var(--cm-border); padding: 6px 12px 6px 0; text-align: start; vertical-align: top; }
</style>
</head>
<body>
<span id="annotated"></span>
<header class="x-top">
  <h1>Preferences</h1>
  <p>Where a reader sets how they like to work: the theme, reduced motion, the scroll wheel, whether graphty uses the graphics card, which overview a project opens with, the name saved on the notes and recipes they make, and the AI provider for the Assistant. There is no account: nothing here signs in, and nothing identifies the reader beyond the name they type. These belong to the reader, not the project: they are kept in this browser and never change what a colleague sees in the same file. The reader reaches them from the main menu, as in Figma, or by name in Quick actions; each choice applies at once.</p>
  <p>The page follows your system theme. Both renders: <a href="../shots/screens__preferences.png">light</a>, <a href="../shots/screens__preferences--dark.png">dark</a> (first state only; the page itself has all twelve).</p>
  <label class="x-toggle"><input type="checkbox" id="ann-toggle"> Show annotations: the framework section behind each numbered element and the compact-mantine component it is built with (the key is at the bottom of the page)</label>
</header>
${states.join("\n")}
<section class="x-annkey"><h2>Annotation key</h2><table><thead><tr><th>#</th><th>Element</th><th>Framework</th><th>compact-mantine</th></tr></thead><tbody>
${annRows.map(([el, fw, cm], i) => `<tr><td><span class="k-step">${i + 1}</span></td><td>${el}</td><td>${fw}</td><td>${cm}</td></tr>`).join("\n")}
</tbody></table></section>
</body>
</html>
`;
writeFileSync(join(here, "preferences.html"), toShell(html)); // the current frame: kit/shell.mjs
console.log("wrote screens/preferences.html");
