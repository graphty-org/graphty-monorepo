// Computes the tier 2 answer key's reference values from graphty-element on the served build:
// loads each file through the element's own import, then reads filter counts, paths and rankings.
process.env.FC_FONTATIONS = "1";
import { readFileSync, writeFileSync } from "node:fs";
const root = "/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1";
const files = root + "/design/ui/studio/tool/files/";
const out = root + "/design/ui/studio/rounds/tier-2/preflight/reference";
const { chromium } = await import(root + "/node_modules/playwright/index.mjs");
const browser = await chromium.launch();
const page = await (
    await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true })
).newPage();
page.on("pageerror", (e) => console.log("page error:", e.message));
await page.goto("https://dev.ato.ms:9366/?next", { waitUntil: "networkidle" });
const build = await page.evaluate(
    () => document.documentElement.outerHTML.match(/[0-9a-f]{12} graphty@[0-9.]+/)?.[0] ?? null,
);
await page
    .getByRole("button", { name: "No thanks" })
    .click()
    .catch(() => {});
const [fc] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: /Open project or file/ }).click(),
]);
await fc.setFiles(files + "friends.csv");
await page.waitForFunction(
    () => document.querySelector("graphty-element")?.session?.data.statistics().nodeCount > 0,
    null,
    { timeout: 30000 },
);
const text = (n) => readFileSync(files + n, "utf8");

const result = await page.evaluate(
    async ({ T }) => {
        const s = document.querySelector("graphty-element").session;
        const file = (n) => new File([T[n]], n, { type: "text/csv" });
        const stats = () => {
            const { nodeCount, edgeCount } = s.data.statistics();
            return { nodes: nodeCount, edges: edgeCount };
        };
        const load = async (input, mapping) => {
            await s.data.import(input, mapping === undefined ? {} : { mapping });
            return stats();
        };
        const nameOf = (id) => {
            const row = s.data.nodePage({ limit: Infinity }).rows?.find((r) => r.id === id);
            return row?.data?.name ?? String(id);
        };
        const idOf = (name) => {
            const page = s.data.nodePage({ limit: Infinity });
            const rows = page.rows ?? page.items ?? [];
            const r = rows.find((x) => x.id === name || x.data?.name === name || x.values?.name === name);
            return r === undefined ? name : r.id;
        };
        const filter = async (attr, min) => {
            const a = s.data.attributes().find((x) => x.path.endsWith(attr));
            await s.visibility.setSteps([
                { id: "step-1", on: true, rule: { kind: "range", attribute: a.path, min, nodes: "ends" } },
            ]);
            const summary = JSON.parse(JSON.stringify(s.visibility.summary));
            const plan = JSON.parse(
                JSON.stringify(await s.plan({ op: "visibility.steps", steps: s.visibility.steps })),
            );
            await s.visibility.setSteps([]);
            return { attribute: a.path, summary, plan };
        };
        const path = async (from, to) => {
            const r = s.runs.start("shortest-path", { source: idOf(from), target: idOf(to) });
            const err = await new Promise((ok) =>
                r.then(
                    () => ok(null),
                    (e) => ok(String(e?.code ?? e)),
                ),
            );
            if (err !== null || r.result === undefined) return { error: err, status: r.status };
            const order = r.result
                .ranking("order")
                .filter((e) => Number.isFinite(e.value))
                .sort((a, b) => a.value - b.value)
                .map((e) => e.id);
            return {
                order,
                graph: JSON.parse(JSON.stringify(r.result.graph)),
                weight: JSON.parse(JSON.stringify(r.caveats?.weight ?? null)),
            };
        };
        const rank = async () => {
            const r = s.runs.start("pagerank");
            const err = await new Promise((ok) =>
                r.then(
                    () => ok(null),
                    (e) => ok(String(e?.code ?? e)),
                ),
            );
            if (err !== null || r.result === undefined) return { error: err, status: r.status };
            return {
                top: r.result.ranking(r.fields?.[0]?.name ?? "rank", 4).map((e) => [e.id, Number(e.value.toFixed(4))]),
                weight: JSON.parse(JSON.stringify(r.caveats?.weight ?? null)),
            };
        };
        const openFile = async (n) => {
            const d = await s.project.open(file(n));
            if (d && typeof d.load === "function") await d.load();
            return { ...stats(), loadedWeight: s.data.loadedWeight() };
        };
        const o = {};
        o.friends = {
            stats: stats(),
            loadedWeight: s.data.loadedWeight(),
            filter4: await filter("weight", 4),
            pathChloeMilo: await path("Chloe", "Milo"),
            pagerank: await rank(),
        };
        o.friendsV2 = { stats: await load({ config: { file: file("friends-v2.csv") } }), pagerank: await rank() };
        o.lesmis = { stats: await load({ config: { url: "/samples/les-miserables.gml" }, name: "Les Miserables" }) };
        o.lesmis.attributes = s.data.attributes().map((a) => a.path);
        o.lesmis.filter5 = await filter("shared_chapters", 5);
        o.florentine = {
            stats: await load({ config: { url: "/samples/florentine.gml" }, name: "Florentine families" }),
        };
        o.florentine.sampleIds = (s.data.nodePage({ limit: 3 }).rows ?? []).map((r) => JSON.parse(JSON.stringify(r)));
        o.florentine.pathStrozziPazzi = await path("Strozzi", "Pazzi");
        for (const [key, n, col] of [
            ["bus", "bus-stops.csv", "minutes"],
            ["trails", "trails.csv", "km"],
        ]) {
            const [a, b] = key === "bus" ? ["Depot", "Harbor"] : ["Trailhead", "Summit"];
            o[key] = {
                unset: {
                    stats: await load({ config: { file: file(n) } }),
                    loadedWeight: s.data.loadedWeight(),
                    path: await path(a, b),
                },
            };
            o[key].farther = {
                stats: await load({ config: { file: file(n) } }, { weight: col, weightMeaning: "distance" }),
                loadedWeight: s.data.loadedWeight(),
                path: await path(a, b),
            };
        }
        o.office = {
            stats: await load({ config: { nodeFile: file("people.csv"), edgeFile: file("messages.csv") } }),
            sources: JSON.parse(JSON.stringify(s.data.sources())),
            loadedWeight: s.data.loadedWeight(),
            pagerank: await rank(),
        };
        o.team5 = {
            stats: await load({ config: { nodeFile: file("players.csv"), edgeFile: file("passes.csv") } }),
            sources: JSON.parse(JSON.stringify(s.data.sources())),
        };
        o.team = { stats: await openFile("team.csv"), pagerank: await rank() };
        o.teamV2 = { stats: await openFile("team-v2.csv"), pagerank: await rank() };
        o.friendsOpen = { stats: await openFile("friends.csv"), pagerank: await rank() };
        o.friendsV2Open = { stats: await openFile("friends-v2.csv"), pagerank: await rank() };
        return o;
    },
    {
        T: Object.fromEntries(
            [
                "friends-v2.csv",
                "bus-stops.csv",
                "trails.csv",
                "people.csv",
                "messages.csv",
                "players.csv",
                "passes.csv",
                "team.csv",
                "team-v2.csv",
                "friends.csv",
            ].map((n) => [n, text(n)]),
        ),
    },
);
result.build = build;
writeFileSync(out + "/reference.json", JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 1).slice(0, 12000));
await browser.close();
