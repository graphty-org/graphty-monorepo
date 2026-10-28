// Tests of tools/check-committed-images.mjs: a push that adds a pile of images outside the folders that
// legitimately hold them fails, a few mockups and visual baselines pass, and the Images-Approved trailer
// overrides, on HEAD or on the commit that adds them (through a landing's merge commit).
//
//   node --test tools/check-committed-images.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";

import { addedImages, verdict } from "./check-committed-images.mjs";
import { isolatedGitEnv } from "./isolated-git-env.mjs";

const TMP = mkdtempSync(join(tmpdir(), "check-committed-images-"));
after(() => rmSync(TMP, { recursive: true, force: true }));
const SCRIPT = new URL("./check-committed-images.mjs", import.meta.url).pathname;
const env = isolatedGitEnv();
let n = 0;

// A repository with one commit on branch `base`, checked out on `work`.
function repo() {
    const dir = join(TMP, `r${n++}`);
    mkdirSync(dir);
    const git = (...args) => execFileSync("git", args, { cwd: dir, env, encoding: "utf8" });
    git("init", "-q", "-b", "base");
    writeFileSync(join(dir, "README.md"), "x\n");
    git("add", ".");
    git("commit", "-qm", "init");
    git("checkout", "-qb", "work");
    const add = (paths, content = "PNG") => {
        for (const p of paths) {
            mkdirSync(join(dir, dirname(p)), { recursive: true });
            writeFileSync(join(dir, p), content);
        }
        git("add", ".");
    };
    const commit = (msg) => git("commit", "-qm", msg);
    const base = git("rev-parse", "base").trim();
    return { dir, git, add, commit, check: () => verdict(addedImages({ cwd: dir, base, env })) };
}
const many = (prefix, count) => Array.from({ length: count }, (_, i) => `${prefix}/walk-${i}.png`);

describe("check-committed-images", () => {
    it("fails a push adding 100 PNGs under design/ui/studio, naming the folder and tmp/design-studio", () => {
        const r = repo();
        r.add(many("design/ui/studio/tier3/walks", 100));
        r.commit("docs: walks");
        const v = r.check();
        assert.equal(v.ok, false);
        const text = v.lines.join("\n");
        assert.match(text, /100 images/);
        assert.match(text, /design\/ui\/studio\/tier3\/walks\//);
        assert.match(text, /tmp\/design-studio\//);
        assert.match(text, /Images-Approved/);
    });

    it("passes 5 mockup thumbnails under design/", () => {
        const r = repo();
        r.add(many("design/ui/mockups", 5));
        r.commit("docs: mockups");
        assert.equal(r.check().ok, true);
    });

    it("fails a few images over 20 MB, counting an LFS pointer as the size it points at", () => {
        const r = repo();
        const pointer = "version https://git-lfs.github.com/spec/v1\noid sha256:" + "a".repeat(64) + "\nsize 9000000\n";
        r.add(many("design/big", 3), pointer);
        r.commit("docs: big");
        const v = r.check();
        assert.equal(v.ok, false);
        assert.match(v.lines[0], /3 images \(25\.7 MB\)/);
    });

    it("passes visual-baselines and other allowed folders, however many", () => {
        const r = repo();
        r.add([...many("visual-baselines/graphty", 100), ...many("graph-io/test/fidelity/x", 50)]);
        r.commit("test: baselines");
        assert.equal(r.check().ok, true);
    });

    it("does not count images the base already has", () => {
        const r = repo();
        r.add(many("design/ui/studio/old", 100));
        r.commit("old");
        r.git("branch", "-f", "base", "HEAD");
        const v = verdict(addedImages({ cwd: r.dir, base: r.git("rev-parse", "base").trim(), env }));
        assert.equal(v.ok, true);
    });

    it("lets an Images-Approved trailer on HEAD override", () => {
        const r = repo();
        r.add(many("design/ui/studio/walks", 100));
        r.commit("docs: walks\n\nImages-Approved: owner asked for these walks");
        const v = r.check();
        assert.equal(v.ok, true);
        assert.match(v.lines[0], /owner asked for these walks/);
    });

    it("lets the trailer on the commit that adds them override through a merge commit", () => {
        const r = repo();
        r.add(many("design/ui/mockups", 30));
        r.commit("docs: mockups\n\nImages-Approved: brand mockups");
        r.git("checkout", "-qb", "golden", "base");
        r.git("merge", "-q", "--no-ff", "-m", "land: work", "work");
        assert.equal(r.check().ok, true);
        // The approval covers only that commit's images.
        r.add(many("design/ui/studio/walks", 30));
        r.commit("docs: walks");
        const v = r.check();
        assert.equal(v.ok, false);
        assert.match(v.lines[0], /30 images/);
    });

    it("runs as a command against the push base", () => {
        const r = repo();
        r.add(many("design/ui/studio/walks", 21));
        r.commit("docs: walks");
        const res = spawnSync("node", [SCRIPT], {
            cwd: r.dir,
            env: { ...env, PUSH_BASE_REF: "base" },
            encoding: "utf8",
        });
        assert.equal(res.status, 1, res.stdout + res.stderr);
        assert.match(res.stderr, /21 images/);
    });
});
