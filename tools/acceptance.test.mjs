// Tests of tools/acceptance.mjs's route selection: which of the app's acceptance routes a change can
// affect, and why.
//
//   node --test tools/acceptance.test.mjs
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { selectRoutes } from "./acceptance.mjs";

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
