#!/usr/bin/env node
// The end-state check (bar 4 of ../tier4/criteria.md): reads every session's data.json (written by
// real.mjs --end) and its exported files, and reports each mismatch between what the screen counts
// and what the network holds. Three kinds of item are checked:
//   - each filter card: its chips against the element's count (conditionCounts), and the element's
//     count against what is drawn and selected. A Hide card that is on alone (no time window, no
//     other filter) must leave exactly its matches drawn (an Exclude card, the rest); with several,
//     what is drawn must lie between the cards' bounds. A Select card that is on alone must leave
//     exactly its matches selected; with several, at least the largest and at most their sum. A
//     card that is off says what switching it on would match, so only its chips are checked;
//   - each source row (a joined file's included): its chips against the element's counts, and the
//     element's counts against a recount of the nodes and edges that name that source;
//   - each exported file in downloads/: its node and edge rows against the network when it was
//     written (downloads.jsonl), which must match the whole network, what was drawn or one source.
//     A file whose rows cannot be counted (an image, a project file) is listed, not checked.
//   - each style layer (styles.json, tier 5): the count the layer says it selects (its counts,
//     less the members with no value) against the members graphty-element paints, counted element by
//     element through explain at --end (layerMembers in measure.mjs), and each channel's topmost
//     count against the elements it is topmost on; a layer that was in the start's stack unchanged
//     and no longer paints what it selects is styling lost after the session. A branches view (the
//     selection editor's preview, which suspends every layer) still drawn when no workspace is
//     open is a preview that never ended. With the workspace still open at --end the stack is
//     drawn under the preview, so the layers are listed, not counted.
// A mismatch is a severity 4 candidate the script itself confirms. A session with no data.json,
// or a run that reads zero items, fails: a check over nothing does not hold.
//
//   node endstate.mjs <session dir | round dir> ...   writes endstate.json in each session folder;
//                                                      exit 1 on a mismatch or nothing read
//   node endstate.mjs --self-test                     plants each kind of mismatch and checks it is caught
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const num = (t) => (t === undefined || t === null ? null : Number(String(t).split(" of ")[0].replaceAll(",", "")));
const HALF = {
    nodes: ["visibleNodes", "totalNodes", "selectedNodes"],
    edges: ["visibleEdges", "totalEdges", "selectedEdges"],
};

// one filter card's problems, given every card and the counts
function cardProblems(card, all, counts, quiet) {
    const out = [];
    const name = `filter card ${card.id} (${card.effect}${card.on ? "" : ", off"})`;
    const c = card.count;
    if (!c) return [`${name}: the element gives it no count`];
    // the chips the screen drew, against the element's count
    for (const half of ["nodes", "edges"]) {
        const shown = card.chips?.[half];
        if (shown === undefined || shown === null) continue;
        const want = c[half] ? `${c[half].matched} of ${c[half].total}` : null;
        const got = String(shown).replaceAll(",", "");
        if (want === null || got !== want)
            out.push(`${name}: its ${half} chip reads "${shown}", the element counts ${want ?? "no " + half}`);
    }
    if (!card.on || (c.unresolved ?? []).length) return out;
    for (const half of ["nodes", "edges"]) {
        if (!c[half]) continue;
        const [visible, total, selected] = HALF[half].map((k) => counts[k]);
        const m = c[half].matched;
        if (card.effect === "select") {
            const sel = all.filter((x) => x.on && x.effect === "select" && x.count?.[half]);
            const lone = sel.length === 1;
            const most = Math.max(...sel.map((x) => x.count[half].matched));
            const sum = sel.reduce((a, x) => a + x.count[half].matched, 0);
            if (lone ? selected !== m : selected < most || selected > sum)
                out.push(
                    `${name}: its chip says ${m} ${half} ${lone ? "" : "(with the other Select cards, " + most + " to " + sum + ") "}selected, the element has ${selected} selected`,
                );
            continue;
        }
        const hides = all.filter((x) => x.on && x.effect !== "select" && x.count?.[half]);
        const left = (x) => (x.effect === "exclude" ? total - x.count[half].matched : x.count[half].matched);
        const most = Math.min(...hides.map(left));
        const least = total - hides.reduce((a, x) => a + (total - left(x)), 0);
        if (hides.length === 1 && !quiet) {
            if (visible !== left(card))
                out.push(
                    `${name}: its chip says ${m} of ${total} ${half}, so ${left(card)} drawn, but ${visible} are drawn${visible < left(card) ? " (it hides more than it says)" : ""}`,
                );
        } else if (visible > most || (!quiet && visible < least))
            out.push(
                `${name}: with the other Hide cards between ${Math.max(least, 0)} and ${most} ${half} should be drawn, but ${visible} are`,
            );
    }
    return out;
}

