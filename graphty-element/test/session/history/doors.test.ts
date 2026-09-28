/**
 * @file The door list's ratchet, and the session half of the doors test.
 *
 * The rule holds for every row: no `knownGap` or `partial` row remains; exempt rows give a
 * reason; a row that dispatches, or will, says how to call it.
 *
 * The session half calls every such row of the session's roots on a real session with a spy on
 * its dispatcher: a `knownGap` door must dispatch nothing, and a `dispatches` or `partial` door
 * exactly the commands its row expects. The renderer's roots are called by
 * `test/browser/doors.test.ts`.
 */

import { assert, describe, it } from "vitest";

import { COMMANDS } from "../../../commands";
import { type Door, DOOR_ROOTS, GESTURE_DOORS } from "../../../src/session/commands/doors";
import { createElementSession, dispatcherOf } from "../../../src/session/GraphSession";
import type { ElementSession } from "../../../src/session/types";
import { callOf, checkDispatches, dispatchesOf } from "./door-harness";

/** Every row, labelled `Root.member`; a whole-type root is one row labelled `Root.*`. */
function rows(): [string, Door][] {
    return DOOR_ROOTS.flatMap((root) =>
        root.whole === undefined
            ? Object.entries(root.doors ?? {}).map(([member, door]): [string, Door] => [`${root.name}.${member}`, door])
            : [[`${root.name}.*`, root.whole]],
    );
}

/**
 * The selection of a session holding one node, "d1", selected.
 * @param session - The session.
 * @returns Its selection, once the node is in and selected.
 */
async function selectOne(session: ElementSession): Promise<object> {
    await session.data.addNodes([{ id: "d1" }]);
    await session.selection.apply({ nodes: ["d1"] });
    return session.selection;
}

/** How the session half reaches an instance of each session root. */
const SESSION_ROOTS: Readonly<Record<string, (session: ElementSession) => object | Promise<object>>> = {
    GraphSession: (session) => session,
    ElementSession: (session) => session,
    SessionHistory: (session) => session.history,
    SessionDataApi: (session) => session.data,
    SessionGraphStore: (session) => session.data.store,
    RunsApi: (session) => session.runs,
    // Cancelled, so `rerun` has something to run again.
    Run: (session) => {
        const run = session.runs.start("degree");
        run.then(undefined, () => undefined);
        run.cancel();
        return run;
    },
    ScopeApi: (session) => {
        session.scope.save("door seed", "graph");
        return session.scope;
    },
    SetsApi: async (session) => {
        await selectOne(session);
        session.sets.create({ kind: "fixed", nodes: ["d1"], reading: "induced" }, { name: "door seed" });
        return session.sets;
    },
    SelectionApi: selectOne,
    SelectionOwner: selectOne,
    SessionViews: (session) => session.views,
    SessionLayout: (session) => session.layout,
    SessionConfig: (session) => session.config,
    VisibilityApi: (session) => session.visibility,
    SessionVisibilityApi: (session) => session.visibility,
    StylesApi: (session) => session.styles,
    SessionStylesApi: (session) => session.styles,
    SessionPositions: (session) => session.positions,
};

describe("the door ratchet", () => {
    it("leaves no knownGap or partial row", () => {
        const open = rows()
            .filter(([, door]) => door.kind === "knownGap" || door.kind === "partial")
            .map(
                ([label, door]) =>
                    `${label} (issue #${door.kind === "knownGap" || door.kind === "partial" ? door.issue : 0})`,
            );

        assert.deepEqual(open, [], "rows that change project state without a step");
    });

    it("gives every exempt and partial row a reason", () => {
        const silent = rows()
            .filter(([, door]) => (door.kind === "exempt" || door.kind === "partial") && door.reason.trim() === "")
            .map(([label]) => label);

        assert.deepEqual(silent, []);
    });

    it("says how to call every row that dispatches or will, and only those", () => {
        const wrong = rows()
            .filter(([, door]) => {
                if (door.kind === "knownGap") {
                    return (door.op === undefined) !== (door.call === undefined);
                }

                return (door.kind === "dispatches" || door.kind === "partial") && door.expect.length === 0;
            })
            .map(([label]) => label);

        assert.deepEqual(wrong, []);
    });

    it("names only ops in the vocabulary for rows that dispatch", () => {
        const unknown = rows()
            .filter(([, door]) => door.kind === "dispatches" || door.kind === "partial")
            .flatMap(([label, door]) =>
                door.kind === "dispatches" || door.kind === "partial"
                    ? [door.op, ...door.expect.map((command) => (command as { op?: string }).op ?? "")]
                          .filter((op) => !Object.hasOwn(COMMANDS, op))
                          .map((op) => `${label}: ${op}`)
                    : [],
            );

        assert.deepEqual(unknown, []);
    });

    it("reaches every undoable op in the vocabulary from some door", () => {
        const reached = new Set(
            rows().flatMap(([, door]) =>
                door.kind === "dispatches" ||
                door.kind === "partial" ||
                (door.kind === "knownGap" && door.op !== undefined)
                    ? [door.op]
                    : [],
            ),
        );
        const unreached = Object.entries(COMMANDS)
            .filter(([op, meta]) => meta.undo === "undoable" && !reached.has(op) && !(op in GESTURE_DOORS))
            .map(([op]) => op);

        assert.deepEqual(unreached, []);
    });
});

describe("the session's doors", () => {
    it("sees what a door dispatches, so a knownGap door that starts dispatching fails", async () => {
        const session = createElementSession();
        const command = { op: "no.such-op" };

        const seen = await dispatchesOf(dispatcherOf(session), session, "execute", { kind: "call", args: [command] });

        assert.deepEqual(seen, [command]);
        session.dispose();
    });

    for (const root of DOOR_ROOTS.filter((each) => each.half === "session" && each.doors !== undefined)) {
        const called = Object.entries(root.doors ?? {}).filter(([, door]) => callOf(door) !== undefined);
        if (called.length === 0) {
            continue;
        }

        it(`${root.name}: every called row dispatches what its row says`, async () => {
            const reach = SESSION_ROOTS[root.name] as
                | ((session: ElementSession) => object | Promise<object>)
                | undefined;
            assert.isDefined(reach, `the session half has no way to reach a ${root.name}`);
            for (const [member, door] of called) {
                const session = createElementSession();
                const call = callOf(door);
                assert.isDefined(call);
                // Awaited only when it is a promise: a `Run` is a thenable, and awaiting it would
                // adopt its outcome instead of handing back the handle.
                const reached = reach(session);
                const target = reached instanceof Promise ? await reached : reached;
                const seen = await dispatchesOf(dispatcherOf(session), target, member, call);
                checkDispatches(`${root.name}.${member}`, door, seen);
                session.dispose();
            }
        });
    }
});
