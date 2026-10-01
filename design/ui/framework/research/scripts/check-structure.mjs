// Structure check for the framework (information-architecture.md 12): the tree-test outline
// against the command register and the inspector tables, the glossary's rejected words against
// every label, the object list against its copies, the key roles against the patterns, the
// behavior map's verb cells against the model's operation table, and the pattern index.
// Run from anywhere: node design/ui/framework/research/scripts/check-structure.mjs [--self-test]
// Exits 1 on any failure. check-framework.mjs runs it and writes the result to research/last-check.txt.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (f) => readFileSync(join(dir, f), "utf8");
const cells = (row) => row.split("|").map((c) => c.trim()).slice(1, -1);
const rows = (text) => text.split("\n").filter((l) => l.startsWith("| ") && !l.startsWith("|---"));
const between = (text, from, to) => {
    const a = text.indexOf(from);
    if (a < 0) throw new Error(`section not found: ${from}`);
    const b = to ? text.indexOf(to, a + from.length) : -1;
    return text.slice(a, b < 0 ? undefined : b);
};
const norm = (l) => l.replace(/\.\.\.$/, "").replace(/\s+/g, " ").trim();

// --- Sources ------------------------------------------------------------------------------------

// The outline as a list of { path, label, depth }, bracketed lines kept as context only.
export function parseOutline(ia) {
    const block = between(ia, "### 4.1 The outline", "## 5.").match(/```text\n([\s\S]*?)```/)[1];
    const lines = block.split("\n").filter((l) => l.trim());
    const stack = [];
    const items = [];
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        const depth = line.match(/^ */)[0].length / 2;
        // a wrapped line continues its predecessor at the same depth after a trailing "/"
        while (line.trim().endsWith("/") && i + 1 < lines.length) line = `${line} ${lines[++i].trim()}`;
        const t = line.trim();
        stack.length = depth;
        stack[depth] = t;
        const parents = stack.slice(0, depth);
        if (t.startsWith("[")) continue;
        for (const p of t.split(" / ")) if (p.trim() && !p.trim().startsWith("[")) items.push({ label: p.trim(), parents, depth });
    }
    return items;
}

export function registerLabels(homes) {
    const out = new Set();
    for (const row of rows(between(homes, "## 3.", "## 4."))) {
        const c = cells(row);
        if (c[0] === "Command") continue;
        for (const p of c[0].replace(/\([^)]*\)/g, "").split(/, |: /)) if (p.trim()) out.add(norm(p));
    }
    return out;
}

// Every bold term in the glossary's tables and its section 13 interface words.
export function glossaryTerms(gl) {
    const out = new Set();
    for (const row of rows(gl)) for (const m of cells(row)[0]?.matchAll(/\*\*([^*]+)\*\*/g) ?? []) out.add(norm(m[1]));
    return out;
}

// Quoted rejected words, from every glossary table's Rejected column.
export function rejectedWords(gl) {
    const out = new Set();
    let col = -1;
    for (const line of gl.split("\n")) {
        if (line.startsWith("|---")) continue;
        if (!line.startsWith("| ")) { col = -1; continue; }
        const c = cells(line);
        const h = c.indexOf("Rejected");
        if (h >= 0) { col = h; continue; }
        if (col < 0) continue;
        for (const m of (c[col] ?? "").matchAll(/"([^"]+)"/g)) out.add(m[1]);
    }
    return out;
}

// The inspector tables of interface-specification.md 4.1 and 4.2, by kind.
export function inspectorKinds(spec) {
    const kinds = new Map();
    const t41 = rows(between(spec, "### 4.1 Which sections", "### 4.1a"));
    const head = cells(t41[0]);
    for (const row of t41.slice(1)) {
        const c = cells(row);
        const sections = [];
        c[1].split(", ").forEach((p) => {
            const name = p.replace(/ B$/, "").replace(/ \([^)]*\)$/, "").trim();
            if (name && name !== ".") sections.push(name);
        });
        head.forEach((h, i) => {
            if (i < 2) return;
            if (c[i] && c[i] !== ".") sections.push(h);
        });
        kinds.set(c[0], { sections, verbs: [], overflow: [] });
    }
    const t42 = rows(between(spec, "### 4.2 Type-row verbs", "### 4.3"));
    const h42 = cells(t42[0]);
    const [iv, io] = [h42.indexOf("Verbs"), h42.indexOf("Overflow")];
    for (const row of t42.slice(1)) {
        const c = cells(row);
        const k = kinds.get(c[0]) ?? { sections: [] };
        const split = (s) => s.split(/, (?![^()]*\))/).map((x) => x.trim()).filter((x) => x && x !== "--");
        k.verbs = split(c[iv]);
        k.overflow = split(c[io]);
        kinds.set(c[0], k);
    }
    return kinds;
}

