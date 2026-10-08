/**
 * Back-pressure on new work (the owner's rule of 2026-10-08): no fixed per-session allowance
 * limits how many jobs a session takes; the machine's shared resources do. While any of them is
 * saturated, githerd invites no session to a new job and its status question says to take none;
 * once all have room, both resume on the next poll. Each is a state check, never a timer.
 *
 * - The push queue (`tmp/push-queue/` of the main checkout): pushes waiting behind the running gates.
 * - GitHub Actions: the repository's runs queued for a runner, one cheap call per poll.
 * - The machine-wide test slots (`tools/test-slots.mjs` of the main checkout, when it has one):
 *   every slot taken and runs waiting for one.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { pushQueueTickets } from "./proc.mjs";

/**
 * The test slot state, read through the main checkout's own `tools/test-slots.mjs`, so its slot
 * count and liveness rules are the ones every test run uses; null when the checkout has none.
 * @param {string} root the main checkout
 * @returns {Promise<{slots: number, live: number} | null>} the slot count (0: no limit) and the live tickets
 */
export async function testSlots(root) {
    const file = join(root, "tools", "test-slots.mjs");
    if (!existsSync(file)) return null;
    const mod = await import(pathToFileURL(file).href);
    return { slots: mod.slotCount(), live: mod.liveTickets(join(root, "tmp", "test-slots")).length };
}

/**
 * Which shared constraints hold new work back now, in words for the board and the sessions; empty
 * when every one has room. A source that cannot be read (the API budget refused the call, the slot
 * script failed) holds nothing back.
 * @param {{root: string, repo: string, get: (path: string) => Promise<{body?: any}>,
 *   slots?: (root: string) => Promise<{slots: number, live: number} | null>}} opts the main
 *   checkout, the repository, a GitHub GET, and the test slot reader (`testSlots`)
 * @returns {Promise<string[]>} the constraints that hold
 */
export async function backPressure({ root, repo, get, slots = testSlots }) {
    const held = [];
    const { waiters } = pushQueueTickets(root);
    if (waiters > 0) held.push(`${waiters} push${waiters > 1 ? "es" : ""} waiting in the push queue`);
    // ponytail: any queued run counts, even one a runner takes seconds later; a poll that catches
    // that window holds invitations for one poll. Require an age if it flickers.
    const queued = await get(`repos/${repo}/actions/runs?status=queued&per_page=1`).then(
        (r) => r.body?.total_count ?? 0,
        () => 0,
    );
    if (queued > 0) held.push(`${queued} GitHub Actions run${queued > 1 ? "s" : ""} queued for a runner`);
    const t = await slots(root).catch(() => null);
    if (t && t.slots > 0 && t.live > t.slots) held.push(`${t.live - t.slots} test runs waiting for a test slot`);
    return held;
}

/**
 * The board's and status's lines on new work: one naming what holds it back, none while the
 * shared resources have room.
 * @param {string[] | undefined} pressure the constraints that hold (`state.pressure`)
 * @returns {string[]} the lines
 */
export function newWorkLines(pressure) {
    return pressure?.length ? [`  NEW WORK HELD BACK: ${pressure.join("; ")}`] : [];
}
