// Tests of tools/release-approvals.mjs: which releases need the owner's go, which release-approvals.json
// entries give it, and the dry run on a real version commit in a scratch repository.
//
//   node --test tools/release-approvals.test.mjs
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

import { isolatedGitEnv } from "./isolated-git-env.mjs";
import { kindOf, onNpm, problems, released, unapproved } from "./release-approvals.mjs";

const SHA = "a".repeat(40);
const entry = (over) => ({
    project: "graphty-element",
    kind: "major",
    merge: SHA,
    approval: "https://github.com/graphty-org/graphty-monorepo/pull/1#pullrequestreview-1",
    since: "2026-11-02",
    ...over,
});

describe("problems", () => {
    it("accepts the empty file and a complete entry", () => {
        assert.deepEqual(problems({ approve: [] }), []);
        assert.deepEqual(problems({ approve: [entry()] }), []);
    });

    it("rejects a file without a list, and every incomplete field", () => {
        assert.equal(problems({}).length, 1);
        assert.equal(problems(null).length, 1);
        assert.deepEqual(problems({ approve: [entry({ kind: "minor", merge: "abc", approval: "", since: "soon" })] }), [
            'approve[0].kind: must be "major" or "first"',
            "approve[0].merge: must be a full 40-character commit id",
            "approve[0].approval: must be a github.com review URL",
            "approve[0].since: must be a YYYY-MM-DD date",
        ]);
    });
});

describe("released", () => {
    it("reads nx's project lines, scoped names included", () => {
        const body =
            "chore(release): publish [skip ci]\n\n- project: graph-format 1.4.7\n\n- project: @graphty/remote-logger 2.0.23\n";
        assert.deepEqual(released(body), [
            { project: "graph-format", version: "1.4.7" },
            { project: "@graphty/remote-logger", version: "2.0.23" },
        ]);
    });
});

describe("kindOf", () => {
    it("names a first publish, a major, and nothing else", () => {
        assert.equal(kindOf("0.1.0", null), "first");
        assert.equal(kindOf("4.0.0", "3.30.0"), "major");
        assert.equal(kindOf("1.0.0", "0.9.3"), "major");
        assert.equal(kindOf("3.31.0", "3.30.0"), null);
        assert.equal(kindOf("0.3.49", "0.3.48"), null);
        assert.equal(kindOf("0.0.29", "0.0.28"), null);
        assert.equal(kindOf("3.30.1", "3.30.0"), null);
    });

    it("names a breaking bump below 1.0.0, which nx releases as a minor", () => {
        assert.equal(kindOf("0.4.0", "0.3.48"), "major");
        assert.equal(kindOf("0.1.0", "0.0.28"), "major");
    });
});

describe("unapproved", () => {
    const plan = [
        { project: "graphty-element", version: "4.0.0", previous: "3.30.0" },
        { project: "layout", version: "2.5.11", previous: "2.5.10" },
        { project: "new-pkg", version: "0.1.0", previous: null },
    ];
    const always = () => true;

    it("lists every major and first publish without an entry", () => {
        assert.deepEqual(
            unapproved(plan, { approve: [] }, always).map((r) => `${r.project}:${r.kind}`),
            ["graphty-element:major", "new-pkg:first"],
        );
    });

    it("an entry approves only its own project and kind, and only when its merge is in the history", () => {
        const approvals = { approve: [entry(), entry({ project: "new-pkg", kind: "major" })] };
        assert.deepEqual(
            unapproved(plan, approvals, always).map((r) => r.project),
            ["new-pkg"],
        );
        assert.deepEqual(
            unapproved(plan, approvals, () => false).map((r) => r.project),
            ["graphty-element", "new-pkg"],
        );
    });
});

