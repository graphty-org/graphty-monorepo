// Tests of tools/claude-promise-hook.mjs and tools/commitments.mjs: the Stop hook blocks a reply that promises later
// work nothing will do, a session whose ledger commitments went stale, and an idle wait on CI while work is open; it
// allows a backed promise, a plain answer, a quoted promise, an offer and a continuation. Each case is a Stop input in
// tools/fixtures/promise-hook/.
//
//   node --test tools/claude-promise-hook.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { decide, hook } from "./claude-promise-hook.mjs";
import { add, cli, liveness } from "./commitments.mjs";

const HOOK = new URL("./claude-promise-hook.mjs", import.meta.url).pathname;
const fixture = (name) =>
    JSON.parse(readFileSync(new URL(`./fixtures/promise-hook/${name}.json`, import.meta.url), "utf8"));
const MIN = 60_000;

function checkout({ roundAge = null, prs = [] } = {}) {
    const root = mkdtempSync(join(tmpdir(), "promise-hook-"));
    mkdirSync(join(root, "tmp", "pr-status"), { recursive: true });
    writeFileSync(join(root, "tmp", "pr-status", "status.json"), JSON.stringify({ pullRequests: prs }));
    if (roundAge !== null) {
        mkdirSync(join(root, "tmp", "issue-round"), { recursive: true });
        const last = join(root, "tmp", "issue-round", "last-round");
        writeFileSync(last, "2026-11-26T10:00:00Z loop-session\n");
        const at = (Date.now() - roundAge * MIN) / 1000;
        utimesSync(last, at, at);
    }
    return root;
}

