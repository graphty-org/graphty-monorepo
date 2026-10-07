#!/usr/bin/env node
// Measures how big Ava's and Farah's dots are drawn when node size is bound to PageRank on the
// running club (design/ui/studio/tool/files/friends.csv), in 2D and in 3D from two orbit angles.
// For each view it records, per node: the PageRank, the size the style gave the node, the node's
// world-space diameter, the camera's distance to the node (along the view axis and straight
// line), the diameter the element says it draws (projected), and the diameter measured from the
// screenshot's pixels. Findings: 3d-size.md beside this script.
//
// Usage (browsers only through the shared slots):
//   design/ui/studio/tool/with-browser.sh node design/ui/studio/next-steps/traces/3d-size.mjs [out dir] [app url]
// Defaults: out dir design/ui/studio/tmp/r3fix-trace-3d-size/run, app https://dev.ato.ms:9366/?next
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../../../../..");
const studio = resolve(here, "../..");
const out = resolve(process.argv[2] ?? join(studio, "tmp/r3fix-trace-3d-size/run"));
const url = process.argv[3] ?? "https://dev.ato.ms:9366/?next";
const csv = join(studio, "tool/files/friends.csv");
const PAIR = ["Ava", "Farah"];
mkdirSync(out, { recursive: true });

const { chromium } = await import(join(repo, "node_modules/playwright/index.mjs"));
const { PNG } = createRequire(import.meta.url)(join(repo, "node_modules/pngjs"));

const browser = await chromium.launch();
const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: true,
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
let shot = 0;
const snap = async (name) => {
    const f = join(out, `${String(++shot).padStart(2, "0")}-${name}.png`);
    await page.screenshot({ path: f });
    return f;
};

// Waits until the camera and every node have stopped moving (three equal readings 300 ms apart).
const settle = async () => {
    let last = "";
    let same = 0;
    for (let i = 0; i < 100 && same < 3; i++) {
        await page.waitForTimeout(300);
        const now = await page.evaluate(() => {
            const el = document.querySelector("graphty-element");
            if (!el?.graph) return "none";
            const cam = el.getScene().activeCamera;
            const p = cam?.globalPosition;
            const nodes = [...el.graph.getNodes()].map((n) => {
                const a = n.mesh.getAbsolutePosition();
                return [a.x, a.y, a.z].map((v) => v.toFixed(3)).join(",");
            });
            return `${p?.x.toFixed(3)},${p?.y.toFixed(3)},${p?.z.toFixed(3)}|${nodes.join(";")}`;
        });
        same = now === last ? same + 1 : 0;
        last = now;
    }
};

const click = async (locator) => {
    await locator.first().click();
    await page.waitForTimeout(400);
};

// --- the reader's route: open the file, run PageRank, bind node Size to it, name every node ---
await page.goto(url);
await click(page.getByRole("button", { name: "No thanks" }));
const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: "Open project or file" }).first().click(),
]);
await chooser.setFiles(csv);
await settle();
await click(page.getByRole("button", { name: "Analyze", exact: true }));
await click(page.getByText("PageRank", { exact: true }));
await click(page.getByRole("button", { name: "Run", exact: true }));
await settle();
await click(page.getByRole("treeitem", { name: "PageRank" }));
await click(page.getByRole("button", { name: "Add to Shape" }));
await click(page.getByText("Size", { exact: true }));
await click(page.getByRole("option", { name: "PageRank" }));
await click(page.getByRole("button", { name: "Add label line" }));
await click(page.getByRole("option", { name: "id", exact: true }));
await settle();

// --- measuring ---
// Everything is read from the element, in render (device) pixels; the page runs at scale 1.
const measure = () =>
    page.evaluate((pair) => {
        const el = document.querySelector("graphty-element");
        const scene = el.getScene();
        const cam = scene.activeCamera;
        const camPos = cam.globalPosition;
        const view = scene.getViewMatrix().m;
        // the PageRank run's per-node value, as the element's record pages publish it
        const run = el.session.runs.list().find((r) => r.algorithm === "pagerank");
        const records = el.session.data.nodePage({ limit: Infinity, columns: [run.id] });
        const ranks = new Map(records.records.map((r, i) => [r.id, records.columns[0].values[i]]));
        const rankOf = (node) => ranks.get(node.id);
        const rows = [...el.graph.getNodes()].map((node) => {
            const { mesh } = node;
            mesh.computeWorldMatrix(true);
            const c = mesh.getAbsolutePosition();
            const ext = mesh.getBoundingInfo().boundingBox.extendSize;
            const s = mesh.absoluteScaling;
            const worldDiameter =
                2 * Math.max(ext.x, ext.y, ext.z) * Math.max(Math.abs(s.x), Math.abs(s.y), Math.abs(s.z));
            const depth = c.x * view[2] + c.y * view[6] + c.z * view[10] + view[14];
            const dist = Math.hypot(c.x - camPos.x, c.y - camPos.y, c.z - camPos.z);
            const at = el.nodeScreenPosition(node.id);
            return {
                id: node.id,
                rank: rankOf(node),
                styleSize: node.size,
                worldDiameter,
                depth,
                distance: dist,
                drawnDiameter: at ? 2 * at.radius : null,
                x: at?.x,
                y: at?.y,
                visible: at?.visible,
            };
        });
        return {
            camera: {
                mode: cam.mode === 1 ? "orthographic" : "perspective",
                fovDeg: (cam.fov * 180) / Math.PI,
                position: [camPos.x, camPos.y, camPos.z],
            },
            rows,
            pair,
            path: records.columns[0].path,
        };
    }, PAIR);

