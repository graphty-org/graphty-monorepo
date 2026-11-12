// Tests of tools/lint-base-drift.mjs (#2985): a throwaway repository where master adds a lint rule
// after the branch was cut, and the branch adds code that rule rejects. The gate must refuse the
// push until the branch merges master, because CI lints the merge and the branch alone has no rule.
//
//   node --test tools/lint-base-drift.test.mjs
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { isolatedGitEnv } from "./isolated-git-env.mjs";
import { lintBaseDrift } from "./lint-base-drift.mjs";

const CLI = join(dirname(fileURLToPath(import.meta.url)), "lint-base-drift.mjs");
const scratch = mkdtempSync(join(tmpdir(), "lint-base-drift-test-"));
after(() => rmSync(scratch, { recursive: true, force: true }));

// master (config without the rule) -> feat (adds a waitFor with no options); master then gains
// `masterExtra` on top of the cut point.
function repo(masterExtra) {
    const dir = mkdtempSync(join(scratch, "repo-"));
    const env = isolatedGitEnv();
    const git = (...args) => execFileSync("git", args, { cwd: dir, env, encoding: "utf8" }).trim();
    const commit = (files, msg) => {
        for (const [p, text] of Object.entries(files)) {
            mkdirSync(dirname(join(dir, p)), { recursive: true });
            writeFileSync(join(dir, p), text);
        }
        git("add", ".");
        git("commit", "-q", "-m", msg);
    };
    git("init", "-q", "-b", "master");
    commit({ "eslint.config.js": "export default [];\n", "src/a.ts": "export const a = 1;\n" }, "base");
    git("switch", "-q", "-c", "feat");
    commit({ "src/story.ts": "await waitFor(() => ready());\n" }, "story without wait options");
    git("switch", "-q", "master");
    commit(masterExtra, "master moves on");
    git("update-ref", "refs/remotes/origin/master", "master");
    git("switch", "-q", "feat");
    const cli = () => spawnSync(process.execPath, [CLI, "origin/master"], { cwd: dir, env, encoding: "utf8" });
    return { dir, env, git, cli };
}

const RULE = {
    "tools/eslint-rules/story-wait-options.mjs": "export default { create: () => ({}) };\n",
    "eslint.config.js": 'import r from "./tools/eslint-rules/story-wait-options.mjs";\nexport default [r];\n',
};

describe("lint-base-drift", () => {
    it("master added a lint rule after the branch was cut: the push is refused with merge advice", () => {
        const r = repo(RULE);
        assert.deepEqual(lintBaseDrift(r.dir, "origin/master", r.env).sort(), Object.keys(RULE).sort());
        const run = r.cli();
        assert.equal(run.status, 1);
        assert.match(run.stderr, /tools\/eslint-rules\/story-wait-options\.mjs/);
        assert.match(run.stderr, /Merge origin\/master first/);
    });

    it("after the branch merges master, the push goes ahead", () => {
        const r = repo(RULE);
        r.git("merge", "-q", "--no-edit", "origin/master");
        assert.deepEqual(lintBaseDrift(r.dir, "origin/master", r.env), []);
        assert.equal(r.cli().status, 0);
    });

    it("a source-only change on master passes; a package's lint config on master refuses", () => {
        const src = repo({ "src/a.ts": "export const a = 2;\n" });
        assert.equal(src.cli().status, 0);
        const pkg = repo({ "graphty/eslint.config.js": "export default [];\n", "layout/tsconfig.eslint.json": "{}\n" });
        assert.deepEqual(lintBaseDrift(pkg.dir, "origin/master", pkg.env).sort(), [
            "graphty/eslint.config.js",
            "layout/tsconfig.eslint.json",
        ]);
    });

    it("an unknown base is a clear refusal, not a crash", () => {
        const r = repo(RULE);
        const run = spawnSync(process.execPath, [CLI, "origin/nope"], { cwd: r.dir, env: r.env, encoding: "utf8" });
        assert.equal(run.status, 1);
        assert.match(run.stderr, /Could not compare this branch's lint configuration with origin\/nope/);
    });
});