describe("claude-promise-hook", () => {
    it("blocks a promise that the routine will pick work up while no round has run, naming what runs", () => {
        const reason = decide(fixture("unbacked-promise"), checkout({ roundAge: 26 * 60 }));
        assert.match(reason, /promises later work that nothing will do/);
        assert.match(reason, /routine that starts issue work will pick up/);
        assert.match(reason, /background tasks running: none; scheduled wakeups: none/);
        assert.match(reason, /issue-round last ran .* PT/);
        assert.match(decide(fixture("unbacked-promise"), checkout()), /issue-round last ran never/);
    });

    it("allows the same promise while the round runs, and a promise a running background agent keeps", () => {
        assert.equal(decide(fixture("unbacked-promise"), checkout({ roundAge: 5 })), null);
        assert.equal(decide(fixture("backed-promise"), checkout()), null);
        const bare = { ...fixture("backed-promise"), background_tasks: [] };
        assert.match(decide(bare, checkout()), /I'll report back/);
        const curly = { ...bare, last_assistant_message: "I\u2019ll check back later." };
        assert.match(decide(curly, checkout()), /check back/, "a curly apostrophe");
    });

    it("counts a live ledger commitment as backing", () => {
        const root = checkout({ prs: [{ number: 10129, state: "PENDING" }] });
        const input = { ...fixture("backed-promise"), background_tasks: [] };
        add(root, "merge PR 10129 when green", "pr:10129", input.session_id);
        assert.equal(decide(input, root), null);
    });

    it("blocks stale commitments: a red PR, a merged PR, a finished task; allows owner and other sessions' entries", () => {
        const input = fixture("stale-backing");
        const root = checkout({
            prs: [
                { number: 10139, state: "FAILURE" },
                { number: 10140, state: "ERROR" },
            ],
        });
        add(root, "PR 10139 auto-merges", "pr:10139", input.session_id);
        add(root, "PR 10129 auto-merges", "pr:10129", input.session_id);
        add(root, "merge agent", "task:gone1", input.session_id);
        add(root, "owner picks the name", "owner", input.session_id);
        add(root, "someone else's", "pr:1", "other-session");
        add(root, "errored PR", "pr:10140", input.session_id);
        const reason = decide(input, root);
        assert.match(reason, /PR 10139 is red/);
        assert.match(reason, /PR 10129 is merged or closed/);
        assert.match(reason, /task gone1 is gone/);
        assert.match(reason, /PR 10140 is red/);
        assert.doesNotMatch(reason, /owner picks|someone else/);
    });

    it("keeps a task live while its agent waits on a background command of its own, and calls it gone after", () => {
        // the Stop input lists the agent's own command as running but not the agent (seen 2026-11-27); only the
        // agent's transcript links the two
        const root = checkout();
        const input = { ...fixture("waiting-agent"), transcript_path: join(root, "session.jsonl") };
        const dir = join(root, "session", "subagents");
        mkdirSync(dir, { recursive: true });
        const lines = [
            { type: "user", toolUseResult: { stdout: "", backgroundTaskId: "b8vh15sqt" } },
            { type: "user", toolUseResult: { isAsync: true, agentId: "anested1", status: "async_launched" } },
        ];
        writeFileSync(join(dir, "agent-awaiting1.jsonl"), lines.map((l) => JSON.stringify(l)).join("\n"));
        add(root, "fix issue 10236", "task:awaiting1", input.session_id);
        assert.equal(decide(input, root), null);
        const nested = { ...input, background_tasks: [{ id: "anested1", type: "subagent", status: "running" }] };
        assert.equal(decide(nested, root), null, "a running agent of its own");
        assert.match(decide({ ...input, background_tasks: [] }, root), /task awaiting1 is gone/);
        const other = { ...input, background_tasks: [{ ...input.background_tasks[0], id: "bother" }] };
        assert.match(decide(other, root), /task awaiting1 is gone/, "someone else's command");
    });

    it("re-reads in-progress labels before calling an issue stale, at most once per 10 minutes", () => {
        const root = checkout();
        const bin = join(root, "bin");
        mkdirSync(bin);
        const calls = join(root, "gh-calls");
        const out = join(root, "gh-out.json");
        writeFileSync(join(bin, "gh"), `#!/bin/sh\necho call >> "${calls}"\ncat "${out}"\n`, { mode: 0o755 });
        const path = process.env.PATH;
        process.env.PATH = `${bin}:${path}`;
        try {
            const input = fixture("issue-just-labeled");
            const now = Date.now();
            mkdirSync(join(root, "tmp", "commitments"), { recursive: true });
            const cache = join(root, "tmp", "commitments", "in-progress.json");
            writeFileSync(cache, JSON.stringify({ at: now - 30 * MIN, numbers: [] }));
            add(root, "issue 10236, worked by its agent", "issue:10236", input.session_id);
            writeFileSync(out, JSON.stringify([{ number: 10236 }]));
            const count = () => readFileSync(calls, "utf8").trim().split("\n").length;
            assert.equal(decide(input, root, now), null, "labeled after the cache was written");
            assert.equal(count(), 1);
            writeFileSync(out, "[]");
            assert.equal(decide(input, root, now + 11 * MIN), null, "listed in a fresh cache: no call");
            assert.equal(count(), 1);
            writeFileSync(cache, JSON.stringify({ at: now + 12 * MIN, tried: now + 12 * MIN, numbers: [] }));
            assert.match(decide(input, root, now + 15 * MIN), /issue 10236 is not labeled in-progress/);
            assert.equal(count(), 1, "refreshed 3 minutes ago: no call");
            assert.match(decide(input, root, now + 23 * MIN), /issue 10236 is not labeled in-progress/);
            assert.equal(count(), 2, "a stale verdict after 10 minutes reads GitHub first");
            writeFileSync(join(bin, "gh"), "#!/bin/sh\nexit 1\n", { mode: 0o755 });
            assert.match(decide(input, root, now + 34 * MIN), /not labeled/, "a failed read keeps the cache");
            assert.equal(JSON.parse(readFileSync(cache, "utf8")).tried, now + 34 * MIN, "and still waits 10 minutes");
        } finally {
            process.env.PATH = path;
        }
    });

    it("blocks an idle wait on CI while work is open, and allows it with an agent running or nothing open", () => {
        const root = checkout();
        assert.match(decide(fixture("idle-wait"), root), /wait on CI or a PR while work is open: the reply lists/);
        const agent = { id: "ag1", type: "local_agent", status: "running" };
        const busy = { ...fixture("idle-wait"), background_tasks: [agent] };
        assert.equal(decide(busy, root), null);
        const nothing = { ...fixture("idle-wait"), last_assistant_message: "Pushed; waiting for CI on PR 10129." };
        assert.equal(decide(nothing, root), null);
        const line = "idle: startable 3 -- start jobs";
        const verdict = { at: Date.now(), session: "loop-session", idle: true, reason: "start jobs", line };
        mkdirSync(join(root, "tmp", "issue-round"), { recursive: true });
        writeFileSync(join(root, "tmp", "issue-round", "idle.json"), JSON.stringify(verdict));
        assert.equal(decide(nothing, root), null, "another session's idle verdict");
        writeFileSync(
            join(root, "tmp", "issue-round", "idle.json"),
            JSON.stringify({ ...verdict, session: nothing.session_id }),
        );
        assert.match(decide(nothing, root), /issue-round: idle: startable 3/);
        add(root, "fix issue 10176", "next", nothing.session_id);
        assert.match(decide(nothing, root), /fix issue 10176/);
    });

    it("allows a plain answer, a quoted promise, an offer and a continuation", () => {
        const root = checkout();
        for (const name of ["plain-answer", "quoted-promise", "offer", "continuation"])
            assert.equal(decide(fixture(name), root), null, name);
        assert.equal(decide({ ...fixture("unbacked-promise"), agent_id: "sub1" }, root), null, "a subagent");
    });

    it("blocks the 2026-11-25 present-tense sentence, and allows a wait whose reply only says 'after that'", () => {
        const root = checkout();
        const say = (last_assistant_message) => ({ ...fixture("plain-answer"), last_assistant_message });
        assert.match(
            decide(say("The routine that starts issue work picks up the high-priority ones."), root),
            /picks up the high-priority ones/,
        );
        assert.match(decide(say("After #10129 merges I'll open the follow-up."), root), /follow-up/);
        assert.equal(decide(say("Waiting for CI on PR 5. After that, nothing is left."), root), null);
    });

    it("survives a corrupt state file or ledger entry instead of going silent for the session", () => {
        const root = checkout();
        mkdirSync(join(root, "tmp", "promise-hook"), { recursive: true });
        const text = JSON.stringify(fixture("unbacked-promise"));
        for (const bad of ['{"x":1,"a67d7fa8-0000-4000-8000-000000000001":{"at":0}}', '"x"', "[1]"]) {
            writeFileSync(join(root, "tmp", "promise-hook", "state.json"), bad);
            assert.equal(JSON.parse(hook(text, root)).decision, "block", bad);
        }
        mkdirSync(join(root, "tmp", "commitments"), { recursive: true });
        const ledger = { commitments: [null, { session: "a67d7fa8-0000-4000-8000-000000000001" }] };
        writeFileSync(join(root, "tmp", "commitments", "ledger.json"), JSON.stringify(ledger));
        assert.match(decide(fixture("unbacked-promise"), root), /promises later work/);
    });

    it("blocks a reply once and a session at most once per 10 minutes, logging each block", () => {
        const root = checkout();
        const text = JSON.stringify(fixture("unbacked-promise"));
        const now = Date.now();
        assert.equal(JSON.parse(hook(text, root, now)).decision, "block");
        assert.equal(hook(text, root, now + 20 * MIN), "", "the same reply again");
        const other = JSON.stringify({ ...fixture("unbacked-promise"), last_assistant_message: "I'll check back." });
        assert.equal(hook(other, root, now + 5 * MIN), "", "inside the quiet period");
        assert.equal(JSON.parse(hook(other, root, now + 11 * MIN)).decision, "block");
        const log = readFileSync(join(root, "tmp", "promise-hook", "log.jsonl"), "utf8")
            .trim()
            .split("\n");
        assert.equal(log.length, 2);
        assert.equal(hook("not json", root), "");
    });

    it("runs as a command from a worktree, reading the main checkout's ledger", () => {
        const root = checkout();
        const r = spawnSync(process.execPath, [HOOK], {
            input: JSON.stringify(fixture("unbacked-promise")),
            env: { ...process.env, CLAUDE_PROJECT_DIR: join(root, ".worktrees", "some-branch") },
        });
        assert.equal(r.status, 0);
        assert.equal(JSON.parse(r.stdout.toString()).decision, "block");
    });
});

describe("commitments", () => {
    it("adds, lists, checks and closes entries for the session in the environment", () => {
        const root = checkout({ prs: [{ number: 5, state: "PENDING" }] });
        const env = { CLAUDE_CODE_SESSION_ID: "s1" };
        const id = cli(["add", "PR 5 merges", "pr:5"], root, env).out;
        cli(["add", "waiting on the owner", "owner"], root, env);
        assert.throws(() => cli(["add", "bad", "pr:x"], root, env), /needs a number/);
        assert.throws(() => add(root, "bad", "nope", "s1"), /backing must be/);
        assert.match(cli(["list"], root, env).out, /PR 5 merges/);
        assert.equal(cli(["list"], root, { CLAUDE_CODE_SESSION_ID: "s2" }).out, "");
        const ok = cli(["check"], root, env);
        assert.equal(ok.code, 0);
        assert.match(ok.out, /2 open, 0 stale/);
        writeFileSync(join(root, "tmp", "pr-status", "status.json"), JSON.stringify({ pullRequests: [] }));
        const bad = cli(["check", "--all"], root, env);
        assert.equal(bad.code, 1);
        assert.match(bad.out, /STALE: PR 5 is merged or closed/);
        assert.equal(cli(["done", id], root, env).code, 0);
        assert.match(cli(["check"], root, env).out, /1 open, 0 stale/);
    });

    it("keeps every entry when sessions add at the same instant", async () => {
        const root = checkout();
        const CLI = new URL("./commitments.mjs", import.meta.url).pathname;
        const { spawn } = await import("node:child_process");
        const runs = Array.from(
            { length: 12 },
            (_, i) =>
                new Promise((ok) => {
                    const p = spawn(process.execPath, [CLI, "add", `x${i}`, "owner", "--session", "s"], {
                        env: { ...process.env, CLAUDE_PROJECT_DIR: root },
                    });
                    p.on("exit", ok);
                }),
        );
        await Promise.all(runs);
        const ids = cli(["list"], root, { CLAUDE_CODE_SESSION_ID: "s" }).out.split("\n");
        assert.equal(ids.length, 12);
        assert.equal(new Set(ids.map((l) => l.split(" ")[0])).size, 12, "distinct ids");
    });

    it("does not call a PR newer than the PR status merged, and stores file paths absolute", () => {
        const root = checkout();
        writeFileSync(
            join(root, "tmp", "pr-status", "status.json"),
            JSON.stringify({ fetchedAt: new Date(Date.now() - MIN).toISOString(), pullRequests: [] }),
        );
        const c = add(root, "new PR", "pr:77", "s");
        assert.equal(liveness(c, root).live, null);
        assert.equal(liveness(c, root, Date.now(), null).why, "PR 77 is newer than the PR status");
        assert.match(add(root, "log", "file:tmp/x.log", "s").backing, /^file:\/.*\/tmp\/x\.log$/);
    });

    it("judges pid, file, round and issue backings", () => {
        const root = checkout({ roundAge: 90 });
        const c = (backing) => ({ backing, session: "s" });
        assert.equal(liveness(c(`pid:${process.pid}`), root).live, true);
        assert.equal(liveness(c("pid:999999999"), root).live, false);
        assert.equal(liveness(c(`file:${join(root, "tmp", "pr-status", "status.json")}`), root).live, true);
        assert.equal(liveness(c("file:/nonexistent"), root).live, false);
        assert.equal(liveness(c("round:issue-round"), root).live, false);
        assert.equal(liveness(c("issue:7"), root).live, null, "no cached labels yet");
        mkdirSync(join(root, "tmp", "commitments"), { recursive: true });
        writeFileSync(
            join(root, "tmp", "commitments", "in-progress.json"),
            JSON.stringify({ at: Date.now(), numbers: [7] }),
        );
        assert.equal(liveness(c("issue:7"), root).live, true);
        assert.equal(liveness(c("issue:8"), root).live, false);
    });
});
