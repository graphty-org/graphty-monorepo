// One story layout in Node on Dawn, as the cytoscape-extensions ForceLayoutsBySize stories run it (headless
// Cytoscape, cytoscape-extensions' dist, seed 42, a 1200 x 823 box). One story, one run per process.
// Usage: node run-story.mjs <adapter substring: 4070|T4> <out dir> <story> <run>
import { execSync } from "node:child_process";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");
const EXT = `${ROOT}/cytoscape-extensions`;
const req = createRequire(`${EXT}/package.json`);
const cytoscape = req("cytoscape");
const ext = await import(`${EXT}/dist/index.js`);
const { plantedPartitionGraph } = await import(req.resolve("@graphty/graph-samples/generators"));

const [adapter, outDir, story, run] = process.argv.slice(2);
const OUT = resolve(outDir, story);
mkdirSync(OUT, { recursive: true });
const journal = (l) => {
    appendFileSync(resolve(outDir, "journal.log"), `${new Date().toISOString()} ${l}\n`);
    execSync("sync");
};

// the story's args (ForceLayoutsBySize.stories.ts, demo.ts, run.ts)
const m = /^(.*)-at-(\d+)$/.exec(story);
const layout = {
    "force-atlas-2": "forceatlas2",
    "fruchterman-reingold": "fruchterman-reingold",
    "spring-electrical": "spring-electrical",
}[m[1]];
const n = Number(m[2]);
const seed = 42;
const groups = Math.max(4, Math.round(Math.sqrt(n) / 5));
const groupSize = Math.round(n / groups);
const g = plantedPartitionGraph({ groups, groupSize, pIn: 6 / groupSize, pOut: 0.5 / n, seed });
const els = [];
for (let i = 0; i < g.nodeCount; i++) els.push({ group: "nodes", data: { id: `n${i}` } });
for (let e = 0; e < g.src.length; e++)
    els.push({ group: "edges", data: { id: `e${e}`, source: `n${g.src[e]}`, target: `n${g.dst[e]}` } });
const cap = Math.max(1_000, Math.round(20 * Math.sqrt(g.nodeCount)));
const budget =
    layout === "fruchterman-reingold"
        ? { iterations: cap, cooling: "adaptive" }
        : layout === "spring-electrical"
          ? { maxIter: 5 * cap }
          : { maxIter: cap };
const extra = layout === "forceatlas2" && n >= 10_000 ? { linlog: true } : {};
// the story canvas: 1200 wide, 900 - the 76 px status bar - its 1 px border high
const W = 1200;
const H = 823;

cytoscape.use(ext.default);
ext.configureWebGpu({ acceptSoftware: true, adapter });
const cy = cytoscape({ headless: true, styleEnabled: false, elements: els });
journal(`BEGIN adapter=${adapter} ${story} run${run}`);
const t0 = Date.now();
const backend = await new Promise((ok, fail) => {
    const l = cy.layout({
        name: `graphty-${layout}`,
        seed,
        gpu: n >= 50_000 ? "require" : "auto",
        animate: false,
        ...budget,
        ...extra,
        boundingBox: { x1: 0, y1: 0, w: W, h: H },
    });
    l.one("layouterror", (_e, err) => fail(err));
    l.one("layoutstop", () => ok(l.backend));
    l.run();
});
const ms = Date.now() - t0;
const positions = cy.nodes().map((nd) => [nd.id(), nd.position().x, nd.position().y]);
writeFileSync(
    `${OUT}/run${run}.json`,
    JSON.stringify({ id: story, run: Number(run), storyMs: ms, backend, positions }),
);
journal(`END adapter=${adapter} ${story} run${run} ${ms}ms backend=${JSON.stringify(backend)}`);
console.log(story, run, ms, JSON.stringify(backend));
process.exit(0);
