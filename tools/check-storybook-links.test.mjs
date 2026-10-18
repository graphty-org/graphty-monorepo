// Tests of tools/check-storybook-links.mjs, run in a throwaway repository with a fake built site.
//
//   node tools/check-storybook-links.test.mjs
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { isolatedGitEnv } from "./isolated-git-env.mjs";

const TOOL = join(dirname(fileURLToPath(import.meta.url)), "check-storybook-links.mjs");
const env = isolatedGitEnv();
const repo = mkdtempSync(join(tmpdir(), "storybook-links-"));
const site = join(repo, "site");
after(() => rmSync(repo, { recursive: true, force: true }));

function check(readme) {
    writeFileSync(join(repo, "README.md"), readme);
    execFileSync("git", ["add", "README.md"], { cwd: repo, env });
    return spawnSync(process.execPath, [TOOL, site], { cwd: repo, env, encoding: "utf8" });
}

describe("check-storybook-links", () => {
    execFileSync("git", ["init", "-q"], { cwd: repo, env });
    mkdirSync(join(site, "storybook", "layout"), { recursive: true });
    const entries = {
        "a--shown": { type: "story", id: "a--shown", tags: ["dev", "test"] },
        "a--hidden": { type: "story", id: "a--hidden", tags: ["test", "regression"] },
        "a--docs": { type: "docs", id: "a--docs", tags: ["dev"] },
    };
    writeFileSync(join(site, "storybook", "layout", "index.json"), JSON.stringify({ v: 5, entries }));
    const url = (path) => `https://graphty.app/storybook/layout/?path=/${path}`;

    it("passes links to a visible story and to a docs page", () => {
        const result = check(`${url("story/a--shown")}\n${url("docs/a--docs")}\n`);
        assert.equal(result.status, 0, result.stdout);
    });

    it("fails a link to a story that does not exist", () => {
        const result = check(`${url("story/a--gone")}\n`);
        assert.equal(result.status, 1);
        assert.match(result.stdout, /has no story "a--gone"/);
    });

    it("fails a link to a hidden story", () => {
        const result = check(`${url("story/a--hidden")}\n`);
        assert.equal(result.status, 1);
        assert.match(result.stdout, /links to a hidden story/);
    });
});
