// Tests of the fix forward into the held nightly candidate (candidate-fix.mjs).
// Run: node tools/channel/candidate-fix.test.mjs
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { isolateGit, isolatedGitEnv } from "../isolated-git-env.mjs";
import { fixCommit, planOf, referencesHold, REFUSED, visualProjects } from "./candidate-fix.mjs";

isolateGit();

describe("referencesHold", () => {
    it("is a fix when its branch is named for the hold issue or a commit references it", () => {
        const s = (b) => `Merge pull request #12 from graphty-org/${b}`;
        assert.equal(referencesHold({ subject: s("fix/900-topic") }, 900), true);
        assert.equal(referencesHold({ subject: s("fix/9001-topic") }, 900), false);
        assert.equal(referencesHold({ subject: s("feat/950-topic"), messages: "x\n\nRefs #900\n" }, 900), true);
        assert.equal(referencesHold({ subject: s("feat/950-topic"), messages: "Refs #9000" }, 900), false);
        assert.equal(referencesHold({ subject: s("fix/900-topic") }, null), false);
    });
});

describe("fixCommit", () => {
    // the head lacks: f1 (the fix), m (pr-open's merge of master: f1 plus master commits n1, n2)
    const ranges = { f1: ["f1"], m: ["m", "f1", "n1", "n2"], f2: ["f2", "m", "f1", "n1", "n2"] };
    const rangeOf = (s) => ranges[s] ?? [];

    it("takes the newest commit whose history past the head is the pull request's own", () => {
        const d = fixCommit({ commits: [{ sha: "f1" }, { sha: "m", merge: true }], rangeOf });
        assert.deepEqual(d, { f: "f1" });
    });

    it("refuses a branch made from newer master, and a fix commit made on top of the master merge", () => {
        const newer = fixCommit({ commits: [{ sha: "x" }], rangeOf: () => ["x", "n1"] });
        assert.match(newer.refuse, /without a copy/);
        const later = fixCommit({ commits: [{ sha: "f1" }, { sha: "m", merge: true }, { sha: "f2" }], rangeOf });
        assert.match(later.refuse, /only part of the fix/);
    });

    it("is done when the head holds the fix already", () => {
        assert.deepEqual(fixCommit({ commits: [{ sha: "f1" }], rangeOf: () => [] }), { done: true });
    });
});

describe("planOf", () => {
    const visual = { graphty: "graphty", "graphty-element": "graphty-element", "graph-io-fidelity": "graph-io" };
    const shards = (affected) => affected.map((p) => `${p}-shard`);
    const prior = { state: "green-images", lane: null, runId: 42 };

    it("re-tests only what the fixes affect, carrying the other captures over from the run before", () => {
        const p = planOf({ prior, affected: ["graph-io"], shards, visual });
        assert.deepEqual(p, {
            shards: '["graph-io-shard"]',
            hosts: false,
            macos: false,
            capture: ["graph-io-fidelity"],
            sourceRun: "42",
        });
    });

    it("runs Hosts and macOS when their packages or the lockfile changed, or when they were red", () => {
        assert.equal(planOf({ prior, affected: ["graph-format"], shards, visual }).hosts, true);
        assert.equal(planOf({ prior, affected: ["graphty-element"], shards, visual }).macos, true);
        const lock = planOf({ prior, affected: ["*lockfile*"], shards, visual });
        assert.deepEqual([lock.hosts, lock.macos, lock.capture.length], [true, true, 3]);
        const red = planOf({
            prior: { ...prior, state: "red", lane: "hosts,autosave_macos" },
            affected: [],
            shards,
            visual,
        });
        assert.deepEqual([red.hosts, red.macos, red.shards], [true, true, '["graph-format"]']);
    });

    it("re-runs everything after a red CI lane or capture, or with no earlier run", () => {
        for (const p of [
            planOf({ prior: { ...prior, state: "red", lane: "ci" }, affected: [], shards, visual }),
            planOf({ prior: { ...prior, state: "red", lane: "captures" }, affected: [], shards, visual }),
            planOf({ prior: null, affected: ["graph-io"], shards, visual }),
        ])
            assert.deepEqual(p, { shards: "", hosts: true, macos: true, capture: [], sourceRun: "" });
    });
});

