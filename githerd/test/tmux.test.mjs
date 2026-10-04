import { execFileSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { identify } from "../lib/proc.mjs";
import {
    capturePane,
    doorbellText,
    endSession,
    interrupt,
    pressKey,
    readRegistry,
    ring,
    running,
    typeLine,
    viewed,
} from "../lib/tmux.mjs";
import { fakeWorkers, killServer, sleep, typed } from "./helpers/fake-worker.mjs";

/** @type {ReturnType<typeof fakeWorkers>} */
let fw;
/** A second private tmux server whose pane runs an attached client, when a test needs one. */
let viewer = "";

beforeEach(() => {
    fw = fakeWorkers();
});

afterEach(async () => {
    if (viewer) {
        killServer(viewer);
        viewer = "";
    }
    await fw.cleanup();
});

describe("startWorker", () => {
    it("opens a window named for the job with the worker command line and finds its registry entry", async () => {
        const started = await fw.start("issue-737", { screen: "idle" });
        expect(started.ok).toBe(true);
        const windows = execFileSync(
            "tmux",
            ["-L", fw.socket, "list-windows", "-t", "githerd", "-F", "#{window_name}"],
            {
                encoding: "utf8",
            },
        );
        expect(windows.split("\n")).toContain("issue-737");
        expect(started.window).toMatchObject({ socket: fw.socket, name: "githerd-issue-737" });
        expect(started.registry).toMatchObject({ pid: started.window.pid, name: "githerd-issue-737", status: "idle" });
        expect(started.startTime).toBe(identify(started.window.pid)?.startTime);
        expect(readRegistry(fw.sessionsDir, started.window.pid)).toEqual(started.registry);
        const [{ argv }] = execFileSync("cat", [`${fw.dir}/issue-737.keys`], { encoding: "utf8" })
            .split("\n")
            .filter(Boolean)
            .map((l) => JSON.parse(l));
        expect(argv.slice(0, 4)).toEqual(["--model", "claude-opus-5-5", "-n", "githerd-issue-737"]);
        expect(argv.at(-2)).toBe("--");
    });

    it("is a start failure with the capture when no registry entry appears, and kills the window", async () => {
        const started = await fw.start("issue-1", { screen: "plan-approval", registry: null });
        expect(started.ok).toBe(false);
        if (started.ok) return;
        expect(started.capture).toContain("Ready to code?");
        const windows = execFileSync("tmux", ["-L", fw.socket, "list-windows", "-a", "-F", "#{window_name}"], {
            encoding: "utf8",
        });
        expect(windows).not.toContain("issue-1");
        expect(readRegistry(fw.sessionsDir, started.window.pid)).toBeNull();
    });
});

describe("typeLine and pressKey", () => {
    it("type a command into the empty box and send a key to a screen the caller opened", async () => {
        const { window } = await fw.start("issue-3", { screen: "idle" });
        expect(await typeLine(window, "/usage", sleep)).toEqual({ sent: true });
        pressKey(window, "Escape");
        for (let i = 0; i < 100 && fw.keys("issue-3").at(-1)?.key !== "Escape"; i++) await delay(20);
        const keys = fw.keys("issue-3");
        expect(keys.find((k) => k.submit !== undefined)).toEqual({ submit: "/usage" });
        expect(keys.at(-1)).toEqual({ key: "Escape" });
    });
});

describe("ring", () => {
    it("types the doorbell into the empty box, checks it landed, and submits it", async () => {
        const { window } = await fw.start("issue-2", { screen: "idle" });
        expect(await ring(window, { nonce: "n0nce", job: "issue-2", sleep })).toEqual({ rung: true });
        const keys = fw.keys("issue-2");
        expect(typed(keys)).toBe(doorbellText("n0nce", "issue-2"));
        expect(keys.at(-1)).toEqual({ submit: "[githerd n0nce] job issue-2 has news. Call githerd_next." });
    });

    it.each([
        "permission",
        "subagent-permission",
        "plan-approval",
        "picker",
        "usage-limit",
        "half-typed",
        "suggestion",
    ])("never sends a key to a pane showing %s", async (screen) => {
        const { window } = await fw.start("issue-3", { screen });
        const rang = await ring(window, { nonce: "n0nce", job: "issue-3", sleep });
        expect(rang.rung).toBe(false);
        expect(fw.keys("issue-3")).toEqual([]);
    });

    it("clears a doorbell that a dialog swallowed and never sends Enter", async () => {
        const { window } = await fw.start("issue-4", { screen: "idle", onType: "permission" });
        const rang = await ring(window, { nonce: "n0nce", job: "issue-4", sleep });
        expect(rang).toMatchObject({ rung: false, why: "doorbell blocked by dialog" });
        if (!rang.rung) expect(rang.capture).toContain("Do you want to proceed?");
        // tmux has delivered C-u when ring returns, but the fake logs a key only once it has read
        // it from its terminal, which can come later on a busy machine.
        await expect.poll(() => fw.keys("issue-4").at(-1)).toEqual({ key: "C-u" });
        expect(fw.keys("issue-4").some((k) => k.submit !== undefined)).toBe(false);
    });

    it("does not ring while a client views the window", async () => {
        const { window } = await fw.start("issue-5", { screen: "idle" });
        expect(viewed(window)).toBe(false);
        viewer = `${fw.socket}-viewer`;
        const attach = `env -u TMUX tmux -L ${fw.socket} attach -t githerd`;
        execFileSync("tmux", ["-L", viewer, "new-session", "-d", "-x", "200", "-y", "50", attach]);
        execFileSync("tmux", ["-L", fw.socket, "select-window", "-t", window.window]);
        for (let i = 0; i < 100 && !viewed(window); i++) await delay(20);
        expect(await ring(window, { nonce: "n0nce", job: "issue-5", sleep })).toEqual({ rung: false, why: "viewed" });
        expect(fw.keys("issue-5")).toEqual([]);
    });
});

describe("interrupt", () => {
    it("sends Escape when no dialog shows, and nothing to a dialog", async () => {
        const idle = await fw.start("issue-6", { screen: "idle" });
        expect(interrupt(idle.window)).toEqual({ sent: true });
        for (let i = 0; i < 100 && !fw.keys("issue-6").length; i++) await delay(20);
        expect(fw.keys("issue-6")).toEqual([{ key: "Escape" }]);
        const dialog = await fw.start("issue-7", { screen: "permission" });
        expect(interrupt(dialog.window)).toMatchObject({ sent: false, why: "permission" });
        expect(fw.keys("issue-7")).toEqual([]);
    });
});

describe("endSession", () => {
    it("types /exit into an idle session and waits for it to go", async () => {
        const { window, startTime } = await fw.start("issue-8", { screen: "idle" });
        expect(await endSession({ ...window, startTime }, { sleep })).toBe("exit");
        expect(running(window.pid, startTime)).toBe(false);
        expect(capturePane(window)).toBe("");
    });

    it("sends SIGTERM to a session showing a dialog", async () => {
        const { window, startTime } = await fw.start("issue-9", { screen: "permission" });
        expect(await endSession({ ...window, startTime }, { sleep })).toBe("sigterm");
        expect(fw.keys("issue-9")).toEqual([]);
    });

    it("only removes the window of a session that is already gone", async () => {
        const { window } = await fw.start("issue-10", { screen: "idle" });
        expect(await endSession({ ...window, startTime: "0" }, { sleep })).toBe("gone");
        expect(capturePane(window)).toBe("");
    });
});
