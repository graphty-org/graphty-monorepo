// The ranking reference values for single-file tasks, loaded the way a participant loads them:
// a fresh app, "Open project or file...", the file; then PageRank as the element runs it.
process.env.FC_FONTATIONS = "1";
import { writeFileSync } from "node:fs";
const root = "/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1";
const files = root + "/design/ui/studio/tool/files/";
const { chromium } = await import(root + "/node_modules/playwright/index.mjs");
const browser = await chromium.launch();
const out = {};
for (const n of ["friends.csv", "friends-v2.csv", "team.csv", "team-v2.csv", "bus-stops.csv", "trails.csv"]) {
    const page = await (
        await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true })
    ).newPage();
    await page.goto("https://dev.ato.ms:9366/?next", { waitUntil: "networkidle" });
    await page
        .getByRole("button", { name: "No thanks" })
        .click()
        .catch(() => {});
    const [fc] = await Promise.all([
        page.waitForEvent("filechooser"),
        page.getByRole("button", { name: /Open project or file/ }).click(),
    ]);
    await fc.setFiles(files + n);
    await page.waitForFunction(
        () => document.querySelector("graphty-element")?.session?.data.statistics().nodeCount > 0,
        null,
        { timeout: 30000 },
    );
    out[n] = await page.evaluate(async () => {
        const s = document.querySelector("graphty-element").session;
        const { nodeCount, edgeCount } = s.data.statistics();
        const r = s.runs.start("pagerank");
        await new Promise((ok) => r.then(ok, ok));
        return {
            nodes: nodeCount,
            edges: edgeCount,
            directed: s.data.directed ?? null,
            loadedWeight: s.data.loadedWeight(),
            top: r.result.ranking(r.fields[0].name, 4).map((e) => [e.id, Number(e.value.toFixed(4))]),
            weight: r.caveats.weight ?? null,
        };
    });
    console.log(n, JSON.stringify(out[n]));
    await page.close();
}
writeFileSync(
    root + "/design/ui/studio/rounds/tier-2/preflight/reference/reference-open.json",
    JSON.stringify(out, null, 2),
);
await browser.close();
