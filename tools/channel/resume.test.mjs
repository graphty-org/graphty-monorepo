// Tests of the promotion after the owner's screenshot approval (resume.mjs).
// Run: node tools/channel/resume.test.mjs
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { isolateGit, isolatedGitEnv } from "../isolated-git-env.mjs";
import { acceptsIn, resumeDecision } from "./resume.mjs";

isolateGit();

const H = "a".repeat(40);
const A = "b".repeat(40);
const subject = (sha) => `test(workspace): approve visual baselines at ${sha.slice(0, 12)}`;

describe("acceptsIn", () => {
    it("finds an accept commit by its subject and its one parent, the candidate it names", () => {
        const commits = [
            { sha: A, parents: [H], subject: subject(H) },
            { sha: "c".repeat(40), parents: ["d".repeat(40)], subject: subject(H) }, // names H, parented elsewhere
            { sha: "e".repeat(40), parents: [H, "f".repeat(40)], subject: subject(H) }, // a merge
            { sha: "1".repeat(40), parents: [H], subject: "feat(x): something else" },
        ];
        assert.deepEqual(acceptsIn(commits), [{ accept: A, candidate: H }]);
    });
});

describe("resumeDecision", () => {
    const ok = {
        candidate: H,
        accept: A,
        hold: { head: H, issue: 7 },
        latest: { state: "green-images" },
    };

    it("promotes the held head's approval once its latest verdict is green-images", () => {
        assert.equal(resumeDecision(ok).run, true);
        // with no hold recorded (a candidate judged before holds existed), the verdict alone decides
        assert.equal(resumeDecision({ ...ok, hold: null }).run, true);
    });

    it("does nothing a second time: nightly holds the accept already, and the hold issue is not told", () => {
        const d = resumeDecision({ ...ok, promoted: true });
        assert.deepEqual([d.run, d.comment], [false, null]);
        // an earlier resume recorded approved: the verdict is no longer green-images
        assert.equal(resumeDecision({ ...ok, latest: { state: "approved" } }).run, false);
    });

    it("never promotes an older candidate: not the held head, or behind nightly; the hold issue is told", () => {
        const stale = resumeDecision({ ...ok, hold: { head: "9".repeat(40), issue: 7 } });
        assert.deepEqual([stale.run, stale.comment], [false, 7]);
        assert.match(stale.why, /an older head/);
        const behind = resumeDecision({ ...ok, older: true });
        assert.deepEqual([behind.run, behind.comment], [false, 7]);
    });

    it("refuses a red run, an approval that is more than accept-only commits on the candidate, and one not merged", () => {
        assert.equal(resumeDecision({ ...ok, latest: { state: "red" } }).run, false);
        assert.equal(resumeDecision({ ...ok, latest: null }).run, false);
        assert.equal(resumeDecision({ ...ok, acceptOnly: false }).run, false);
        assert.equal(resumeDecision({ ...ok, onMaster: false }).run, false);
    });
});

