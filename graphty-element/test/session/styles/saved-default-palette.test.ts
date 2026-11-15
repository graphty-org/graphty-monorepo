/**
 * @file A saved look names the palette each colour binding that names none was painted through,
 * so a file never depends on the reading build's default palettes (issue #6514). The session's
 * own layers keep their bindings as written.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../src/session";

/** A binding's own colours, which name no palette and take none. */
const STOPS = [
    { at: 0, value: "#000000" },
    { at: 11, value: "#ffffff" },
];

/**
 * A session holding nodes with a measurement and a group, coloured by the given bindings.
 * @param bindings - Each layer's colour binding, by layer name.
 * @param groups - How many distinct groups the nodes hold.
 * @returns The session.
 */
async function painted(bindings: Record<string, Record<string, unknown>>, groups = 3): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes(
        Array.from({ length: 12 }, (_, at) => ({ id: `n${at}`, weight: at, grp: `g${at % groups}` })),
    );
    for (const [name, binding] of Object.entries(bindings)) {
        await session.styles.add({
            name,
            target: "node",
            selector: { match: "everything" },
            encode: { "node.color": binding as { by: string } },
        });
    }

    return session;
}

/**
 * The palette each layer's colour binding names in the saved look, by layer name.
 * @param session - The session.
 * @returns Layer name to palette id.
 */
function saved(session: GraphSession): Record<string, unknown> {
    return Object.fromEntries(
        session.styles.toDocument().layers.map((layer) => {
            const binding = layer.encode?.["node.color"] as { palette?: unknown; stops?: unknown } | undefined;
            return [layer.name, binding?.palette ?? binding?.stops];
        }),
    );
}

describe("a saved look names its default palettes", () => {
    it("names the palette a measurement and a few groups were painted through", async () => {
        const session = await painted({
            ramp: { by: "data.weight" },
            groups: { by: "data.grp", scale: "ordinal" },
            stops: { by: "data.weight", stops: STOPS },
        });
        assert.deepEqual(saved(session), {
            ramp: "ylorbr",
            groups: "okabe-ito",
            stops: STOPS,
        });
        const live = session.styles.list().find((layer) => layer.name === "ramp")?.encode?.["node.color"];
        assert.isUndefined((live as { palette?: unknown } | undefined)?.palette, "the live layer is unchanged");
        session.dispose();
    });

    it("names the larger palette the element picked for more groups than the preferred one holds", async () => {
        const session = await painted({ groups: { by: "data.grp", scale: "ordinal" } }, 10);
        const name = saved(session).groups;
        assert.isString(name);
        assert.notStrictEqual(name, "okabe-ito");
        const reopened = createGraphSession();
        const opened = await reopened.project.open((await session.project.save()).text);
        assert.deepEqual(opened.problems, [], "the named palette holds every group");
        session.dispose();
        reopened.dispose();
    });
});
