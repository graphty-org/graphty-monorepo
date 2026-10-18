// Tests of tools/check-storybooks.mjs.
//
//   node tools/check-storybooks.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { checkStorybook, readBaselines } from "./check-storybooks.mjs";

const TOOL = join(dirname(fileURLToPath(import.meta.url)), "check-storybooks.mjs");
const SHARDS = [{ shard: "demo-storybook", package: "demo" }];
const TAXONOMY = { sections: ["Introduction", "Data"], storyShard: "demo-storybook", a11yBudget: 2 };
const VISIBLE = ["dev", "test"];

const story = (id, title, name, tags = VISIBLE) => ({
    type: "story",
    id,
    title,
    name,
    importPath: "./x.stories.ts",
    tags,
});
const docs = (id, title, importPath = "./x.mdx") => ({
    type: "docs",
    id,
    title,
    name: "Docs",
    importPath,
    tags: ["dev"],
});

/**
 * A Storybook that passes every rule; each test changes one thing.
 * @returns its entries
 */
function good() {
    return [
        docs("introduction-welcome--docs", "Introduction/Welcome"),
        docs("data-overview--docs", "Data/Overview", "./overview.mdx"),
        story("data--default", "Data/Formats", "Default"),
        story("data--playground", "Data/Formats", "Playground"),
        story("data--graph-ml", "Data/Formats", "GraphML"),
        story("data--pin", "Data/Formats", "Pin", ["test", "regression"]),
    ];
}

function run(list, extra = {}) {
    return checkStorybook({
        pkg: "demo",
        taxonomy: TAXONOMY,
        entries: Object.fromEntries(list.map((e) => [e.id, e])),
        readSource: () => "See https://graphty.app/docs/demo/.",
        baselineIds: [],
        renames: [],
        reports: null,
        shards: SHARDS,
        ...extra,
    }).problems;
}

describe("checkStorybook", () => {
    it("passes a Storybook that keeps every rule", () => {
        assert.deepEqual(run(good()), []);
    });

    it("fails a section outside the taxonomy, and its missing Overview", () => {
        const problems = run([...good(), story("misc--a", "Misc/A", "A")]);
        assert.ok(problems.some((p) => p.includes('section "Misc" is not in')));
        assert.ok(problems.some((p) => p.includes('section "Misc" has no Overview')));
    });

    it("ignores a hidden story's old title", () => {
        assert.deepEqual(run([...good(), story("old--a", "Old/A", "A", ["test", "regression"])]), []);
    });

    it("fails a package with no Introduction", () => {
        assert.ok(run(good().slice(1)).some((p) => p.includes("no Introduction")));
    });

    it("fails an Overview with no graphty.app/docs link", () => {
        const problems = run(good(), { readSource: () => "no link" });
        assert.ok(problems.some((p) => p.includes("does not link to https://graphty.app/docs/")));
    });

    it("fails sections out of the taxonomy's order, a section split in two, and one not opening on its Overview", () => {
        const [welcome, overview, ...stories] = good();
        assert.ok(run([overview, ...stories, welcome]).some((p) => p.includes("not in the taxonomy's order")));
        const split = run([
            welcome,
            overview,
            stories[0],
            docs("introduction-more--docs", "Introduction/More"),
            stories[1],
        ]);
        assert.ok(split.some((p) => p.includes("Introduction > Data > Introduction > Data")));
        assert.ok(
            run([welcome, ...stories, overview]).some((p) => p.includes('section "Data" opens on "Data/Formats"')),
        );
    });

    it("fails an MDX link to an entry that is not in the Storybook, or to a hidden story", () => {
        const readSource = () =>
            "https://graphty.app/docs/ [a](?path=/story/data--graph-ml) [b](?path=/docs/data-overview--docs) " +
            "[c](?path=/story/data--gone) [d](?path=/story/data--pin) " +
            "[e](https://graphty.app/storybook/layout/?path=/story/not--here)";
        const problems = run(good(), { readSource });
        assert.deepEqual(problems.filter((p) => p.includes("links to")).sort(), [
            './overview.mdx: links to "data--gone", which is not in this Storybook',
            './overview.mdx: links to "data--pin", a story hidden from the sidebar; link a visible one',
            './x.mdx: links to "data--gone", which is not in this Storybook',
            './x.mdx: links to "data--pin", a story hidden from the sidebar; link a visible one',
        ]);
    });

    it("fails two entries with one title and name, docs entries included", () => {
        const problems = run([...good(), docs("data-overview--docs-2", "Data/Overview")]);
        assert.ok(problems.some((p) => p.includes('two entries named "Docs"')));
    });

    it("fails a title that shares a component id, has no Docs page and is not linked from its Overview", () => {
        const split = [...good(), docs("data--docs", "Data/Formats"), story("data--csv", "Data/Your own data", "CSV")];
        const problems = run(split);
        assert.ok(problems.some((p) => p.includes('"Data/Your own data" shares the component id "data"')));
        assert.deepEqual(run(split, { readSource: () => "https://graphty.app/docs/ ?path=/story/data--csv" }), []);
        const withDocs = [...split, docs("data-your-own-data--docs", "Data/Your own data")];
        assert.deepEqual(run(withDocs), []);
    });

    it("accepts an Overview named Overview under the section's own title", () => {
        const list = good().map((e) =>
            e.id === "data-overview--docs" ? { ...e, id: "data--overview", title: "Data", name: "Overview" } : e,
        );
        assert.deepEqual(run(list), []);
    });

    it("checks the package's own docs link when the taxonomy names one", () => {
        const taxonomy = { ...TAXONOMY, docsLink: "https://www.npmjs.com/package/demo" };
        assert.ok(
            run(good(), { taxonomy }).some((p) => p.includes("does not link to https://www.npmjs.com/package/demo")),
        );
        assert.deepEqual(run(good(), { taxonomy, readSource: () => "https://www.npmjs.com/package/demo" }), []);
    });

    it("fails a regression story that is still visible or untested", () => {
        assert.ok(run([...good(), story("data--r", "Data/Formats", "R", ["dev", "test", "regression"])]).length > 0);
        const untested = run([...good(), story("data--i", "Data/Formats", "I", ["internal"])]);
        assert.ok(untested.some((p) => p.includes('keep the "test" tag')));
    });

    it("fails an auto-split name", () => {
        const problems = run([...good(), story("data--csv-neo-4-j", "Data/Formats", "Csv Neo 4 J")]);
        assert.ok(problems.some((p) => p.includes("looks split")));
    });

    it("fails Default or Playground out of place", () => {
        const list = good();
        [list[2], list[3]] = [list[3], list[2]];
        const problems = run(list);
        assert.ok(problems.some((p) => p.includes("Default must be the first")));
        assert.ok(problems.some((p) => p.includes("Playground must come right after Default")));
    });

    it("fails a baselined id missing from the build, unless renamed to one that is there", () => {
        assert.ok(run(good(), { baselineIds: ["data--gone"] }).some((p) => p.includes("data--gone: has a baseline")));
        const renames = [{ from: "data--gone", to: "data--graph-ml" }];
        assert.deepEqual(run(good(), { baselineIds: ["data--gone", "data--pin"], renames }), []);
    });

    it("counts accessibility violations of the stories in the build against the budget", () => {
        const reports = [
            { id: "data--default", a11yViolations: 2 },
            { id: "data--graph-ml", a11yViolations: 1 },
            { id: "deleted--story", a11yViolations: 9 },
        ];
        assert.ok(run(good(), { reports }).some((p) => p.includes("3 violations, over the budget of 2")));
        assert.deepEqual(run(good(), { reports: reports.slice(0, 1) }), []);
    });

    it("fails a Storybook no CI shard tests", () => {
        assert.ok(run(good(), { shards: [] }).some((p) => p.includes("no CI shard")));
        assert.ok(run(good(), { shards: [{ shard: "demo-storybook", package: "other" }] }).length > 0);
    });
});

