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
// The data a session ends with, for the graders and the end-state check (endstate.mjs): the node,
// edge, visible and selected counts; each source with the element's counts, a recount of the nodes
// and edges that name it (data.sourcesOf) and, when the Data place shows its row, the numbers its
// chips read; each column's kind and role (the attribute's roles, each load's mapping and the
// project's known fields); each filter card (Select or Hide, on or off) with the
// element's count and, when the Data place shows the card, its chips; the time window. Read through
// graphty-element's public API and the screen; null when no graph is open. Self-contained: it runs
// in the page.
export function dataState() {
    const s = document.querySelector("graphty-element")?.session;
    if (!s) return null;
    const plain = (x) => JSON.parse(JSON.stringify(x ?? null));
    const num = (t) => Number(String(t).replaceAll(",", ""));
    const nodes = s.data.nodes();
    const edges = s.data.edges();
    const recount = {};
    for (const [list, kind, key] of [
        [nodes, "node", "nodes"],
        [edges, "edge", "edges"],
    ])
        for (const x of list)
            for (const k of s.data.sourcesOf(x.id, { kind })) (recount[k] ??= { nodes: 0, edges: 0 })[key]++;
    // the chips (compact-mantine's EntityChip) inside an element, by kind: { nodes: "13", edges: "18" }
    const chipsIn = (el) => {
        const out = {};
        for (const c of el.querySelectorAll(".cm-entity-chip[data-kind]"))
            out[c.dataset.kind === "node" ? "nodes" : "edges"] = c.querySelector(".cm-entity-text")?.textContent.trim();
        return out;
    };
    // a source row's chips as the Data place draws them; a count of 0 draws no chip
    const rowChips = (key) => {
        const row = [...document.querySelectorAll(".dp-source[data-source]")].find((r) => r.dataset.source === key);
        if (!row || !row.checkVisibility()) return null;
        const c = chipsIn(row.querySelector(".dp-source-chips") ?? document.createElement("i"));
        return { nodes: c.nodes ? num(c.nodes.split(" of ")[0]) : 0, edges: c.edges ? num(c.edges) : 0 };
    };
    // each filter card's chips ("4 of 14" by kind), in the list's order, which is the conditions' order
    const cards = [...document.querySelectorAll(".dp-filters > *")].filter((c) => c.checkVisibility());
    const cardChips = (i) => (cards[i] ? chipsIn(cards[i]) : null);
    const counts = s.visibility.conditionCounts();
    return {
        counts: {
            ...plain(s.visibility.summary),
            selectedNodes: s.selection.nodes.length,
            selectedEdges: s.selection.edges.length,
        },
        sources: s.data.sources().map((x) => ({
            key: x.key,
            name: x.name ?? (x.tables ?? []).join(" and "),
            kind: x.kind,
            counts: plain(x.counts),
            recount: recount[x.key] ?? { nodes: 0, edges: 0 },
            chips: rowChips(x.key),
            join: x.join ? { matched: x.join.matched, rows: x.join.rows, onto: x.join.onto } : null,
            leftOut: plain(x.leftOut ?? null),
            // the roles the load read each table with (the Fields rows: id, source, target, time, place)
            mapping: plain(x.mapping ?? null),
        })),
        // the fields the project names (time, weight and its meaning, ...) and the weight in use
        knownFields: plain(s.config?.data?.knownFields ?? null),
        weight: plain(s.data.loadedWeight?.() ?? null),
        columns: s.data
            .attributes()
            .filter((a) => a.origin !== "result")
            .map((a) => ({
                kind: a.kind,
                path: a.path,
                name: a.name,
                type: a.type,
                roles: plain(a.roles ?? []),
                hidden: a.hidden === true,
            })),
        filters: s.visibility.conditions.map((c, i) => ({
            id: c.id,
            effect: c.effect,
            on: c.on,
            within: c.within ?? null,
            rule: plain(c.rule),
            count: plain(counts.find((x) => x.id === c.id) ?? null),
            chips: cardChips(i),
        })),
        filter: plain(s.visibility.filter),
        window: plain(s.visibility.window),
    };
}
// The network as it is when a file is exported: totals, what is visible, and each source's counts,
// for the end-state check's export rows (endstate.mjs). Self-contained: it runs in the page.
export function networkCounts() {
    const s = document.querySelector("graphty-element")?.session;
    if (!s) return null;
    return {
        ...JSON.parse(JSON.stringify(s.visibility.summary)),
        sources: s.data.sources().map((x) => ({ key: x.key, name: x.name ?? null, ...x.counts })),
    };
}
// The style tree, for graders and the first-styled clock: every row of the tree (layers and folders,
// in order) and every layer's whole spec, read through graphty-element's public API, with each layer's
// counts when asked; null when no graph is open. Self-contained: it runs in the page.
export function styleTree(withCounts = true) {
    const s = document.querySelector("graphty-element")?.session;
    if (!s) return null;
    const plain = (x) => JSON.parse(JSON.stringify(x ?? null));
    const counts = (id) => {
        try {
            return plain(s.styles.counts(id));
        } catch {
            return null;
        }
    };
    return {
        tree: plain(s.styles.tree()),
        layers: s.styles.list().map((l) => (withCounts ? { ...plain(l), counts: counts(l.id) } : plain(l))),
    };
}
// The node colors drawn now, distinct and sorted, read through graphty-element's public explain (the
// color every layer together gives each node); null when no graph is open. Bar 4 stops its clock at
// the first screenshot where this holds one color that is not the start's. Self-contained: it runs
// in the page.
export function nodeColors() {
    const s = document.querySelector("graphty-element")?.session;
    if (!s) return null;
    const seen = new Set();
    for (const n of s.data.nodes()) {
        try {
            const c = s.styles.explain({ node: n.id }).merged["node.color"];
            seen.add(String(c?.hex ?? c ?? "none").toLowerCase());
        } catch {
            seen.add("unreadable");
        }
    }
    return [...seen].sort();
}
// The key as the reader sees it: each section's title and text, and each row's text and the color
// its chip is painted (#rrggbb); null when no key is shown. Self-contained: it runs in the page.
export function keyShown() {
    const card = document.querySelector("section[aria-label=Legend]");
    if (!card || !card.checkVisibility()) return null;
    // innerText keeps the line breaks between a row's parts ("Layer 1" and "8 of 331 nodes")
    const flat = (e) => e.innerText.replace(/\s+/g, " ").trim();
    const hex = (c) => {
        const m = String(c).match(/[\d.]+/g);
        if (!m || m.length < 3 || (m.length > 3 && Number(m[3]) === 0)) return null;
        return `#${m
            .slice(0, 3)
            .map((x) => Math.round(Number(x)).toString(16).padStart(2, "0"))
            .join("")}`;
    };
    return [...card.querySelectorAll(".ws-legend-section")].map((sec) => ({
        title: sec.getAttribute("aria-label"),
        text: flat(sec),
        rows: [...sec.querySelectorAll(".cm-data-row")].map((r) => {
            const chit = r.querySelector(".ws-legend-chit");
            const painted = chit
                ? [chit, ...chit.querySelectorAll("*")]
                      .map((e) => hex(getComputedStyle(e).backgroundColor))
                      .find(Boolean)
                : null;
            return { text: flat(r), color: painted ?? null };
        }),
    }));
}
// How many nodes and edges are drawn in each color now (#rrggbb), read through graphty-element's
// public explain; null when no graph is open. Self-contained: it runs in the page.
export function drawnColors() {
    const s = document.querySelector("graphty-element")?.session;
    if (!s) return null;
    const ctx = document.createElement("canvas").getContext("2d");
    const hex = (c) => {
        if (c === undefined || c === null) return "none";
        const v = String(c?.hex ?? c);
        ctx.fillStyle = "#000000";
        ctx.fillStyle = v;
        return String(ctx.fillStyle).toLowerCase();
    };
    const tally = (items, key, channel) => {
        const out = {};
        for (const it of items) {
            let c = "unreadable";
            try {
                c = hex(s.styles.explain({ [key]: it.id }).merged[channel]);
            } catch {
                // counted as unreadable
            }
            out[c] = (out[c] ?? 0) + 1;
        }
        return out;
    };
    const edges = (() => {
        try {
            return [...s.data.edges()];
        } catch {
            return [];
        }
    })();
    return { nodes: tally(s.data.nodes(), "node", "node.color"), edges: tally(edges, "edge", "edge.color") };
}
// What the layers look like, with nothing that names or counts them: every "id" and "row" key (a
// layer's place in the tree, by id) and the counts left out, so the same looks under new ids (a sample opened again) read the same
export function styleContent(tree) {
    if (!tree) return null;
    const strip = (x) =>
        Array.isArray(x)
            ? x.map(strip)
            : x && typeof x === "object"
              ? Object.fromEntries(
                    Object.entries(x)
                        .filter(([k]) => !["id", "row", "counts"].includes(k))
                        .map(([k, v]) => [k, strip(v)]),
                )
              : x;
    return JSON.stringify(strip(tree.layers));
}
// The style tree at the end beside the start's, by layer id: what is gone, what was added, and what
// changed (anything but the counts). Graders judge whether each was the participant's choice.
export function styleChanges(start, end) {
    const byId = (t) => new Map((t?.layers ?? []).map((l) => [l.id, l]));
    const [a, b] = [byId(start), byId(end)];
    const same = (x, y) => styleContent({ layers: [x] }) === styleContent({ layers: [y] });
    return {
        gone: [...a.keys()].filter((id) => !b.has(id)),
        added: [...b.keys()].filter((id) => !a.has(id)),
        changed: [...a.keys()].filter((id) => b.has(id) && !same(a.get(id), b.get(id))),
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
// per word -- with the data's words and numbers left out: ids and values, and the names the session
// holds for the data (each source's name, its file name without the extension, its tables, the
// columns the file brought, each node's name; "Ava's" is the name Ava)
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
    // names match as written, so a column "weight" leaves the app's own "Weight" label counted
    // ponytail: an app word spelled exactly like a data name ("Loaded weight") is left out too
    const names = new Set();
    const name = (v) => {
        for (const w of String(v ?? "").split(/\s+/)) if (w) names.add(w);
    };
    const d = el?.session?.data;
    for (const x of d?.sources?.() ?? []) {
        name(x.name);
        name(x.name?.replace(/\.\w+$/, ""));
        for (const t of x.tables ?? []) name(t);
    }
    for (const a of d?.attributes?.() ?? []) if (a.origin === "imported" || a.origin === "joined") name(a.name);
    for (const n of d?.nodes?.() ?? []) name(d.name(n.id));
    const isData = (w) => data.has(w.toLowerCase()) || names.has(w) || names.has(w.replace(/['\u2019]s$/, ""));
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
            if (/\d/.test(w) || isData(w)) left.push(w);
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

// Bar 8: the option a focused list box points at (aria-activedescendant, through shadow roots) is
// inside the visible part of every box that scrolls it: { option, inView }, or null when focus points
// at no option. Axe flags a scrolling list with no tab stop of its own; a list driven by
// aria-activedescendant needs none as long as the keys that move the option also scroll it.
export function activeInView() {
    let a = document.activeElement;
    while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
    const id = a?.getAttribute("aria-activedescendant");
    const o = id && a.getRootNode().getElementById(id);
    if (!o) return null;
    const b = o.getBoundingClientRect();
    let inView = b.top >= 0 && b.bottom <= innerHeight;
    for (let p = o.parentElement; p && inView; p = p.parentElement) {
        if (!/auto|scroll|hidden/.test(getComputedStyle(p).overflowY)) continue;
        const r = p.getBoundingClientRect();
        inView = b.top >= r.top - 1 && b.bottom <= r.bottom + 1;
    }
    return { option: o.textContent.replace(/\s+/g, " ").trim().slice(0, 80), inView };
}

// Planted failures, so a check that cannot fail is caught: an image with no text alternative (axe),
// two buttons of one name, focus dropped to the page, a clipped name and an element code (bar 10),
// and the active option scrolled out of its list ("unscroll")
export function plant(kind) {
    if (kind === "unscroll") {
        let a = document.activeElement;
        while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
        const o = a?.getRootNode().getElementById(a.getAttribute("aria-activedescendant") ?? "");
        for (let p = o?.parentElement; p; p = p.parentElement)
            if (p.scrollHeight > p.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(p).overflowY)) {
                // to the top, or to the bottom when the option is near the top
                p.scrollTop = 0;
                if (o.getBoundingClientRect().bottom <= p.getBoundingClientRect().bottom) p.scrollTop = p.scrollHeight;
                return;
            }
        return;
    }
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
    const all = [];
    let controls = 0;
    for (const n of nodes) {
        const role = n.role?.value;
        const name = String(n.name?.value ?? "")
            .replace(/\s+/g, " ")
            .trim();
        if (n.ignored || !CONTROLS.has(role) || !name) continue;
        if ((n.properties ?? []).some((p) => p.name === "disabled" && p.value.value === true)) continue;
        controls++;
        all.push(name);
        const k = name.toLowerCase();
        by.set(k, [...(by.get(k) ?? []), `${role} "${name}"`]);
    }
    return { controls, all, shared: [...by.values()].filter((v) => v.length > 1) };
}

// Bar 6 of ../tier3/criteria.md, the list bars.mjs --tier 3 must cover and real.mjs --gate checks a
// bars run against: every screen (measured at every size), every action after which focus is
// checked, and every typing check. A name here is the name the walk measures it under.
export const BAR6 = {
    screens: [
        "the start screen",
        "a sample just opened",
        "a sample just opened, the key switched on",
        "Everything, Node tab",
        "the open shape list",
        "Everything, Edge tab",
        "the line menu",
        "a new layer, its picker open",
        "the add-a-condition menu",
        "a text card",
        "a layer with a condition, at rest",
        "a color just added",
        "the text menu",
        "the analysis list, filtered to groups",
        "a groups analysis before it runs",
        "a folder of groups",
        "a folder of groups, Edge tab",
        "the find box, a name typed, its results",
        "a node's inspector, its Memberships",
        "a node's own Style tab, its Fill + and Why this look",
        "two layers picked together",
        "a layer with an Edge tab condition, at rest",
        "a colleague's project just opened",
        "a colleague's layer selected",
        "a file read, before loading",
        "a category card",
        "a yes/no card",
        "a number card",
        "a has-no-value card",
        "a layer with four conditions, at rest",
        "a color bound to a category column, with its key",
        "the color popover of a category column",
        "the size popover, before a column is picked",
        "the size popover of a number column",
        "a run's folder, its picker open, a card added to every layer",
        "the color from each layer dialog",
    ],
    focus: [
        "adding a layer",
        "adding a card",
        "choosing a text card's match kind",
        "Done in the picker",
        "adding a color",
        "Undo",
        "Escape from the line menu",
        "Escape from the text menu",
        "running a groups analysis",
        "Done in an Edge tab picker",
        "Load",
        "adding a yes/no card",
        "Escape from a card's menu",
        "Done after four cards",
        "picking a column for a color",
        "Escape from the color popover",
        "adding a size",
        "Escape from the size popover",
        "Escape from a bound size's popover",
        "adding a shape",
        "adding a card on a folder",
        "Done in a folder's picker",
        "Escape from the color from each layer dialog",
        "selecting a colleague's layer",
    ],
    typed: ["a new text card", "a text card after Starts with", "a new Color line", "a new Shape line"],
};

// What a bars run left out of bar 6, one MISS line each, at every size: a screen not measured (axe
// and shared names), a focus action not checked, a typing check not made, and a check whose planted
// failure was not caught there. seen: { screens, focus, typed, planted }, each { <size>: [names] }.
// Until 2026-10-21 focus and typed were one list and every check but bar 10's ran at the first size
// only, while the screens were still recorded as walked at 900 x 700 (tool dry run 2, round 1)
export const BAR6_PLANTS = ["axe", "shared names", "focus", "typing"];
export function bar6Gaps(seen, sizes) {
    return walkGaps(BAR6, BAR6_PLANTS, "bar 6", seen, sizes);
}
// Bar 5 of ../tier4/criteria.md, the tier 4 data screens bars.mjs --tier 4 must measure with axe at
// every size (and real.mjs --gate checks a bars run against), and the checks each size must prove
// on a planted failure first
export const BAR5_TIER4 = {
    screens: [
        "the start screen",
        "the web address box, from the start screen",
        "Sources +",
        "the web address box, from Sources +",
        "the join screen",
        "the issue list",
        "Fields +",
        "the Filters picker",
        "Export on Data",
    ],
    focus: [],
    typed: [],
};
export const BAR5_TIER4_PLANTS = ["axe", "shared names", "focus"];
export function tier4Gaps(seen, sizes) {
    return walkGaps(BAR5_TIER4, BAR5_TIER4_PLANTS, "bar 5", seen, sizes);
}
function walkGaps(list, plants, bar, seen, sizes) {
    const out = [];
    for (const size of sizes) {
        const has = (k, n) => Array.isArray(seen[k]?.[size]) && seen[k][size].includes(n);
        for (const s of list.screens)
            if (!has("screens", s)) out.push(`MISS ${s} at ${size}: not walked (${bar} lists it)`);
        for (const f of list.focus)
            if (!has("focus", f)) out.push(`MISS focus after ${f} at ${size}: not checked (${bar} lists it)`);
        for (const t of list.typed)
            if (!has("typed", t)) out.push(`MISS typing into ${t} at ${size}: not checked (${bar} lists it)`);
        for (const c of plants)
            if (!has("planted", c)) out.push(`MISS the ${c} check at ${size}: its planted failure was not caught`);
    }
    return out;
}
