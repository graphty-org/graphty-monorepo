/**
 * @file The geographic layout projects each node's latitude and longitude onto a flat map, north up
 * (issue #2004).
 */
import "../../src/layout";

import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { GeographicLayout } from "../../src/layout/GeographicLayoutEngine";
import { LayoutEngine, layoutEngineInternals } from "../../src/layout/LayoutEngine";
import { fakeNode } from "../helpers/layout-fakes";

/**
 * Lay out nodes carrying the data given.
 * @param data - each node's data
 * @param options - the layout's options
 * @returns each node's x and y
 */
function layOut(data: Record<string, unknown>[], options: Record<string, unknown> = {}): [number, number][] {
    const builder = new GraphBuilder({ directed: false });
    data.forEach((_, i) => builder.addNode(`n${i}`));
    const stored = builder.freeze({ label: "test" });
    const source = { getSnapshot: (): GraphSnapshot => stored, undirected: (s: GraphSnapshot) => s.toUndirected() };
    const parentGraph = { getDataManager: () => source };
    const nodes = data.map((d, index) =>
        fakeNode(`n${index}`, { index, parentGraph, data: d, setMeshPosition: () => undefined }),
    );
    const engine = LayoutEngine.get("geographic", options);
    assert.instanceOf(engine, GeographicLayout);
    layoutEngineInternals.addNodes(engine, nodes);
    engine.publishPositions();
    return nodes.map((n) => {
        const p = engine.getNodePosition(n);
        return [p.x, p.y];
    });
}

const near = (actual: number, expected: number): void => assert.closeTo(actual, expected, 1e-3);

describe("the geographic layout", () => {
    it("reads `latitude` and `longitude` by default: east is +x, north is +y, the radius is scalingFactor", () => {
        const xy = layOut([
            { latitude: 45, longitude: 90 },
            { latitude: "-30", longitude: "-60" },
        ]);
        near(xy[0][0], 100 * (Math.PI / 2));
        near(xy[0][1], 100 * (Math.PI / 4));
        near(xy[1][0], 100 * (-Math.PI / 3));
        near(xy[1][1], 100 * (-Math.PI / 6));
    });

    it("reads the attributes it is given, with the projection and central meridian chosen", () => {
        const xy = layOut([{ geo: { lat: 0, lon: 170 } }, { geo: { lat: 0, lon: -170 } }], {
            latitude: "geo.lat",
            longitude: "geo.lon",
            centralMeridian: "auto",
            projection: "web-mercator",
        });
        near(xy[0][0], 100 * ((-10 * Math.PI) / 180));
        near(xy[1][0], 100 * ((10 * Math.PI) / 180));
    });

    it("places a node with no coordinates at the origin", () => {
        const xy = layOut([{ latitude: 10, longitude: 10 }, { name: "nowhere" }]);
        assert.deepEqual(xy[1], [0, 0]);
    });
});