describe("the command", () => {
    const root = mkdtempSync(join(tmpdir(), "check-storybooks-"));
    const cli = (...args) => spawnSync(process.execPath, [TOOL, "--root", root, ...args], { encoding: "utf8" });

    it("fails with 'no build' when the index is missing, even when only reporting", () => {
        const result = cli("--report-only", "layout");
        assert.equal(result.status, 1);
        assert.match(result.stdout, /no build/);
    });

    it("reports problems without failing under --report-only, and fails on them otherwise", () => {
        mkdirSync(join(root, "layout", "storybook-static"), { recursive: true });
        const entries = { "misc--a": story("misc--a", "Misc/A", "A") };
        writeFileSync(join(root, "layout", "storybook-static", "index.json"), JSON.stringify({ v: 5, entries }));
        const reported = cli("--report-only", "layout");
        assert.equal(reported.status, 0);
        assert.match(reported.stdout, /section "Misc" is not in/);
        assert.equal(cli("layout").status, 1);
    });

    it("checks every package when none is named, and every captured Storybook is in the taxonomy", () => {
        writeFileSync(join(root, "visual-review.config.json"), JSON.stringify({ projects: { layout: {}, zzz: {} } }));
        const result = cli("--report-only");
        assert.match(result.stdout, /zzz has a Storybook \(visual-review.config.json\) and is not in/);
        assert.match(result.stdout, /check-storybooks graphty-element: no build/);
    });

    it("reads baseline ids before the first dot, and the rename records", () => {
        const dir = join(root, "visual-baselines", "layout");
        mkdirSync(dir, { recursive: true });
        for (const f of ["a--b.png", "a--b.dark.png", "c--d.png", "c--d.json"]) writeFileSync(join(dir, f), "");
        writeFileSync(join(dir, "renames.json"), JSON.stringify([{ from: "x", to: "y" }]));
        const { ids, renames } = readBaselines(dir);
        assert.deepEqual(ids.sort(), ["a--b", "c--d"]);
        assert.deepEqual(renames, [{ from: "x", to: "y" }]);
        rmSync(root, { recursive: true, force: true });
    });
});