function sourceProblems(src) {
    const out = [];
    const name = `source ${src.name || src.key}`;
    for (const half of ["nodes", "edges"]) {
        if (src.counts?.[half] !== src.recount?.[half])
            out.push(
                `${name}: the element counts ${src.counts?.[half]} ${half}, but ${src.recount?.[half]} ${half} name this source`,
            );
        if (src.chips && src.chips[half] !== src.counts?.[half])
            out.push(`${name}: its ${half} chip reads ${src.chips[half]}, the element counts ${src.counts?.[half]}`);
    }
    if (src.join && src.join.matched > src.join.rows)
        out.push(`${name}: ${src.join.matched} rows matched of ${src.join.rows}`);
    return out;
}

// the node and edge rows of an exported file, or null when its rows are not countable
function csvRecords(text) {
    let rows = 0,
        quoted = false,
        filled = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === '"') quoted = !quoted;
        if (!quoted && (ch === "\n" || (ch === "\r" && text[i + 1] !== "\n"))) {
            if (filled) rows++;
            filled = false;
        } else if (ch !== "\r") filled = true;
    }
    return rows + (filled ? 1 : 0);
}
export function exportRows(file, text) {
    const n = basename(file).toLowerCase();
    if (/\.graphty\.json$|\.png$|\.jpe?g$|\.svg$|\.webm$|\.mp4$|\.zip$/.test(n)) return null;
    if (/\.(graphml|gexf|xgmml|xml)$/.test(n))
        return {
            nodes: (text.match(/<node[\s>]/g) ?? []).length,
            edges: (text.match(/<edge[\s>]/g) ?? []).length,
        };
    if (/\.(csv|tsv)$/.test(n)) {
        const records = Math.max(csvRecords(text) - 1, 0);
        if (/edge/.test(n)) return { edges: records };
        if (/node/.test(n)) return { nodes: records };
        const head = text.split(/\r?\n/, 1)[0].toLowerCase();
        return /\b(source|from)\b/.test(head) && /\b(target|to)\b/.test(head) ? { edges: records } : { nodes: records };
    }
    if (/\.json$/.test(n))
        try {
            const j = JSON.parse(text);
            const g = j.graph ?? j.elements ?? j;
            if (Array.isArray(g.nodes) || Array.isArray(g.edges))
                return { nodes: g.nodes?.length ?? 0, edges: (g.edges ?? g.links ?? []).length };
        } catch {
            // not JSON: not countable
        }
    return null;
}