// Labels a flow draws: commands on edges, and capitalized items after a place's colon.
export function flowLabels(flows) {
    const out = [];
    for (const block of flows.matchAll(/```mermaid\n([\s\S]*?)```/g)) {
        for (const e of block[1].matchAll(/-\.?->\|"([^"]+)"\|/g)) {
            for (const part of e[1].split(/ \/ |; /)) out.push(part.replace(/^[a-z][^:]*: /, "").trim());
        }
        for (const n of block[1].matchAll(/\["([^"]+)"\]/g)) {
            for (const seg of n[1].split(": ").slice(1)) for (const p of seg.split(", ")) out.push(p.trim());
        }
    }
    return out.filter((l) => /^[A-Z]/.test(l));
}

// --- Checks -------------------------------------------------------------------------------------

const OUTLINE_KIND = {
    "nothing selected": "Nothing",
    "one node selected": "One node",
    "one edge selected": "One edge",
    "several elements selected": "Several elements",
    "one set selected": "Set",
    "one path selected": "Path",
    "one group selected": "Set, offered (a group)",
    "one found path selected": "Path, offered (a found path)",
};
// A verb or overflow entry whose label follows the selection is scored under its first form.
const firstForm = (v) => norm(v.replace(/\s*\(split:[^)]*\)/, "").replace(/ \((fixed|rule) set\)$/, "").replace(/ or (Unpin|Expand|Show on canvas)$/, ""));

