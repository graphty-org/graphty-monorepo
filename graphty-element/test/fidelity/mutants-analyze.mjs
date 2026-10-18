// Summarise mutant runs: per mutation, per sample, properties whose pass rate moved and whether new floor drops appear.
import fs from "node:fs";
const dir = process.argv[2];
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
const per = {}; // mutation -> rows
const base = {};
for (const f of files) {
    const id = f.replace(/\.json$/, "");
    const d = JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8"));
    const b = d.none;
    base[id] = { dropped: b.dropped, unfloored: b.unfloored };
    for (const [m, r] of Object.entries(d)) {
        if (m === "none") continue;
        const moved = [];
        for (const p of new Set([...Object.keys(b.scores), ...Object.keys(r.scores)])) {
            const x = b.scores[p],
                y = r.scores[p];
            if (x !== y) moved.push(`${p} ${x ?? "-"}->${y ?? "-"}`);
        }
        const newDrops = r.dropped.filter((s) => !b.dropped.some((t) => t.split(":")[0] === s.split(":")[0]));
        const newUnf = r.unfloored.filter((p) => !b.unfloored.includes(p));
        (per[m] ??= []).push({
            id,
            exercised: r.exercised,
            moved,
            fails: newDrops.length + newUnf.length > 0,
            newDrops: newDrops.map((s) => s.split(":")[0].replace(id + " ", "")),
            newUnf,
        });
    }
}
console.log("BASELINE", JSON.stringify(base, null, 1));
for (const [m, rows] of Object.entries(per)) {
    const ex = rows.filter((r) => r.exercised);
    const fail = ex.filter((r) => r.fails);
    console.log(`\n## ${m}: exercised ${ex.length}/${rows.length}, CI fails on ${fail.length}/${ex.length}`);
    for (const r of rows)
        console.log(
            `  ${r.id}${r.exercised ? "" : " (not exercised)"}: fails=${r.fails} drops=[${r.newDrops.join(", ")}] unfloored=[${r.newUnf.join(", ")}] moved=[${r.moved.join("; ")}]`,
        );
}