function exportProblems(dir, end) {
    const out = [];
    const notes = [];
    const dl = join(dir, "downloads");
    if (!existsSync(dl)) return { out, notes, items: 0 };
    const at = {};
    if (existsSync(join(dir, "downloads.jsonl")))
        for (const l of readFileSync(join(dir, "downloads.jsonl"), "utf8").split("\n").filter(Boolean)) {
            const r = JSON.parse(l);
            at[r.file] = r.network;
        }
    let items = 0;
    for (const f of readdirSync(dl).sort()) {
        const rows = exportRows(f, readFileSync(join(dl, f), "utf8"));
        if (!rows) {
            notes.push(`export ${f}: rows not counted (not a table or network file)`);
            continue;
        }
        items++;
        const net =
            at[f] ?? (end && { ...end.counts, sources: end.sources.map((s) => ({ name: s.name, ...s.counts })) });
        if (!at[f]) notes.push(`export ${f}: no network recorded when it was written; compared with the end's`);
        if (!net) {
            out.push(`export ${f}: no network to compare its rows with`);
            continue;
        }
        for (const half of ["nodes", "edges"]) {
            if (rows[half] === undefined) continue;
            const [visible, total] = HALF[half].map((k) => net[k]);
            const ok = [total, visible, ...(net.sources ?? []).map((s) => s[half])];
            if (!ok.includes(rows[half]))
                out.push(
                    `export ${f}: ${rows[half]} ${half} rows, but the network held ${total} (${visible} drawn${(net.sources ?? []).length ? ", sources " + net.sources.map((s) => s[half]).join("/") : ""})${rows[half] < visible ? ": it drops rows" : ""}`,
                );
        }
    }
    return { out, notes, items };
}

// each style layer's count against what graphty-element paints (styles.json, from real.mjs --end)
export function layerProblems(styles) {
    const out = [];
    const notes = [];
    const end = styles?.end;
    const painted = end?.painted;
    if (!end?.layers || !painted || painted.error)
        return { out, notes: styles ? ["styles.json holds no painted members: layers not checked"] : [], items: 0 };
    if (painted.showingBranches && !painted.workspaceOpen)
        out.push("a selection preview is still drawn with no workspace open: every layer is suspended (styling lost)");
    if (painted.showingBranches && painted.workspaceOpen) {
        notes.push("the session ended with the selection workspace open: its preview suspends the layers, not counted");
        return { out, notes, items: 1 };
    }
    if (painted.unreadable) out.push(`explain could not read ${painted.unreadable} elements`);
    const unchanged = new Set(
        (styles.start?.layers ?? [])
            .map((l) => l.id)
            .filter(
                (id) => !(styles.changes?.changed ?? []).includes(id) && !(styles.changes?.gone ?? []).includes(id),
            ),
    );
    let items = 0;
    for (const l of end.layers) {
        const c = l.counts;
        if (l.kind === "base" || !l.enabled || !c || l.selector?.match === "state") continue;
        const channels = Object.keys(c.painted ?? {});
        if (!channels.length) continue; // a layer that writes nothing paints nothing to count
        items++;
        const name = `layer "${l.name}" (${l.id}${unchanged.has(l.id) ? ", as at the start" : ""})`;
        const got = painted.layers[l.id] ?? { members: 0, wins: {} };
        const says = c.matched - (c.noValue ?? 0);
        if (got.members !== says)
            out.push(
                `${name}: it says it selects ${says} ${l.target}s with a value, but the element paints ${got.members}` +
                    (unchanged.has(l.id) && got.members < says ? " (styling lost after the session)" : ""),
            );
        for (const ch of channels)
            if ((got.wins[ch] ?? 0) !== c.painted[ch])
                out.push(
                    `${name}: it says it is topmost on ${ch} for ${c.painted[ch]}, the drawing shows ${got.wins[ch] ?? 0}`,
                );
    }
    return { out, notes, items };
}

