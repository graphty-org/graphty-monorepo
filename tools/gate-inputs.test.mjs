// Tests of the gate's input keys and the wait log (design/ci/fast-pipeline.md, build order step 1):
//  - a pass is keyed by what the gate reads -- the files, the installed lockfile, the gate's own scripts,
//    the lane environment -- never by the branch or the commit, so it is reused for an identical tree
//    (another worktree, a commit that changes no file, golden's land commit) and never when any of those
//    inputs changes;
//  - a push whose whole gate already passed skips the source-only checks and the wait for a gate slot;
//  - every wait for a slot or a lock is logged with who held it.
// Each test works in throwaway git repositories.
//
//   node tools/gate-inputs.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, describe, it } from "node:test";

import { isolateGit } from "./isolated-git-env.mjs";
import { gateKey, inputKey } from "./prepush-inputs.mjs";
import { acquire } from "./test-slots.mjs";
import { logWait } from "./wait-log.mjs";

const TMP = mkdtempSync(join(tmpdir(), "gate-inputs-"));
after(() => rmSync(TMP, { recursive: true, force: true }));
isolateGit();

const TOOLS = fileURLToPath(new URL(".", import.meta.url));
let made = 0;
// The environment without the base the gate running these tests may have exported.
// The tests run inside the gate, so drop the gate's own settings (PREPUSH_LIGHT, PREPUSH_ALL, the hook's
// PUSH_REMOTE_*, ...):
// a test sets each one it needs.
const OUR_ENV = Object.fromEntries(
    Object.entries(process.env).filter(
        ([k]) => k !== "PUSH_BASE_REF" && !k.startsWith("PREPUSH_") && !k.startsWith("PUSH_REMOTE"),
    ),
);

// A checkout with the gate's tools in it: a source file, an ignored dist/ and tmp/, an installed lockfile.
function repo() {
    const dir = join(TMP, `repo-${++made}`);
    mkdirSync(join(dir, "tools"), { recursive: true });
    mkdirSync(join(dir, ".husky"));
    mkdirSync(join(dir, "node_modules/.pnpm"), { recursive: true });
    for (const f of ["prepush-inputs.mjs", "push-base.mjs", "wait-log.mjs"])
        copyFileSync(join(TOOLS, f), join(dir, "tools", f));
    writeFileSync(join(dir, ".husky/pre-push"), "hook\n");
    writeFileSync(join(dir, ".gitignore"), "node_modules/\ndist/\ntmp/\n");
    writeFileSync(join(dir, "a.ts"), "a\n");
    writeFileSync(join(dir, "pnpm-lock.yaml"), "lock\n");
    writeFileSync(join(dir, "node_modules/.pnpm/lock.yaml"), "lock\n");
    const git = (...args) => {
        const r = spawnSync("git", args, { cwd: dir, encoding: "utf8" });
        assert.equal(r.status, 0, `git ${args.join(" ")}: ${r.stderr}`);
        return r.stdout.trim();
    };
    git("init", "-q", "-b", "main");
    git("add", ".");
    git("commit", "-q", "-m", "a");
    const inputs = (...args) =>
        spawnSync(process.execPath, [join(dir, "tools/prepush-inputs.mjs"), ...args], {
            cwd: dir,
            encoding: "utf8",
            env: OUR_ENV,
        });
    return { dir, git, inputs, key: (env = {}) => gateKey(dir, dir, env) };
}

