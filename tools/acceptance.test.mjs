// Tests of tools/acceptance.mjs's route selection: which of the app's acceptance routes a change can
// affect, and why; and of the order in which the app's dry run (graphty/acceptance/run.mjs) takes its slots.
//
//   node --test tools/acceptance.test.mjs
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { appInputs, couldNotRun, selectRoutes } from "./acceptance.mjs";

const routes = [
    { id: "t38a-volunteers", text: 'async walk(u) { await openFile(u, "volunteers.graphml"); }' },
    { id: "t40a-les-mis", text: 'async walk(u) { await openSample(u, "Les Miserables"); }' },
];
const app = {
    files: new Set(["graphty/src/App.tsx", "graphty-element/src/Graph.ts", "layout/src/index.ts"]),
    packages: new Set(["graphty", "graphty-element", "layout", "graph-samples"]),
    whole: new Set(["graph-io"]),
};
const everything = [/^package\.json$/u, /^tsconfig\.base\.json$/u];
const routesText = routes.map((r) => r.text).join("\n");
const pick = (...changed) => selectRoutes({ changed, app, routes, routesText, everything });
const ids = (s) => [...s.routes.keys()].sort();
const ALL = ["t38a-volunteers", "t40a-les-mis"];

describe("selectRoutes", () => {
    it("selects nothing for a change outside the app", () => {
        const s = pick("visual-review/trusted/gate.mjs", "docs/index.md", ".github/workflows/ci.yml");
        assert.deepEqual(ids(s), []);
        assert.equal(s.why.length, 3, "every changed file says why");
    });

    it("selects every route for a file the app's build runs", () => {
        assert.deepEqual(ids(pick("graphty-element/src/Graph.ts")), ALL);
        assert.deepEqual(ids(pick("layout/src/index.ts")), ALL);
    });

    it("selects nothing for tests, stories and docs of the app's packages", () => {
        const s = pick("graphty/src/App.test.tsx", "graphty-element/stories/Foo.stories.ts", "graphty/README.md");
        assert.deepEqual(ids(s), []);
    });

    it("selects nothing for code of an app package that the build does not run", () => {
        assert.deepEqual(ids(pick("graphty-element/src/node-only/cli.ts")), []);
        assert.deepEqual(ids(pick("graphty/eslint.config.js")), [], "lint configuration");
    });

    it("selects every route for a non-code file of an app package (fail safe)", () => {
        const files = ["graphty/index.html", "graphty/public/x.png", "graphty/src/theme.css", "graphty/package.json"];
        for (const f of [...files, "graphty/vite.aliases.ts", "graphty-element/scripts/build.mjs"])
            assert.deepEqual(ids(pick(f)), ALL, f);
    });

    it("selects every route for any build input of a package bundled whole", () => {
        assert.deepEqual(ids(pick("graph-io/src/formats/dot/index.ts")), ALL);
        assert.deepEqual(ids(pick("graph-io/test/dot.test.ts")), []);
    });

    it("selects every route for a shared root input and for the suite's own code", () => {
        for (const f of ["package.json", "tsconfig.base.json", "pnpm-lock.yaml", "graphty/acceptance/routes.mjs"])
            assert.deepEqual(ids(pick(f)), ALL, f);
        for (const f of ["tools/acceptance.mjs", "design/ui/studio/tool/with-browser.sh"])
            assert.deepEqual(ids(pick(f)), ALL, f);
        assert.deepEqual(ids(pick("graphty/acceptance/README.md")), []);
    });

    it("selects only the routes that open a changed data file", () => {
        const s = pick("design/ui/studio/tool/files/volunteers.graphml");
        assert.deepEqual(ids(s), ["t38a-volunteers"]);
        assert.match(s.routes.get("t38a-volunteers"), /volunteers\.graphml/u);
        assert.deepEqual(ids(pick("design/ui/studio/tool/files/unused.csv")), []);
    });

    it("selects every route for a data file the shared steps name but no route does", () => {
        const s = selectRoutes({
            changed: ["design/ui/studio/tool/files/people.csv"],
            app,
            routes,
            routesText: `${routesText}\nconst DEFAULT = "people.csv";`,
            everything,
        });
        assert.deepEqual(ids(s), ALL);
    });
});

