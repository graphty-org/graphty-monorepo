// Lint for the framework documents (README.md, "Validation of the set").
// Run from anywhere: node design/ui/framework/research/scripts/check-framework.mjs
// Checks: each document under its ceiling in the README's table; plain ASCII; American spelling
// (including -ise, -ised, -ising and -isation words) outside code spans, URLs and the glossary's
// rejected-word cells; stale phrases the set retired; that every number in a "`doc.md` N.M, N.M"
// pointer names a heading that exists, exactly; that a bare "(N.M)" names a heading of its own
// document; that a quoted title after a document name occurs in that document; and that every
// "was door N" matches an element-needs.md Door cell reading "was N"; the same pointers when they
// wrap across a line; numbers in a table column whose header names a document; every quote in
// interface-specification.md's Departures fields against figma-crosswalk.md; no "Interim:" clause left in
// element-needs.md and no fallback pointer left in interface-specification.md; implementation-mapping.md's
// traceability (its card rows against interface-specification.md 5, element-needs.md's Slice lines, its
// slices against one-way-doors.md's queue and element-needs.md's areas, its deletion list against the
// graphty tree at the named commit, an issue on every defect row); the word "today" only in the two
// documents that own element status; every open door a document cites named by its title at least
// once in that document; and check-flows.mjs and check-structure.mjs, self-test first. Exits 1 on
// any failure. It checks the documents' form and consistency, never whether the design is right.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (f) => readFileSync(join(dir, f), "utf8");
const docs = readdirSync(dir).filter((f) => f.endsWith(".md")).sort();
const failures = [];
const fail = (f, msg) => failures.push(`${f}: ${msg}`);

// 1. Ceilings, from the README's document table.
const readme = read("README.md");
const ceilings = new Map();
for (const line of readme.split("\n")) {
    const m = line.match(/^\| [^|]* \| `([A-Za-z-]+\.md)` \|.*?\| (\d+) KB/);
    if (m) ceilings.set(m[1], Number(m[2]));
}
for (const f of docs) {
    if (!ceilings.has(f)) { fail(f, "no ceiling in the README's table"); continue; }
    const kb = Buffer.byteLength(read(f)) / 1024;
    if (kb > ceilings.get(f)) fail(f, `${kb.toFixed(1)} KB over its ${ceilings.get(f)} KB ceiling`);
}

// 2 and 3. ASCII, spelling and stale phrases, outside code spans and URLs.
const british = /\b(colou?rs?|neighbours?|neighbourhoods?|behaviours?|catalogues?|cancelled|organis\w*|characteris\w*|analys(e|ed|ing)\b|favour\w*|honour\w*|grey\w*|labelled|modelled|licence|centre)\b/i;
const britishOnly = (w) => /ou|ogue|cancelled|is|ys|grey|lled|licence|centre/i.test(w) && !/^colors?$/i.test(w);
// -ise words that are American too; anything else ending in -ise, -ised, -ising or -isation is British.
const iseOk = new Set(["rise", "arise", "raise", "praise", "promise", "otherwise", "precise", "concise", "exercise",
    "expertise", "wise", "likewise", "clockwise", "advise", "comprise", "surprise", "noise", "enterprise", "revise",
    "supervise", "devise", "improvise", "compromise", "merchandise", "premise", "franchise", "disguise", "paradise",
    "cruise", "treatise", "demise", "despise", "poise", "guise", "chastise", "televise", "incise", "excise", "bruise",
    "noisewise", "pairwise", "stepwise", "elementwise", "piecewise", "rowwise", "counterclockwise", "anticlockwise"]);
