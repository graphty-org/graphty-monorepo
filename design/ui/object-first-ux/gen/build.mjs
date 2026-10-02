// Renders every spec in ./screens/*.mjs to design/ui/object-first-ux/mocks/v2/
// screen-N.html, screenshots each to screen-N.png (the frame plus the 60 px
// caption; a page: "reference" spec is captured full page), and writes
// index.html (the gallery).
// Usage: node design/ui/object-first-ux/gen/build.mjs [N ...]   (no args: every screen)

import { readdirSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { render, viewportOf, OUT, esc } from "./render.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const only = new Set(process.argv.slice(2));
mkdirSync(OUT, { recursive: true });

const specs = [];
for (const f of readdirSync(path.join(here, "screens")).filter((x) => /^screen-\d+\.mjs$/.test(x)).sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]))) {
  const spec = (await import(pathToFileURL(path.join(here, "screens", f)).href)).default;
  specs.push(spec);
  if (only.size && !only.has(String(spec.id))) continue;
  writeFileSync(path.join(OUT, `screen-${spec.id}.html`), render(spec));
}

// The gallery, grouped by what the screens show.
const GROUPS = [
  ["The core screens (round 2)", "The layout, the tree, the inspector, the toolbar, the dock and the two dialogs.", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]],
  ["Files, projects and sessions", "The file menu, unsaved work, saving and reopening a project, autosave, recipes, two graphs at once.", [16, 17, 18, 19, 20, 21]],
  ["Getting data in", "Every way in opens one Import dialog: a URL, pasted text, nodes and edges files, options, a drop, failures, progress, large files, a database.", [22, 23, 24, 25, 26, 101, 27, 28, 29, 30, 31, 32]],
  ["Editing and joining data", "The import report, load rules, column operations, joins, formulas, editing a value, removing, merging, adding.", [33, 34, 35, 36, 37, 38, 39, 40, 41, 42]],
  ["Undo, history, errors and recovery", "The History dock, the object menu, rename and reorder, failed runs, stale objects, a lost view, empty results.", [43, 44, 102, 45, 46, 47, 48]],
  ["Navigating, finding and selecting", "Right-click menus, Find, 3D and framing, the minimap, saved views, follow, box selection, edges, Focus, the keyboard.", [49, 50, 51, 52, 53, 54, 55, 56, 57, 58]],
  ["Filters, sets and paths", "Filter by values, range and rule, edge filters, patterns, neighbours, combining, members, all routes, editing a Set.", [59, 60, 61, 62, 63, 64, 65, 66, 67, 68]],
  ["Analysis results", "Values, plots, groups, summary graphs, the record, batches, scope, findings, what breaks, compare, time, notes, the assistant.", [69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82]],
  ["Layout, look, export, present and VR", "Layouts, pinning, the canvas look, labels, hover, palettes, channels, saved styles, export, Present mode and VR.", [83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100]],
];
const byIdSpec = Object.fromEntries(specs.map((s) => [s.id, s]));
const listed = new Set(GROUPS.flatMap((g) => g[2]));
const rest = specs.filter((s) => !listed.has(s.id)).map((s) => s.id);
if (rest.length) GROUPS.push(["Other screens", "", rest]);
const card = (s) => `<div class="screen" id="screen-${s.id}">
  <a href="screen-${s.id}.html"><img src="screen-${s.id}.png" alt="Screen ${s.id}: ${esc(s.title)}" loading="lazy"></a>
  <div><h3>${s.id}. ${esc(s.title)}</h3><p class="state">${esc(s.caption?.text || "")}</p>
  <p class="links"><a href="screen-${s.id}.html">Open the HTML</a><a href="screen-${s.id}.png">PNG</a></p></div>
</div>`;
const toc = GROUPS.map((g, i) => `<li><a href="#group-${i}">${esc(g[0])}</a> <span class="n">${g[2].length}</span></li>`).join("");
const gallery = GROUPS.map((g, i) => `<h2 id="group-${i}">${esc(g[0])}</h2><p class="lede">${esc(g[1])}</p>\n${g[2].filter((id) => byIdSpec[id]).map((id) => card(byIdSpec[id])).join("\n")}`).join("\n");
writeFileSync(path.join(OUT, "index.html"), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Object-first graphty mocks</title>
<style>
  :root { color-scheme: light dark; --ink: #000; --ink-2: #00000080; --line: #e6e6e6; --bg: #fff; --card: #f5f5f5; --link: #007be5; }
  @media (prefers-color-scheme: dark) { :root { --ink: #fff; --ink-2: #ffffffb2; --line: #444; --bg: #2c2c2c; --card: #383838; --link: #7cc4f8; } }
  html { background: var(--bg); color: var(--ink); font: 450 14px/22px Inter, ui-sans-serif, system-ui, sans-serif; }
  body { margin: 0 auto; padding: 32px 24px 64px; max-width: 1180px; }
  h1 { font-size: 22px; line-height: 30px; font-weight: 600; margin: 0 0 8px; }
  p { margin: 0 0 8px; } .lede { color: var(--ink-2); max-width: 760px; margin-bottom: 24px; }
  a { color: var(--link); text-decoration: none; } a:hover { text-decoration: underline; }
  .screen { display: grid; grid-template-columns: minmax(0, 720px) minmax(240px, 1fr); gap: 24px; padding: 24px 0; border-top: 1px solid var(--line); align-items: start; }
  .screen img { width: 100%; height: auto; display: block; border: 1px solid var(--line); border-radius: 5px; background: var(--card); }
  .screen h3 { font-size: 15px; line-height: 22px; font-weight: 600; margin: 0 0 6px; }
  .screen .state { color: var(--ink-2); font-size: 13px; line-height: 20px; margin-bottom: 8px; }
  .screen .links { font-size: 13px; line-height: 20px; } .screen .links a + a { margin-left: 12px; }
  h2 { font-size: 18px; line-height: 26px; font-weight: 600; margin: 40px 0 4px; }
  .toc { columns: 2; margin: 0 0 16px; padding-left: 18px; } .toc .n { color: var(--ink-2); }
</style></head><body>
<h1>Object-first graphty: the mocks</h1>
<p class="lede">Every screen is generated from one spec by <code>design/ui/object-first-ux/gen/render.mjs</code>, so all of them share one chrome, the round-4 frame (<code>../../round-4/revision-round-4.md</code>): the rail (Objects, Data, Styles, Views, AI; Settings and Help at its foot) beside the dataset name as the file menu and the active rail panel, the 144 px inspector header block with pill tabs, the 48 px icon-only toolbar with Actions (the command palette), Time on time data and the one view-mode button, the dock handle (Table, History) and the status bar. Screens 1 to 15 are the round-2 design (<code>../../round-2/screens.md</code>, <code>../../round-2/revision.md</code>). Screens 16 to 102 draw the key functions round 2 left undrawn (<code>../../round-3/revision-round-3.md</code>). A dark tag above a card or a menu marks a second moment drawn on the same screen.</p>
<ul class="toc">${toc}</ul>
${gallery}
</body></html>
`);

const browser = await chromium.launch({ headless: true, args: ["--use-angle=swiftshader"] });
for (const s of specs) {
  if (only.size && !only.has(String(s.id))) continue;
  const page = await browser.newPage({ viewport: viewportOf(s), deviceScaleFactor: 1 });
  page.on("pageerror", (e) => console.error("pageerror:", e.message));
  page.on("console", (m) => { if (m.type() === "error") console.error("console:", m.text()); });
  await page.goto(pathToFileURL(path.join(OUT, `screen-${s.id}.html`)).href);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, `screen-${s.id}.png`), fullPage: s.page === "reference" });
  console.log(`screen-${s.id}.png`);
  await page.close();
}
await browser.close();
