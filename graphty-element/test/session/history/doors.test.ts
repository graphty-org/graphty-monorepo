/**
 * @file The door list's ratchet, and the session half of the doors test.
 *
 * The ratchet holds for every row: a `knownGap` or `partial` row names a phase after the one the
 * branch has reached (`PLAN_PHASE`), so a phase cannot finish while a door it promised is still
 * open; exempt rows give a reason; a row that dispatches, or will, says how to call it.
 *
 * The session half calls every such row of the session's roots on a real session with a spy on
 * its dispatcher: a `knownGap` door must dispatch nothing, and a `dispatches` or `partial` door
 * exactly the commands its row expects. The renderer's roots are called by
 * `test/browser/doors.test.ts`.
 */

import { assert, describe, it } from "vitest";

import { COMMANDS } from "../../../commands";
import type { GraphStore } from "../../../src/data/GraphStore";
import { type Door, DOOR_ROOTS, PHASES, PLAN_PHASE } from "../../../src/session/commands/doors";
import { createElementSession, dispatcherOf } from "../../../src/session/GraphSession";
import { ingestNode } from "../../../src/session/project/ingest";
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
 * @returns Its selection.
 */
function selectOne(session: ElementSession): object {
    ingestNode(session.data.store as GraphStore, "d1", { id: "d1" });
    // Applied at once; the promise only reports the delta.
    void session.selection.apply({ nodes: ["d1"] });
    return session.selection;
}

/** How the session half reaches an instance of each session root. */
const SESSION_ROOTS: Readonly<Record<string, (session: ElementSession) => object>> = {
    GraphSession: (session) => session,
    ElementSession: (session) => session,
    SessionHistory: (session) => session.history,
    SessionDataApi: (session) => session.data,
    SessionGraphStore: (session) => session.data.store,
    RunsApi: (session) => session.runs,
    Run: (session) => {
        const run = session.runs.start("degree");
        run.then(undefined, () => undefined);
        return run;
    },
    ScopeApi: (session) => {
        session.scope.save("door seed", "graph");
        return session.scope;
    },
    SelectionApi: selectOne,
    SelectionOwner: selectOne,
    SessionViews: (session) => session.views,
    SessionConfig: (session) => session.config,
    VisibilityApi: (session) => session.visibility,
    SessionVisibilityApi: (session) => session.visibility,
    StylesApi: (session) => session.styles,
    SessionStylesApi: (session) => session.styles,
    ElementPositions: (session) => session.positions,
};

describe("the door ratchet", () => {
    it("has reached a phase of the plan", () => {
        assert.include(PHASES, PLAN_PHASE);
    });

    it("leaves no knownGap or partial row at or below the phase reached", () => {
        const reached = PHASES.indexOf(PLAN_PHASE);
        const overdue = rows()
            .filter(
                ([, door]) =>
                    (door.kind === "knownGap" || door.kind === "partial") && PHASES.indexOf(door.phase) <= reached,
            )
            .map(
                ([label, door]) =>
                    `${label} (${door.kind === "knownGap" || door.kind === "partial" ? door.phase : ""})`,
            );

        assert.deepEqual(overdue, [], `rows still open at phase ${PLAN_PHASE}`);
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
            .filter(([op, meta]) => meta.undo === "undoable" && !reached.has(op))
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
            const reach = SESSION_ROOTS[root.name] as ((session: ElementSession) => object) | undefined;
            assert.isDefined(reach, `the session half has no way to reach a ${root.name}`);
            for (const [member, door] of called) {
                const session = createElementSession();
                const call = callOf(door);
                assert.isDefined(call);
                const seen = await dispatchesOf(dispatcherOf(session), reach(session), member, call);
                checkDispatches(`${root.name}.${member}`, door, seen);
                session.dispose();
            }
        });
    }
});