const iseWord = /\b([A-Za-z]+?)(ise|ised|ises|ising|isation|isations)\b/g;
const iseBritish = (m) => {
    const w = m[0].toLowerCase();
    const base = w.replace(/(d|s|ing)$/, (x) => (x === "ing" ? "e" : "")).replace(/ation(s)?$/, "e");
    return !iseOk.has(w) && !iseOk.has(base) && !iseOk.has(w.replace(/d$|s$/, "")) && !/wise$/.test(w);
};
const stale = [
    [/\bsearch graph\b/i, "the search graph is retired (conceptual-model.md 4.4)"],
    [/\bshow-context\b/i, "show-context is retired (conceptual-model.md 4.4)"],
    [/\bworking-set step\b|\bWorking set:/, "a working set is a filter step on screen"],
    [/\bkind switcher\b|\bCircuit\b/, "a path's kind is derived and read-only"],
    [/document-architecture\.md/, "the map is retired to research/archive"],
    [/`element-contract\.md` 13\b/, "element needs are element-needs.md"],
    [/\bDownload a copy\b|\bRetry on the CPU\b|\bSave as set\b|\bUngroup set\b/, "a rejected command name"],
    [/\blast-activated\b|\blastActivated\b/, "the inspector follows the selection only"],
    [/\bCategory filter\b|\bby category\b|search, Category/, "the Catalog's filter and headings are families"],
    [/\bDefault look\b/, "the bottom style layer is Base style"],
    [/\bFilter (to|out) selection\b/, "the label is Filter to or Filter out; the selection form is a palette alias"],
    [/\bInclude found nodes\b|\bReplace step\b/, "growing a step is Add selection to step"],
    [/\bRun as search\b/, "a Find kept as a result is Save Find as result"],
    [/\bSave as rule set\b/, "a rule set is made by Create rule set"],
    [/\bposition snapshot\b/, "a view holds stored positions"],
    [/reads "unmeasured"/, "a count still being computed reads not yet measured"],
    [/\bRandomise\b|\bRandomize\b/, "the seed control is New seed"],
    [/\bat opacity 0\b.*hidden|Hidden layer/, "hiding is a visibility state, not a layer"],
    [/[Hh]iding is paint|\bHidden row\b/, "hidden elements are counted on the not-drawn line, outside the style stack"],
    [/\bpinned first\b/, "Overrides is kept first; pin is a node's position only (glossary.md 14)"],
    [/\b[Cc]ommand palette\b/, "the command list is Quick actions; palette means colors (glossary.md 13)"],
    [/\bedge rule\b/, "a set's edges are Edges included (glossary.md 3)"],
    [/\bProject details\b|\bChange options\b|\bScope focused\b/, "a renamed command (output-homes.md 3)"],
    [/\bElement today\b|dashed hidden form/, "a retired form (element status is a need row; the selected-hidden form is B6's)"],
    [/\bsource folds?\b/, "the style stack is cut by count behind N more; the source is a word on each row"],
    [/Reset all overrides|Find path from|Save as recipe|\bGroup by\b|\bLay out\b/, "a renamed command (output-homes.md 3)"],
    [/`session\.visibility`[^.]*what is drawn/, "session.visibility is the data scope on master (door 86)"],
];
// A retired door number is cited nowhere as an open door, research included.
{
    const retired = new Set([...(read("one-way-doors.md") + read("decided-doors.md")).matchAll(/\bformerly door (\d+)|\(was door (\d+)\)/g)].map((m) => m[1] ?? m[2]));
    const open = new Set([...read("one-way-doors.md").matchAll(/^#### (\d+)\. /gm)].map((m) => m[1]));
    for (const f of [...docs, "research/study-schedule.md"]) {
        for (const m of read(f).matchAll(/\(door (\d+)\)|\bdoors? (\d+), (\d+)\b/g)) {
            for (const n of [m[1], m[2], m[3]].filter(Boolean)) if (retired.has(n) && !open.has(n)) fail(f, `cites retired door ${n}; cite the "Decided, and not doors" row by its title`);
        }
    }
}

for (const f of [...docs, "research/study-schedule.md"]) {
    const lines = read(f).split("\n");
    lines.forEach((line, i) => {
        if (/[^\x00-\x7f]/.test(line)) fail(`${f}:${i + 1}`, "non-ASCII character");
        const prose = line.split("`").filter((_, k) => k % 2 === 0).join(" ").replace(/https?:\/\/\S+/g, "");
        // Rejected names are quoted where they are rejected: the glossary's alias cells and the
        // rejected-alternatives lists, whose entries open with a bold "- **An ...:**" name.
        // A quoted British spelling is exempt only as one quoted token, never across two quotes.
        const exempt = /reject|withdraw|retired|Rejected|British|American spellings|neighbour, colour|"[^"\s]*(ou|ogue)[^"\s]*"/.test(prose)
            || (f === "glossary.md" && line.startsWith("| **"))
            || /^- \*\*An? /.test(line)
            || /^- .*"[^"]+".*\b(19|20)\d\d\b/.test(line); // a cited title keeps its own spelling
        const exemptStale = /reject|withdraw|retired|Rejected|\(Quick actions\)/.test(prose) || /^- \*\*An? /.test(line);
        const m = prose.match(british);
        if (m && britishOnly(m[0]) && !exempt) fail(`${f}:${i + 1}`, `British spelling "${m[0]}"`);
        for (const w of prose.matchAll(iseWord)) if (iseBritish(w) && !exempt) fail(`${f}:${i + 1}`, `British spelling "${w[0]}"`);
        for (const [re, why] of stale) {
            if (re.test(line) && !exemptStale && !f.startsWith("research/") && f !== "glossary.md") fail(`${f}:${i + 1}`, why);
        }
        // Element status is written only where it is owned (README, "Rules every document follows").
        // one-way-doors.md states each door's published baseline, which is what makes it a door.
        if (!f.startsWith("research/") && !/^(element-needs|element-needs-later|implementation-mapping|one-way-doors)\.md$/.test(f)
            && /\btoday\b/i.test(line.replace(/graphty-today\.md/g, ""))) {
            fail(`${f}:${i + 1}`, 'element status ("today") belongs in element-needs.md or implementation-mapping.md; cite the need row');
        }
    });
}

// 4. Section pointers resolve, exactly. Doors are checked against one-way-doors.md's headings.
const headings = new Map();
for (const f of docs) {
    const set = new Set();
    for (const m of read(f).matchAll(/^#+ ((?:\d+(?:\.\d+)*[a-z]?)|[A-B]\d+)[. ]/gm)) set.add(m[1].replace(/\.$/, ""));
    headings.set(f, set);
}
const doorText = read("one-way-doors.md");
const openDoors = new Set([...doorText.matchAll(/^#### (\d+)\. /gm)].map((m) => m[1]));
const needsFiles = ["element-needs.md", "element-needs.md"].filter((f) => existsSync(join(dir, f)));
const needsText = needsFiles.map(read).join("\n");
const wasDoors = new Set();
for (const line of needsText.split("\n")) {
    const last = line.split("|").at(-2) ?? "";
    for (const m of last.matchAll(/was ((?:\d+(?:,| and| or)? ?)+)/g)) for (const n of m[1].match(/\d+/g)) wasDoors.add(n);
}
const decidedDoors = new Set([...(doorText + read("decided-doors.md")).matchAll(/\((?:was|formerly) door (\d+)/g)].map((m) => m[1]));
const exists = (target, num) => {
    const set = headings.get(target);
    if (!set) return true;
    if (set.has(num)) return true;
    // a section cited as "N" is fine when N.x headings exist under a "## N." heading
    return false;
};
const listRe = /`([a-z-]+\.md)` ((?:\d+(?:\.\d+)?|section \d+)(?:(?:, (?:and )?| and | or |; )\d+(?:\.\d+)?)*)/g;
for (const f of docs) {
    const raw = read(f);
    // pointers may wrap across lines; table rows never do, so joining is safe for the pointer checks
    const text = raw.replace(/\n(?![|#\n-])\s*/g, " ");
    for (const m of text.matchAll(listRe)) {
        const [, target] = m;
        if (target === "figma-spec.md") continue; // compact-mantine's, outside this folder
        if (!existsSync(join(dir, target))) { fail(f, `cites a missing document ${target}`); continue; }
        const nums = m[2].replace(/^section /, "").split(/, (?:and )?| and | or |; /);
        for (const num of nums) {
            if (target === "one-way-doors.md") {
                if (!openDoors.has(num)) fail(f, `cites door ${num}, which is not an open door`);
                continue;
            }
            if (target === "README.md" || target === "CLAUDE.md") continue;
            if (!exists(target, num)) fail(f, `cites ${target} ${num}, which has no such heading`);
        }
    }
    // a bare "(N.M)" or "(N.M; N.M)" names a heading of this document
    for (const m of raw.matchAll(/\((\d+\.\d+(?:(?:; |, )\d+\.\d+)*)\)/g)) {
        const before = raw.slice(Math.max(0, m.index - 40), m.index);
        if (/\.md`\s*$|undo design\s*$|figma|WCAG|flows\.md`?\s*$/i.test(before)) continue;
        // task-flows.md names patterns by their section in the two pattern documents (its section 1)
        const own = f === "task-flows.md"
            ? new Set([...headings.get(f), ...headings.get("interaction-patterns.md"), ...headings.get("interaction-pattern-entries.md")])
            : headings.get(f);
        for (const num of m[1].split(/; |, /)) if (!own.has(num)) fail(f, `a bare pointer (${num}) names no heading of this document`);
    }
    // a quoted title after a document name occurs in that document
    for (const m of text.matchAll(/`([a-z-]+\.md)`(?: \d+(?:\.\d+)?)?, "([^"]{6,})"/g)) {
        const [, target, title] = m;
        if (!existsSync(join(dir, target)) || target === "README.md") continue;
        const t = title.replace(/\.\.\.$/, "").replace(/ \.\.\. .*$/, "");
        if (!(target === "element-needs.md" ? needsText : read(target)).replace(/\s+/g, " ").includes(t.replace(/\s+/g, " "))) fail(f, `quotes "${title}" from ${target}, which does not contain it`);
    }
    for (const m of text.matchAll(/\bdoors? (\d+)\b/g)) {
        if (f === "one-way-doors.md" || f === "decided-doors.md" || f.startsWith("element-needs")) break;
        const back = text.slice(Math.max(0, m.index - 6), m.index);
        if (back.includes("was ")) {
            if (!wasDoors.has(m[1]) && !decidedDoors.has(m[1])) fail(f, `cites "was door ${m[1]}", which no element-needs.md Door cell reads`);
        } else if (!openDoors.has(m[1])) fail(f, `cites door ${m[1]}, which is not open`);
    }
}

// 5. The flows check (task-flows.md 12, item 1), self-test first.
const flowsRun = spawnSync(process.execPath, [join(dirname(fileURLToPath(import.meta.url)), "check-flows.mjs"), "--self-test"], { encoding: "utf8" });
if (flowsRun.status !== 0) {
    for (const line of `${flowsRun.stdout}${flowsRun.stderr}`.split("\n")) if (line && !/failure\(s\)$|self-test passed/.test(line)) fail("check-flows.mjs", line);
    if (!failures.some((x) => x.startsWith("check-flows.mjs"))) fail("check-flows.mjs", `exited ${flowsRun.status}`);
}

// 5a. The structure check (information-architecture.md 12), self-test first; its result lands in
// research/last-check.txt with this lint's.
const structureRun = spawnSync(process.execPath, [join(dirname(fileURLToPath(import.meta.url)), "check-structure.mjs"), "--self-test"], { encoding: "utf8" });
if (structureRun.status !== 0) {
    for (const line of `${structureRun.stdout}${structureRun.stderr}`.split("\n")) if (line && !/failure\(s\)$|self-test passed/.test(line)) fail("check-structure.mjs", line);
    if (!failures.some((x) => x.startsWith("check-structure.mjs"))) fail("check-structure.mjs", `exited ${structureRun.status}`);
}

// 5b. Every open door a document cites is named by its exact title at least once in that document,
// so a stranger never meets a bare number: "door 33, Choosing the overview recipe", or a list in the
// document's Sources ("Open decisions cited"). Before 2026-09-28 this matched only a title's first
// three words, so "passed" did not cover title equality. Now every "door N, <title>" and every
// "N, <title>" in an "Open decisions cited" line must start with the door's heading, character for
// character, and a retired door number fails wherever it is cited, research included.
{
    const titles = new Map([...doorText.matchAll(/^#### (\d+)\. (.+)$/gm)].map((m) => [m[1], m[2].trim()]));
    const key = (t) => t.toLowerCase().replace(/`/g, "").replace(/^(the|a|an) /, "").split(/\s+/).slice(0, 3).join(" ");
    for (const f of docs) {
        if (f === "one-way-doors.md" || f === "decided-doors.md" || f.startsWith("element-needs")) continue;
        const flat = read(f).replace(/\s+/g, " ");
        const low = flat.toLowerCase().replace(/`/g, "");
        const cited = new Set();
        for (const m of flat.matchAll(/\bdoors? ((?:\d+(?:, | and | or |; | to )?)+)|`one-way-doors\.md` ((?:\d+(?:, | and | or |; | to )?)+)/g)) {
            for (const n of (m[1] ?? m[2]).match(/\d+/g)) if (titles.has(n)) cited.add(n);
        }
        for (const n of cited) {
            const title = titles.get(n).toLowerCase().replace(/`/g, "");
            const named = [...low.matchAll(new RegExp(`\\b${n}\\b`, "g"))].some((m) => low.slice(m.index, m.index + 12 + title.length).includes(title));
            if (!named) fail(f, `cites door ${n} without its exact title ("${titles.get(n)}") anywhere in the document`);
        }
        const exact = (n, text, where) => {
            if (!titles.has(n)) return;
            const want = titles.get(n).replace(/`/g, "");
            const got = text.replace(/`/g, "").trim();
            const firstWords = (s) => s.toLowerCase().split(/\s+/).slice(0, 2).join(" ");
            // only a text that looks like a title (a capital first) and shares nothing is ignored as prose
            if (!/^[A-Z]/.test(got)) return;
            if (!got.startsWith(want) && (firstWords(got) === firstWords(want) || /^[A-Z][a-z]+(?: [a-z-]+)*(?::|$)/.test(got.split(/[;,()]/)[0]))) {
                if (!got.startsWith(want.slice(0, Math.min(want.length, got.length)))) fail(f, `${where} names door ${n} as "${got.slice(0, 50)}", but its title is "${want}"`);
            }
        };
        for (const m of flat.matchAll(/\bdoor (\d+), ([^;.()|]{4,90})/g)) exact(m[1], m[2], "a citation");
        for (const line of read(f).replace(/\n(?![|#\n-])\s*/g, " ").split("\n").filter((l) => /Open decisions cited|one-way-doors\.md`\): /.test(l))) {
            for (const m of line.split(/\): /)[1]?.matchAll(/(\d+), ([^;]+)/g) ?? []) exact(m[1], m[2], "its Sources");
        }
    }
}

// 5c. A table column whose header names a document: every section number in its cells resolves.
for (const f of docs) {
    let cols = null;
    for (const line of read(f).split("\n")) {
        if (!line.startsWith("|")) { cols = null; continue; }
        const cells = line.split("|").slice(1, -1).map((c) => c.trim());
        if (/^\|[-| ]+\|$/.test(line)) continue;
        if (!cols) { cols = cells.map((c) => (c.match(/^[^`]*\(`([a-z-]+\.md)`\)$/) ?? [])[1]); continue; }
        cells.forEach((c, i) => {
            const target = cols[i];
            if (!target || c === "--") return;
            for (const n of c.match(/\b\d+\.\d+\b/g) ?? []) if (!exists(target, n)) fail(f, `a "${target}" column cites ${n}, which has no such heading`);
        });
    }
}

// 6. Departures cite the ledger; 8.4 quotes element-needs.md.
{
    const spec = (read("interface-specification.md") + read("interface-templates.md")).replace(/\s+/g, " ");
    const ledger = read("figma-crosswalk.md").replace(/\s+/g, " ");
    const needs = needsText.replace(/\s+/g, " ");
    for (const m of spec.matchAll(/\*\*Departures:\*\* (.*?)(?= - \*\*Regions)/g)) {
        if (!/figma-crosswalk\.md|^none/.test(m[1])) fail("interface-specification.md", `a Departures field cites no ledger row: "${m[1].slice(0, 60)}"`);
        for (const q of m[1].matchAll(/"([^"]{6,})"/g)) if (!ledger.includes(q[1])) fail("interface-specification.md", `Departures quotes "${q[1]}", which figma-crosswalk.md 4 does not contain`);
    }
    // There are no fallbacks: no "Interim:" clause in element-needs.md, no fallback pointer in the spec.
    needsFiles.forEach((nf) => read(nf).split("\n").forEach((l, i) => { if (/\bInterim:/.test(l)) fail(`${nf}:${i + 1}`, "an Interim clause is a fallback; a part is absent until its need lands (implementation-mapping.md 7)"); }));
    read("interface-specification.md").split("\n").forEach((l, i) => {
        if (/fallback/i.test(l) && /8\.4|implementation-mapping\.md` 7/.test(l) && !/no fallbacks|no "fallback"/.test(l)) fail(`interface-specification.md:${i + 1}`, "a fallback pointer; a blocked part is absent (implementation-mapping.md 7)");
    });
}

// 6a. The departures ledger's fact table (figma-crosswalk.md 4.0): at most 40 facts; every row it
// names by the start of its Figma cell exists; every detail row of 4.1 to 4.4 is named once.
{
    const x = read("figma-crosswalk.md");
    const sec = x.slice(x.indexOf("### 4.0"), x.indexOf("### 4.1"));
    const detail = x.slice(x.indexOf("### 4.1"), x.indexOf("\n## 5.")).split("\n")
        .filter((l) => l.startsWith("| ") && !l.startsWith("| Figma |")).map((l) => l.split("|")[1].trim());
    const facts = sec.split("\n").filter((l) => l.startsWith("| ") && !l.startsWith("| Fact"));
    if (facts.length > 40) fail("figma-crosswalk.md", `4.0 holds ${facts.length} facts, over the target of 40 (principles.md 0)`);
    const named = new Set();
    for (const m of sec.replace(/\s+/g, " ").matchAll(/"([^"]{4,})"|`("\+"[^`]*)`/g)) {
        const q = m[1] ?? m[2];
        const hits = detail.filter((r) => r.startsWith(q));
        if (!hits.length) fail("figma-crosswalk.md", `4.0 names "${q}", which starts no ledger row`);
        hits.forEach((h) => named.add(h));
    }
    for (const r of detail) if (!named.has(r)) fail("figma-crosswalk.md", `ledger row "${r.slice(0, 50)}" is named by no fact, exception or waiting list in 4.0`);
}

// 7. implementation-mapping.md's traceability (its section 12).
{
    const map = read("implementation-mapping.md");
    const section = (n) => map.split(`\n## ${n}.`)[1]?.split("\n## ")[0] ?? "";
    // Card rows equal the template headings of interface-templates.md, 0 excepted.
    const cards = new Set([...section(5).matchAll(/^\| (\d+a?) [A-Z]/gm)].map((m) => m[1]));
    const templates = new Set([...read("interface-templates.md").matchAll(/^## (\d+a?)\. /gm)].map((m) => m[1]).filter((n) => n !== "0"));
    for (const n of templates) if (!cards.has(n)) fail("implementation-mapping.md", `section 5 has no card row for interface-templates.md ${n}`);
    for (const n of cards) if (!templates.has(n)) fail("implementation-mapping.md", `card row ${n} has no template in interface-templates.md`);
    // Slices: section 9's table against the queue; the table carries no door column.
    const b9 = section(9);
    if (/^\|[^\n]*Doors/m.test(b9)) fail("implementation-mapping.md", "section 9's table carries a door column; the queue is the one list");
    const slices = new Set([...b9.matchAll(/^\| (\d+[a-c]?) \| /gm)].map((m) => m[1]));
    const queue = doorText.split("\n## The queue")[1]?.split("\n## ")[0] ?? "";
    const queued = new Set([...queue.matchAll(/^\| (\d+[a-c]?), /gm)].map((m) => m[1]));
    for (const n of slices) if (!queued.has(n)) fail("one-way-doors.md", `the queue has no row for slice ${n}`);
    for (const n of queued) if (!slices.has(n)) fail("implementation-mapping.md", `section 9 has no slice ${n}, which the queue names`);
    // Every area of element-needs.md 2 names slices that exist.
    const areas = needsText.split("\n## 2.").slice(1).flatMap((part) => part.split("\n## ")[0].split("\n### ").slice(1));
    for (const a of areas) {
        const title = a.split("\n")[0];
        const line = a.match(/^Slice: (.*)$/m);
        const ids = line ? [...line[1].matchAll(/\b(\d+[a-c]?)\b/g)].map((m) => m[1]) : [];
        if (!ids.length) { fail("element-needs.md", `area "${title}" names no build slice`); continue; }
        for (const id of ids) if (!slices.has(id)) fail("element-needs.md", `area "${title}" names slice ${id}, which implementation-mapping.md 9 does not have`);
    }
    // Every slice in section 9 has an element-needs.md area naming it.
    const named = new Set(areas.flatMap((a) => [...(a.match(/^Slice: (.*)$/m)?.[1] ?? "").matchAll(/\b(\d+[a-c]?)\b/g)].map((m) => m[1])));
    for (const n of slices) if (!named.has(n)) fail("element-needs.md", `no area names slice ${n}`);
    // Every *defect* row of section 8 has an Issue cell: "#n", or "to file" (printed as pending).
    let pending = 0;
    for (const line of section(8).split("\n").filter((l) => l.startsWith("| `") && l.includes("*defect"))) {
        const issue = line.split("|").slice(-2)[0].trim();
        if (issue === "to file") pending++;
        else if (!/^#\d+$/.test(issue)) fail("implementation-mapping.md", `section 8 defect row with no issue: ${line.slice(0, 60)}`);
    }
    if (pending) console.log(`pending: ${pending} defect row(s) of implementation-mapping.md 8 read "to file"; slice 0 does not merge until none does`);
    // Section 8's deletion list exists in the graphty tree at the commit the status line names.
    const sha = map.match(/master at `([0-9a-f]{7,40})`/)?.[1];
    const tree = sha ? spawnSync("git", ["ls-tree", "-r", "--full-tree", "--name-only", sha, "graphty/src"], { cwd: dir, encoding: "utf8" }) : null;
    if (!tree || tree.status !== 0) fail("implementation-mapping.md", "cannot list the graphty tree at the status line's commit");
    else {
        const files = tree.stdout.split("\n");
        for (const line of section(8).split("\n").filter((l) => l.startsWith("| `"))) {
            for (const m of line.split("|")[1].matchAll(/`([^`*]+\.tsx?)`/g)) {
                if (!files.some((f) => f.endsWith(`/${m[1]}`))) fail("implementation-mapping.md", `section 8 lists ${m[1]}, which is not in graphty/src at ${sha}`);
            }
        }
    }
}

for (const x of failures) console.log(x);
console.log(`${failures.length} failure(s) across ${docs.length} documents`);
// The README cites this file for the set's last validation, so no document states a result by hand.
{
    const { writeFileSync } = await import("node:fs");
    const stamp = new Date().toLocaleDateString("en-CA");
    writeFileSync(join(dir, "research", "last-check.txt"),
        `${stamp}: check-framework.mjs (with check-flows.mjs and check-structure.mjs): ${failures.length ? `${failures.length} failure(s)\n${failures.join("\n")}` : "passed"}\n`);
}
process.exit(failures.length ? 1 : 0);
