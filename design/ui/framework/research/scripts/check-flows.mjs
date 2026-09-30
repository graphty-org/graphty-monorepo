// Link and label check for user-journeys.md and task-flows.md (task-flows.md section 12), and the
// stage-to-flow rule in the header of task-flows.md.
// Run from anywhere: node design/ui/framework/research/scripts/check-flows.mjs
// Add --self-test to prove first that it catches known-bad input. Prints each failure and exits 1
// when there is any. The framework lint (check-framework.mjs) runs it with --self-test; nothing
// outside this folder runs either.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (f) => readFileSync(join(dir, f), "utf8");
const cells = (row) => row.split("|").map((c) => c.trim()).slice(1, -1);
const tableRows = (text) => text.split("\n").filter((l) => l.startsWith("| ") && !l.startsWith("|---"));
const between = (text, from, to) => {
    const a = text.indexOf(from);
    const b = to ? text.indexOf(to, a + from.length) : -1;
    return text.slice(a, b < 0 ? undefined : b);
};

// The vocabularies. The outline is the labelled hierarchy; the register (output-homes.md 3) is the
// one list of command labels. A label is matched as a whole item, never as a substring of a file.
function outlineLabels(ia) {
    const block = between(ia, "### 4.1 The outline", "## 5.").match(/```text\n([\s\S]*?)```/)[1];
    const labels = new Set();
    for (const line of block.split("\n")) {
        const t = line.trim();
        if (!t || t.startsWith("[")) continue;
        for (const p of t.split("/")) if (p.trim()) labels.add(p.trim());
    }
    return labels;
}
// The place and device names a node may start with: the outline's labels, its bracketed lines (up
// to the first comma or colon) and the place inventory (information-architecture.md 4). Lower case.
function placeNames(ia) {
    const names = new Set();
    for (const line of between(ia, "### 4.1 The outline", "## 5.").match(/```text\n([\s\S]*?)```/)[1].split("\n")) {
        const t = line.trim();
        if (!t) continue;
        if (t.startsWith("[")) names.add(t.slice(1).split(/[\],:]/)[0].trim().toLowerCase());
        else for (const p of t.split("/")) if (p.trim()) names.add(p.trim().replace(/^\[|[\],:].*$|\.\.\.$/g, "").toLowerCase());
    }
    for (const row of tableRows(between(ia, "## 4. Places", "### 4.1")).slice(1)) names.add(cells(row)[0].toLowerCase());
    return names;
}
function commandColumn(section) {
    const labels = new Set();
    for (const row of tableRows(section).slice(1)) {
        for (const p of cells(row)[0].replace(/\([^)]*\)/g, "").split(", ")) if (p.trim()) labels.add(p.trim());
    }
    return labels;
}

