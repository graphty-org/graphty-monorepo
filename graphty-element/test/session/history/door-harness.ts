/**
 * @file Calling one door with a spy on the dispatcher, shared by the Node and browser halves of
 * the doors test.
 */

import { assert } from "vitest";

import type { Door, DoorCall } from "../../../src/session/commands/doors";
import type { Dispatcher } from "../../../src/session/project/Dispatcher";

/** How long a door's returned promise is given to settle before its dispatches are read. */
const SETTLE_MS = 500;

/**
 * Call a door on `target` and collect every command dispatched while it runs and settles.
 * Whatever the call throws or rejects with is ignored: only what it dispatched is asked.
 * @param dispatcher - The dispatcher to spy on.
 * @param target - The object the door is a member of.
 * @param member - The member.
 * @param call - How to call it.
 * @returns The commands dispatched, in order.
 */
export async function dispatchesOf(
    dispatcher: Dispatcher,
    target: object,
    member: string,
    call: DoorCall,
): Promise<unknown[]> {
    const restore = call.kind === "call" ? await call.around?.(target) : undefined;
    const seen: unknown[] = [];
    const previous = dispatcher.events.dispatched;
    dispatcher.events.dispatched = (command) => {
        seen.push(command);
    };
    try {
        let result: unknown;
        try {
            if (call.kind === "set") {
                (target as Record<string, unknown>)[member] = call.value;
            } else {
                const args = typeof call.args === "function" ? call.args() : call.args;
                const method = (target as Record<string, unknown>)[member];
                assert.isFunction(method, `${member} is not a method`);
                result = (method as (...values: unknown[]) => unknown).apply(target, [...args]);
            }
        } catch {
            // A refusal is an answer; what was dispatched before it is what is asked.
        }

        let timer: ReturnType<typeof setTimeout> | undefined;
        await Promise.race([
            Promise.resolve(result).catch(() => undefined),
            new Promise((resolve) => {
                timer = setTimeout(resolve, SETTLE_MS);
            }),
        ]);
        clearTimeout(timer);
        return seen;
    } finally {
        dispatcher.events.dispatched = previous;
        await restore?.();
    }
}

/**
 * Check one row's calls against what it dispatched.
 * @param label - `Root.member`, for the message.
 * @param door - The row.
 * @param seen - What calling it dispatched.
 */
export function checkDispatches(label: string, door: Door, seen: readonly unknown[]): void {
    if (door.kind === "knownGap") {
        assert.deepEqual(
            seen,
            [],
            `${label} is knownGap but dispatched: port it in doors.ts (dispatches or partial) with its expected commands`,
        );
    } else if (door.kind === "dispatches" || door.kind === "partial") {
        assert.isNotEmpty(seen, `${label} is ${door.kind} but dispatched nothing`);
        assert.deepEqual(
            seen,
            door.expect,
            `${label} dispatched something other than its row expects: ${JSON.stringify(seen)}`,
        );
    }
}

/**
 * The call of a row that has one.
 * @param door - The row.
 * @returns Its call, or undefined for a row that is not called.
 */
export function callOf(door: Door): DoorCall | undefined {
    return door.kind === "dispatches" || door.kind === "partial" || door.kind === "knownGap" ? door.call : undefined;
}