describe("the gate key", () => {
    it("is the same for an identical tree: another commit, another branch, another worktree", () => {
        const r = repo();
        const before = r.key();
        r.git("commit", "-q", "--allow-empty", "-m", "nothing changes");
        assert.equal(r.key(), before, "a commit that changes no file");
        r.git("checkout", "-q", "-b", "feat/x");
        assert.equal(r.key(), before, "another branch");
        writeFileSync(join(r.dir, "b.ts"), "b\n");
        const edited = r.key();
        r.git("add", "b.ts");
        assert.equal(r.key(), edited, "the same file staged");
        r.git("commit", "-q", "-m", "b");
        assert.equal(r.key(), edited, "the same file committed");
        r.git("rm", "-q", "b.ts");
        r.git("commit", "-q", "-m", "back");
        assert.equal(r.key(), before, "back to the same files");
        // A second worktree at a merge commit with the same tree, as golden's land commit of a branch
        // that merged golden first, with its own install of the same lockfile.
        const merge = r.git("commit-tree", "HEAD^{tree}", "-p", "HEAD", "-p", "main", "-m", "land: feat/x");
        const other = join(TMP, `worktree-${made}`);
        r.git("worktree", "add", "-q", "--detach", other, merge);
        mkdirSync(join(other, "node_modules/.pnpm"), { recursive: true });
        writeFileSync(join(other, "node_modules/.pnpm/lock.yaml"), "lock\n");
        assert.equal(gateKey(other, r.dir, {}), before, "the land commit in another worktree");
        mkdirSync(join(r.dir, "dist"));
        writeFileSync(join(r.dir, "dist/out.js"), "x\n");
        assert.equal(r.key(), before, "an ignored build output");
        assert.equal(r.key({ GRAPHTY_TEST_SLOTS: "8", PUSH_BASE_REF: "origin/master" }), before, "slots and base");
    });

    it("never lets a branch stacked on an unlanded branch stand for a push measured from master", () => {
        const r = repo();
        const checked = r.key({ PUSH_BASE_REF: "origin/master" });
        assert.equal(r.key({}), checked, "no base is master");
        // The stacked branch S tests only its commits since its parent F; the merge of S into master,
        // with the same files, must still run the gate over F's commits.
        r.git("update-ref", "refs/remotes/origin/fix/parent", "HEAD");
        const stacked = r.key({ PUSH_BASE_REF: "origin/fix/parent" });
        assert.notEqual(stacked, checked);
        assert.equal(r.key({ PUSH_BASE_REF: "origin/fix/parent" }), stacked, "the same stacked base again");
        r.git("commit", "-q", "--allow-empty", "-m", "the parent moves");
        r.git("update-ref", "refs/remotes/origin/fix/parent", "HEAD");
        assert.notEqual(r.key({ PUSH_BASE_REF: "origin/fix/parent" }), stacked, "a parent at another commit");
    });

    it("changes with any file, the installed lockfile, the gate's scripts or the lanes", () => {
        const r = repo();
        const base = r.key();
        const changed = (why, edit, undo) => {
            edit();
            assert.notEqual(r.key(), base, why);
            undo();
            assert.equal(r.key(), base, `${why}, undone`);
        };
        const file = (path, text) => {
            const old = existsSync(join(r.dir, path)) ? readFileSync(join(r.dir, path), "utf8") : null;
            return [
                () => writeFileSync(join(r.dir, path), text),
                () => (old === null ? rmSync(join(r.dir, path)) : writeFileSync(join(r.dir, path), old)),
            ];
        };
        changed("an edit", ...file("a.ts", "b\n"));
        changed("an untracked file", ...file("new.ts", "n\n"));
        changed("the installed lockfile", ...file("node_modules/.pnpm/lock.yaml", "lock 2\n"));
        changed("the gate's tools", ...file("tools/x.sh", "x\n"));
        changed("the gate's hook", ...file(".husky/pre-push", "hook 2\n"));
        assert.notEqual(r.key({ GRAPHTY_GPU_REQUIRE: "nvidia" }), base, "a GRAPHTY_ lane");
        assert.notEqual(r.key({ PREPUSH_ALL: "1" }), base, "PREPUSH_ALL");
        assert.notEqual(r.key({ PREPUSH_LIGHT: "1" }), base, "the light gate is not the full one");
        assert.equal(r.key({ PREPUSH_LIGHT: "0" }), base, "PREPUSH_LIGHT=0 is the full gate, as unset is");
    });

    it("counts the gate's version when the gate is another checkout than the one it checks", () => {
        const checked = repo();
        const gate = repo();
        const before = gateKey(checked.dir, gate.dir, {});
        writeFileSync(join(gate.dir, "tools/prepush.sh"), "a newer gate\n");
        assert.notEqual(gateKey(checked.dir, gate.dir, {}), before, "an uncommitted gate change");
        gate.git("add", ".");
        gate.git("commit", "-q", "-m", "gate");
        assert.notEqual(gateKey(checked.dir, gate.dir, {}), before, "a committed gate change");
        writeFileSync(join(gate.dir, "a.ts"), "not a gate file\n");
        const again = gateKey(checked.dir, gate.dir, {});
        writeFileSync(join(gate.dir, "a.ts"), "still not\n");
        assert.equal(gateKey(checked.dir, gate.dir, {}), again, "a file outside the gate's tools/ and .husky/");
    });

    it("puts the installed lockfile and the gate's version in every test shard's key", () => {
        const shard = { shard: "s", package: "p", "test-command": "true", "needs-browser": false };
        const files = new Map([["p/a.ts", "1"]]);
        const roots = new Map([["p", "p"]]);
        const key = (context) => inputKey(shard, files, roots, new Set(["p"]), new Map(), {}, context);
        const base = key({ lock: "l", gate: "g" });
        assert.equal(key({ lock: "l", gate: "g" }), base);
        assert.notEqual(key({ lock: "l2", gate: "g" }), base, "the installed lockfile");
        assert.notEqual(key({ lock: "l", gate: "g2" }), base, "the gate's version");
    });
});

