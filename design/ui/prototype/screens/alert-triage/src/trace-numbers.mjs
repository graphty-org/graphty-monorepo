#!/usr/bin/env node
// Numbers for screens/alert-triage.html that kit/alerts.json does not hold: the money words
// (Money in and Money out, the weighted in- and out-degree on amount, beside Links in and Links out)
// for every account the alert pages show, and the dated Neighbors trace from ACC-365386:
// Direction Out, From Aug 6, one to three hops, with each transfer's hop and time order, and the
// step footer's two sums for the selected account.
// It re-runs kit/gen-alerts.mjs unchanged except for its last line (the file write), so every
// account, transfer, amount and time is the kit's own; the kit's drawings go to a throwaway folder.
// Output: kit/fixtures.json scenarios.alertTriage, and screens/img/alerts-trace-{light,dark}.svg.
// Run from design/ui/prototype/: node screens/alert-triage/src/trace-numbers.mjs
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const proto = join(here, "../../..");
const kit = join(proto, "kit");
const scratch = mkdtempSync(join(tmpdir(), "alerts-trace-"));
mkdirSync(join(scratch, "canvas"));

// Runs inside the re-run of gen-alerts.mjs (its source is pasted there), so the names it uses are
// that script's own: edges, amount, time, ids, seed, scenario, out and the drawing helpers.
function injected() {
    const FROM = "2026-08-06T00:00:00Z";
    const fromLabel = "Aug 6";
    // Money in / out and Links in / out over the full graph, for every account alerts.json names.
    const named = new Set(JSON.stringify(out).match(/ACC-\d{6}/g));
    const idx = new Map(ids.map((x, i) => [x, i]));
    const accounts = {};
    for (const id of [...named].sort()) {
        const v = idx.get(id);
        let mi = 0, mo = 0, li = 0, lo = 0;
        edges.forEach(([a, b], k) => {
            if (b === v) { mi += amount[k]; li++; }
            if (a === v) { mo += amount[k]; lo++; }
        });
        accounts[id] = { moneyIn: round2(mi), moneyOut: round2(mo), linksIn: li, linksOut: lo };
    }
    // Dated Neighbors: out along transfers on or after FROM. A step keeps the accounts reached
    // and every transfer among them on or after FROM.
    const inWin = (k) => time[k] >= FROM;
    const reach = (k) => {
        const d = new Map([[seed, 0]]);
        let fr = [seed];
        for (let h = 1; h <= k; h++) {
            const nx = [];
            for (const u of fr) edges.forEach(([a, b], e) => { if (a === u && inWin(e) && !d.has(b)) { d.set(b, h); nx.push(b); } });
            fr = nx;
        }
        return d;
    };
    const stepEdges = (d) => edges.map((e, k) => [e, k]).filter(([[a, b], k]) => d.has(a) && d.has(b) && inWin(k));
    const hops = [1, 2, 3].map((h) => { const d = reach(h); return { hops: h, nodes: d.size, edges: stepEdges(d).length }; });
    const d2 = reach(2);
    // When money first reached each account inside the step (the seed: no arrival, it starts the trace).
    const arrived = new Map();
    for (const [[a, b], k] of stepEdges(d2).sort((x, y) => (time[x[1]] < time[y[1]] ? -1 : 1)))
        if (b !== seed && !arrived.has(b) && (a === seed || arrived.has(a))) arrived.set(b, time[k]);
    const rows = stepEdges(d2).map(([[a, b], k]) => {
        const reachedAt = a === seed ? null : arrived.get(a) ?? null;
        return { source: ids[a], target: ids[b], time: time[k], amount: amount[k], senderHop: d2.get(a),
                 earlierThanHopBefore: reachedAt !== null && time[k] < reachedAt, reachedAt };
    }).sort((x, y) => (x.time < y.time ? -1 : 1));
    const sum = (list) => round2(list.reduce((s, r) => s + r.amount, 0));
    const inOrder = rows.filter((r) => !r.earlierThanHopBefore);
    const nodes2 = [...d2.keys()];
    // The step footer's two sums for the selected account, split at the step's From date.
    // Read over the full graph: a dated Out step holds none of the money that came in before.
    const own = edges.map((e, k) => [e, k]).filter(([[a, b]]) => a === seed || b === seed);
    const footer = {
        account: ids[seed],
        moneyInBefore: round2(own.filter(([[, b], k]) => b === seed && !inWin(k)).reduce((s, [, k]) => s + amount[k], 0)),
        moneyOutFrom: round2(own.filter(([[a], k]) => a === seed && inWin(k)).reduce((s, [, k]) => s + amount[k], 0)),
        transfersInBefore: own.filter(([[, b], k]) => b === seed && !inWin(k)).length,
        transfersOutFrom: own.filter(([[a], k]) => a === seed && inWin(k)).length,
    };
    const seedOwnRows = own.length;
    // The drawing: hop columns, arrows along each transfer, a dashed edge with a clock mark where a
    // transfer is earlier than the one that reached its sender. Alerted accounts keep the Alerts
    // layer (vermillion diamond); nothing is shaped by kind.
    // The account most of the step pays into (the money transfer service) sits in a column of its
    // own at the right, so the arrows into it do not run through the hop columns.
    const inCount = (v) => rows.filter((r) => r.target === ids[v]).length;
    const hub = nodes2.filter((v) => v !== seed).sort((a, b) => inCount(b) - inCount(a))[0];
    const byHop = [0, 1, 2].map((h) => nodes2.filter((v) => d2.get(v) === h && v !== hub).sort((a, b) => (ids[a] < ids[b] ? -1 : 1)));
    const pos = new Map([[hub, [1080, Math.round(H * 0.75)]]]);
    const COLX = [150, 450, 780];
    byHop.forEach((list, h) => list.forEach((v, j) => pos.set(v, [COLX[h], Math.round(((j + 1) * H) / (list.length + 1))])));
    const anchors = Object.fromEntries(nodes2.map((v) => [ids[v], { x: Math.round((pos.get(v)[0] / W) * 1000) / 10, y: Math.round((pos.get(v)[1] / H) * 1000) / 10 }]));
    const svg = (theme) => {
        const T = THEMES[theme];
        const o = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Transfers out of ACC-365386 from Aug 6, two hops">`,
                   `<defs><marker id="ah" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${T.edge}"/></marker></defs>`,
                   `<rect width="${W}" height="${H}" fill="${T.canvas}"/>`];
        for (const r of rows) {
            const [x1, y1] = pos.get(idx.get(r.source)), [x2, y2] = pos.get(idx.get(r.target));
            const L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L, gap = 18;
            const dash = r.earlierThanHopBefore ? ' stroke-dasharray="6 5"' : "";
            o.push(`<line x1="${f1(x1 + ux * gap)}" y1="${f1(y1 + uy * gap)}" x2="${f1(x2 - ux * gap)}" y2="${f1(y2 - uy * gap)}" stroke="${T.edge}" stroke-width="1.5"${dash} marker-end="url(#ah)"/>`);
            if (r.earlierThanHopBefore) {
                const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
                o.push(`<g fill="${T.canvas}" stroke="${T.ink}" stroke-width="1.5"><circle cx="${f1(mx)}" cy="${f1(my)}" r="8"/><path d="M${f1(mx)},${f1(my - 5)} V${f1(my)} H${f1(mx + 4)}" fill="none"/></g>`);
            }
        }
        o.push("<g>");
        const edged = nodes2.some((v) => contrast(scenario[v] ? VERM : GRAY, T.canvas) < 3);
        for (const v of nodes2) {
            const [x, y] = pos.get(v);
            o.push(mark(v, x, y, 10, scenario[v] ? VERM : GRAY, T, edged, !!scenario[v]));
            if (v === seed) o.push(markRing(x, y, 14.5, theme, "selected"));
        }
        o.push("</g>");
        o.push(`<g font-family="Inter Variable, Inter, system-ui, sans-serif" font-size="12" fill="${T.ink}" stroke="${T.halo}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">`);
        for (const v of nodes2) { const [x, y] = pos.get(v); o.push(`<text x="${f1(x + 20)}" y="${f1(y - 14)}">${esc(ids[v])}</text>`); }
        o.push("</g></svg>");
        return o.join("\n");
    };
    for (const theme of ["light", "dark"]) writeFileSync(join(IMG, `alerts-trace-${theme}.svg`), svg(theme));
    const scen = {
        generatedBy: "screens/alert-triage/src/trace-numbers.mjs -- regenerate instead of editing by hand",
        note: "Money in and Money out are the weighted in- and out-degree on amount (USD) over the full August graph; Links in and Links out count transfers. The trace is Neighbors of ACC-365386 with Direction Out and From Aug 6 (on or after 2026-08-06T00:00Z).",
        accounts,
        trace: {
            seed: ids[seed], direction: "out", from: FROM, fromLabel, hops,
            step: { hops: 2, nodes: d2.size, edges: rows.length, bySenderHop: [0, 1, 2].map((h) => ({ senderHop: h, transfers: rows.filter((r) => r.senderHop === h).length, total: sum(rows.filter((r) => r.senderHop === h)) })),
                    earlierThanHopBefore: rows.length - inOrder.length, total: sum(rows),
                    totalInOrder: sum(inOrder), rows },
            footer, seedOwnRows,
            anchors,
            drawing: "screens/img/alerts-trace-{theme}.svg",
        },
    };
    const FIX = join(KIT, "fixtures.json");
    const fx = JSON.parse(readFileSync(FIX, "utf8"));
    fx.scenarios.alertTriage = scen;
    writeFileSync(FIX, JSON.stringify(fx, null, 1));
    // The re-run must be the kit's own August: its seed's first hop matches alerts.json.
    const kept = JSON.parse(readFileSync(join(KIT, "alerts.json"), "utf8")).august.seed.hop1;
    if (JSON.stringify(kept) !== JSON.stringify(out.august.seed.hop1)) throw new Error("the re-run differs from kit/alerts.json");
    console.log("scenarios.alertTriage:", Object.keys(accounts).length, "accounts; trace", JSON.stringify(hops), "footer", JSON.stringify(footer));
}
const block = `(${injected.toString()})();`;

let src = readFileSync(join(kit, "gen-alerts.mjs"), "utf8");
const swap = (a, b) => {
    if (!src.includes(a)) throw new Error(`gen-alerts.mjs changed: cannot find ${a}`);
    src = src.replace(a, b);
};
swap("const here = dirname(fileURLToPath(import.meta.url));",
     `const here = ${JSON.stringify(kit)}; const KIT = here; const IMG = ${JSON.stringify(join(proto, "screens/img"))};`);
swap('const outDir = join(here, "canvas");', `const outDir = ${JSON.stringify(join(scratch, "canvas"))};`);
swap('writeFileSync(join(here, "alerts.json"), JSON.stringify(out, null, 1));', block);
const run = join(scratch, "gen-alerts-trace.mjs");
writeFileSync(run, src);
await import(pathToFileURL(run).href);
