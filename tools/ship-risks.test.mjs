// Tests of tools/ship-risks.mjs on a throwaway repository with master, a cut and golden.
//
//   node tools/ship-risks.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, before, describe, it } from "node:test";

import { isolatedGitEnv } from "./isolated-git-env.mjs";
import { localBaselines, missingLandings, riskLines } from "./ship-risks.mjs";

const dir = mkdtempSync(join(tmpdir(), "ship-risks-"));
// The module runs git with the process's environment; keep it off the developer's config and hooks.
process.env = isolatedGitEnv();
after(() => rmSync(dir, { recursive: true, force: true }));

const git = (...args) => {
    const r = spawnSync("git", args, { cwd: dir, encoding: "utf8" });
    assert.equal(r.status, 0, `git ${args.join(" ")}: ${r.stderr}`);
    return r.stdout.trim();
};
const commit = (files, message) => {
    for (const [f, text] of Object.entries(files)) {
        mkdirSync(dirname(join(dir, f)), { recursive: true });
        writeFileSync(join(dir, f), text);
    }
    git("add", ".");
    git("commit", "-q", "-m", message);
    return git("rev-parse", "HEAD");
};
const record = (items, local) =>
    JSON.stringify({
        subject: { runId: local.length ? null : 1, local: local.map((project) => ({ project })) },
        items,
    });
// A "land: <branch>" merge of one commit on `branch` into the checked-out branch.
const land = (branch, files) => {
    const from = git("rev-parse", "--abbrev-ref", "HEAD");
    git("switch", "-q", "-c", branch);
    commit(files, `work on ${branch}`);
    git("switch", "-q", from);
    git("merge", "-q", "--no-ff", "-m", `land: ${branch}`, branch);
    return git("rev-parse", "HEAD");
};

const A = "visual-baselines/graphty/a.png";
const B = "visual-baselines/graphty/b.png";
const C = "visual-baselines/graphty-element/c.png";
const refs = { cut: "cut", golden: "golden", master: "master" };

describe("ship-risks", () => {
    let story;
    before(() => {
        git("init", "-q", "-b", "master");
        commit(
            { "README.md": "x", [A]: "a0", [B]: "b0", [C]: "c0", "lib/shared.ts": "0", "lib/other.ts": "0" },
            "init",
        );
        git("switch", "-q", "-c", "golden");
        land("one", {
            [A]: "a1",
            [B]: "b1",
            [C]: "c1",
            "lib/shared.ts": "1",
            // a is local, then confirmed by a later CI record; b is local only; c is from CI.
            "visual-baselines/reviews/20261001T000000Z-pr1.json": record([{ path: A }, { path: B }], ["graphty"]),
            "visual-baselines/reviews/20261002T000000Z-pr1.json": record([{ path: A }, { path: C }], []),
        });
        git("branch", "cut");
        story = land("story-fix", { "graphty/src/x/Canvas.stories.tsx": "s" });
        land("unrelated", { "lib/other.ts": "1" });
        land("shared", { "lib/shared.ts": "2" });
        land("camera", { "graphty-element/src/cameras/Fit.ts": "c" });
    });

    it("lists the cut's baselines whose newest record is a local capture", () => {
        assert.deepEqual(localBaselines(dir, "cut", "master"), [
            { path: B, record: "visual-baselines/reviews/20261001T000000Z-pr1.json" },
        ]);
    });

    it("lists golden's landings the cut lacks that touch its files, stories or camera code", () => {
        const found = missingLandings(dir, "cut", "golden", "master");
        assert.deepEqual(
            found.map((l) => [l.branch, l.files]),
            [
                ["story-fix", ["graphty/src/x/Canvas.stories.tsx"]],
                ["shared", ["lib/shared.ts"]],
                ["camera", ["graphty-element/src/cameras/Fit.ts"]],
            ],
        );
        assert.equal(found[0].sha, story);
        const lines = riskLines(dir, refs).join("\n");
        assert.match(lines, /1 screenshot baselines accepted from a local capture/);
        assert.match(lines, new RegExp(`${story.slice(0, 10)} story-fix: graphty/src/x/Canvas.stories.tsx`));
    });

    it("says there are no known risks when there are none", () => {
        assert.deepEqual(localBaselines(dir, "golden", "golden"), []);
        assert.deepEqual(missingLandings(dir, "golden", "golden", "master"), []);
        assert.match(riskLines(dir, { cut: "golden", golden: "golden", master: "golden" })[0], /no known risks/);
    });
});
