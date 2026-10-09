// What the studio's scripts measure on a page of the real graphty app, shared by real.mjs (inside a
// live session) and bars.mjs. Page functions are handed to page.evaluate, so each is self-contained.
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const AXE = join(resolve(dirname(fileURLToPath(import.meta.url)), "../../../.."), "node_modules/axe-core/axe.min.js");
export const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
export const serious = (v) => v.impact === "serious" || v.impact === "critical";

// Bar 2: the open work a returning user keeps -- runs, style layers, notes, filter steps, sources --
// each "<key> <what it is>"; null when no graph is open
export function openWork() {
    const s = document.querySelector("graphty-element")?.session;
    if (!s) return null;
    const short = (t) =>
        String(t ?? "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 60);
    return {
        runs: s.runs.list().map((r) => `${r.id} ${short(r.label)}`),
        layers: s.styles.list().map((l) => `${l.id} ${short(l.name)}`),
        notes: s.notes.list().map((n) => `${n.id} ${short(n.text)}`),
        steps: s.visibility.steps.map((f) => `${f.id} ${f.on ? "on" : "off"}`),
        sources: s.data.sources().map((x) => short(x.name ?? (x.tables ?? []).join(" and "))),
    };
}
// what the start list held and the end list does not, by id (a renamed run, an edited note or a step
// turned off is not gone); a source has no id, so by its name
export function workGone(start, end) {
    const gone = {};
    for (const [kind, items] of Object.entries(start ?? {})) {
        if (!Array.isArray(items)) continue;
        const key = (x) => (kind === "sources" ? x : x.split(" ")[0]);
        const left = new Set((Array.isArray(end?.[kind]) ? end[kind] : []).map(key));
        const lost = items.filter((x) => !left.has(key(x)));
        if (lost.length) gone[kind] = lost;
    }
    return gone;
}

// Bar 9: the app's own words on screen -- visible light-DOM text outside graphty-element, one entry
// per word -- with the data's words (ids and values) and numbers left out
export function wordsOnScreen() {
    const el = document.querySelector("graphty-element");
    const data = new Set();
    const add = (v) => {
        if (typeof v === "string" || typeof v === "number")
            for (const w of String(v).toLowerCase().split(/\s+/)) if (w) data.add(w);
    };
    for (const n of el?.getNodes?.() ?? []) {
        add(n.id);
        for (const v of Object.values(n.data ?? {})) add(v);
    }
    const words = [];
    const left = [];
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let t = walk.nextNode(); t; t = walk.nextNode()) {
        const p = t.parentElement;
        if (!p || p.closest("script, style, graphty-element, [role=tooltip], #studio-planted") || !p.checkVisibility())
            continue;
        // text a screen reader hears but nobody sees (a visually hidden status line) is not on screen
        let clipped = false;
        for (let a = p; a && !clipped; a = a.parentElement) {
            const ar = a.getBoundingClientRect();
            clipped = getComputedStyle(a).overflow !== "visible" && (ar.width <= 1 || ar.height <= 1);
        }
        if (clipped) continue;
        const r = document.createRange();
        r.selectNodeContents(t);
        const b = r.getBoundingClientRect();
        if (b.width < 1 || b.height < 1 || b.right < 0 || b.bottom < 0 || b.left > innerWidth || b.top > innerHeight)
            continue;
        for (const raw of t.textContent.split(/\s+/)) {
            const w = raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
            if (!w) continue;
            if (/\d/.test(w) || data.has(w.toLowerCase())) left.push(w);
            else words.push(w);
        }
    }
    return { words, left };
}

// Bar 8: focus fell to the page (nothing focused, or the body) -- through shadow roots
export function focusOnPage() {
    const a = document.activeElement;
    return !a || a === document.body || a === document.documentElement;
}

// Planted failures, so a check that cannot fail is caught: an image with no text alternative (axe),
// two buttons of one name, focus dropped to the page
export function plant(kind) {
    if (kind === "blur") {
        let e = document.activeElement;
        while (e?.shadowRoot?.activeElement) e = e.shadowRoot.activeElement;
        e?.blur();
        document.activeElement?.blur();
        return;
    }
    const d = document.createElement("div");
    d.id = "studio-planted";
    d.innerHTML =
        kind === "twins"
            ? "<button>Planted twin</button><button>Planted twin</button>"
            : '<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" width="8" height="8">';
    document.body.append(d);
}
export function unplant() {
    document.getElementById("studio-planted")?.remove();
}

// axe-core on the whole page; every violation with its nodes
export async function axeViolations(page) {
    await page.addScriptTag({ path: AXE }).catch(() => {});
    const r = await page.evaluate(
        (tags) => window.axe.run(document, { runOnly: { type: "tag", values: tags }, resultTypes: ["violations"] }),
        AXE_TAGS,
    );
    return r.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.map((n) => ({ target: n.target.join(" "), html: n.html.slice(0, 200), why: n.failureSummary })),
    }));
}

// Bar 8: reachable controls (in the accessibility tree, not disabled) that share an accessible name,
// read from Chromium's own tree so shadow roots and every naming rule count. Items of a list, tree or
// table (option, treeitem, row) are the data's, so two people of one name are not counted.
const CONTROLS = new Set([
    "button",
    "link",
    "checkbox",
    "radio",
    "switch",
    "tab",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
    "combobox",
    "textbox",
    "searchbox",
    "slider",
    "spinbutton",
]);
export async function sameNames(cdp) {
    const { nodes } = await cdp.send("Accessibility.getFullAXTree");
    const by = new Map();
    let controls = 0;
    for (const n of nodes) {
        const role = n.role?.value;
        const name = String(n.name?.value ?? "")
            .replace(/\s+/g, " ")
            .trim();
        if (n.ignored || !CONTROLS.has(role) || !name) continue;
        if ((n.properties ?? []).some((p) => p.name === "disabled" && p.value.value === true)) continue;
        controls++;
        const k = name.toLowerCase();
        by.set(k, [...(by.get(k) ?? []), `${role} "${name}"`]);
    }
    return { controls, shared: [...by.values()].filter((v) => v.length > 1) };
}