describe("a test shard's key", () => {
    // Package p depends on q; r is unrelated. The gate is a checkout of its own, as .worktrees/gate-live
    // is, holding a copy of the gate's scripts.
    const graph = {
        roots: new Map([
            ["p", "p"],
            ["q", "q"],
            ["r", "r"],
        ]),
        outputs: new Map([
            ["p", ["p/dist"]],
            ["q", ["q/dist"]],
        ]),
        deps: new Map([["p", new Set(["q"])]]),
    };
    const shard = { shard: "p-1", package: "p", "test-command": "cd p && vitest run", "needs-browser": false };
    const write = (dir, path, text) => {
        mkdirSync(join(dir, path, ".."), { recursive: true });
        writeFileSync(join(dir, path), text);
    };
    const gate = repo();
    for (const f of ["shard-verdict.mjs", "x.mjs"]) write(gate.dir, `tools/${f}`, `${f}\n`);
    const gateInputs = import(join(gate.dir, "tools/prepush-inputs.mjs"));
    const checkout = () => {
        const r = repo();
        for (const p of ["p", "q", "r"]) write(r.dir, `${p}/src/a.ts`, `${p}\n`);
        write(r.dir, ".gitignore", "node_modules/\ndist/\ntmp/\ncoverage/\n.coverage-parts/\n");
        r.git("add", ".");
        r.git("commit", "-q", "-m", "packages");
        return r;
    };
    const keyOf = async (dir) => (await gateInputs).shardKeys(dir, graph)()(shard);

    it("is the same for the same tree in two worktrees, whatever their build outputs hold", async () => {
        const r = checkout();
        const other = join(TMP, `shard-worktree-${made}`);
        r.git("worktree", "add", "-q", "--detach", other, "HEAD");
        write(other, "node_modules/.pnpm/lock.yaml", "lock\n");
        // graph-format stamps the commit it was built at; nx's cache restores another commit's build.
        write(r.dir, "q/dist/q.js", 'producer = "@graphty/graph-format@29f982b6ae06"\n');
        write(other, "q/dist/q.js", 'producer = "@graphty/graph-format@c09057348c37"\n');
        write(other, "p/dist/tsconfig.tsbuildinfo", "buffer@5.7.1\n");
        assert.equal(await keyOf(other), await keyOf(r.dir));
    });

    it("is not changed by what a run writes, nor by a gate change outside the rule that judges a run", async () => {
        const r = checkout();
        const before = await keyOf(r.dir);
        write(r.dir, "p/coverage/index.html", "report\n");
        write(r.dir, "p/.coverage-parts/p-1/coverage-final.json", "{}\n");
        write(r.dir, "p/dist/p.js", "rebuilt\n");
        write(r.dir, "tmp/prepush-tests/p-1.log", "Tests  1 passed (1)\n");
        write(gate.dir, "tools/x.mjs", "a gate fix that went live during the run\n");
        write(r.dir, "r/src/a.ts", "a package p does not read\n");
        assert.equal(await keyOf(r.dir), before);
    });

    it("changes with the files the shard reads, the installed lockfile and the gate's verdict rule", async () => {
        const r = checkout();
        const base = await keyOf(r.dir);
        const changed = async (why, dir, path, text) => {
            const old = existsSync(join(dir, path)) ? readFileSync(join(dir, path), "utf8") : null;
            write(dir, path, text);
            assert.notEqual(await keyOf(r.dir), base, why);
            if (old === null) rmSync(join(dir, path));
            else writeFileSync(join(dir, path), old);
            assert.equal(await keyOf(r.dir), base, `${why}, undone`);
        };
        await changed("its package's source", r.dir, "p/src/a.ts", "p 2\n");
        await changed("a new test file, not yet committed", r.dir, "p/test/a.test.ts", "t\n");
        await changed("a dependency's source", r.dir, "q/src/a.ts", "q 2\n");
        await changed("a root file", r.dir, "pnpm-lock.yaml", "lock 2\n");
        await changed("the checkout's own tools", r.dir, "tools/run-tests.sh", "x\n");
        await changed("the installed lockfile", r.dir, "node_modules/.pnpm/lock.yaml", "lock 2\n");
        await changed("the gate's verdict rule", gate.dir, "tools/shard-verdict.mjs", "stricter\n");
    });
});