// Every label a flow draws: commands on edges, and capitalised text after a place's colon.
// An answer out of a diamond is written in lower case, as is a description after a place's colon;
// both are skipped. "Cancel" is a dialog's dismiss button (interaction-patterns.md 3.6), not a command.
function drawnLabels(flows) {
    const found = [];
    for (const block of flows.matchAll(/```mermaid\n([\s\S]*?)```/g)) {
        for (const e of block[1].matchAll(/-\.?->\|"([^"]+)"\|/g)) {
            for (const part of e[1].split(/ \/ |; /)) {
                const c = part.replace(/^[a-z][^:]*: /, "").trim();
                if (/^[A-Z]/.test(c) && c !== "Cancel") found.push(c);
            }
        }
        for (const n of block[1].matchAll(/\w+\(?\[\/?"([^"]+)"\/?\]\)?/g)) {
            if (n[0].includes('[/"') || /^Flows? /.test(n[1])) continue; // commits and hand-offs
            for (const seg of n[1].split(": ").slice(1)) {
                for (const p of seg.split(", ")) if (/^[A-Z]/.test(p.trim())) found.push(p.trim());
            }
        }
    }
    return [...new Set(found)];
}
// The place or device each rectangle and stadium starts with, before its colon. "Canvas or table"
// names two; "Inspector, node" names the inspector. Hand-offs (Flow 7, Rest, Where...) are skipped.
function drawnPlaces(flows) {
    const found = new Map();
    for (const block of flows.matchAll(/```mermaid\n([\s\S]*?)```/g)) {
        for (const n of block[1].matchAll(/\w+(\(?)\["([^"]+)"\]\)?/g)) {
            const head = n[2].split(": ")[0];
            if (/^(Flows? |Rest|Where )/.test(head)) continue;
            for (const h of head.split(" or ")) found.set(h.split(", ")[0], n[1] ? "device" : "place");
        }
    }
    return found;
}
function classify(label, outline, register) {
    const bare = label.replace(/\.\.\.$/, "");
    const has = (set) => set.has(label) || set.has(bare) || set.has(`${bare}...`);
    if (has(outline)) return null;
    if (has(register)) return "register only";
    return "neither";
}

function check({ journeys, flows, needs, outline, register, places, crosswalk = "", workflowIds = [], registerUndo = null }) {
    const failures = [];
    const journeyNums = new Set([...journeys.matchAll(/\n## (\d)\. /g)].map((m) => m[1]));
    // The routes owed in 10.3 that name a journey stage, as "(journey N, Stage)".
    const owed = new Set();
    for (const row of tableRows(between(flows, "### 10.3", "\n## 11."))) {
        const m = cells(row)[0].match(/\(journey (\d), ([^)]+)\)/);
        if (m) owed.add(`${m[1]}|${m[2]}`);
    }
    const owedNamed = new Set();

    // 1. Stage-to-flow links run both ways.
    const stageLinks = new Set();
    for (const section of journeys.split(/\n## (?=\d\. )/).slice(1).map((x) => x.split("\n## ")[0])) {
        const j = section.match(/^(\d)\./)[1];
        const rows = tableRows(section);
        if (!rows.some((l) => l.startsWith("| Stage") && l.trim().endsWith("| Flow |"))) continue;
        for (const row of rows.filter((l) => !l.startsWith("| Stage"))) {
            const c = cells(row);
            const stage = c[0].replace(/^\*[^*]+\*\s*/, "");
            const flow = c.at(-1);
            // A stage inside a sitting names a flow, a route owed in 10.3, or the journey that serves it.
            if (!c[0].startsWith("*Between") && !/\d/.test(flow)) failures.push(`journey ${j} stage "${stage}" names no flow and no 10.3 route`);
            const jn = flow.match(/^journey (\d)$/);
            if (jn) {
                if (!journeyNums.has(jn[1])) failures.push(`journey ${j} stage "${stage}" names journey ${jn[1]}, which does not exist`);
                continue;
            }
            if (/\b10\.3\b/.test(flow)) {
                if (owed.has(`${j}|${stage}`)) owedNamed.add(`${j}|${stage}`);
                else failures.push(`journey ${j} stage "${stage}" cites 10.3, which has no row naming (journey ${j}, ${stage})`);
            }
            for (const f of flow.match(/\d+(\.\d+)?/g) ?? []) if (f !== "10.3") stageLinks.add(`${j}|${stage}|${f}`);
        }
    }
    for (const o of owed) if (!owedNamed.has(o)) failures.push(`10.3 names a stage that does not cite 10.3: ${o}`);

    // 1a. Every workflow has a placement in user-journeys.md, "Workflows and where they run".
    const placed = new Set(tableRows(between(journeys, "## Workflows and where they run", "\n## ")).map((r) => cells(r)[0]));
    for (const id of workflowIds) if (!placed.has(id)) failures.push(`workflow ${id} has no row in "Workflows and where they run"`);

    const flowServes = new Set();
    const flowSections = [...flows.matchAll(/\n(##+) (\d+(?:\.\d+)?)[. ][^\n]*\n\n\*\*Task:\*\*[\s\S]*?\*\*Serves:\*\* ([^*]*?)\.\s+\*\*/g)];
    for (const m of flowSections) {
        for (const part of m[3].replace(/\s+/g, " ").split(";")) {
            const s = part.trim().match(/^(\d) (.+)$/);
            if (s) flowServes.add(`${s[1]}|${s[2]}|${m[2]}`);
            else failures.push(`flow ${m[2]} serves something that is not "journey stage": "${part.trim()}"`);
        }
    }
    for (const l of stageLinks) if (!flowServes.has(l)) failures.push(`journey stage names a flow that does not list it: ${l}`);
    for (const l of flowServes) if (!stageLinks.has(l)) failures.push(`flow lists a stage that does not name it: ${l}`);

    // 2. Every quoted element-needs.md row exists.
    for (const m of flows.matchAll(/\*\*missing\*\*: "([^"]+)"/g)) {
        if (!needs.includes(m[1])) failures.push(`no element-needs.md row holds "${m[1]}"`);
    }

    // 3. Every drawn label is in the outline, or is in section 11's label table with its class,
    //    and that table holds nothing the drawings do not.
    const found = new Map();
    for (const l of drawnLabels(flows)) {
        const cls = classify(l, outline, register);
        if (cls) found.set(l, cls);
    }
    const listed = new Map();
    for (const row of tableRows(between(flows, "## 11.", "## 12."))) {
        const c = cells(row);
        if (["register only", "neither"].includes(c[1])) listed.set(c[0], c[1]);
    }
    for (const [l, cls] of found) {
        if (listed.get(l) !== cls) failures.push(`label not in the outline (${cls}), missing from section 11: "${l}"`);
    }
    for (const l of listed.keys()) if (!found.has(l)) failures.push(`section 11 lists a label no flow draws: "${l}"`);

    // 3a. Every place or device a node starts with is a place or outline name, or is in section 11's
    //     table of places and devices with its kind, and that table holds nothing the drawings do not.
    const placesFound = new Map([...drawnPlaces(flows)].filter(([h]) => !places.has(h.toLowerCase())));
    const placesListed = new Map();
    for (const row of tableRows(between(flows, "## 11.", "## 12."))) {
        const c = cells(row);
        if (["place", "device"].includes(c[1])) placesListed.set(c[0], c[1]);
    }
    for (const [h, kind] of placesFound) {
        if (placesListed.get(h) !== kind) failures.push(`${kind} not in the outline or the place inventory, missing from section 11: "${h}"`);
    }
    for (const h of placesListed.keys()) if (!placesFound.has(h)) failures.push(`section 11 lists a place or device no flow draws: "${h}"`);

    // 4. Every flow states its keyboard routes and its Figma route, and every departure in its
    //    header names a row of the departures ledger, figma-crosswalk.md 4.N, by its Figma cell.
    const ledger = new Map();
    for (const sec of crosswalk.split(/\n### (?=4\.\d )/).slice(1)) {
        ledger.set(sec.slice(0, 3), new Set(tableRows(sec.split("\n## ")[0]).map((r) => cells(r)[0])));
    }
    const heads = flowSections.map((m) => m.index);
    heads.forEach((start, i) => {
        const body = flows.slice(start, heads[i + 1] ?? flows.indexOf("\n## 11.")).replace(/\s+/g, " ");
        const f = flowSections[i][2];
        if (!body.includes("**Keyboard.**")) failures.push(`flow ${f} has no Keyboard line`);
        if (!body.includes("**Figma route:**")) failures.push(`flow ${f} has no Figma route`);
        const header = body.split("**Claim:**")[0];
        for (const d of header.matchAll(/Departure: ([^]*?)(?=\. [A-Z*]|$)/g)) {
            const m = d[1].match(/`figma-crosswalk\.md` (4\.\d), "([^"]+)"/);
            if (!m || ![...(ledger.get(m[1]) ?? [])].some((row) => row.startsWith(m[2]))) failures.push(`flow ${f} has a departure that names no row of figma-crosswalk.md 4`);
        }
    });
    // 5. The step tables' Command and Undo label columns against the register (output-homes.md 3):
    //    every capitalized command is a register or outline label (a dialog's commit verbs and
    //    gestures excepted), and every undo label opens with the first word of a register undo label.
    if (registerUndo) {
        const undoFirst = new Set(registerUndo.map((u) => u.split(/\s+/)[0]));
        let head = null;
        for (const line of flows.split("\n")) {
            if (line.startsWith("| Step | Place | Command")) { head = cells(line); continue; }
            if (!line.startsWith("|")) { head = null; continue; }
            if (!head || line.startsWith("|---")) continue;
            const c = cells(line);
            for (const p of (c[head.indexOf("Command")] ?? "").split("; ").map((x) => x.trim().replace(/(?<!\.)\.$/, ""))) {
                if (!/^[A-Z]/.test(p) || /\+|click/.test(p) || ["Apply", "Load", "Cancel"].includes(p)) continue;
                if (classify(p, outline, register) === "neither") failures.push(`step table command "${p}" is not a register label`);
            }
            for (const m of (c[head.indexOf("Undo label")] ?? "").matchAll(/"([^"]+)"/g)) {
                if (!undoFirst.has(m[1].split(/\s+/)[0])) failures.push(`step table undo label "${m[1]}" opens with no register undo label's verb`);
            }
        }
    }
    return { failures, found };
}

function selfTest() {
    const empty = new Set();
    const flows = [
        "\n## 1. X\n\n**Task:** 1. **Serves:** 1 Arrive. **Start:** rest. Departure: made up (`principles.md`). **Claim:** c.",
        "```mermaid\nflowchart TD\n  Q{\"Ok?\"} -->|\"Bogus command\"| A[\"Place: Made up leaf\"]\n  Q -->|\"no: Re-map columns\"| B[\"Place: a description\"]\n  D([\"Made-up dialog\"]) --> H[\"Flow 2\"]\n```",
        "### 10.3 Owed\n\n| Route | Task |\n|---|---|\n| Test it (journey 1, Test) | 10 |\n| Stale (journey 1, Gone) | 10 |\n",
        "## 11. Gaps\n## 12. V",
    ].join("\n");
    const { failures, found } = check({
        journeys: "J\n## 1. J\n\n| Stage | Flow |\n|---|---|\n| Arrive | 1 |\n| Triage | 1 |\n| Re-enter | -- |\n| *Between sessions:* x | -- |\n| Test | 10.3 |\n| Unowed | 10.3 |\n| Settle | journey 9 |\n"
            + "\n## Workflows and where they run\n\n| Workflow | Placement |\n|---|---|\n| W01 | journey 1 |\n",
        workflowIds: ["W01", "W02"],
        flows,
        needs: "",
        outline: empty,
        register: new Set(["Re-map columns"]),
        places: new Set(),
    });
    const expect = (cond, what) => {
        if (!cond) throw new Error(`self-test: the check failed to catch ${what}`);
    };
    expect(found.get("Bogus command") === "neither", "a command on a diamond edge");
    expect(found.get("Re-map columns") === "register only", "a register-only label after an answer");
    expect(found.get("Made up leaf") === "neither", "a label on a place");
    expect(!found.has("a description"), "a lower-case description (it flagged it)");
    expect(failures.some((f) => f.includes("1|Triage|1")), "a one-way stage link");
    expect(failures.some((f) => f.includes("no Keyboard line")), "a flow without its Keyboard line");
    expect(failures.some((f) => f.includes('place not in the outline') && f.includes('"Place"')), "an invented place");
    expect(failures.some((f) => f.includes('device not in the outline') && f.includes('"Made-up dialog"')), "an invented device");
    expect(!failures.some((f) => f.includes("Flow 2")), "a hand-off (it flagged it)");
    expect(failures.some((f) => f.includes('"Re-enter" names no flow')), "a stage in a sitting with no flow");
    expect(!failures.some((f) => f.includes("Between") || f.includes('"Test"')), "a between-session row or a 10.3 route (it flagged it)");
    expect(failures.some((f) => f.includes("names journey 9")), "a journey cell naming no journey");
    expect(failures.some((f) => f.includes('"Unowed" cites 10.3')), "a 10.3 citation with no 10.3 row");
    expect(failures.some((f) => f.includes("1|Gone")), "a 10.3 row its stage does not name back");
    expect(failures.some((f) => f.includes("workflow W02")) && !failures.some((f) => f.includes("workflow W01")), "an unplaced workflow");
    expect(failures.some((f) => f.includes("no Figma route")), "a flow without its Figma route");
    expect(failures.some((f) => f.includes("names no row of figma-crosswalk")), "a departure outside the ledger");
    console.log("self-test passed");
}

if (process.argv.includes("--self-test")) selfTest();
const ia = read("information-architecture.md");
const { failures } = check({
    journeys: read("user-journeys.md"),
    flows: read("task-flows.md"),
    needs: ["element-needs.md", "element-needs.md"].filter((f) => existsSync(join(dir, f))).map(read).join("\n"),
    outline: outlineLabels(ia),
    register: commandColumn(between(read("output-homes.md"), "## 3.", "## 4.")),
    registerUndo: tableRows(between(read("output-homes.md"), "## 3.", "## 4.")).flatMap((r) => [...(cells(r)[4] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1])),
    places: placeNames(ia),
    crosswalk: read("figma-crosswalk.md"),
    workflowIds: readdirSync(join(dir, "..", "..", "designloom", "workflows"))
        .filter((f) => f.endsWith(".yaml")).map((f) => f.replace(/\.yaml$/, "")),
});
for (const f of failures) console.log(f);
console.log(`${failures.length} failure(s)`);
process.exit(failures.length ? 1 : 0);