// Diameter of a dot from the screenshot: from its center, walk out in the four directions while the
// pixel is a node's orange/brown (red well above blue); the smallest reach is the radius (another
// node touching one side, an edge or a label only lengthens or stops one direction).
const pixelDiameter = (png, x, y) => {
    const isNode = (px, py) => {
        if (px < 0 || py < 0 || px >= png.width || py >= png.height) return false;
        const i = (png.width * py + px) * 4;
        const [r, g, b] = [png.data[i], png.data[i + 1], png.data[i + 2]];
        return r - b > 40 && r > g;
    };
    const cx = Math.round(x);
    const cy = Math.round(y);
    const reach = (dx, dy) => {
        let k = 0;
        while (isNode(cx + dx * (k + 1), cy + dy * (k + 1)) && k < 2000) k++;
        return k;
    };
    const h = reach(-1, 0) + reach(1, 0) + 1;
    const v = reach(0, -1) + reach(0, 1) + 1;
    return Math.min(h, v);
};

const canvasBox = async () =>
    page.evaluate(() => {
        const el = document.querySelector("graphty-element");
        const r = el.getBoundingClientRect();
        return { x: r.left, y: r.top };
    });

const views = [];
const record = async (name) => {
    await settle();
    const file = await snap(name);
    const m = await measure();
    const box = await canvasBox();
    const png = PNG.sync.read(readFileSync(file));
    for (const r of m.rows) r.pixelDiameter = r.visible ? pixelDiameter(png, box.x + r.x, box.y + r.y) : null;
    // every pair whose drawn order disagrees with its PageRank order
    const ranked = m.rows.filter((r) => typeof r.rank === "number");
    let inverted = 0;
    let worldInverted = 0;
    let pairs = 0;
    for (const a of ranked)
        for (const b of ranked)
            if (a.rank > b.rank) {
                pairs++;
                if (a.drawnDiameter < b.drawnDiameter) inverted++;
                if (a.worldDiameter < b.worldDiameter) worldInverted++;
            }
    const depths = m.rows.map((r) => r.depth);
    views.push({
        name,
        file,
        ...m,
        invertedPairs: inverted,
        worldInvertedPairs: worldInverted,
        rankedPairs: pairs,
        depthRange: [Math.min(...depths), Math.max(...depths)],
    });
};

await record("3d-default");
// a second orbit angle: half a turn about the vertical, so what was near is now far
await page.evaluate(() => {
    const el = document.querySelector("graphty-element");
    const ctl = el.getCameraController();
    ctl.pivotController.rotate(Math.PI, 0);
    ctl.updateCameraPosition();
});
await record("3d-half-turn");
// the reader's 2D: the toolbar's view menu, 2D
await click(page.getByRole("toolbar", { name: "Canvas tools" }).getByRole("button", { name: /^View/ }));
await click(page.getByRole("menuitemradio", { name: "2D" }).or(page.getByRole("menuitem", { name: "2D" })));
await record("2d");

writeFileSync(join(out, "measurements.json"), JSON.stringify({ url, views, errors }, null, 2));

// --- the table the findings quote ---
const f = (v, d = 2) => (typeof v === "number" ? v.toFixed(d) : String(v));
for (const v of views) {
    console.log(`\n${v.name} (${v.camera.mode}, fov ${f(v.camera.fovDeg, 1)} deg): ${v.file}`);
    console.log(
        `  pairs against PageRank order: drawn ${v.invertedPairs} of ${v.rankedPairs}, world size ${v.worldInvertedPairs} of ${v.rankedPairs}; ` +
            `node depths ${f(v.depthRange[0])} to ${f(v.depthRange[1])}`,
    );
    for (const id of PAIR) {
        const r = v.rows.find((x) => x.id === id);
        console.log(
            `  ${id.padEnd(6)} rank ${f(r.rank, 5)}  style size ${f(r.styleSize, 3)}  world diameter ${f(r.worldDiameter, 3)}  ` +
                `depth ${f(r.depth)}  distance ${f(r.distance)}  drawn ${f(r.drawnDiameter, 1)} px  pixels ${r.pixelDiameter} px`,
        );
    }
}
if (errors.length) console.log(`\npage errors:\n${errors.join("\n")}`);
await browser.close();
