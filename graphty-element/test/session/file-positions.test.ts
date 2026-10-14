/**
 * @file A file that stores a drawing is drawn as stored: GML `graphics [ x y ]`, Pajek vertex
 * coordinates and DOT `pos` reach the node records as `position`, so an import with
 * `layout: "recommended"` keeps them (the `fixed` rule) and every node sits at its file position
 * times `positionScale`.
 */

import { assert, describe, it, vi } from "vitest";

import { DataConfig } from "../../src/config/DataConfig";
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
            [1, 10.5, -4],
            [2, 0, 7],
        ],
    ],
    [
        "pajek",
        PAJEK,
        [
            ["1", 0.25, 0.75],
            ["2", 0.5, 0.125],
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
