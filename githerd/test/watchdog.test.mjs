import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { move, newJob } from "../lib/board.mjs";
import { decide, descendantTicks, sample, transcriptFiles, watchPass } from "../lib/watchdog.mjs";
import { fakeWorkers, sleep, typed } from "./helpers/fake-worker.mjs";

const T0 = new Date("2026-10-04T12:00:00Z");
const MIN = 60 * 1000;
const at = (/** @type {number} */ minutes) => new Date(T0.getTime() + minutes * MIN);

/**
 * A job in the given state, held by a worker.
 * @param {string} [state] `working` (default), `waiting` or `parked`
 * @returns {any} the job
 */
function job(state = "working") {
    const j = newJob({ kind: "issue", target: "737" }, T0);
    move(j, "starting", T0);
    move(j, "working", T0);
    if (state === "waiting") move(j, "waiting", T0, { waitingFor: { checks: "abc" } });
    if (state === "parked") move(j, "parked", T0, { waitingFor: { owner: "x" } });
    j.holder = { startedAt: T0.toISOString() };
    return j;
}

/**
 * What a pass saw.
 * @param {object} [over] fields to change
 * @returns {any} the look
 */
function look(over = {}) {
    return {
        alive: true,
        registry: { status: "idle" },
        screen: { kind: "empty-box" },
        progressed: false,
        viewed: false,
        ...over,
    };
}

describe("decide", () => {
    it("reports a dead session", () => {
        expect(decide(job(), look({ alive: false }), T0)).toEqual({ action: "dead" });
    });

    it("rings an idle working worker, waits 15 minutes for progress, rings again, then recycles", () => {
        const j = job();
        expect(decide(j, look(), T0).action).toBe("ring");
        j.watch.rings.push(T0.toISOString());
        expect(decide(j, look(), at(14)).action).toBe("none");
        expect(decide(j, look(), at(15)).action).toBe("ring");
        j.watch.rings.push(at(15).toISOString());
        expect(decide(j, look(), at(29)).action).toBe("none");
        expect(decide(j, look(), at(30))).toEqual({ action: "recycle", reason: "2 doorbells brought no progress" });
    });

    it("counts a ring as delivered once progress follows", () => {
        const j = job();
        decide(j, look(), T0);
        j.watch.rings.push(T0.toISOString());
        expect(decide(j, look({ progressed: true, registry: { status: "busy" } }), at(5)).action).toBe("none");
        expect(j.watch.rings).toEqual([]);
        expect(decide(j, look(), at(6)).action).toBe("ring");
    });

    it("interrupts a busy worker after 20 minutes without progress and recycles it 10 minutes later", () => {
        const j = job();
        const busy = look({ registry: { status: "busy" } });
        expect(decide(j, busy, T0).action).toBe("none");
        expect(decide(j, busy, at(19)).action).toBe("none");
        expect(decide(j, busy, at(20)).action).toBe("escape");
        j.watch.escapedAt = at(20).toISOString();
        expect(decide(j, look(), at(21)).action).toBe("ring");
        expect(decide(j, busy, at(29)).action).toBe("none");
        expect(decide(j, look(), at(30)).action).toBe("recycle");
    });

    it("never interrupts while the worker makes progress", () => {
        const j = job();
        for (let m = 0; m <= 60; m += 5) {
            expect(decide(j, look({ registry: { status: "busy" }, progressed: true }), at(m)).action).toBe("none");
        }
    });

    it("parks a working job on any dialog and leaves other states alone", () => {
        for (const kind of ["permission", "plan", "picker"]) {
            expect(decide(job(), look({ screen: { kind } }), T0).action).toBe("park");
        }
        const prompt = look({
            registry: { status: "waiting", waitingFor: "permission prompt" },
            screen: { kind: "unknown" },
        });
        expect(decide(job(), prompt, T0).action).toBe("park");
        expect(decide(job("parked"), prompt, T0).action).toBe("none");
    });

    it("stops on the usage-limit screen before anything else", () => {
        expect(decide(job(), look({ screen: { kind: "usage-limit" } }), T0).action).toBe("usage-limit");
    });

    it("does not ring into the owner's window or text, and hands the job over after 30 minutes", () => {
        const j = job();
        expect(decide(j, look({ viewed: true }), T0).action).toBe("none");
        expect(decide(j, look({ screen: { kind: "owner-text", text: "hi" } }), at(29)).action).toBe("none");
        expect(decide(j, look({ viewed: true }), at(30))).toEqual({
            action: "hand-over",
            reason: "the owner is viewing it",
        });
        const k = job();
        decide(k, look({ screen: { kind: "owner-text", text: "hi" } }), T0);
        expect(decide(k, look({ screen: { kind: "owner-text", text: "hi" } }), at(30)).reason).toBe(
            "the owner's unsent text is in it",
        );
    });

    it("leaves a steered job alone until it has been idle 2 hours", () => {
        const j = job();
        j.steeredAt = T0.toISOString();
        expect(decide(j, look({ screen: { kind: "permission" } }), T0).action).toBe("none");
        expect(decide(j, look({ registry: { status: "busy" } }), at(60)).action).toBe("none");
        expect(decide(j, look(), at(119)).action).toBe("none");
        expect(decide(j, look(), at(120)).action).toBe("steering-ended");
    });

    it("recycles an idle session after 3 compactions or 12 hours, waiting or working", () => {
        const j = job("waiting");
        j.compactions = 3;
        expect(decide(j, look(), T0)).toEqual({ action: "recycle", reason: "compacted 3 times" });
        expect(decide(job("waiting"), look(), at(12 * 60))).toEqual({ action: "recycle", reason: "lived 12 hours" });
        expect(decide(job("waiting"), look(), at(60)).action).toBe("none");
        expect(decide(job(), look({ registry: { status: "busy" } }), at(12 * 60)).action).not.toBe("recycle");
    });

    it("does nothing for a session with no registry entry", () => {
        expect(decide(job(), look({ registry: null }), T0).action).toBe("none");
    });
});

