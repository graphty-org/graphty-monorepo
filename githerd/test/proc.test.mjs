import { spawn } from "node:child_process";
import { once } from "node:events";

import { afterEach, describe, expect, it } from "vitest";

import { bootId, identify, sameProcess } from "../lib/proc.mjs";

/** @type {import("node:child_process").ChildProcess[]} */
const children = [];

/**
 * Starts a sleeping node child in its own process group, with a marker on its command line.
 * @param {string} marker text to put on the command line
 * @returns {import("node:child_process").ChildProcess} the child
 */
function startChild(marker) {
    const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)", marker], {
        detached: true,
        stdio: "ignore",
    });
    children.push(child);
    return child;
}

/**
 * Whether any process in the group is alive.
 * @param {number} pgid the group id
 * @returns {boolean} true if the group exists
 */
function groupAlive(pgid) {
    try {
        process.kill(-pgid, 0);
        return true;
    } catch {
        return false;
    }
}

afterEach(async () => {
    for (const child of children.splice(0)) {
        if (child.exitCode === null && child.signalCode === null) {
            const exited = once(child, "exit");
            process.kill(-child.pid, "SIGKILL");
            await exited;
        }
        expect(groupAlive(child.pid)).toBe(false);
    }
});

describe("identify", () => {
    it("returns pid, start time and boot id of a live process", () => {
        const id = identify(process.pid);
        expect(id.pid).toBe(process.pid);
        expect(id.startTime).toMatch(/^\d+$/);
        expect(id.bootId).toBe(bootId());
        expect(id.bootId).toMatch(/^[0-9a-f-]{36}$/);
    });

    it("returns null for a process that does not exist", async () => {
        const child = startChild("githerd-gone");
        const exited = once(child, "exit");
        process.kill(-child.pid, "SIGKILL");
        await exited;
        expect(identify(child.pid)).toBeNull();
    });
});

describe("sameProcess", () => {
    it("matches a live child", () => {
        const child = startChild("run-20261002-0001-ab");
        const record = identify(child.pid);
        expect(sameProcess(record)).toBe(true);
        expect(sameProcess(record, { cmdlineIncludes: "run-20261002-0001-ab" })).toBe(true);
    });

    it("does not match when the start time differs", () => {
        const record = identify(startChild("x").pid);
        expect(sameProcess({ ...record, startTime: String(Number(record.startTime) + 1) })).toBe(false);
    });

    it("does not match when the boot id differs", () => {
        const record = identify(startChild("x").pid);
        expect(sameProcess({ ...record, bootId: "00000000-0000-0000-0000-000000000000" })).toBe(false);
    });

    it("does not match when the command line lacks the run id", () => {
        const record = identify(startChild("run-20261002-0001-ab").pid);
        expect(sameProcess(record, { cmdlineIncludes: "run-20261002-0002-cd" })).toBe(false);
    });

    it("does not match a process that has exited", async () => {
        const child = startChild("x");
        const record = identify(child.pid);
        const exited = once(child, "exit");
        process.kill(-child.pid, "SIGKILL");
        await exited;
        expect(sameProcess(record)).toBe(false);
    });
});
