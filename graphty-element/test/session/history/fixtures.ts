/**
 * @file The round-trip fixtures: for every undoable op, one command per value of its argument's
 * discriminant, run, undone and redone by `round-trip.test.ts` (on a session) and
 * `test/browser/history-round-trip.test.ts` (on a real `Graph`, for fixtures tagged `renderer`).
 *
 * Both run them over the same small graph: nodes `n1`, `n2` and `n3`, edges `n1 -> n2` and
 * `n2 -> n3`, and a session that can run `degree` and `shortest-path`.
 *
 * The vocabulary test fails when an undoable op, or a value of its discriminant, has no fixture
 * here, and when an op that changes what is drawn has no fixture tagged `renderer`. A phase that
 * adds an op adds its fixtures (design/undo/undo-plan.md, "How to read this plan", rule 3).
 */

import type { LayerSpec } from "../../../src/catalog/types";
import type { SessionCommand } from "../../../src/session/planning";
import type { GraphSession } from "../../../src/session/types";

/** One command whose round trip is checked. */
export interface RoundTripFixture {
    /** What the case is, for the test title. */
    readonly name: string;
    /** The command, run through `session.execute`. */
    readonly command: SessionCommand;
    /** The value of the command's discriminant it covers, for an op that has one. */
    readonly variant?: string;
    /** Where it runs: on a session, on a renderer, or both. */
    readonly tags: readonly ("session" | "renderer")[];
    /**
     * State to build before the command, as steps of their own. The round trip is checked from
     * the state after them.
     */
    readonly before?: (session: GraphSession) => Promise<void>;
}

/** Both twins run every style fixture. */
const BOTH = ["session", "renderer"] as const;

/**
 * A node layer a fixture adds. Its id is minted from its name: "Fixture A" is `fixture-a_1`.
 * @param name - The layer's name.
 * @param color - The colour it paints every node.
 * @returns The specification.
 */
function nodeLayer(name: string, color: string): LayerSpec {
    return { name, target: "node", selector: { match: "everything" }, set: { "node.color": color } };
}

/**
 * Add layers, each as a step of its own, and wait for the picture.
 * @param specs - The layers.
 * @returns The fixture's `before`.
 */
function withLayers(...specs: LayerSpec[]): (session: GraphSession) => Promise<void> {
    return async (session) => {
        for (const spec of specs) {
            await session.styles.add(spec);
        }
    };
}

/**
 * Run an algorithm without the layers it would paint by itself, and wait for everything.
 * @param session - The session.
 * @param algorithm - What to run.
 * @param as - The run's id.
 * @param params - Its parameters.
 */
async function runQuietly(
    session: GraphSession,
    algorithm: string,
    as: string,
    params: Readonly<Record<string, unknown>> = {},
): Promise<void> {
    await session.runs.start(algorithm, params, { as, style: false });
    await session.styles.settled();
}

/** Every fixture. */
export const FIXTURES: readonly RoundTripFixture[] = [
    {
        name: "style.patch add",
        variant: "add",
        tags: BOTH,
        command: { op: "style.patch", action: "add", spec: nodeLayer("Fixture A", "#ff0000") },
    },
    {
        name: "style.patch update",
        variant: "update",
        tags: BOTH,
        before: withLayers(nodeLayer("Fixture A", "#ff0000")),
        command: { op: "style.patch", action: "update", id: "fixture-a_1", patch: { set: { "node.color": "#00ff00" } } },
    },
    {
        name: "style.patch remove",
        variant: "remove",
        tags: BOTH,
        before: withLayers(nodeLayer("Fixture A", "#ff0000")),
        command: { op: "style.patch", action: "remove", id: "fixture-a_1" },
    },
    {
        name: "style.patch move",
        variant: "move",
        tags: BOTH,
        before: withLayers(nodeLayer("Fixture A", "#ff0000"), nodeLayer("Fixture B", "#0000ff")),
        command: { op: "style.patch", action: "move", id: "fixture-a_1", before: null },
    },
    {
        name: "style.patch removeBySource",
        variant: "removeBySource",
        tags: BOTH,
        before: withLayers(nodeLayer("Fixture A", "#ff0000"), nodeLayer("Fixture B", "#0000ff")),
        command: { op: "style.patch", action: "removeBySource", ids: ["fixture-a_1", "fixture-b_1"] },
    },
    {
        name: "style.patch highlight",
        variant: "highlight",
        tags: BOTH,
        before: (session) => runQuietly(session, "shortest-path", "route", { source: "n1", target: "n3" }),
        command: { op: "style.patch", action: "highlight", spec: { run: "route" } },
    },
    {
        name: "style.patch resolveToStatic",
        variant: "resolveToStatic",
        tags: BOTH,
        before: async (session) => {
            await runQuietly(session, "degree", "deg");
            await session.styles.encode({ run: "deg", channel: "node.color", name: "Fixture encoding" });
        },
        command: { op: "style.patch", action: "resolveToStatic", id: "fixture-encoding_1", channel: "node.color" },
    },
    {
        name: "style.encode",
        tags: BOTH,
        before: (session) => runQuietly(session, "degree", "deg"),
        command: { op: "style.encode", spec: { run: "deg", channel: "node.color", name: "Fixture encoding" } },
    },
    {
        name: "style.template",
        tags: BOTH,
        command: {
            op: "style.template",
            document: { version: 1, layers: [nodeLayer("Fixture T", "#00ffff")] },
            templateId: "fixture-template",
        },
    },
];