describe("visualProjects", () => {
    it("maps each Storybook to the nx project that builds it", () => {
        const cfg = JSON.parse(readFileSync(new URL("../../visual-review.config.json", import.meta.url), "utf8"));
        const v = visualProjects(cfg);
        assert.equal(v["graph-io-fidelity"], "graph-io");
        assert.equal(v["graphty-element"], "graphty-element");
    });
});

describe("candidate-fix.mjs advance, on real repositories, a stand-in store and a stand-in gh", () => {
    function repos() {
        const root = mkdtempSync(join(tmpdir(), "candidate-fix-"));
        const origin = join(root, "origin.git");
        const dir = join(root, "work");
        const env = isolatedGitEnv({ PATH: process.env.PATH, HOME: process.env.HOME });
        const run = (cwd, ...a) => execFileSync("git", a, { cwd, encoding: "utf8", env }).trim();
        run(root, "init", "-q", "--bare", "-b", "master", origin);
        run(root, "clone", "-q", origin, dir);
        const git = (...a) => run(dir, ...a);
        const commit = (file) => {
            writeFileSync(join(dir, file), `${file}\n`);
            git("add", file);
            git("commit", "-q", "-m", `change ${file}`);
            return git("rev-parse", "HEAD");
        };
        const pr = (n, branch) =>
            git("merge", "-q", "--no-ff", "-m", `Merge pull request #${n} from graphty-org/${branch}`, branch);
        const c = commit("base.txt");
        commit("newer-master.txt");
        // #11: a fix from the candidate, with pr-open.sh's merge of master on top
        git("switch", "-q", "-c", "fix/900-one", c);
        const one = commit("one.txt");
        git("merge", "-q", "--no-edit", "master");
        git("switch", "-q", "master");
        pr(11, "fix/900-one");
        // #12: a "fix" made from newer master
        git("switch", "-q", "-c", "fix/900-bad", "master");
        commit("bad.txt");
        git("switch", "-q", "master");
        const bad = (pr(12, "fix/900-bad"), git("rev-parse", "HEAD"));
        // #13: an ordinary pull request
        git("switch", "-q", "-c", "feat/950-other", "master");
        commit("other.txt");
        git("switch", "-q", "master");
        pr(13, "feat/950-other");
        // #14: a second fix from the candidate, made beside #11
        git("switch", "-q", "-c", "fix/900-two", c);
        const two = commit("two.txt");
        git("switch", "-q", "master");
        pr(14, "fix/900-two");
        git("push", "-q", "origin", "master");
        return { dir, origin, git, run, c, one, two, bad, root };
    }

    async function advance({ dir, root }, hold, said = "", extra = {}) {
        const posts = [];
        const server = createServer((req, res) => {
            let body = "";
            req.on("data", (d) => (body += d));
            req.on("end", () => {
                if (req.method === "POST") posts.push(JSON.parse(body));
                res.setHeader("content-type", "application/json");
                res.end(JSON.stringify(req.method === "POST" ? { held: true } : { hold, recent: [] }));
            });
        });
        await new Promise((r) => server.listen(0, "127.0.0.1", r));
        const bin = join(root, "bin");
        mkdirSync(bin, { recursive: true });
        const log = join(root, "gh.log");
        writeFileSync(join(root, "said"), said);
        writeFileSync(
            join(bin, "gh"),
            `#!/bin/sh\nif [ "$1" = api ]; then cat "${join(root, "said")}"; exit 0; fi\n` +
                `echo "$@" >> "${log}"\nwhile [ $# -gt 0 ]; do [ "$1" = --body-file ] && cat "$2" >> "${log}"; shift; done\n`,
        );
        chmodSync(join(bin, "gh"), 0o755);
        writeFileSync(log, "");
        const out = join(root, "output");
        writeFileSync(out, "");
        const script = new URL("./candidate-fix.mjs", import.meta.url).pathname;
        const code = await new Promise((resolve) => {
            const child = spawn(process.execPath, [script, "advance"], {
                cwd: dir,
                stdio: "ignore",
                env: {
                    ...isolatedGitEnv({ PATH: `${bin}:${process.env.PATH}`, HOME: process.env.HOME }),
                    RESULTS_URL: `http://127.0.0.1:${server.address().port}`,
                    GRAPHTY_RESULTS_TOKEN: "t",
                    GITHUB_OUTPUT: out,
                    ...extra,
                },
            });
            child.on("exit", resolve);
        });
        server.close();
        const fields = Object.fromEntries(
            readFileSync(out, "utf8")
                .trim()
                .split("\n")
                .map((l) => l.split(/=(.*)/s).slice(0, 2)),
        );
        return { code, out: fields, posts, gh: readFileSync(log, "utf8") };
    }

    it("merges each fix from the candidate, never master, refuses the one made from newer master, and pushes", async () => {
        const r = repos();
        const { code, out, posts, gh } = await advance(r, { base: r.c, head: r.c, issue: 900 });
        assert.equal(code, 0);
        assert.equal(out.moved, "true");
        const head = out.head;
        // both fixes, merged; nothing from master past the candidate
        assert.deepEqual(r.git("rev-parse", `${head}^1`, `${head}^2`).split("\n"), [r.one, r.two]);
        assert.equal(r.git("rev-list", head, `^${r.c}`, "--", "newer-master.txt", "bad.txt", "other.txt"), "");
        assert.equal(r.run(r.origin, "rev-parse", "refs/heads/channel/candidate"), head);
        assert.deepEqual(posts, [{ base: r.c, head, issue: 900 }]);
        assert.ok(gh.includes(REFUSED(r.bad)), "the fix made from newer master is refused on the hold issue");
        assert.match(gh, /without a copy/);
        assert.match(gh, /Fix forward: the held candidate's head is now/);
    });

    it("does nothing again: the fixes are in the head and the refusal was told once", async () => {
        const r = repos();
        const first = await advance(r, { base: r.c, head: r.c, issue: 900 });
        const again = await advance(r, { base: r.c, head: first.out.head, issue: 900 }, REFUSED(r.bad));
        assert.deepEqual([again.code, again.out.moved, again.out.head], [0, "false", first.out.head]);
        assert.deepEqual([again.posts, again.gh], [[], ""]);
    });

    it("takes the merge of fix_pr as a fix when only its description references the hold issue", async () => {
        const r = repos();
        r.git("switch", "-q", "-c", "feat/960-described", r.c);
        writeFileSync(join(r.dir, "described.txt"), "described\n");
        r.git("add", "described.txt");
        r.git("commit", "-q", "-m", "fix(x): described in the pull request only");
        const f = r.git("rev-parse", "HEAD");
        r.git("switch", "-q", "master");
        r.git("merge", "-q", "--no-ff", "-m", "Merge pull request #15 from graphty-org/feat/960-described", f);
        r.git("push", "-q", "origin", "master");
        const inHead = (head) => r.git("rev-list", head, `^${r.c}`).split("\n").includes(f);
        const without = await advance(r, { base: r.c, head: r.c, issue: 900 });
        assert.equal(inHead(without.out.head), false);
        r.git("switch", "-q", "master"); // advance leaves the checkout on the head; the job's checkout is master
        const named = await advance(r, { base: r.c, head: without.out.head, issue: 900 }, REFUSED(r.bad), {
            FIX_PR: "14,15",
        });
        assert.deepEqual([named.code, named.out.moved, inHead(named.out.head)], [0, "true", true]);
    });

    it("with nothing held, merges nothing", async () => {
        const r = repos();
        const { code, out, posts } = await advance(r, null);
        assert.deepEqual([code, out.moved, posts], [0, "false", []]);
    });
});