describe("progress counters", () => {
    /** @type {string} */
    let dir;
    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), "githerd-watchdog-"));
    });
    afterEach(() => rmSync(dir, { recursive: true, force: true }));

    /**
     * Writes a fake `/proc` entry.
     * @param {number} pid the pid
     * @param {number} ppid its parent
     * @param {number[]} ticks utime, stime, cutime, cstime
     * @param {string} argv0 the command
     */
    function proc(pid, ppid, [ut, st, cut, cst], argv0) {
        mkdirSync(join(dir, String(pid)), { recursive: true });
        const rest = ["S", ppid, 0, 0, 0, 0, 0, 0, 0, 0, 0, ut, st, cut, cst, 20, 0, 1, 0, 100];
        writeFileSync(join(dir, String(pid), "stat"), `${pid} (${argv0} (x)) ${rest.join(" ")}`);
        writeFileSync(join(dir, String(pid), "cmdline"), `${argv0}\0-c\0x\0`);
    }

    it("counts the commands' CPU and claude's reaped children, not claude or its MCP servers", () => {
        proc(100, 1, [500, 500, 7, 3], "claude");
        proc(101, 100, [900, 900, 0, 0], "/usr/bin/java");
        proc(102, 100, [1, 2, 3, 4], "/bin/bash");
        proc(103, 102, [10, 20, 0, 0], "/usr/bin/pnpm");
        proc(104, 103, [100, 0, 0, 0], "node");
        proc(200, 1, [5000, 0, 0, 0], "unrelated");
        writeFileSync(join(dir, "self"), "");
        expect(descendantTicks(100, dir)).toBe(10 + 10 + 30 + 100);
        expect(descendantTicks(999, dir)).toBe(0);
    });

    it("finds the transcripts of a session and its subagents and adds their sizes", () => {
        const cwd = "/home/a/x.worktrees/githerd-issue-7";
        const project = join(dir, "-home-a-x-worktrees-githerd-issue-7");
        mkdirSync(join(project, "s1", "subagents"), { recursive: true });
        writeFileSync(join(project, "s1.jsonl"), "12345");
        writeFileSync(join(project, "s1", "subagents", "agent-a.jsonl"), "123");
        writeFileSync(join(project, "s1", "subagents", "agent-a.meta"), "ignored");
        const files = transcriptFiles(dir, cwd, "s1");
        expect(files).toEqual([join(project, "s1.jsonl"), join(project, "s1", "subagents", "agent-a.jsonl")]);
        expect(transcriptFiles(dir, cwd, "s2")).toEqual([join(project, "s2.jsonl")]);
        writeFileSync(join(dir, "task.output"), "1234567");
        proc(100, 1, [0, 0, 0, 0], "claude");
        expect(sample({ pid: 100, transcripts: files, taskOutput: join(dir, "task.output"), procRoot: dir })).toEqual({
            transcript: 8,
            cpu: 0,
            task: 7,
        });
        expect(sample({ pid: 100, transcripts: [join(dir, "none")], procRoot: dir }).transcript).toBe(0);
    });
});

