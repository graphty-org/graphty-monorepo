import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { backPressure, testSlots } from "../lib/pressure.mjs";

/** A pid above Linux's largest pid_max (2^22), so no process ever has it. */
const DEAD = 4_194_305;

describe("back-pressure on new work", () => {
    /** @type {string} */
    let root;
    beforeEach(() => {
        root = mkdtempSync(join(tmpdir(), "githerd-pressure-"));
        mkdirSync(join(root, "tools"));
        writeFileSync(join(root, "tools", "push-queue.sh"), "");
        mkdirSync(join(root, "tmp", "push-queue"), { recursive: true });
    });
    afterEach(() => rmSync(root, { recursive: true, force: true }));

    /**
     * Writes a push queue ticket.
     * @param {number} n its arrival
     * @param {number} pid its process
     * @returns {string} its path
     */
    const ticket = (n, pid) => {
        const path = join(root, "tmp", "push-queue", `1-${n}-${pid}`);
        writeFileSync(path, `${root} :: git push`);
        return path;
    };
    const idle = { get: async () => ({ body: { total_count: 0 } }), slots: async () => null };

    it("holds nothing back while every shared resource has room", async () => {
        for (const n of [1, 2, 3]) ticket(n, process.pid);
        expect(await backPressure({ root, repo: "o/r", ...idle })).toEqual([]);
    });

    it("holds new work back while pushes wait for a gate, and prunes dead tickets", async () => {
        for (const n of [1, 2, 3, 4, 5]) ticket(n, process.pid);
        const dead = ticket(6, DEAD);
        expect(await backPressure({ root, repo: "o/r", ...idle })).toEqual(["2 pushes waiting in the push queue"]);
        expect(existsSync(dead)).toBe(false);
    });

    it("holds new work back while the repository's Actions runs are queued for a runner", async () => {
        /** @type {string[]} */
        const asked = [];
        const get = async (/** @type {string} */ path) => {
            asked.push(path);
            return { body: { total_count: 3 } };
        };
        expect(await backPressure({ root, repo: "o/r", get, slots: idle.slots })).toEqual([
            "3 GitHub Actions runs queued for a runner",
        ]);
        expect(asked).toEqual(["repos/o/r/actions/runs?status=queued&per_page=1"]);
        // A refused call (the API budget) holds nothing back.
        const refused = async () => Promise.reject(new Error("poll call held back"));
        expect(await backPressure({ root, repo: "o/r", get: refused, slots: idle.slots })).toEqual([]);
    });

    it("holds new work back while every test slot is taken and runs wait", async () => {
        const at = (/** @type {number} */ live, /** @type {number} */ slots) =>
            backPressure({ root, repo: "o/r", get: idle.get, slots: async () => ({ slots, live }) });
        expect(await at(6, 4)).toEqual(["2 test runs waiting for a test slot"]);
        expect(await at(4, 4)).toEqual([]);
        expect(await at(9, 0)).toEqual([]);
    });

    it("reads the test slots through the checkout's own test-slots script, and skips a checkout without one", async () => {
        expect(await testSlots(root)).toBeNull();
        writeFileSync(
            join(root, "tools", "test-slots.mjs"),
            "export const slotCount = () => 4;\nexport const liveTickets = (dir) => dir.endsWith('test-slots') ? [1, 2, 3, 4, 5] : [];\n",
        );
        expect(await testSlots(root)).toEqual({ slots: 4, live: 5 });
    });
});
