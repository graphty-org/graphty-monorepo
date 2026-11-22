/**
 * A sample dataset whose nodes carry a saved drawing opens in it (issue #9281): loaded with
 * `layout: "placed"`, a dataset graph-samples gives a cartesian position column (BioPlex 3.0,
 * WikiPathways WP615) is drawn on the fixed layout at its saved coordinates, y up, and a dataset
 * whose positions are geographic (openflights) is not placed as a drawing. A dataset whose own
 * position column says which way its y grows (issue #2004) is drawn y up either way: a y-down
 * drawing is turned over, so the fixed layout never shows it upside down.
 */

import { fromEdgeArrays } from "@graphty/graph-format";
import { afterEach, assert, describe, it, vi } from "vitest";

import { createGraphSession, type GraphSession } from "../../src/session";

/** Where the served dataset puts each node. */
const SAVED: Readonly<Record<string, readonly [number, number]>> = { a: [0, 0], b: [10, 0], c: [0, 20] };

/** The bytes of a three-node dataset with plain x and y columns (or longitude and latitude). */
function datasetBytes(columns: readonly [string, string]): Uint8Array {
    const ids = Object.keys(SAVED);
    return fromEdgeArrays({
        directed: true,
        nodeCount: ids.length,
        src: Uint32Array.of(0, 0),
        dst: Uint32Array.of(1, 2),
        ids,
        nodeColumns: {
            [columns[0]]: Float64Array.from(ids, (id) => SAVED[id][0]),
            [columns[1]]: Float64Array.from(ids, (id) => SAVED[id][1]),
        },
    }).toBytes();
}

/**
 * The bytes of the same dataset carrying its own cartesian position column, whose y grows as `yAxis` says.
 * @param yAxis - which way the column's y grows
 * @returns the dataset file
 */
function drawnBytes(yAxis: "up" | "down"): Uint8Array {
    const ids = Object.keys(SAVED);
    const data = Float64Array.from(
        ids.flatMap((id) => [SAVED[id][0], yAxis === "up" ? SAVED[id][1] : -SAVED[id][1], 0]),
    );
    return fromEdgeArrays({
        directed: true,
        nodeCount: ids.length,
        src: Uint32Array.of(0, 0),
        dst: Uint32Array.of(1, 2),
        ids,
    })
        .withColumns({
            position: {
                data,
                decl: {
                    dtype: "f64",
                    components: 3,
                    role: "position",
                    coordinates: { kind: "cartesian", dims: 2, units: "file", yAxis },
                },
            },
        })
        .toBytes();
}

/**
 * Asserts the session drew the saved drawing on the fixed layout, y up: b right of a, c above a.
 * @param session - the session
 */
async function assertDrawnYUp(session: GraphSession): Promise<void> {
    assert.strictEqual(session.layout.id, "fixed", "every node placed: the saved drawing is kept");
    await vi.waitFor(() => {
        const [ax, ay] = at(session, "a");
        const [bx, by] = at(session, "b");
        const [cx, cy] = at(session, "c");
        const unit = (bx - ax) / SAVED.b[0];
        assert.isAbove(unit, 0, "b right of a");
        assert.closeTo(by - ay, 0, 1e-6, "b level with a");
        assert.closeTo(cx - ax, 0, 1e-6, "c above a");
        assert.closeTo(cy - ay, SAVED.c[1] * unit, 1e-6, "c twice as far as b, y up");
    });
}

/**
 * Serves `bytes` for every download.
 * @param bytes - the dataset file
 */
function serve(bytes: Uint8Array): void {
    vi.stubGlobal("fetch", () => Promise.resolve(new Response(bytes.slice())));
}

/**
 * Where the session holds a node.
 * @param session - the session
 * @param id - the node
 * @returns its x and y
 */
function at(session: GraphSession, id: string): readonly [number, number] {
    const snapshot = session.snapshot();
    const out = { x: 0, y: 0, z: 0 };
    session.positions.read(snapshot.ids.indexOf(id), out);
    return [out.x, out.y];
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("a dataset's saved drawing", () => {
    for (const name of ["bioplex3-hct116", "wikipathways-senescence-autophagy"]) {
        it(`opens ${name} where it was drawn with layout: placed`, async () => {
            serve(datasetBytes(["x", "y"]));
            const session = createGraphSession();
            await session.data.loadDataset(name, { baseUrl: "https://datasets.test/", layout: "placed" });
            await vi.waitFor(() => {
                assert.lengthOf(session.history.pending, 0);
            });
            await assertDrawnYUp(session);
            session.dispose();
        });
    }

    for (const yAxis of ["up", "down"] as const) {
        it(`draws a dataset's own y-${yAxis} position column y up on the fixed layout`, async () => {
            serve(drawnBytes(yAxis));
            const session = createGraphSession();
            await session.data.loadDataset("bioplex3-hct116", { baseUrl: "https://datasets.test/", layout: "placed" });
            await vi.waitFor(() => {
                assert.lengthOf(session.history.pending, 0);
            });
            await assertDrawnYUp(session);
            session.dispose();
        });
    }

    it("does not draw openflights' longitude and latitude as a saved drawing", async () => {
        serve(datasetBytes(["longitude", "latitude"]));
        const session = createGraphSession();
        await session.data.loadDataset("openflights", { baseUrl: "https://datasets.test/", layout: "placed" });
        await vi.waitFor(() => {
            assert.lengthOf(session.history.pending, 0);
        });
        assert.notStrictEqual(session.layout.id, "fixed");
        session.dispose();
    });
});