describe("pass records (prepush-inputs.mjs passed / record)", () => {
    it("are found from any worktree with the same inputs, and never after a change", () => {
        const r = repo();
        const key = r.inputs("key").stdout.trim();
        assert.match(key, /^[0-9a-f]{64}$/);
        assert.equal(r.inputs("passed", "gate", key).status, 1, "nothing passed yet");
        assert.equal(r.inputs("record", "gate", key).status, 0);
        const pass = JSON.parse(r.inputs("passed", "gate", key).stdout);
        assert.equal(pass.branch, "main");
        assert.equal(pass.sha, r.git("rev-parse", "HEAD"));
        assert.equal(r.inputs("passed", "source", key).status, 1, "a pass of one kind is not another's");

        // Another worktree of the same repository on another branch, same files: the same pass.
        const other = join(TMP, `worktree-${made}`);
        r.git("worktree", "add", "-q", "-b", "golden", other);
        mkdirSync(join(other, "node_modules/.pnpm"), { recursive: true });
        writeFileSync(join(other, "node_modules/.pnpm/lock.yaml"), "lock\n");
        const there = (...args) =>
            spawnSync(process.execPath, [join(other, "tools/prepush-inputs.mjs"), ...args], {
                cwd: other,
                encoding: "utf8",
                env: OUR_ENV,
            });
        assert.equal(there("passed", "gate").status, 0, "reused on golden's identical tree");
        writeFileSync(join(other, "a.ts"), "changed\n");
        assert.equal(there("passed", "gate").status, 1, "not after an edit");
    });

    it("are refused when the checkout changed while the checks ran", () => {
        const r = repo();
        const key = r.inputs("key").stdout.trim();
        writeFileSync(join(r.dir, "a.ts"), "edited during the run\n");
        const refused = r.inputs("record", "gate", key);
        assert.equal(refused.status, 1);
        assert.match(refused.stderr, /changed while the gate checks ran/);
        assert.equal(r.inputs("passed", "gate", key).status, 1);
    });
});

