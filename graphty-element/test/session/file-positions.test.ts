/**
 * @file A file that stores a drawing is drawn as stored: GML `graphics [ x y ]`, Pajek vertex
 * coordinates and DOT `pos` reach the node records as `position`, so an import with
 * `layout: "recommended"` keeps them (the `fixed` rule) and every node sits at its file position,
 * centered and y up (graph-io's `extractPositions`), times `positionScale`.
 */

import { assert, describe, it, vi } from "vitest";

import { DataConfig } from "../../src/config/DataConfig";
import { exportSession } from "../../src/data/export";
import { makeSession } from "./helpers";

const SCALE = 2;

const GML = `graph [
  node [ id 1 label "a" graphics [ x 10.5 y -4 w 30 h 30 fill "#FF0000" ] ]
  node [ id 2 label "b" graphics [ x 0 y 7 w 30 h 30 fill "#00FF00" ] ]
  edge [ source 1 target 2 ]
]`;

const PAJEK = '*Vertices 2\n1 "a" 0.25 0.75\n2 "b" 0.5 0.125\n*Edges\n1 2\n';

const DOT = 'graph { a [pos="10,20"]; b [pos="-5,3!"]; a -- b }';

// GML ids are numbers (read canonically); Pajek vertex numbers and DOT ids stay strings.
const cases: [string, string, [string | number, number, number][]][] = [
    [
        "gml",
        GML,
        [
            // GML is y down (no Creator names a y-up tool): y is negated
            [1, 10.5, 4],
            [2, 0, -7],
        ],
    ],
    [
        "pajek",
        PAJEK,
        [
            // Pajek is y down: y is negated
            ["1", 0.25, -0.75],
            ["2", 0.5, -0.125],
        ],
    ],
    [
        "dot",
        DOT,
        [
            ["a", 10, 20],
            ["b", -5, 3],
        ],
    ],
];

describe("an import with layout recommended keeps the drawing a file stores", () => {
    for (const [type, data, expected] of cases) {
        it(`places every ${type} node at its file position`, async () => {
            const harness = makeSession({
                config: DataConfig.parse({ directed: "auto", knownFields: { positionScale: SCALE } }),
            });
            const { session } = harness;

            await session.data.import({ type, config: { data } }, { layout: "recommended" });
            await vi.waitFor(() => {
                assert.lengthOf(session.history.pending, 0);
            });

            assert.strictEqual(session.layout.id, "fixed", "every node is placed, so the stored drawing is kept");
            const snapshot = session.snapshot();
            const read = { x: 0, y: 0, z: 0 };
            for (const [id, x, y] of expected) {
                const row = snapshot.ids.requireIndex(id);
                session.positions.read(row, read);
                assert.deepEqual(read, { x: x * SCALE, y: y * SCALE, z: 0 }, `node ${String(id)}`);
            }

            session.dispose();
        });
    }
});

/**
 * Import a file with `layout: "recommended"` into a fresh session and read every node's position.
 * @param type - the format
 * @param data - the file
 * @returns the session and the positions by id
 */
async function loaded(
    type: string,
    data: string,
): Promise<{ session: ReturnType<typeof makeSession>["session"]; at: Map<string, number[]> }> {
    const { session } = makeSession({
        config: DataConfig.parse({ directed: "auto", knownFields: { positionScale: SCALE } }),
    });
    await session.data.import({ type, config: { data } }, { layout: "recommended" });
    await vi.waitFor(() => {
        assert.lengthOf(session.history.pending, 0);
    });
    const snapshot = session.snapshot();
    const read = { x: 0, y: 0, z: 0 };
    const at = new Map<string, number[]>();
    for (let row = 0; row < snapshot.nodeCount; row++) {
        session.positions.read(row, read);
        at.set(String(snapshot.ids.idOf(row)), [read.x, read.y, read.z]);
    }

    return { session, at };
}

describe("a file loaded and saved is drawn the same way when loaded again", () => {
    for (const [type, data] of [
        ["gml", GML],
        ["pajek", PAJEK],
        ["dot", DOT],
        ["pajek", '*Vertices 2\n1 "a" 0.25 0.75 0.9\n2 "b" 0.5 0.125 0.2\n*Edges\n1 2\n'],
    ] as const) {
        it(`${type}${data.includes("0.9") ? " 3D" : ""}`, async () => {
            const first = await loaded(type, data);
            const saved = await exportSession(first.session, type).text();
            const second = await loaded(type, saved);

            assert.deepEqual([...second.at.values()], [...first.at.values()], saved);
            assert.isTrue(second.session.layout.id === "fixed");
            first.session.dispose();
            second.session.dispose();
        });
    }
});