// The done check of #3455: a seeded major with no entry fails the dry run; its entry passes it.
describe("dry-run on a version commit", () => {
    const dir = mkdtempSync(join(tmpdir(), "release-approvals-"));
    after(() => rmSync(dir, { recursive: true, force: true }));
    const git = (...args) =>
        execFileSync("git", args, { cwd: dir, encoding: "utf8", env: { ...isolatedGitEnv(), HUSKY: "0" } }).trim();
    mkdirSync(join(dir, "tools"));
    cpSync(new URL("./release-approvals.mjs", import.meta.url), join(dir, "tools", "release-approvals.mjs"));
    cpSync(new URL("./release-hold.mjs", import.meta.url), join(dir, "tools", "release-hold.mjs"));
    // npm as the registry answers: githerd was never published (a 404), everything else has versions
    mkdirSync(join(dir, "bin"));
    writeFileSync(
        join(dir, "bin", "npm"),
        '#!/bin/bash\nif [ "$2" = githerd ]; then echo "npm error code E404" >&2; exit 1; fi\necho \'["1.0.0"]\'\n',
        { mode: 0o755 },
    );
    git("init", "-q", "-b", "master");
    writeFileSync(join(dir, "release-approvals.json"), '{ "approve": [] }\n');
    git("add", ".");
    git("commit", "-q", "-m", "chore: start");
    git("tag", "graphty-element@3.30.0");
    git("tag", "layout@2.5.10");
    git("tag", "githerd@0.1.19");
    git("commit", "-q", "--allow-empty", "-m", "feat(graphty-element)!: drop the old API");
    const candidate = git("rev-parse", "HEAD");
    git(
        "commit",
        "-q",
        "--allow-empty",
        "-m",
        "chore(release): publish [skip ci]\n\n- project: graphty-element 4.0.0\n\n- project: layout 2.5.11\n\n- project: githerd 0.1.20",
    );
    const commit = git("rev-parse", "HEAD");
    const run = (env = {}) => {
        const out = join(dir, "github-output");
        writeFileSync(out, "");
        const r = spawnSync("node", ["tools/release-approvals.mjs", "dry-run", candidate, commit], {
            cwd: dir,
            encoding: "utf8",
            env: { ...isolatedGitEnv(), PATH: `${join(dir, "bin")}:${process.env.PATH}`, GITHUB_OUTPUT: out, ...env },
        });
        return { status: r.status, stdout: r.stdout, output: readFileSync(out, "utf8") };
    };

    it("fails on a seeded major with no entry, naming the project and holding it alone", () => {
        const r = run();
        assert.equal(r.status, 1, r.stdout);
        assert.match(r.stdout, /graphty-element: 3\.30\.0 -> 4\.0\.0/);
        assert.match(r.stdout, /::error::graphty-element would publish a major \(3\.30\.0 -> 4\.0\.0\)/);
        assert.doesNotMatch(r.stdout, /::error::layout/);
        assert.match(r.output, /^held=graphty-element,githerd\n$/);
    });

    it("holds a tagged package npm never had as a first publish, not a plain bump that fails to publish", () => {
        const r = run();
        assert.match(r.stdout, /githerd: \(first publish\) -> 0\.1\.20/);
        assert.match(r.stdout, /::error::githerd would publish its first publish/);
    });

    it("passes once release-approvals.json approves that major and that first publish", () => {
        const approve = [entry({ merge: candidate }), entry({ project: "githerd", kind: "first", merge: candidate })];
        writeFileSync(join(dir, "release-approvals.json"), JSON.stringify({ approve }));
        const r = run();
        assert.equal(r.status, 0, r.stdout);
        assert.equal(r.output, "held=\n");
    });

    it("reads release-approvals.json from RELEASE_POLICY_REF, not from the checked-out candidate", () => {
        // master's tip approves nothing; the checkout's file (the candidate's tree) still approves both
        git("branch", "-f", "policy", candidate);
        const r = run({ RELEASE_POLICY_REF: "policy" });
        assert.equal(r.status, 1, r.stdout);
        assert.match(r.output, /^held=graphty-element,githerd\n$/);
    });
});

describe("onNpm", () => {
    it("is false only on npm's 404, true for a package with versions, and throws on any other failure", () => {
        const fail = (stderr) => () => {
            throw Object.assign(new Error("Command failed: npm view"), { stderr });
        };
        assert.equal(onNpm("@graphty/githerd", fail("npm error code E404\nnpm error 404 Not Found - GET ...")), false);
        assert.equal(
            onNpm("@graphty/layout", () => '["1.0.0","1.0.1"]'),
            true,
        );
        assert.throws(() => onNpm("@graphty/layout", fail("npm error code ETIMEDOUT")), /npm view/);
    });
});