describe("appInputs", () => {
    it("traces a package through its build's own map, and a map-less build output to the whole package", () => {
        const root = mkdtempSync(join(tmpdir(), "acceptance-app-"));
        const put = (f, text) => {
            mkdirSync(dirname(join(root, f)), { recursive: true });
            writeFileSync(join(root, f), text);
        };
        const map = (sources) => JSON.stringify({ version: 3, sources, mappings: "" });
        try {
            put("graphty/package.json", JSON.stringify({ name: "app", dependencies: { ui: "workspace:*" } }));
            put(
                "compact-mantine/package.json",
                JSON.stringify({ name: "ui", exports: { ".": { import: "./dist/index.js" } } }),
            );
            put("layout/package.json", JSON.stringify({ name: "lay" }));
            put("compact-mantine/src/index.ts", "");
            put("compact-mantine/vite.config.ts", 'build: { lib: { entry: "src/index.ts" } }');
            put("compact-mantine/dist/index.js", "");
            put("layout/dist/index.js", "");
            put("layout/dist/index.js.map", map(["../src/a.ts"]));
            put(
                "graphty/dist/assets/index.js.map",
                map(["../../src/App.tsx", "../../../compact-mantine/dist/index.js", "../../../layout/dist/index.js"]),
            );
            const app = appInputs(root, join(root, "graphty/dist"));
            assert.deepEqual([...app.files].sort(), ["graphty/src/App.tsx", "layout/src/a.ts"]);
            assert.deepEqual([...app.whole], ["compact-mantine"]);
            const s = selectRoutes({
                changed: ["compact-mantine/src/theme/index.ts"],
                app,
                routes,
                routesText,
                everything,
            });
            assert.deepEqual(ids(s), ALL, "a theme change of a map-less package runs every route");
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });
});

describe("couldNotRun", () => {
    const notRun = { result: "not run", reason: "no worker reached it (worker exits: 1)" };
    it("is true when no route was walked, or every route failed for want of the GPU", () => {
        assert.equal(couldNotRun([notRun, notRun], 2), true);
        assert.equal(couldNotRun([{ result: "fail", reason: "draws with SwiftShader, not the NVIDIA card" }], 1), true);
    });
    it("is false when a route was walked and failed", () => {
        assert.equal(couldNotRun([notRun, { result: "fail", reason: "expected 3 nodes" }], 2), false);
        assert.equal(couldNotRun([notRun, { result: "pass" }], 2), false);
    });
});

// The dry run takes its first browser slot before the machine's one GPU slot, so a wait for a browser slot never
// holds the GPU slot, which kept every GPU job on the machine waiting for hours (#8930). Planted slot pools: every
// browser slot held, then the GPU slot held, so the run reaches no browser and launches nothing.
describe("the dry run's slot order", () => {
    const repo = fileURLToPath(new URL("..", import.meta.url));
    // Resolves once the child's stderr has printed a line matching `re`.
    const said = (child, re) =>
        new Promise((resolve, reject) => {
            let text = "";
            child.stderr.on("data", (d) => {
                text += d;
                if (re.test(text)) resolve();
            });
            child.once("exit", (code) => reject(new Error(`exited (${code}) before it printed ${re}: ${text}`)));
        });
    const ended = (child) =>
        child.exitCode !== null || child.signalCode !== null
            ? Promise.resolve()
            : new Promise((r) => child.once("exit", r));

    it("holds no GPU ticket while it waits for a browser slot, and holds a browser slot while it waits for the GPU", async () => {
        const root = mkdtempSync(join(tmpdir(), "dry-run-slots-"));
        const pool = join(root, "browser");
        const gpu = join(root, "gpu");
        mkdirSync(join(root, "dist"), { recursive: true });
        mkdirSync(pool);
        writeFileSync(join(root, "dist/index.html"), "<html></html>");
        const env = {
            ...process.env,
            BROWSER_SLOT_DIR: pool,
            GRAPHTY_GPU_SLOTS_DIR: gpu,
            GRAPHTY_TEST_SLOTS_DIR: join(root, "test"),
            GRAPHTY_TEST_SLOTS: "4",
            PIPELINE_WAIT_LOG: "off",
        };
        for (const k of ["BROWSER_SLOT_PRIORITY", "GRAPHTY_TEST_SLOT_HELD", "DRY_RUN_GPU_HELD", "DRY_RUN_SLOT_HELD"])
            delete env[k];
        // holds all four browser slots until its stdin closes
        const browsers = spawn(
            "bash",
            [
                "-c",
                'for i in 1 2 3 4; do exec {fd}>"$1/slot$i"; flock "$fd"; done; echo held >&2; read -r _',
                "-",
                pool,
            ],
            { stdio: ["pipe", "ignore", "pipe"] },
        );
        // holds the GPU slot until it is stopped
        const card = spawn(
            process.execPath,
            [
                join(repo, "tools/test-slots.mjs"),
                "--gpu",
                process.execPath,
                "-e",
                "console.error('held'); setInterval(() => {}, 1 << 30)",
            ],
            { env, stdio: ["ignore", "ignore", "pipe"], detached: true },
        );
        let run;
        try {
            await Promise.all([said(browsers, /held/), said(card, /held/)]);
            run = spawn(process.execPath, [join(repo, "graphty/acceptance/run.mjs"), "--dist", join(root, "dist")], {
                cwd: repo,
                env,
                stdio: ["ignore", "ignore", "pipe"],
                detached: true,
            });
            const waitingForGpu = said(run, /test-slots: waiting for one of 1 /);
            const waitingForBrowser = said(run, /with-browser: waiting for one of 4 browser slots/);
            waitingForBrowser.catch(() => {}); // a run that waits for the GPU first never prints it
            const first = await Promise.race([
                waitingForBrowser.then(() => "a browser slot"),
                waitingForGpu.then(() => "the GPU slot"),
            ]);
            assert.equal(first, "a browser slot", "the run waits for a browser slot before it asks for the GPU slot");
            assert.equal(
                readdirSync(gpu).length,
                1,
                "only the planted GPU holder's ticket: the run took none while it waited",
            );

            browsers.stdin.end(); // free the browser slots: the run takes one, then waits for the GPU slot
            await waitingForGpu;
            assert.equal(readdirSync(gpu).length, 2, "the run's GPU ticket, waiting behind the planted holder");
            const holders = readdirSync(pool)
                .filter((f) => f.endsWith(".holder"))
                .map((f) => readFileSync(join(pool, f), "utf8"));
            assert.ok(
                holders.some((h) => h.includes("test-slots.mjs")),
                `the run holds a browser slot while it waits for the GPU: ${holders.join("; ")}`,
            );
        } finally {
            if (run && run.exitCode === null) process.kill(-run.pid, "SIGTERM");
            process.kill(-card.pid, "SIGTERM"); // the holder and the command it runs
            browsers.stdin.end();
            await Promise.all([run, card, browsers].filter(Boolean).map(ended));
            rmSync(root, { recursive: true, force: true });
        }
    });
});
