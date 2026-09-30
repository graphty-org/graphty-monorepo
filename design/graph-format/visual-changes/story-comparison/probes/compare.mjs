// compare.mjs <storybook-a> <storybook-b> <outDir> [--settle ms] [--ids id,id] [--jobs n]
// Runs tools/diff-stories.mjs once per story (a crash costs one story), pixel-diffs each pair,
// writes <outDir>/results.json.
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
        settle: { type: "string", default: "4500" },
        ids: { type: "string" },
        jobs: { type: "string", default: "6" },
    },
});
const [a, b, out] = positionals;
mkdirSync(out, { recursive: true });
const ROOT = new URL("../../../../../", import.meta.url).pathname; // the repository root
const idx = (d) =>
    Object.values(JSON.parse(readFileSync(join(d, "index.json"), "utf8")).entries)
        .filter((e) => e.type === "story")
        .map((e) => e.id);
const ia = idx(a),
    ib = idx(b);
const onlyA = ia.filter((x) => !ib.includes(x)),
    onlyB = ib.filter((x) => !ia.includes(x));
let ids = values.ids ? values.ids.split(",") : ia.filter((x) => ib.includes(x));
const run = (args) =>
    new Promise((r) => {
        const p = spawn("node", args, { cwd: ROOT });
        let o = "",
            e = "";
        p.stdout.on("data", (d) => (o += d));
        p.stderr.on("data", (d) => (e += d));
        p.on("close", (c) => r({ c, o, e }));
    });
const results = [];
let next = 0;
async function worker() {
    while (next < ids.length) {
        const id = ids[next++];
        const d = await run(["tools/diff-stories.mjs", a, b, id, "--out", out, "--settle", values.settle]);
        let r;
        try {
            r = JSON.parse(d.o);
        } catch {
            results.push({ id, crashed: true, err: d.e.slice(-400) });
            console.log("CRASH", id);
            continue;
        }
        if (!r.identicalBytes) {
            const p = await run(["tools/pixel-diff.mjs", r.baseline, r.head]);
            try {
                r.pixel = JSON.parse(p.o);
            } catch {
                r.pixel = { err: (p.e || p.o).slice(-200) };
            }
        }
        delete r.cameraBaseline;
        delete r.cameraHead;
        results.push(r);
        console.log(results.length, "/", ids.length, id, r.identicalBytes ? "same" : `DIFF ${r.pixel?.changedPixels}`);
    }
}
await Promise.all(Array.from({ length: Number(values.jobs) }, worker));
writeFileSync(join(out, "results.json"), JSON.stringify({ onlyA, onlyB, results }, null, 1));
console.log("onlyA", onlyA, "onlyB", onlyB);
