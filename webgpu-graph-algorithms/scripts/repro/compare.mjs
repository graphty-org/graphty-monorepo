// Compares two run-all.sh output directories (A, B): per story, A run to run and B run to run (bitwise), then A run 1
// against B run 1: bitwise, largest and median per-node distance, share of nodes that differ, and the shape residual
// after removing translation and uniform scale (in rms radii, as simfit did). Then the one-iter floats, if present.
// Usage: node compare.mjs <dir A> <dir B>
import { existsSync, readdirSync, readFileSync } from "node:fs";

const [A, B] = process.argv.slice(2);
const load = (p) => JSON.parse(readFileSync(p, "utf8")).positions;
const same = (p, q) => {
    const m = new Map(q.map((r) => [r[0], r]));
    return p.every(([id, x, y]) => Object.is(m.get(id)[1], x) && Object.is(m.get(id)[2], y));
};
const runs = (d, s) =>
    readdirSync(`${d}/${s}`)
        .filter((f) => /^run\d+\.json$/.test(f))
        .sort()
        .map((f) => load(`${d}/${s}/${f}`));
const runToRun = (rs) =>
    rs.slice(1).every((r) => same(rs[0], r))
        ? `yes (${rs.length} runs)`
        : `NO (${rs.slice(1).filter((r) => !same(rs[0], r)).length} of ${rs.length - 1} differ from run 1)`;
function cross(P, Q) {
    const m = new Map(Q.map((r) => [r[0], r]));
    const Qa = P.map((p) => m.get(p[0]));
    const d = P.map((p, i) => Math.hypot(p[1] - Qa[i][1], p[2] - Qa[i][2])).sort((u, v) => u - v);
    const differ = P.filter((p, i) => !Object.is(p[1], Qa[i][1]) || !Object.is(p[2], Qa[i][2])).length;
    const mean = (S) => [S.reduce((s, p) => s + p[1], 0) / S.length, S.reduce((s, p) => s + p[2], 0) / S.length];
    const [ax, ay] = mean(P),
        [bx, by] = mean(Qa);
    const ra = Math.sqrt(P.reduce((s, p) => s + (p[1] - ax) ** 2 + (p[2] - ay) ** 2, 0) / P.length);
    const rb = Math.sqrt(Qa.reduce((s, p) => s + (p[1] - bx) ** 2 + (p[2] - by) ** 2, 0) / Qa.length);
    const res = P.map((p, i) =>
        Math.hypot((p[1] - ax) / ra - (Qa[i][1] - bx) / rb, (p[2] - ay) / ra - (Qa[i][2] - by) / rb),
    ).sort((u, v) => u - v);
    return {
        equal: differ === 0,
        max: d.at(-1),
        median: d[d.length >> 1],
        share: differ / P.length,
        resMedian: res[res.length >> 1],
        resP99: res[Math.floor(res.length * 0.99)],
    };
}
const e = (v) => (v === 0 ? "0" : v.toExponential(2));
console.log(
    `| story | ${A} run to run | ${B} run to run | A vs B equal | max px | median px | nodes differing | shape residual median / p99 (rms radii) |`,
);
console.log("|---|---|---|---|---|---|---|---|");
const stories = readdirSync(A).filter((s) => s.includes("-at-") && existsSync(`${B}/${s}`));
stories.sort((u, v) => Number(u.split("-at-")[1]) - Number(v.split("-at-")[1]) || u.localeCompare(v));
for (const s of stories) {
    const ra = runs(A, s),
        rb = runs(B, s);
    const c = cross(ra[0], rb[0]);
    console.log(
        `| ${s} | ${runToRun(ra)} | ${runToRun(rb)} | ${c.equal ? "yes" : "no"} | ${e(c.max)} | ${e(c.median)} | ${(100 * c.share).toFixed(1)}% | ${e(c.resMedian)} / ${e(c.resP99)} |`,
    );
}
if (existsSync(`${A}/one-iter`) && existsSync(`${B}/one-iter`)) {
    console.log("\nIteration-exact (2,000 nodes, same start):");
    for (const k of ["forceAtlas2", "fruchtermanReingold", "springElectrical"]) {
        const a = JSON.parse(readFileSync(`${A}/one-iter/${k}.json`)),
            b = JSON.parse(readFileSync(`${B}/one-iter/${k}.json`));
        for (const at of Object.keys(a)) {
            const fa = new Float32Array(Buffer.from(a[at], "base64").buffer.slice(0)),
                fb = new Float32Array(Buffer.from(b[at], "base64").buffer.slice(0));
            let d = 0,
                mx = 0;
            for (let i = 0; i < fa.length; i++)
                if (!Object.is(fa[i], fb[i])) {
                    d++;
                    mx = Math.max(mx, Math.abs(fa[i] - fb[i]));
                }
            console.log(
                `${k.padEnd(20)} after ${at.padStart(2)} iterations: ${d} of ${fa.length} floats differ, max abs ${e(mx)}`,
            );
        }
    }
}