describe("prepush.sh with a gate that already passed", () => {
    // A checkout whose gate is the real prepush.sh and source checks, with every outside step stubbed:
    // pnpm answers "no package affected", and the offline link check and the SonarQube step write a
    // line to a log each time they run (the SonarQube one prints SONAR_OUT). With `projects` (nx's answer,
    // a JSON list) the per-package steps run too, stubbed: build, lint, the NVIDIA GPU tests, the test
    // shards and the screenshot capture each log their name.
    function gateRepo(projects = "[]") {
        const r = repo();
        for (const f of ["prepush.sh", "prepush-source-checks.sh"])
            copyFileSync(join(TOOLS, f), join(r.dir, "tools", f));
        const ran = join(TMP, `steps-${made}.log`);
        writeFileSync(join(r.dir, "tools/queued-push-guard.mjs"), "");
        writeFileSync(join(r.dir, "tools/check-committed-images.mjs"), "");
        writeFileSync(join(r.dir, "tools/check-figma-lock.mjs"), "");
        writeFileSync(join(r.dir, "tools/release-dry-run.mjs"), "");
        writeFileSync(join(r.dir, "tools/check-links.sh"), `#!/bin/sh\necho links >> "${ran}"\n`, { mode: 0o755 });
        writeFileSync(
            join(r.dir, "tools/sonar-gate.mjs"),
            `import { appendFileSync } from "node:fs";\nappendFileSync(${JSON.stringify(ran)}, "sonar\\n");\nconsole.log(process.env.SONAR_OUT ?? "");\n`,
        );
        writeFileSync(join(r.dir, "package.json"), '{ "scripts": {} }\n');
        const log = (name) =>
            `import { appendFileSync } from "node:fs";\nappendFileSync(${JSON.stringify(ran)}, "${name}\\n");\n`;
        writeFileSync(join(r.dir, "tools/lint-base-drift.mjs"), "");
        writeFileSync(join(r.dir, "tools/test-slots.mjs"), log("gpu"));
        writeFileSync(join(r.dir, "tools/prepush-tests.mjs"), log("tests"));
        writeFileSync(
            join(r.dir, "tools/visual-preview.sh"),
            `#!/bin/sh\n[ "$1" = --head ] && echo screenshots >> "${ran}"\nexit 0\n`,
            {
                mode: 0o755,
            },
        );
        mkdirSync(join(r.dir, "webgpu-graph-algorithms"));
        writeFileSync(join(r.dir, "webgpu-graph-algorithms/.keep"), "");
        r.git("add", ".");
        r.git("commit", "-q", "-m", "gate");
        r.git("update-ref", "refs/remotes/origin/master", "HEAD");
        const bin = join(TMP, `bin-${made}`);
        mkdirSync(bin);
        writeFileSync(
            join(bin, "pnpm"),
            `#!/bin/sh\ncase "$*" in --version) echo 10.30.0;; *"show projects"*) echo '${projects}';;\n` +
                `*"-t build"*) echo build >> "${ran}";; *"-t lint"*) echo lint >> "${ran}";; esac\n`,
            { mode: 0o755 },
        );
        writeFileSync(join(bin, "npm"), "#!/bin/sh\nexit 0\n", { mode: 0o755 });
        const env = { ...OUR_ENV, PATH: `${bin}:${process.env.PATH}`, PUSH_BASE_REF: "origin/master" };
        delete env.PREPUSH_RERUN_ALL;
        const gate = (extra = {}) =>
            spawnSync("bash", [join(r.dir, "tools/prepush.sh")], {
                cwd: r.dir,
                encoding: "utf8",
                env: { ...env, ...extra },
            });
        const steps = () => (existsSync(ran) ? readFileSync(ran, "utf8").trim().split("\n") : []);
        return { ...r, gate, steps };
    }

    it("records a pass, then skips the whole gate on the same tree, and PREPUSH_RERUN_ALL=1 runs it all", () => {
        const r = gateRepo();
        const first = r.gate();
        assert.equal(first.status, 0, first.stdout + first.stderr);
        // SonarQube runs in the background beside the other source checks, so the two log in either order.
        assert.deepEqual(r.steps().sort(), ["links", "sonar"]);
        assert.equal(r.inputs("passed", "gate").status, 0, "a whole-gate pass is recorded");

        const second = r.gate();
        assert.equal(second.status, 0, second.stdout + second.stderr);
        assert.match(second.stdout, /\[SKIP\] The whole gate: it already passed on exactly these inputs/);
        assert.deepEqual(r.steps().sort(), ["links", "sonar"], "no step ran again");

        const again = r.gate({ PREPUSH_RERUN_ALL: "1" });
        assert.equal(again.status, 0, again.stdout + again.stderr);
        assert.deepEqual(r.steps().sort(), ["links", "links", "sonar", "sonar"]);
    });

    it("records no pass that SonarQube did not check, so the next push of the same files is scanned", () => {
        const r = gateRepo();
        const unchecked = r.gate({ SONAR_OUT: "SonarQube did NOT check this push (server unreachable)" });
        assert.equal(unchecked.status, 0, unchecked.stdout + unchecked.stderr);
        assert.equal(r.inputs("passed", "source").status, 1);
        assert.equal(r.inputs("passed", "gate").status, 1);
        assert.equal(r.gate().status, 0);
        assert.deepEqual(r.steps().sort(), ["links", "links", "sonar", "sonar"]);
    });

    it("PREPUSH_LIGHT=1 runs build, lint and the NVIDIA GPU tests but no test shard and no screenshot", () => {
        const r = gateRepo('["webgpu-graph-algorithms"]');
        const light = r.gate({ PREPUSH_LIGHT: "1" });
        assert.equal(light.status, 0, light.stdout + light.stderr);
        // the source checks first (SonarQube beside the rest), then the build, then lint beside the GPU tests
        assert.deepEqual(r.steps().slice(0, 2).sort(), ["links", "sonar"]);
        assert.deepEqual(r.steps().slice(2, 3), ["build"]);
        assert.deepEqual(r.steps().slice(3).sort(), ["gpu", "lint"]);
        assert.match(light.stdout, /\[LIGHT\] tests run in CI;/);
        assert.equal(r.inputs("passed", "gate").status, 1, "a light pass is not recorded for the full gate's key");

        // the full gate is another key, so the light pass does not stand in for it
        const full = r.gate();
        assert.equal(full.status, 0, full.stdout + full.stderr);
        // the screenshots and the GPU tests run in the background, beside the shards, in any order
        assert.deepEqual(r.steps().slice(5).sort(), ["build", "gpu", "links", "lint", "screenshots", "sonar", "tests"]);
        assert.doesNotMatch(full.stdout, /\[LIGHT\]/);
    });
});

