#!/usr/bin/env node
// The shell: brings every app frame on a page to the current frame (kit/template.html), so no page
// shows the old navigation beside the new one.
//
//   node kit/shell.mjs screens/a.html screens/b.html      (rewrites the files in place)
//   import { toShell } from "../kit/shell.mjs"            (a generator passes its page through it)
//
// What it changes, in every k-app:
// - The rail: main menu, Graph, Data, Results, Notes, Assistant. Results is the rail place that holds
//   runs ("Every run of a measure, with its settings and date."); a frame whose Results panel is open
//   keeps it as its left panel, with Results pressed.
// - The left panel's header carries the privacy line under the project name; the Assistant with no
//   provider is its iconless "Off. Nothing is sent." button.
// - The right column's header: no avatar and no Export files... button (Export... is in the project
//   name menu and the Data panel). A header row left empty goes, or keeps the zoom.
// - Styles leave the Graph panel: the list becomes the inspector's Style stack section when the
//   inspector shows the graph, and is dropped when it shows a selection (its Appearance section is
//   the stack for that selection).
// - One right panel: the inspector with nothing selected has no Results section (runs have one
//   home, the rail place; a value is read on its node and in the table).
// - The toolbar's lightning button reads "Quick actions" (an icon-only zap tool gets the word).
// It is idempotent: a page already on the shell comes back unchanged. A frame inside an element
// marked data-frame="before" (or the older data-shell-keep: a deliberate before-and-after) is left
// alone; a Styles section marked data-shell-keep stays in the Graph panel (a study arm that tests
// that placement).
// kit/check.mjs fails a task screen that still shows the old chrome.
import { readFileSync, writeFileSync } from "node:fs";

// ---------------------------------------------------------------- balanced elements
// The element that starts at `start` (an opening tag), to its matching close; tags of other names
// inside are skipped. Returns [start, end) or null.
function elementAt(html, start) {
    const name = /^<([a-z0-9]+)/i.exec(html.slice(start, start + 20))?.[1];
    if (!name) return null;
    const re = new RegExp(`<(/?)${name}\\b[^>]*>`, "gi");
    re.lastIndex = start;
    let depth = 0;
    for (let m; (m = re.exec(html)); ) {
        if (m[1]) depth--;
        else if (!m[0].endsWith("/>")) depth++;
        if (depth === 0) return [start, re.lastIndex];
    }
    return null;
}
// Every element whose opening tag matches `open` (a regexp source for the whole tag), outermost first.
function elements(html, open, from = 0, to = html.length) {
    const out = [];
    const re = new RegExp(open, "gi");
    re.lastIndex = from;
    for (let m; (m = re.exec(html)) && m.index < to; ) {
        const r = elementAt(html, m.index);
        if (!r || r[1] > to) continue;
        out.push(r);
        re.lastIndex = r[1];
    }
    return out;
}
const text = (h) => h.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
// The direct children of the element [s, e): each child element's range.
function children(html, [s, e]) {
    const inner = html.indexOf(">", s) + 1;
    const close = html.lastIndexOf("</", e);
    const out = [];
    const re = /<([a-z0-9]+)\b[^>]*>/gi;
    re.lastIndex = inner;
    for (let m; (m = re.exec(html)) && m.index < close; ) {
        const r = elementAt(html, m.index);
        if (!r) break;
        out.push(r);
        re.lastIndex = r[1];
    }
    return out;
}

// ---------------------------------------------------------------- pieces
const icon = (name) => `<svg class="k-i "><use href="../kit/icons.svg#${name}"/></svg>`;
const railBtn = (name, word, on) => `<div class="k-rail-btn" role="button" aria-pressed="${on ? "true" : "false"}"><span class="k-rail-pill">${icon(name)}</span>${word}</div>`;
const ASST_OFF = `<div class="k-rail-btn k-asst-off" role="button" aria-pressed="false" title="Assistant: off until you set a provider in Preferences">Assistant<span class="k-asst-cap">Off. Nothing is sent.</span></div>`;
const PRIVACY = `<a class="k-privacy">Nothing has been sent from this project</a>`;
const ZOOM = `<span class="k-grow"></span><span class="k-btn k-btn-ghost k-num">100%<svg class="k-i k-i-sm"><use href="../kit/icons.svg#chevron-down"/></svg></span>`;

