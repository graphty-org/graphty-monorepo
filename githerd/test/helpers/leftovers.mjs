/**
 * Finds and kills what a test left running in its directory, read from /proc rather than from the
 * test's own records, so a process the test never learned the pid of (a push spawned after the
 * test gave up on it, a hook's children) is found all the same.
 */
import { readdirSync, readFileSync } from "node:fs";

import { expect, vi } from "vitest";

/**
 * The process groups of every running process whose command line names a path under a directory.
 * A zombie has exited and is not counted.
 * @param {string} dir the directory
 * @returns {number[]} the groups, each once
 */
export function groupsUsing(dir) {
    const groups = new Set();
    for (const pid of readdirSync("/proc")) {
        if (!/^\d+$/.test(pid)) continue;
        try {
            if (!readFileSync(`/proc/${pid}/cmdline`, "utf8").includes(dir)) continue;
            const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
            const fields = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
            // Field 3 is the state, field 5 the process group.
            if (fields[0] !== "Z") groups.add(Number(fields[5 - 3]));
        } catch {
            // Gone while being read.
        }
    }
    return [...groups];
}

/**
 * Kills every process group `groupsUsing` finds for a directory and waits until none runs.
 * @param {string} dir the directory
 * @returns {Promise<number[]>} the groups it found and killed
 */
export async function reapGroupsUsing(dir) {
    const groups = groupsUsing(dir);
    for (const g of groups) {
        try {
            process.kill(-g, "SIGKILL");
        } catch {
            // Gone.
        }
    }
    await vi.waitFor(() => expect(groupsUsing(dir)).toEqual([]), { timeout: 15_000, interval: 20 });
    return groups;
}