export function checkBranches(outline, kinds) {
    const failures = [];
    const byKind = new Map();
    for (const it of outline) {
        const kindLine = it.parents.find((p) => OUTLINE_KIND[p.replace(/^\[|\]$/g, "")]);
        if (!kindLine || !it.parents.includes("[right-hand panel]")) continue;
        const kind = OUTLINE_KIND[kindLine.replace(/^\[|\]$/g, "")];
        const e = byKind.get(kind) ?? { sections: new Set(), verbs: new Set(), overflow: new Set() };
        const parent = it.parents.at(-1);
        const label = norm(it.label);
        if (/^\[actions on/.test(parent) || (/^\[split button\]/.test(parent) && it.parents.some((p) => /^\[actions on/.test(p)))) e.verbs.add(label);
        else if (parent === "[more actions]") e.overflow.add(label);
        else if (parent === kindLine) e.sections.add(label);
        byKind.set(kind, e);
    }
    // Both directions: a kind the specification draws with no outline branch fails too.
    for (const kind of kinds.keys()) if (!byKind.has(kind)) failures.push(`interface-specification.md 4.1 kind "${kind}" has no branch in the outline`);
    if (kinds.size !== byKind.size) failures.push(`the outline scores ${byKind.size} inspector kinds and interface-specification.md 4.1 draws ${kinds.size}`);
    for (const [kind, e] of byKind) {
        const k = kinds.get(kind);
        if (!k) { failures.push(`outline kind "${kind}" has no row in interface-specification.md 4.1`); continue; }
        const specVerbs = new Set();
        for (const v of k.verbs) {
            specVerbs.add(firstForm(v));
            const sp = v.match(/\(split:([^)]*)\)/);
            if (sp) for (const x of sp[1].split(", ")) if (/^[A-Z]/.test(x.trim())) specVerbs.add(norm(x));
        }
        // The graph's own verbs are its commands, not a fixed list, so the Nothing kind has none to compare.
        const specOver = new Set(kind === "Nothing" ? [] : k.overflow.map(firstForm));
        const specSections = new Set(k.sections.map((s) => s.replace(/^(Property rows)$/, "")).filter(Boolean));
        // The Look is the property header's icon, a bracketed control in the outline, scored by a first-click task.
        if (kind === "Nothing") specSections.delete("Look");
        const diff = (a, b, what) => {
            for (const x of a) if (!b.has(x)) failures.push(`${kind}: ${what} "${x}"`);
        };
        // Verbs live only in interface-specification.md 4.2 and are scored by first-click tasks, so
        // the outline must hold none (information-architecture.md 4.1).
        for (const v of [...e.verbs, ...e.overflow]) failures.push(`${kind}: the outline lists the verb "${v}", which belongs only in interface-specification.md 4.2`);
        const outlineSections = new Set([...e.sections].filter((s) => specSections.has(s) || /^[A-Z]/.test(s)));
        const ignore = new Set(["Run layout", "Unpin all", "Replace", "Re-map columns", "Lay out", "Overview", "Last import", "Edges", "Types", "Attributes row", "General overview", "Flow overview", "Community overview", "Use as default overview", "Compute the overview", "Apply recipe..."]);
        diff([...outlineSections].filter((s) => !ignore.has(s)), specSections, "outline section missing from interface-specification.md 4.1:");
        for (const s of specSections) if (!e.sections.has(s)) failures.push(`${kind}: interface-specification.md 4.1 section missing from the outline: "${s}"`);
    }
    return failures;
}

export function checkLabels(outline, register, terms, seeded) {
    const failures = [];
    for (const it of outline) {
        const l = norm(it.label);
        if (register.has(l) || terms.has(l) || seeded.has(l)) continue;
        failures.push(`outline label is neither a register label, a glossary term nor seeded data: "${it.label}"`);
    }
    return failures;
}

// A rejected word is rejected as the name of one concept; it stays legal where it is itself a
// preferred term or a command label ("Hide" is rejected for a filter step and is the eye's label).
export function checkRejected(labels, rejected, where, allowed = new Set()) {
    const failures = [];
    const ok = new Set([...allowed].map((a) => a.toLowerCase()));
    for (const l of labels) {
        if (ok.has(norm(l).toLowerCase())) continue;
        for (const r of rejected) if (norm(l).toLowerCase() === r.toLowerCase()) failures.push(`${where}: label "${l}" is a rejected word in glossary.md`);
    }
    return failures;
}

export function checkObjects(model, copies) {
    const failures = [];
    const names = [];
    for (const row of rows(between(model, "### 1.3 The object map", "### 1.4"))) {
        const m = cells(row)[0]?.match(/\*\*([^*]+)\*\*/g);
        if (m) for (const x of m) names.push(x.replace(/\*/g, "").toLowerCase());
    }
    for (const [doc, text] of copies) {
        const hay = text.toLowerCase().replace(/\s+/g, " ");
        for (const n of names) {
            const stem = n.replace(/s$/, "");
            if (!hay.includes(stem)) failures.push(`${doc}: object type "${n}" from conceptual-model.md 1.3 has no row`);
        }
    }
    return failures;
}

export function checkKeys(homes, patterns) {
    const failures = [];
    const text = patterns.toLowerCase();
    for (const row of rows(between(homes, "## 3.", "## 4."))) {
        const c = cells(row);
        const key = c.at(-2) ?? "";
        if (!key || key === "--" || key === "Key") continue;
        for (const role of key.replace(/\([^)]*\)/g, "").split(/, |:/)) {
            const r = role.trim().toLowerCase();
            if (!r || /^(enter|shift\+enter)$/.test(r)) continue;
            if (!text.includes(r.split(" ")[0])) failures.push(`register key role "${role.trim()}" is named nowhere in the interaction patterns`);
        }
    }
    return failures;
}

// The Delete, Reorder and Edit cells of interaction-patterns.md 2 read "--" exactly where the
// model's operation table (conceptual-model.md 7.1) reads "no".
export function checkVerbs(model, patterns) {
    const failures = [];
    const m = rows(between(model, "#### Which operations apply to which object", "### 7.2"));
    const mHead = cells(m[0]);
    const refused = new Map();
    for (const row of m.slice(1)) {
        const c = cells(row);
        // a model row may name several types ("Look, data version, catalog entry"); names match case-insensitively
        for (const obj of c[0].split(", ")) mHead.forEach((h, i) => { if (i > 0) refused.set(`${obj.toLowerCase()}|${h}`, /^no\b/.test(c[i] ?? "")); });
    }
    const p = rows(between(patterns, "## 2.", "## 3."));
    const pHead = cells(p[0]);
    for (const row of p.slice(1)) {
        const c = cells(row);
        const verb = c[0].match(/^\*\*([^*]+)\*\*/)?.[1];
        if (!["Delete", "Reorder", "Edit"].includes(verb)) continue;
        pHead.forEach((obj, i) => {
            if (i === 0) return;
            const no = refused.get(`${obj.toLowerCase()}|${verb}`);
            if (no === undefined) failures.push(`conceptual-model.md 7.1 has no ${verb} cell for "${obj}"`);
            else if (no !== c[i].startsWith("--")) failures.push(`${verb} on "${obj}": interaction-patterns.md 2 reads "${c[i]}" but conceptual-model.md 7.1 ${no ? "refuses" : "allows"} it`);
        });
    }
    return failures;
}

