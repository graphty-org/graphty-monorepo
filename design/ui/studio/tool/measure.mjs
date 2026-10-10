// What the studio's scripts measure on a page of the real graphty app, shared by real.mjs (inside a
// live session) and bars.mjs. Page functions are handed to page.evaluate, so each is self-contained.
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const AXE = join(resolve(dirname(fileURLToPath(import.meta.url)), "../../../.."), "node_modules/axe-core/axe.min.js");
export const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
export const serious = (v) => v.impact === "serious" || v.impact === "critical";
// Playwright's headless Chromium starts with --hide-scrollbars, so a scrolling pane looked cut in
// every screenshot; a person's desktop Chrome draws the scrollbar, so the studio's does too
export const LAUNCH = { ignoreDefaultArgs: ["--hide-scrollbars"] };
// how much of a control's name a report quotes: one length everywhere, long enough for a Recent
// projects row (its name, when it was saved and its size)
export const NAME_CHARS = 80;

// Bar 2: the open work a returning user keeps -- runs, style layers, notes, filter steps, sources --
// each "<key> <what it is>" (a filter step: "<id> on|off <its whole rule>"; a run: "<id> <its algorithm's
// technical name> (label <the element's label>)", since the screen names a run by its algorithm); null
// when no graph is open
export function openWork() {
    const s = document.querySelector("graphty-element")?.session;
    if (!s) return null;
    const short = (t) =>
        String(t ?? "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 60);
    return {
        runs: s.runs.list().map((r) => {
            // the app names a run by the algorithm's technical name ("PageRank"), not its plainName
            const a = s.catalog?.algorithms?.().find((d) => d.key === r.algorithm);
            const algorithm = a?.technicalName ?? a?.plainName ?? r.algorithm;
            return `${r.id} ${short(algorithm)} (label ${short(r.label)})`;
        }),
        layers: s.styles.list().map((l) => `${l.id} ${short(l.name)}`),
        notes: s.notes.list().map((n) => `${n.id} ${short(n.text)}`),
        steps: s.visibility.steps.map((f) => `${f.id} ${f.on ? "on" : "off"} ${JSON.stringify(f.rule)}`),
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

// Bar 10's two scripted counts, outside graphty-element, each with the element it is in:
//   cut: text clipped or ellipsized (scrollWidth > clientWidth on a box that hides its overflow and
//        is not a pane a person scrolls), with where the whole text can be read: "title" or "name"
//        (a title or accessible name on it or around it holding the whole text), "shown" (the
//        whole text in another element on screen that fits), or null. Each null
//        one is marked data-studio-cut=<mark>, so the caller can hover it and look for a tooltip.
//   raw: a visible string from the element or the code, not the app's words: an error code
//        (E_BAD_SELECTOR) or a field path (results.louvain.group, data.weight). The data's own
//        words (ids and values) are left out, as in wordsOnScreen.
// ponytail: a refusal's raw text and a file's raw statement have no fixed shape, so only the
// experts catch those; add a pattern when one is seen on screen.
export function bar10() {
    const norm = (s) =>
        String(s ?? "")
            .replace(/\s+/g, " ")
            .trim();
    const describe = (el) => {
        const cls = [...el.classList].find((c) => !/^m_/.test(c));
        const own = `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${cls ? "." + cls : ""}`;
        const ctx = el.parentElement?.closest("[role], [aria-label]");
        if (!ctx) return own;
        const name = norm(ctx.getAttribute("aria-label")).slice(0, 40);
        return `${own} in ${ctx.getAttribute("role") ?? ctx.tagName.toLowerCase()}${name ? ` "${name}"` : ""}`;
    };
    // text a screen reader hears but nobody sees (a visually hidden status line) is not on screen
    const hidden = (el) => {
        for (let a = el; a; a = a.parentElement) {
            const ar = a.getBoundingClientRect();
            if (getComputedStyle(a).overflow !== "visible" && (ar.width <= 1 || ar.height <= 1)) return true;
        }
        return false;
    };
    const skip = (el) =>
        !el || el.closest("script, style, graphty-element, [role=tooltip]") || !el.checkVisibility() || hidden(el);
    const fits = (el) => el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1;
    const whole = [...document.body.querySelectorAll("*")].filter(
        (el) => el.childElementCount === 0 && el.textContent.trim() && !skip(el) && fits(el),
    );
    const cut = [];
    for (const el of document.body.querySelectorAll("*")) {
        if (skip(el) || !el.clientWidth) continue;
        const box = el.getBoundingClientRect();
        if (box.right < 0 || box.bottom < 0 || box.left > innerWidth || box.top > innerHeight) continue; // off screen
        const cs = getComputedStyle(el);
        const wide = el.scrollWidth > el.clientWidth + 1 && (cs.overflowX === "hidden" || cs.overflowX === "clip");
        const clamped = cs.webkitLineClamp !== "none" && el.scrollHeight > el.clientHeight + 1;
        if (!wide && !clamped) continue;
        // the box whose own text runs out, not a panel that hides a wide child
        if (el.querySelector("div, p, ul, ol, table, section, button, input, textarea, select, svg, canvas, [role]"))
            continue;
        const text = norm(el.textContent);
        if (!text) continue;
        let readable = null;
        for (let a = el, up = 0; a && a !== document.body && up < 5 && !readable; a = a.parentElement, up++) {
            if (norm(a.getAttribute("title")).includes(text)) readable = "title";
            else if (norm(a.getAttribute("aria-label")).includes(text)) readable = "name";
        }
        // or shown whole elsewhere on the screen (a node's title cut, its id row in full below it)
        if (!readable && whole.some((w) => !el.contains(w) && norm(w.textContent).includes(text))) readable = "shown";
        const c = { element: describe(el), text: text.slice(0, 80), readable }; // 80: NAME_CHARS
        if (!readable) el.setAttribute("data-studio-cut", (c.mark = cut.length));
        cut.push(c);
    }
    const data = new Set();
    for (const n of document.querySelector("graphty-element")?.getNodes?.() ?? []) {
        data.add(String(n.id));
        for (const v of Object.values(n.data ?? {})) data.add(String(v));
    }
    const FILE = /\.(csv|tsv|json|graphml|gexf|gml|dot|net|txt|xml|png|svg|graphty)$/i;
    const RAW = [
        ["code", /\bE_[A-Z0-9]+(?:_[A-Z0-9]+)+\b/g],
        [
            "field path",
            /\b(?:(?:data|results|algorithmResults|style|metadata)(?:\.[A-Za-z_$][\w$-]*)+|[a-z_$][\w$]*(?:\.[A-Za-z_$][\w$-]*){2,})/g,
        ],
    ];
    const raw = [];
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let t = walk.nextNode(); t; t = walk.nextNode()) {
        const p = t.parentElement;
        if (skip(p)) continue;
        const r = document.createRange();
        r.selectNodeContents(t);
        const b = r.getBoundingClientRect();
        if (b.width < 1 || b.height < 1 || b.right < 0 || b.bottom < 0 || b.left > innerWidth || b.top > innerHeight)
            continue;
        for (const [kind, re] of RAW)
            for (const [m] of t.textContent.matchAll(re))
                if (!FILE.test(m) && !data.has(m)) raw.push({ kind, text: m, element: describe(p) });
    }
    return { cut, raw };
}

// Bar 8: focus fell to the page (nothing focused, or the body) -- through shadow roots
export function focusOnPage() {
    const a = document.activeElement;
    return !a || a === document.body || a === document.documentElement;
}

// Planted failures, so a check that cannot fail is caught: an image with no text alternative (axe),
// two buttons of one name, focus dropped to the page, a clipped name and an element code (bar 10)
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
    d.style.cssText = "position:fixed;left:0;top:0;z-index:2147483647;background:#fff;color:#000";
    d.innerHTML =
        {
            twins: "<button>Planted twin</button><button>Planted twin</button>",
            // a long name in a narrow box, ellipsized, with no title, name or tooltip giving it whole
            cut: '<span style="display:block;width:90px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">Planted cut Northern Regional Distribution Center 01</span>',
            raw: "<p>The rule was refused: E_BAD_SELECTOR</p>",
        }[kind] ?? '<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" width="8" height="8">';
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