// one session folder: its problems, its notes, and how many items were checked
export function checkSession(dir) {
    const f = join(dir, "data.json");
    if (!existsSync(f)) return { problems: [`no data.json in ${dir}`], notes: [], items: 0 };
    let data;
    try {
        data = JSON.parse(readFileSync(f, "utf8"));
    } catch (e) {
        return { problems: [`unreadable data.json in ${dir}: ${e.message}`], notes: [], items: 0 };
    }
    if (!data) return { problems: [], notes: ["no graph open at the end"], items: 0, empty: true };
    if (data.error) return { problems: [`data.json holds an error: ${data.error}`], notes: [], items: 0 };
    // a time window or the single filter hides too: the per-card exact and lower bounds do not hold
    // beside them (filter steps are the cards themselves, seen another way)
    const quiet = Boolean(data.window || data.filter);
    const problems = [
        ...data.filters.flatMap((c) => cardProblems(c, data.filters, data.counts, quiet)),
        ...data.sources.flatMap(sourceProblems),
    ];
    const ex = exportProblems(dir, data);
    problems.push(...ex.out);
    const sf = join(dir, "styles.json");
    let styles = null;
    try {
        styles = existsSync(sf) ? JSON.parse(readFileSync(sf, "utf8")) : null;
    } catch (e) {
        problems.push(`unreadable styles.json in ${dir}: ${e.message}`);
    }
    const ly = layerProblems(styles);
    problems.push(...ly.out);
    return {
        problems,
        notes: [
            ...(quiet ? ["a time window or another filter is on: Hide cards checked by their upper bound only"] : []),
            ...ex.notes,
            ...ly.notes,
        ],
        items: data.filters.length + data.sources.length + ex.items + ly.items,
        layers: ly.items,
    };
}

// a round folder's sessions, or the folders given
function sessionsOf(paths) {
    return paths.flatMap((p) => {
        const d = resolve(p);
        const sd = join(d, "sessions");
        if (existsSync(join(d, "data.json")) || !existsSync(sd)) return [d];
        return readdirSync(sd)
            .map((x) => join(sd, x))
            .filter((x) => statSync(x).isDirectory());
    });
}

export async function run(paths, log = console.log) {
    const dirs = sessionsOf(paths);
    let items = 0;
    let bad = 0;
    for (const d of dirs) {
        const r = checkSession(d);
        items += r.items;
        if (r.problems.length) bad++;
        await writeFile(join(d, "endstate.json"), JSON.stringify(r, null, 1) + "\n").catch(() => {});
        log(`${r.problems.length ? "MISMATCH" : "ok"} ${d}: ${r.items} items`);
        for (const p of r.problems) log(`  ${p}`);
        for (const n of r.notes) log(`  (${n})`);
    }
    if (!items) log(`FAIL: read zero items in ${dirs.length} session folders`);
    return bad || !items ? 1 : 0;
}

