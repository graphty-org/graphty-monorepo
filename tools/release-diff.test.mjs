// Tests of tools/release-diff.mjs over master's real history: two real release pairs (the commit before a
// release and the release merge onto master) change only versions and changelogs, a real version commit
// passes, a real accept merge passes only with --accept-merges, and real code merges never pass.
//
//   node tools/release-diff.test.mjs   (part of pnpm run test:ci-workflows; needs full history, fetch-depth 0)
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { diffCommits } from "./release-diff.mjs";

// Real commits on master's first-parent history.
const REAL = {
    // Release of 2026-10-21 (13 packages): master before it, the version commit, the merge onto master.
    before1021: "909fda2c702c9d802d24ce9dcc21fb8dbf6d2530",
    version1021: "c7e343d3f7345adf61ae3eb312da52b817a61bb2",
    release1021: "cd99c55f2618c2c8e828b858d01bbc9c250f54bc",
    // Release of 2026-10-19 (4 packages): master before it and the merge onto master.
    before1019: "627c2df1b622c3e99318cf7fdc9caad97bcafafe",
    release1019: "dfff3b7a3e43a2bc3afc317372c006417c68d864",
    // The merge of pull request #2640 and its first parent: it brought only a visual-baselines review record.
    acceptBase: "ff2d993297d7c7649f783131f220eb1858c2d2fd",
    accept: "81c35a8fb24b221b182bb96b05d312f41bfa90ff",
    // The first parent of the golden-cut merge of pull request #3238, which brought 697 files of code.
    codeBase: "56bf7ad9d63604163a3586bd539c8ce86549e4e2",
};

describe("release-diff on real release pairs", () => {
    it("the 13-package release merge of 2026-10-21 changes only versions and changelogs", () => {
        const { files, stray } = diffCommits(REAL.before1021, REAL.release1021);
        assert.deepEqual(stray, []);
        assert.equal(files.length, 26);
    });

    it("the 4-package release merge of 2026-10-19 changes only versions and changelogs", () => {
        const { files, stray } = diffCommits(REAL.before1019, REAL.release1019);
        assert.deepEqual(stray, []);
        assert.equal(files.length, 8);
    });

    it("the version commit of 2026-10-21 passes the version job's check", () => {
        assert.deepEqual(diffCommits(`${REAL.version1021}^`, REAL.version1021).stray, []);
    });

    it("an accept merge passes only with --accept-merges", () => {
        assert.deepEqual(diffCommits(REAL.acceptBase, REAL.accept, { acceptMerges: true }).stray, []);
        const { stray } = diffCommits(REAL.acceptBase, REAL.accept);
        assert.equal(stray.length, 1);
        assert.match(stray[0], /^visual-baselines\/reviews\/.*: not a package.json or a CHANGELOG.md$/);
    });

    it("a code merge never passes, alone or followed by a release merge", () => {
        for (const to of [REAL.before1021, REAL.release1021]) {
            const { stray } = diffCommits(REAL.codeBase, to, { acceptMerges: true });
            assert.ok(stray.some((m) => /\.ts: not a package.json/.test(m)));
        }
    });

    it("the range between the two releases, which holds code, does not pass", () => {
        assert.notDeepEqual(diffCommits(REAL.release1019, REAL.before1021, { acceptMerges: true }).stray, []);
    });
});