// Every entry of interaction-pattern-entries.md is in the index (interaction-patterns.md 1.4),
// with the same grammars as its Grammar line.
export function checkIndex(patterns, entries) {
    const failures = [];
    const index = new Map();
    for (const row of rows(between(patterns, "### 1.4", "## 2.")).slice(1)) {
        const c = cells(row);
        index.set(c[1], c[2]);
    }
    for (const block of entries.split(/\n(?=### )/).slice(1)) {
        const sec = block.match(/^### (\d+\.\d+)/)?.[1];
        const grammar = block.match(/\*\*Grammar:\*\*([^\n]*)/)?.[1];
        if (!sec || !grammar) continue;
        const nums = (s) => [...s.matchAll(/\b3\.\d\b/g)].map((x) => x[0]).sort().join(", ");
        if (!index.has(sec)) failures.push(`interaction-pattern-entries.md ${sec} is missing from the index in interaction-patterns.md 1.4`);
        else if (nums(index.get(sec)) !== nums(grammar)) failures.push(`index row ${sec} lists grammars "${index.get(sec)}" but the entry's Grammar line reads "${grammar.trim()}"`);
    }
    return failures;
}

// --- Run ----------------------------------------------------------------------------------------

const SEEDED = new Set([
    "March transfers", "April transfers", "Watchlist", "Context", "Findings", "Closeness", "PageRank",
    "Louvain", "Connected components", "Largest component", "k-core", "Centrality", "Community", "Path",
    "Structure", "Flow", "Prediction", "Communities: Louvain", "In this project", "Graph", "Results", "Notes",
    "File", "Edit", "View", "Selection", "Algorithms", "Recipes", "Preferences", "Help", "Graphs",
    "Sets and paths", "Views", "Nodes", "Edges", "Type", "Types", "Find", "Filter steps", "Export",
    "Documentation", "Shortcuts", "Scope", "Direction and Weight", "Parameters", "Readings", "Top groups",
    "From", "To", "Lasso", "Hand", "Select", "Note", "Overview recipe", "Last import", "Created from",
    "Used by", "Memberships", "Members", "Rule", "Endpoints", "Position", "Connections", "Statistics",
    "Attributes", "Appearance", "Name", "Look", "Background", "Layout", "Style layers", "Replace",
    "Pin", "Collapse", "Show filtered graph", "New graph from", "Quick actions",
    "General overview", "Flow overview", "Community overview", "Reduced motion", "GPU policy", "Top nodes",
    "Findings report", "Community colors", "Degree sizes", "Base style", "Styles", "Assistant", "Overview",
]);

// The rail's places agree across the README's frame summary, interface-specification.md 1.2 and the
// outline's top-level unbracketed branches (information-architecture.md 12).
export function checkRail(readme, spec, outline) {
    const failures = [];
    const row = rows(between(spec, "### 1.2 Regions", "### 1.3")).find((r) => cells(r)[0] === "Rail");
    const rail = cells(row)[2].split(", ").filter((x) => x !== "main menu");
    const top = new Set(outline.filter((it) => it.depth === 0).map((it) => it.label));
    const frame = between(readme, "## The frame at a glance", "\n## ");
    for (const r of rail) {
        if (!top.has(r)) failures.push(`rail place "${r}" (interface-specification.md 1.2) is not a top-level branch of the outline`);
        if (!frame.includes(r)) failures.push(`rail place "${r}" (interface-specification.md 1.2) is missing from the README's frame summary`);
    }
    for (const t of top) if (!rail.includes(t)) failures.push(`outline top-level branch "${t}" is not a rail place in interface-specification.md 1.2`);
    return failures;
}

// The route cells of output-homes.md 1: a route written "<Menu>'s <Command>" names a command the
// outline lists under that main-menu submenu (the tree test's answer key depends on it).
export function checkRoutes(homes, outline) {
    const failures = [];
    const menus = new Set(["File", "Edit", "View", "Selection", "Algorithms", "Recipes", "Preferences", "Help"]);
    for (const row of rows(between(homes, "## 1. Objects", "## 2."))) {
        const c = cells(row);
        if (c[0] === "Object") continue;
        for (const m of (c[3] ?? "").matchAll(/\b([A-Z][a-z]+)'s ([A-Z][^;,]*)/g)) {
            if (!menus.has(m[1])) continue;
            const label = norm(m[2]);
            const ok = outline.some((it) => norm(it.label) === label && it.parents.includes(m[1]) && it.parents[0] === "[main menu]");
            if (!ok) failures.push(`output-homes.md 1, ${c[0]}: route "${m[0]}" is not under ${m[1]} in the outline`);
        }
    }
    return failures;
}

function selfTest() {
    const outline = parseOutline("### 4.1 The outline\n```text\n[right-hand panel]\n  [one node selected]\n    [actions on this node]\n      Bogus verb\n    Attributes\n```\n## 5.");
    const kinds = new Map([["One node", { sections: ["Attributes", "Appearance"], verbs: ["Select neighbors"], overflow: [] }], ["Set", { sections: [], verbs: [], overflow: [] }]]);
    const f = checkBranches(outline, kinds);
    if (!f.some((x) => x.includes('kind "Set" has no branch'))) throw new Error("self-test: missed a spec kind with no outline branch");
    const routeOutline = parseOutline("### 4.1 The outline\n```text\n[main menu]\n  Selection\n    Show on canvas\n```\n## 5.");
    const rf = checkRoutes("## 1. Objects\n| Object | Home | Detail | Routes |\n|---|---|---|---|\n| x | h | d | Edit's Show on canvas |\n## 2.", routeOutline);
    if (!rf.length) throw new Error("self-test: missed a route under the wrong menu");
    if (!f.some((x) => x.includes("Bogus verb"))) throw new Error("self-test: missed a verb listed in the outline");
    if (!f.some((x) => x.includes('"Appearance"'))) throw new Error("self-test: missed a spec section not in the outline");
    const parsed = rejectedWords("| Term | Rejected |\n|---|---|\n| **x** | \"Summary\" |\n");
    if (!parsed.has("Summary")) throw new Error("self-test: the glossary's Rejected column was not read");
    const r = checkRejected(["Summary"], parsed, "x");
    if (!r.length) throw new Error("self-test: missed a rejected word");
    console.log("self-test passed");
}

if (process.argv.includes("--self-test")) selfTest();
const ia = read("information-architecture.md");
const homes = read("output-homes.md");
const gl = read("glossary.md");
const spec = read("interface-specification.md");
const outline = parseOutline(ia);
const register = registerLabels(homes);
const terms = glossaryTerms(gl);
const rejected = rejectedWords(gl);
const failures = [
    ...checkBranches(outline, inspectorKinds(spec)),
    ...checkRoutes(homes, outline),
    ...checkRail(read("README.md"), spec, outline),
    ...checkLabels(outline, register, terms, SEEDED),
    ...checkRejected(outline.map((i) => i.label), rejected, "information-architecture.md 4.1", new Set([...terms, ...register])),
    ...checkRejected([...register], rejected, "output-homes.md 3", terms),
    ...checkRejected(flowLabels(read("task-flows.md")), rejected, "task-flows.md", new Set([...terms, ...register])),
    ...checkObjects(read("conceptual-model.md"), [
        ["output-homes.md 1", between(homes, "## 1. Objects", "## 2.")],
        ["figma-crosswalk.md 2", between(read("figma-crosswalk.md"), "## 2.", "## 3.")],
        ["interaction-patterns.md 2", between(read("interaction-patterns.md"), "## 2.", "## 3.")],
        ["interface-specification.md 6", between(spec, "## 6.", "## 7.")],
    ]),
    ...checkKeys(homes, read("interaction-patterns.md") + read("interaction-pattern-entries.md")),
    ...checkVerbs(read("conceptual-model.md"), read("interaction-patterns.md")),
    ...checkIndex(read("interaction-patterns.md"), read("interaction-pattern-entries.md")),
];
for (const f of failures) console.log(f);
console.log(`${failures.length} failure(s)`);
process.exit(failures.length ? 1 : 0);
