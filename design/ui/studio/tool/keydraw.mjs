#!/usr/bin/env node
// The key-and-drawing check (../tier3/criteria.md, the screenshot audit, bar 5): on a session's last
// screen, the key, the layers' counts and the colors on the drawing must say the same thing. It reads
// what real.mjs --end saved: key.json (the key as the reader saw it, each row's chip color, and how
// many nodes and edges the drawing shows in each color) and styles.json (each layer's counts). For
// every key section it reports:
//   - a row whose color no node or edge is drawn in (a stale key);
//   - two rows of one section in one color (two values the key says differ, drawn alike);
//   - a section that says "N of M nodes" (or edges) where the layer of that name picks another
//     number (the picker's count), or where fewer than N are drawn in its one color.
// A session with no key.json, or a run that read no key row at all, fails: a check over nothing
// checks nothing. Each line is a measurement for the audit, which rates its severity.
//
//   node keydraw.mjs <session dir | round dir> ...   a round dir: every sessions/<id>/ in it
//   node keydraw.mjs --self-test                     plants each disagreement and checks it is caught
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const num = (t) => Number(String(t).replaceAll(",", ""));

// Every disagreement on one screen. key: keyShown() rows; drawn: drawnColors(); layers: styles.json's
// end layers (name, counts.matched)
export function judge(key, drawn, layers = []) {
    const out = [];
    const on = (kind, c) => drawn?.[kind]?.[c] ?? 0;
    for (const sec of key ?? []) {
        const title = sec.title ?? sec.rows[0]?.text ?? sec.text;
        const colored = sec.rows.filter((r) => r.color);
        for (const r of colored)
            if (on("nodes", r.color) + on("edges", r.color) === 0)
                out.push(`stale key: "${title}" shows ${r.color} for "${r.text}", and no node or edge is drawn in it`);
        const by = Map.groupBy(colored, (r) => r.color);
        for (const [c, rs] of by)
            if (rs.length > 1)
                out.push(
                    `one color for two values: "${title}" draws ${rs.map((r) => `"${r.text}"`).join(" and ")} in ${c}`,
                );
        const m = sec.text.match(/([\d,]+) of ([\d,]+) (nodes?|edges?)\b/);
        if (!m) continue;
        const n = num(m[1]);
        const kind = m[3].startsWith("node") ? "nodes" : "edges";
        // the layer the section names ("Layer 1", or "Color: Layer 1" on a one-row section), of its kind
        const layer = layers.find(
            (l) =>
                (l.target ?? kind.slice(0, -1)) === kind.slice(0, -1) &&
                (title === l.name || title.endsWith(`: ${l.name}`)),
        );
        const picks = layer?.counts?.matched;
        if (typeof picks === "number" && picks !== n)
            out.push(`count: "${title}" says ${n} of ${num(m[2])} ${kind}, and its layer picks ${picks}`);
        if (colored.length === 1 && on(kind, colored[0].color) < n)
            out.push(
                `count: "${title}" says ${n} ${kind} in ${colored[0].color}, and the drawing shows ${on(kind, colored[0].color)}`,
            );
    }
    return out;
}

// One session folder: its lines, and how many key rows it read
export function session(dir) {
    const kf = join(dir, "key.json");
    if (!existsSync(kf))
        return { lines: [`FAIL: ${kf} is missing (a session ended before real.mjs wrote it)`], rows: 0 };
    const { key, drawn } = JSON.parse(readFileSync(kf, "utf8"));
    if (key?.error || drawn?.error)
        return { lines: [`FAIL: ${kf} could not be read in the page: ${key?.error ?? drawn?.error}`], rows: 0 };
    const sf = join(dir, "styles.json");
    const layers = existsSync(sf) ? (JSON.parse(readFileSync(sf, "utf8")).end?.layers ?? []) : [];
    const rows = (key ?? []).reduce((n, s) => n + s.rows.length, 0);
    return { lines: judge(key, drawn, layers), rows };
}

function selfTest() {
    const drawn = { nodes: { "#800080": 8, "#6366f1": 323 }, edges: { "#a9a9a9": 361 } };
    const layers = [
        { name: "Layer 1", target: "edge", counts: { matched: 361 } },
        { name: "Layer 1", target: "node", counts: { matched: 8 } },
    ];
    const good = [{ title: "Layer 1", text: "Layer 1 8 of 331 nodes", rows: [{ text: "Layer 1", color: "#800080" }] }];
    assert.deepEqual(judge(good, drawn, layers), [], "a key that agrees with the drawing was reported");
    const planted = {
        "a stale key": [{ ...good[0], rows: [{ text: "Layer 1", color: "#ff0000" }] }],
        "two values in one color": [
            {
                title: "Color: role",
                text: "Color: role board staff",
                rows: [
                    { text: "board", color: "#800080" },
                    { text: "staff", color: "#800080" },
                ],
            },
        ],
        "a count the layer does not pick": [{ ...good[0], text: "Layer 1 9 of 331 nodes" }],
        "a count the layer does not pick, on a one-row section": [
            {
                title: null,
                text: "Color: Layer 1 9 of 331 nodes",
                rows: [{ text: "Color: Layer 1", color: "#800080" }],
            },
        ],
        "a count the drawing does not show": [{ ...good[0], text: "Layer 1 8 of 331 nodes" }],
    };
    for (const [what, key] of Object.entries(planted)) {
        const d = what === "a count the drawing does not show" ? { ...drawn, nodes: { "#800080": 5 } } : drawn;
        const r = judge(key, d, layers);
        assert.ok(r.length > 0, `missed ${what}`);
        console.log(`caught ${what}: ${r.join("; ")}`);
    }
    console.log("keydraw.mjs self-test: every planted disagreement caught, the agreeing key passes");
}

const args = process.argv.slice(2);
if (args[0] === "--self-test") selfTest();
else if (args.length) {
    const dirs = args.flatMap((a) => {
        const d = resolve(a);
        const sd = join(d, "sessions");
        return existsSync(sd) && !existsSync(join(d, "key.json"))
            ? readdirSync(sd)
                  .map((id) => join(sd, id))
                  .filter((x) => existsSync(join(x, "session.json")))
            : [d];
    });
    let rows = 0;
    let bad = 0;
    for (const d of dirs) {
        const r = session(d);
        rows += r.rows;
        for (const l of r.lines) {
            console.log(`${basename(d)}: ${l}`);
            bad++;
        }
    }
    if (!rows) console.log(`FAIL: read no key row in ${dirs.length} sessions; a check over nothing checks nothing`);
    console.log(`${dirs.length} sessions, ${rows} key rows read: ${bad} disagreements`);
    process.exitCode = bad || !rows ? 1 : 0;
} else {
    console.error("usage: keydraw.mjs <session dir | round dir> ... | --self-test");
    process.exitCode = 2;
}