describe("resume.mjs check, on a real repository and a stand-in store", () => {
    // master: base -> H -> newer -> merge of the approval P (the accept A on H, then the signed approval record);
    // channel/nightly at base
    function repo({ extra } = {}) {
        const dir = mkdtempSync(join(tmpdir(), "resume-"));
        const git = (...a) =>
            execFileSync("git", a, {
                cwd: dir,
                encoding: "utf8",
            }).trim();
        git("init", "-q", "-b", "master");
        git("commit", "-q", "--allow-empty", "-m", "base");
        const base = git("rev-parse", "HEAD");
        git("commit", "-q", "--allow-empty", "-m", "the candidate");
        const h = git("rev-parse", "HEAD");
        git("switch", "-q", "-c", "accept");
        mkdirSync(join(dir, "visual-baselines"));
        writeFileSync(join(dir, "visual-baselines", "a.png"), "png\n");
        git("add", ".");
        git("commit", "-q", "-m", subject(h));
        const a = git("rev-parse", "HEAD");
        mkdirSync(join(dir, "visual-review-approvals"));
        writeFileSync(join(dir, "visual-review-approvals", "tree.json"), "{}\n");
        if (extra) writeFileSync(join(dir, "code.js"), "1\n");
        git("add", ".");
        git("commit", "-q", "-m", "test(workspace): approve the visual baselines of the candidate");
        const p = git("rev-parse", "HEAD");
        git("switch", "-q", "master");
        git("commit", "-q", "--allow-empty", "-m", "newer master");
        git("merge", "-q", "--no-ff", "-m", "Merge the accept", "accept");
        git("update-ref", "refs/remotes/origin/channel/nightly", base);
        return { dir, h, a, p, git };
    }

    async function check(env, store) {
        const server = createServer((req, res) => {
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify(store));
        });
        await new Promise((r) => server.listen(0, "127.0.0.1", r));
        const out = join(mkdtempSync(join(tmpdir(), "resume-out-")), "output");
        writeFileSync(out, "");
        const script = new URL("./resume.mjs", import.meta.url).pathname;
        // async spawn: the stand-in store answers from this process's event loop
        const code = await new Promise((resolve) => {
            const child = spawn(process.execPath, [script, "check"], {
                cwd: env.cwd,
                stdio: "ignore",
                env: {
                    ...isolatedGitEnv({ PATH: process.env.PATH, HOME: process.env.HOME }),
                    RESULTS_URL: `http://127.0.0.1:${server.address().port}`,
                    GRAPHTY_RESULTS_TOKEN: "t",
                    GITHUB_OUTPUT: out,
                    ...env,
                },
            });
            child.on("exit", resolve);
        });
        server.close();
        return {
            code,
            out: Object.fromEntries(
                readFileSync(out, "utf8")
                    .trim()
                    .split("\n")
                    .map((l) => l.split(/=(.*)/s).slice(0, 2)),
            ),
        };
    }

    it("a full slot catches up on the held head's merged approval and names the run that judged it", async () => {
        const { dir, h, p } = repo();
        const store = { hold: { head: h, issue: null }, recent: [{ sha: h, state: "green-images", runId: 42 }] };
        const { code, out } = await check({ cwd: dir, MODE: "full" }, store);
        assert.equal(code, 0);
        // the approval pull request's head, which holds the signed approval the screenshot gate needs
        assert.deepEqual([out.resume, out.sha, out.tested, out.held, out.source_run], ["true", p, h, h, "42"]);
    });

    it("promote-nightly refuses an approval that brings anything but baselines and approvals", async () => {
        const { dir, h, p } = repo({ extra: true });
        const store = { hold: null, recent: [{ sha: h, state: "green-images", runId: 42 }] };
        const { code, out } = await check({ cwd: dir, MODE: "promote-nightly", CANDIDATE: h, ACCEPT: p }, store);
        assert.equal(code, 0);
        assert.equal(out.resume, "false");
        assert.match(out.why, /accept-only/);
    });

    it("a full slot does not catch up while a publish hold is open, or with nothing held", async () => {
        const { dir, h } = repo();
        const store = { hold: { head: h, issue: null }, recent: [{ sha: h, state: "green-images", runId: 42 }] };
        assert.equal((await check({ cwd: dir, MODE: "full", PUBLISH_HOLD: "9" }, store)).out.resume, "false");
        assert.equal((await check({ cwd: dir, MODE: "full" }, { ...store, hold: null })).out.resume, "false");
    });

    it("a full slot's catch-up that errors (git, a GitHub 5xx) tests as it would have", async () => {
        const dir = mkdtempSync(join(tmpdir(), "resume-nogit-"));
        const store = { hold: { head: "a".repeat(40), issue: null }, recent: [] };
        const full = await check({ cwd: dir, MODE: "full" }, store);
        assert.deepEqual([full.code, full.out.resume], [0, "false"]);
        assert.match(full.out.why, /^no catch-up: /);
    });

    it("promote-nightly promotes the approval once, and does nothing once nightly holds it", async () => {
        const { dir, h, p, git } = repo();
        const store = { hold: null, recent: [{ sha: h, state: "green-images", runId: 42 }] };
        const first = await check({ cwd: dir, MODE: "promote-nightly", CANDIDATE: h, ACCEPT: p }, store);
        assert.deepEqual([first.code, first.out.resume, first.out.sha], [0, "true", p]);
        git("update-ref", "refs/remotes/origin/channel/nightly", "master");
        const { code, out } = await check({ cwd: dir, MODE: "promote-nightly", CANDIDATE: h, ACCEPT: p }, store);
        assert.equal(code, 0);
        assert.equal(out.resume, "false");
        assert.match(out.why, /promoted/);
    });
});