// The rail, in the template's order; the pressed place kept (Results pressed becomes Graph).
function rail(html, [s, e], resultsOpen) {
    const open = html.slice(s, html.indexOf(">", s) + 1);
    const kids = children(html, [s, e]).map(([a, b]) => html.slice(a, b));
    const word = (k) => text(k).replace(/^\d+\s*/, "").split(" ")[0]; // a badge's count is not the word
    const isMenu = (k) => /icons\.svg#menu"/.test(k);
    const isSep = (k) => /k-rail-sep/.test(k);
    const isAsst = (k) => /k-asst-off|asst-off|#sparkles"/.test(k) || word(k) === "Assistant";
    const pressed = (k) => /aria-pressed="true"/.test(k);
    const find = (w) => kids.find((k) => !isMenu(k) && !isSep(k) && !isAsst(k) && word(k) === w);
    const results = find("Results");
    const order = kids.filter((k) => !isMenu(k) && !isSep(k)).map((k) => (isAsst(k) ? "Assistant" : word(k)));
    // The Assistant with no provider has no icon and says so (template.html); an older frame drew it
    // as a disabled sparkles button. A sparkles button that is not disabled has a provider: kept.
    const asstOff = (k) => (/#sparkles"/.test(k) && /aria-disabled="true"/.test(k) ? ASST_OFF : k);
    if (order.join() === "Graph,Data,Results,Notes,Assistant" && !resultsOpen && kids.filter(isAsst).every((k) => asstOff(k) === k)) return html.slice(s, e); // already the shell
    const graph = find("Graph");
    const onResults = !!resultsOpen || !!(results && pressed(results));
    const onGraph = !onResults && !!(graph && pressed(graph));
    // A new button is the Graph button's own markup (its role, data-say and classes) with its icon and word.
    const clone = (name, w) => graph ? setPressed(graph, false).replace(/#network"/, `#${name}"`).replace(/>Graph<\/div>$/, `>${w}</div>`).replace(/(data-say|aria-label)="Graph"/g, `$1="${w}"`) : railBtn(name, w, false);
    const setPressed = (k, on) => (/aria-pressed="/.test(k) ? k.replace(/aria-pressed="(true|false)"/, `aria-pressed="${on}"`) : k.replace(/^<div class="k-rail-btn([^"]*)"/, `<div class="k-rail-btn$1" aria-pressed="${on}"`))
        .replace(/<span class="k-rail-badge[^"]*"[^>]*>[^<]*<\/span>/, "");
    const out = [
        ...kids.filter(isMenu),
        ...kids.filter(isSep).slice(0, 1),
        graph ? setPressed(graph, !!onGraph) : railBtn("network", "Graph", !!onGraph),
        find("Data") ?? clone("database", "Data"),
        results ? setPressed(results, onResults) : setPressed(clone("flask-conical", "Results"), onResults),
        find("Notes") ?? clone("sticky-note", "Notes"),
        ...kids.filter(isAsst).map(asstOff),
    ];
    const tag = /^<([a-z]+)/.exec(open)[1];
    return `${open}${out.join("")}</${tag}>`;
}

// ---------------------------------------------------------------- one app frame
function frame(app) {
    let h = app;
    // 1. the rail (Results pressed while the Results panel is the left panel)
    const rp = elements(h, `<aside class="k-panel\\b[^"]*"[^>]*aria-label="Results"[^>]*>`)[0];
    const nav = elements(h, `<(?:nav|div) class="k-rail(?:\\s[^"]*)?"[^>]*>`)[0];
    if (nav) h = h.slice(0, nav[0]) + rail(h, nav, !!rp) + h.slice(nav[1]);

    // 2. the privacy line under the project name in the left panel's header: every frame has it
    let gp = elements(h, `<aside class="k-panel\\b[^"]*"[^>]*>`)[0];
    const ph = gp && elements(h, `<div class="k-panel-head\\b[^"]*"[^>]*>`, gp[0], gp[1])[0];
    if (ph && !/class="k-privacy\b/.test(h.slice(ph[0], ph[1]))) {
        const tl = elements(h, `<div class="k-title-line\\b[^"]*"[^>]*>`, ph[0], ph[1])[0];
        if (tl) h = h.slice(0, tl[1]) + PRIVACY + h.slice(tl[1]);
    }

    // 3. Styles out of the Graph panel
    let styles = "";
    gp = elements(h, `<aside class="k-panel\\b[^"]*"[^>]*>`)[0];
    if (gp) {
        const panel = h.slice(gp[0], gp[1]);
        for (const [a, b] of elements(panel, `<section\\b[^>]*>`).reverse()) {
            const sec = panel.slice(a, b);
            const sh = elements(sec, `<div class="k-section-head\\b[^"]*"[^>]*>`)[0];
            if (!sh || !/^Styles\b/.test(text(sec.slice(sh[0], sh[1]))) || /^<section\b[^>]*\sdata-shell-keep\b/.test(sec)) continue; // a placement kept on purpose
            styles = sec.replace(/(<div class="k-section-head\b[^"]*"[^>]*>)\s*Styles/, "$1Style stack");
            h = h.slice(0, gp[0]) + panel.slice(0, a) + panel.slice(b) + h.slice(gp[1]);
            break;
        }
    }

    // 5. the right column: Style stack for the graph's inspector; no Results section there (runs
    // live on the Results rail place)
    const rc = elements(h, `<aside class="k-right\\b[^"]*"[^>]*>`)[0];
    if (rc) {
        let r = h.slice(rc[0], rc[1]);
        // the type line: a k-typerow, or an inspector mock's ins-type group ("TP53, Node")
        const typerow = text(/<div class="k-typerow[^"]*"[^>]*>([\s\S]*?)<\/div>/.exec(r)?.[1] ?? "")
            || (/class="ins-type"[^>]*aria-label="[^"]*, ([^"]*)"/.exec(r)?.[1] ?? "");
        const ofGraph = !typerow || /\bGraph$/.test(typerow);
        if (ofGraph) {
            for (const [a, b] of elements(r, `<section\\b[^>]*>`).reverse()) {
                const sec = r.slice(a, b);
                const sh = elements(sec, `<div class="k-section-head\\b[^"]*"[^>]*>`)[0];
                if (sh && /^Results\b/.test(text(sec.slice(sh[0], sh[1])))) r = r.slice(0, a) + r.slice(b);
            }
        }
        const heads = [...r.matchAll(/<div class="k-section-head\b[^"]*"[^>]*>([^<]*)/g)].map((m) => m[1].trim());
        if (styles && ofGraph && !heads.some((x) => /^(Style stack|Appearance)$/.test(x))) {
            const sc = elements(r, `<div class="k-scroll\\b[^"]*"[^>]*>`)[0];
            if (sc) {
                const first = elements(r, `<section\\b[^>]*>`, sc[0], sc[1])[0];
                const at = first ? first[1] : r.lastIndexOf("</div>", sc[1]);
                r = r.slice(0, at) + styles + r.slice(at);
            }
        }
        h = h.slice(0, rc[0]) + r + h.slice(rc[1]);
    }
    return h;
}

// Every header row, in a frame or a loose right column: no avatar, no Export files... button; a row
// left empty goes (the zoom row under it stays) or keeps the zoom.
function headers(h) {
    for (const [a, b] of elements(h, `<div class="k-header1\\b[^"]*"[^>]*>`).reverse()) {
        const row = h.slice(a, b);
        if (!/class="k-avatar\b|>\s*Export(?: files)?\.\.\.\s*</.test(row)) continue;
        const clean = row.replace(/<span class="k-avatar\b[^"]*"[^>]*>[^<]*<\/span>/g, "").replace(/<span class="k-btn\b[^"]*"[^>]*>\s*Export(?: files)?\.\.\.\s*<\/span>/g, "");
        const hasH2 = /^\s*<div class="k-header2\b/.test(h.slice(b, b + 200));
        h = h.slice(0, a) + (text(clean) ? clean : hasH2 ? "" : clean.replace(/>[\s\S]*<\/div>$/, `>${ZOOM}</div>`)) + h.slice(b);
    }
    return h;
}

// The lightning button carries its name: "Quick actions", beside the icon.
const quickActions = (h) => h.replace(/<span class="k-tool((?: [^"]*)?)"([^>]*)>(<svg\b[^>]*><use href="[^"]*#zap"\/><\/svg>)<\/span>/g,
    (m, cls, attrs, svg) => `<span class="k-tool k-tool-label${cls}"${/\stitle="/.test(attrs) ? attrs : `${attrs} title="Quick actions Ctrl+K"`}>${svg}Quick actions</span>`);

export function toShell(html) {
    let out = "";
    let at = 0;
    // A frame kept on purpose ("for comparison: the placement this design replaces") sits inside an
    // element marked data-frame="before" (or data-shell-keep), and is left as it is.
    const apps = elements(html, `<div class="k-app\\b[^"]*"[^>]*>`);
    const keep = elements(html, `<[a-z]+\\b[^>]*\\s(?:data-shell-keep\\b|data-frame="before")[^>]*>`)
        // one inside a frame (a Styles section kept in the Graph panel) is the frame's business
        .filter(([a, b]) => !apps.some(([s, e]) => s < a && b <= e));
    const fix = (chunk) => {
        let o = "";
        let at = 0;
        for (const [s, e] of elements(chunk, `<div class="k-app\\b[^"]*"[^>]*>`)) {
            o += chunk.slice(at, s) + frame(chunk.slice(s, e));
            at = e;
        }
        return quickActions(headers(o + chunk.slice(at)));
    };
    for (const [s, e] of keep) {
        if (s < at) continue; // nested in a kept element already
        out += fix(html.slice(at, s)) + html.slice(s, e);
        at = e;
    }
    out += fix(html.slice(at));
    // Menus name the one dialog: Export..., not Export files...
    return out.replace(/(<div class="k-menu-item\b[^>]*>(?:(?!<\/div>)[\s\S])*?)Export files\.\.\./g, "$1Export...");
}

if (import.meta.url === `file://${process.argv[1]}`) {
    for (const f of process.argv.slice(2)) {
        const before = readFileSync(f, "utf8");
        const after = toShell(before);
        if (after !== before) writeFileSync(f, after);
        console.log(`${after === before ? "unchanged" : "reshelled"} ${f}`);
    }
}