describe("watchPass", () => {
    /** @type {ReturnType<typeof fakeWorkers>} */
    let fw;
    beforeEach(() => {
        fw = fakeWorkers();
    });
    afterEach(async () => {
        await fw.cleanup();
    });

    /**
     * A working job held by a fake worker showing a screen.
     * @param {string} id the job id
     * @param {any} scenario the fake's scenario
     * @returns {Promise<any>} the job
     */
    async function held(id, scenario) {
        const started = await fw.start(id, scenario);
        if (!started.ok) throw new Error("the fake did not start");
        const j = newJob({ kind: "issue", target: id, id }, T0);
        move(j, "starting", T0);
        move(j, "working", T0);
        j.worktree = fw.dir;
        j.holder = { ...started.window, startTime: started.startTime, nonce: "n0nce", startedAt: T0.toISOString() };
        return j;
    }

    const options = () => ({ sessionsDir: fw.sessionsDir, projectsDir: join(fw.dir, "projects"), sleep });

    it("rings an idle worker and leaves an owner session alone", async () => {
        const j = await held("issue-20", { screen: "idle" });
        const owner = { id: "x", holder: { session: "owner" } };
        const state = { jobs: { [j.id]: j, x: owner } };
        const pass = await watchPass(state, T0, options());
        expect(pass).toEqual({ workers: 1, ledger: [{ kind: "doorbell", job: "issue-20" }], dead: [] });
        expect(typed(fw.keys("issue-20"))).toBe("[githerd n0nce] job issue-20 has news. Call githerd_next.");
        expect(j.watch.rings).toEqual([T0.toISOString()]);
        expect(await watchPass({ jobs: {} }, T0, options())).toEqual({ workers: 0, ledger: [], dead: [] });
    });

    it("does not ring while the owner's text is in the box", async () => {
        const j = await held("issue-21", { screen: "half-typed" });
        const pass = await watchPass({ jobs: { [j.id]: j } }, T0, options());
        expect(pass.ledger).toEqual([]);
        expect(fw.keys("issue-21")).toEqual([]);
    });

    it("records a doorbell a dialog swallowed, with the capture", async () => {
        const j = await held("issue-30", { screen: "idle", onType: "plan-approval" });
        const pass = await watchPass({ jobs: { [j.id]: j } }, T0, options());
        expect(pass.ledger).toMatchObject([
            { kind: "doorbell-blocked", job: "issue-30", why: "doorbell blocked by dialog" },
        ]);
        expect(pass.ledger[0].capture).toContain("Ready to code?");
        expect(j.watch.rings).toEqual([]);
    });

    it("parks a job on a permission prompt with one owner item naming the allow rule, typing nothing", async () => {
        const j = await held("issue-22", {
            screen: "permission",
            registry: { status: "waiting", waitingFor: "permission prompt" },
        });
        /** @type {any} */
        const state = { jobs: { [j.id]: j } };
        const pass = await watchPass(state, T0, options());
        expect(pass.ledger).toEqual([{ kind: "parked-on-permission", job: "issue-22", item: "permission-issue-22" }]);
        expect(j.state).toBe("parked");
        expect(j.waitingFor).toEqual({ owner: "permission-issue-22" });
        expect(j.holder.pane).toBeTruthy();
        const item = state.ownerItems["permission-issue-22"];
        expect(item.kind).toBe("permission rule");
        expect(item.question).toContain("Bash(date +%s > perm-probe.txt)");
        expect(item.options[0].choice).toContain("githerd answer permission-issue-22 allow");
        expect(fw.keys("issue-22")).toEqual([]);
    });

    it("stops starts on the usage-limit screen and raises one item when extra usage is on", async () => {
        const j = await held("issue-23", { screen: "usage-limit" });
        /** @type {any} */
        const state = { jobs: { [j.id]: j } };
        const pass = await watchPass(state, T0, options());
        expect(pass.ledger).toEqual([
            { kind: "usage-limit-screen", job: "issue-23", resets: "3pm (America/Los_Angeles)", extraUsage: true },
        ]);
        expect(state.apiStop).toMatchObject({ kind: "usage", resets: "3pm (America/Los_Angeles)" });
        expect(state.ownerItems["extra-usage"].blocks).toBe("workers");
        expect(fw.keys("issue-23")).toEqual([]);
    });

    it("interrupts a stalled busy worker with a status request, and recycles it ten minutes later", async () => {
        const j = await held("issue-24", { screen: "idle", registry: { status: "busy" } });
        const state = { jobs: { [j.id]: j } };
        await watchPass(state, T0, options());
        expect((await watchPass(state, at(20), options())).ledger).toEqual([{ kind: "escaped", job: "issue-24" }]);
        expect(j.news.at(-1).text).toContain("no progress for 20 minutes");
        const pass = await watchPass(state, at(30), options());
        expect(pass.ledger).toEqual([
            { kind: "recycled", job: "issue-24", reason: "no progress for 10 minutes after an interrupt" },
        ]);
        expect(j.state).toBe("queued");
        expect(j.attempts.at(-1).outcome).toContain("session recycled");
        expect(j.holder).toBeNull();
        expect(j.fresh).toBe(true);
        expect(
            fw
                .keys("issue-24")
                .filter((k) => k.typed === undefined)
                .map((k) => k.key ?? k.submit),
        ).toEqual(["Escape", "/exit"]);
    });

    it("counts the session's transcript growth as progress", async () => {
        const j = await held("issue-25", { screen: "idle", registry: { status: "busy" } });
        const state = { jobs: { [j.id]: j } };
        const project = join(fw.dir, "projects", fw.dir.replaceAll(/[^A-Za-z0-9]/g, "-"));
        mkdirSync(project, { recursive: true });
        const transcript = join(project, `sess-${j.holder.pid}.jsonl`);
        writeFileSync(transcript, "a");
        await watchPass(state, T0, options());
        writeFileSync(transcript, "ab");
        await watchPass(state, at(19), options());
        expect((await watchPass(state, at(25), options())).ledger).toEqual([]);
        expect(j.watch.progressAt).toBe(at(19).toISOString());
    });

    it("counts a push in the queue and a githerd_expect window as progress", async () => {
        const j = await held("issue-26", { screen: "idle", registry: { status: "busy" } });
        const state = { jobs: { [j.id]: j } };
        await watchPass(state, T0, { ...options(), pushQueued: () => true });
        expect(j.watch.progressAt).toBe(T0.toISOString());
        j.expect = { until: at(60).toISOString(), reason: "full build" };
        await watchPass(state, at(25), options());
        expect(j.watch.progressAt).toBe(at(25).toISOString());
    });

    it("hands a job over when the owner's text stays in the box for 30 minutes", async () => {
        const j = await held("issue-27", { screen: "half-typed" });
        const state = { jobs: { [j.id]: j } };
        await watchPass(state, T0, options());
        const pass = await watchPass(state, at(30), options());
        expect(pass.ledger).toEqual([
            {
                kind: "window-left-to-owner",
                job: "issue-27",
                window: "githerd-issue-27",
                reason: "the owner's unsent text is in it",
            },
        ]);
        expect(j.state).toBe("queued");
        expect(j.holder).toBeNull();
    });

    it("ends steering after two idle hours", async () => {
        const j = await held("issue-28", { screen: "idle" });
        j.steeredAt = T0.toISOString();
        const state = { jobs: { [j.id]: j } };
        await watchPass(state, T0, options());
        expect((await watchPass(state, at(120), options())).ledger).toEqual([
            { kind: "steering-ended", job: "issue-28" },
        ]);
        expect(j.steeredAt).toBeNull();
    });

    it("reports a session whose process is gone", async () => {
        const j = await held("issue-29", { screen: "idle" });
        j.holder.startTime = "1";
        expect(await watchPass({ jobs: { [j.id]: j } }, T0, options())).toEqual({
            workers: 1,
            ledger: [],
            dead: ["issue-29"],
        });
    });
});