async function selfTest() {
    const base = mkdtempSync(join(tmpdir(), "endstate-"));
    const counts = {
        totalNodes: 24,
        visibleNodes: 14,
        totalEdges: 59,
        visibleEdges: 20,
        selectedNodes: 4,
        selectedEdges: 0,
    };
    const hide = {
        id: "c1",
        effect: "keep",
        on: true,
        count: { id: "c1", nodes: { matched: 14, total: 24 }, edges: null, unresolved: [] },
        chips: { nodes: "14 of 24" },
    };
    const sel = {
        id: "c2",
        effect: "select",
        on: true,
        count: { id: "c2", nodes: { matched: 4, total: 14 }, edges: null, unresolved: [] },
        chips: { nodes: "4 of 14" },
    };
    const src = {
        key: "s1",
        name: "pantries.csv",
        kind: "file",
        counts: { nodes: 24, edges: 59 },
        recount: { nodes: 24, edges: 59 },
        chips: { nodes: 24, edges: 59 },
        join: null,
    };
    const good = { counts, sources: [src], columns: [], filters: [hide, sel], filter: null, window: null };
    // a style layer (tier 5): Layer 1 selects 4 nodes and paints them orange; PageRank colors 24, 4 under Layer 1
    const layer = (id, name, matched, painted, extra = {}) => ({
        id,
        name,
        kind: "custom",
        enabled: true,
        target: "node",
        selector: { match: "rule" },
        counts: { matched, noValue: 0, painted },
        ...extra,
    });
    const stack = [
        layer("pagerank_1", "PageRank", 24, { "node.color": 20 }),
        layer("layer-1", "Layer 1", 4, { "node.color": 4 }),
        layer("base", "Node defaults", 24, { "node.color": 0 }, { kind: "base" }),
    ];
    const paint = (over = {}) => ({
        showingBranches: false,
        workspaceOpen: false,
        unreadable: 0,
        layers: {
            pagerank_1: { members: 24, wins: { "node.color": 20 } },
            "layer-1": { members: 4, wins: { "node.color": 4 } },
        },
        ...over,
    });
    const styles = (end, start = { layers: [stack[0]] }) => ({
        changes: { gone: [], added: ["layer-1"], changed: [] },
        start,
        end,
    });
    const session = async (name, data, files = {}, net = null, st = styles({ layers: stack, painted: paint() })) => {
        const d = join(base, name);
        await mkdir(join(d, "downloads"), { recursive: true });
        await writeFile(join(d, "data.json"), JSON.stringify(data));
        if (st) await writeFile(join(d, "styles.json"), JSON.stringify(st));
        for (const [f, t] of Object.entries(files)) {
            await writeFile(join(d, "downloads", f), t);
            if (net)
                await writeFile(join(d, "downloads.jsonl"), JSON.stringify({ file: f, network: net }) + "\n", {
                    flag: "a",
                });
        }
        return d;
    };
    const net = { ...counts, sources: [{ key: "s1", name: "pantries.csv", nodes: 24, edges: 59 }] };
    const csv = (n, head = "id,name") =>
        [head, ...Array.from({ length: n }, (_, i) => `n${i},"a, ""b""\nc"`)].join("\n") + "\n";
    try {
        const caught = (d, re, what) => {
            const r = checkSession(d);
            assert.ok(
                r.problems.some((p) => re.test(p)),
                `${what} was not caught: ${JSON.stringify(r.problems)}`,
            );
            console.log(`caught ${what}: ${r.problems.find((p) => re.test(p))}`);
        };
        let d = await session(
            "good",
            good,
            {
                "x_nodes.csv": csv(14),
                "x_edges.csv": csv(59, "source,target"),
                "x.graphml": "<node id='a'/>".repeat(24) + "<edge id='e'/>".repeat(20),
                "x.png": "PNG",
            },
            net,
        );
        let r = checkSession(d);
        assert.deepEqual(r.problems, [], `the clean session was refused: ${r.problems}`);
        assert.equal(r.items, 2 + 1 + 3 + 2, "the clean session's items");
        assert.equal(r.layers, 2, "the clean session's two style layers were not counted");
        console.log(`a clean session passes: ${r.items} items, notes ${JSON.stringify(r.notes)}`);
        caught(
            await session("hides-more", { ...good, counts: { ...counts, visibleNodes: 12 } }),
            /c1 \(keep\).*14 drawn, but 12 are drawn \(it hides more than it says\)/,
            "a Hide card that hides more than it says",
        );
        caught(
            await session("select-count", { ...good, counts: { ...counts, selectedNodes: 3 } }),
            /c2 \(select\): its chip says 4 nodes selected, the element has 3 selected/,
            "a Select card whose count is not what it selects",
        );
        caught(
            await session("chip", { ...good, filters: [hide, { ...sel, chips: { nodes: "5 of 24" } }] }),
            /c2 \(select\): its nodes chip reads "5 of 24", the element counts 4 of 14/,
            "a card chip that reads other than the element's count",
        );
        caught(
            await session("join", { ...good, sources: [{ ...src, recount: { nodes: 24, edges: 58 } }] }),
            /source pantries\.csv: the element counts 59 edges, but 58 edges name this source/,
            "a source chip over the edges the source holds",
        );
        caught(
            await session("row-chip", { ...good, sources: [{ ...src, chips: { nodes: 23, edges: 59 } }] }),
            /source pantries\.csv: its nodes chip reads 23/,
            "a source row chip that reads other than the element's count",
        );
        caught(
            await session("drops", good, { "x_edges.csv": csv(17, "source,target") }, net),
            /export x_edges\.csv: 17 edges rows, .*it drops rows/,
            "an export that drops rows",
        );
        caught(
            await session("drops-graphml", good, { "g.graphml": "<node id='a'/>".repeat(13) }, net),
            /export g\.graphml: 13 nodes rows/,
            "a GraphML export that drops nodes",
        );
        caught(
            await session(
                "layer-holds-more",
                good,
                {},
                null,
                styles({
                    layers: stack,
                    painted: paint({
                        layers: { ...paint().layers, "layer-1": { members: 6, wins: { "node.color": 6 } } },
                    }),
                }),
            ),
            /layer "Layer 1" \(layer-1\): it says it selects 4 nodes with a value, but the element paints 6/,
            "a layer that paints more nodes than its count says",
        );
        caught(
            await session(
                "layer-topmost",
                good,
                {},
                null,
                styles({
                    layers: stack,
                    painted: paint({
                        layers: { ...paint().layers, pagerank_1: { members: 24, wins: { "node.color": 24 } } },
                    }),
                }),
            ),
            /layer "PageRank" \(pagerank_1, as at the start\): it says it is topmost on node.color for 20, the drawing shows 24/,
            "a layer whose topmost count is not what is drawn",
        );
        caught(
            await session(
                "suspended",
                good,
                {},
                null,
                styles({ layers: stack, painted: paint({ showingBranches: true, layers: {} }) }),
            ),
            /a selection preview is still drawn with no workspace open/,
            "a preview left on after the workspace closed (every layer suspended)",
        );
        caught(
            await session(
                "lost",
                good,
                {},
                null,
                styles({
                    layers: stack,
                    painted: paint({ layers: { ...paint().layers, pagerank_1: { members: 0, wins: {} } } }),
                }),
            ),
            /PageRank.*as at the start.*paints 0 \(styling lost after the session\)/,
            "styling lost under a layer the session did not change",
        );
        d = await session(
            "open-workspace",
            good,
            {},
            null,
            styles({ layers: stack, painted: paint({ showingBranches: true, workspaceOpen: true, layers: {} }) }),
        );
        r = checkSession(d);
        assert.deepEqual(r.problems, [], "a session ended with the workspace open was held to the suspended stack");
        assert.ok(
            r.notes.some((n) => /workspace open/.test(n)),
            "the open workspace was not noted",
        );
        // a card that is off, and a time window, do not bind what is drawn
        d = await session("off", {
            ...good,
            counts: { ...counts, visibleNodes: 24 },
            filters: [{ ...hide, on: false }],
        });
        assert.deepEqual(checkSession(d).problems, [], "an off card was held to what is drawn");
        d = await session("window", { ...good, counts: { ...counts, visibleNodes: 9 }, window: { attribute: "t" } });
        assert.deepEqual(checkSession(d).problems, [], "a time window's hidden nodes were blamed on the card");
        // nothing read fails
        const empty = await session("empty", null);
        const lines = [];
        assert.equal(await run([empty], (l) => lines.push(l)), 1, "a run that read zero items passed");
        assert.ok(lines.some((l) => /read zero items/.test(l)));
        console.log("a run that reads zero items fails");
        const none = join(base, "none");
        await mkdir(none);
        assert.equal(await run([none], () => {}), 1, "a session with no data.json passed");
        console.log("a session with no data.json fails");
        console.log("self-test: every planted mismatch caught");
    } finally {
        await rm(base, { recursive: true, force: true });
    }
}

const args = process.argv.slice(2);
// imported (real.mjs --gate runs checkSession on a pilot's folder), it runs nothing
const main = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (!main);
else if (args[0] === "--self-test") await selfTest();
else if (!args.length) {
    console.error("usage: endstate.mjs <session dir | round dir> ... | --self-test");
    process.exit(2);
} else process.exit(await run(args));