describe("the wait log", () => {
    const read = (file) => readFileSync(file, "utf8").trim().split("\n").map(JSON.parse);

    it("writes one JSON line per wait, and nothing when it is off", () => {
        const file = join(TMP, "waits-direct.jsonl");
        logWait({ kind: "gate-slot", start: 1000, end: 4000, waiter: "w", heldBy: ["h"] }, file);
        assert.deepEqual(read(file), [
            {
                kind: "gate-slot",
                start: new Date(1000).toISOString(),
                end: new Date(4000).toISOString(),
                ms: 3000,
                waiter: "w",
                pid: process.pid,
                heldBy: ["h"],
            },
        ]);
        logWait({ kind: "x", start: 0 }, null);
        assert.equal(read(file).length, 1);
    });

    it("records a test slot's wait with the run that held it, and no line for a run that did not wait", async () => {
        const dir = join(TMP, "test-slots");
        const lines = [];
        const quiet = { env: {}, poll: 5, log: () => {}, dir, slots: 1, waitLog: (l) => lines.push(l) };
        const holder = spawn("sleep", ["600"], { stdio: "ignore" });
        const waiter = spawn("sleep", ["600"], { stdio: "ignore" });
        try {
            const release = await acquire({ ...quiet, pid: holder.pid, label: "the holder" });
            assert.equal(lines.length, 0, "a slot taken at once is no wait");
            let told;
            const waiting = new Promise((resolve) => (told = resolve));
            const taking = acquire({ ...quiet, pid: waiter.pid, label: "the waiter", log: told });
            await waiting;
            release();
            (await taking)();
            assert.equal(lines.length, 1);
            assert.equal(lines[0].kind, "test-slot");
            assert.equal(lines[0].waiter, "the waiter");
            assert.match(lines[0].heldBy[0], new RegExp(`^pid ${holder.pid} the holder`));
        } finally {
            holder.kill();
            waiter.kill();
        }
    });

    it("records a wait for a browser slot with the commands that held the slots", () => {
        const slots = join(TMP, "browser-slots");
        const log = join(TMP, "waits-browser.jsonl");
        const gate = join(TOOLS, "with-browser.sh");
        // Four holders fill the slots; the fifth command waits, says so, and runs once they end.
        const r = spawnSync(
            "bash",
            [
                "-c",
                `set -u
for i in 1 2 3 4; do "$GATE" sh -c "touch held.$i; while [ ! -e go ]; do sleep 0.05; done" & done
until [ -e held.1 ] && [ -e held.2 ] && [ -e held.3 ] && [ -e held.4 ]; do sleep 0.05; done
"$GATE" sh -c "echo fifth > fifth" 2> fifth.err &
until grep -q "waiting for one of 4 browser slots" fifth.err 2>/dev/null; do sleep 0.05; done
touch go
wait`,
            ],
            {
                cwd: TMP,
                encoding: "utf8",
                env: {
                    ...process.env,
                    GATE: gate,
                    // Run under tools/low-priority.sh, the holders would all wait for slot 4 and never start.
                    BROWSER_SLOT_PRIORITY: "",
                    BROWSER_SLOT_DIR: slots,
                    BROWSER_SLOT_POLL: "0.1",
                    PIPELINE_WAIT_LOG: log,
                },
            },
        );
        assert.equal(r.status, 0, r.stdout + r.stderr);
        assert.equal(readFileSync(join(TMP, "fifth"), "utf8"), "fifth\n");
        const lines = read(log);
        const fifth = lines.find((l) => l.waiter.includes("echo fifth"));
        assert.equal(fifth?.kind, "browser-slot", JSON.stringify(lines));
        assert.equal(fifth.heldBy.length, 4);
        for (const h of fifth.heldBy) assert.match(h, /^\d+ \S+ .* :: sh -c touch held\.\d/);
    });

    it("keeps a low-priority command (BROWSER_SLOT_PRIORITY=low) to slot 4; an ordinary one takes any", () => {
        const dir = join(TMP, "low-lane");
        mkdirSync(dir, { recursive: true });
        // The low holder takes slot 4; an ordinary command then takes slot 1 at once, and another low
        // command waits for slot 4 although slots 2 and 3 are free.
        const r = spawnSync(
            "bash",
            [
                "-c",
                `set -u
BROWSER_SLOT_PRIORITY=low "$GATE" sh -c "touch held.4; while [ ! -e go ]; do sleep 0.05; done" &
until [ -e held.4 ]; do sleep 0.05; done
"$GATE" sh -c "echo gate > gate"
BROWSER_SLOT_PRIORITY=low "$GATE" sh -c "echo other > other" 2> other.err &
until grep -q "waiting for one of 4 browser slots" other.err 2>/dev/null; do sleep 0.05; done
[ ! -e other ] || exit 9
touch go
wait`,
            ],
            {
                cwd: dir,
                encoding: "utf8",
                env: {
                    ...process.env,
                    GATE: join(TOOLS, "with-browser.sh"),
                    BROWSER_SLOT_PRIORITY: "",
                    BROWSER_SLOT_DIR: join(dir, "browser-slots"),
                    BROWSER_SLOT_POLL: "0.1",
                    PIPELINE_WAIT_LOG: "off",
                },
            },
        );
        assert.equal(r.status, 0, r.stdout + r.stderr);
        assert.equal(readFileSync(join(dir, "gate"), "utf8"), "gate\n", "the ordinary command ran beside the holder");
        assert.equal(
            readFileSync(join(dir, "other"), "utf8"),
            "other\n",
            "the second low command ran once slot 4 was free",
        );
    });

    it("gives the next free slot to the high lane (BROWSER_SLOT_PRIORITY=high), ahead of a command that waited first", () => {
        const dir = join(TMP, "high-lane");
        mkdirSync(dir, { recursive: true });
        // Four holders fill the slots. An ordinary command starts waiting, looking every 0.02 s; then a high one
        // starts waiting, looking every second. One slot frees: the high one takes it, the other keeps waiting.
        const r = spawnSync(
            "bash",
            [
                "-c",
                `set -u
for i in 1 2 3 4; do "$GATE" sh -c "touch held.$i; while [ ! -e go.$i ]; do sleep 0.05; done" & done
until [ -e held.1 ] && [ -e held.2 ] && [ -e held.3 ] && [ -e held.4 ]; do sleep 0.05; done
hold='while [ ! -e done ]; do sleep 0.05; done'
BROWSER_SLOT_POLL=0.02 "$GATE" sh -c "echo shard >> order; $hold" 2> shard.err &
until grep -q "waiting for one of 4" shard.err 2>/dev/null; do sleep 0.05; done
BROWSER_SLOT_PRIORITY=high BROWSER_SLOT_POLL=1 "$GATE" sh -c "echo preview >> order; $hold" 2> preview.err &
until grep -q "waiting for one of 4" preview.err 2>/dev/null; do sleep 0.05; done
touch go.1
until [ -s order ]; do sleep 0.05; done
first=$(head -1 order)
touch go.2 go.3 go.4
until [ "$(wc -l < order)" -eq 2 ]; do sleep 0.05; done
touch done
wait
[ "$first" = preview ] || { echo "first: $first"; exit 9; }
ls -a browser-slots | grep -q '^\\.high-' && { echo "a high mark was left"; exit 8; }
exit 0`,
            ],
            {
                cwd: dir,
                encoding: "utf8",
                env: {
                    ...process.env,
                    GATE: join(TOOLS, "with-browser.sh"),
                    // the caller's lane (tools/low-priority.sh sets low, which waits for slot 4 only) would
                    // keep the four holders from filling the slots
                    BROWSER_SLOT_PRIORITY: "",
                    BROWSER_SLOT_DIR: join(dir, "browser-slots"),
                    PIPELINE_WAIT_LOG: "off",
                },
            },
        );
        assert.equal(r.status, 0, r.stdout + r.stderr);
    });
});
