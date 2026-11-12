/**
 * @file `node.meshDetail`: "full" (the default) is today's mesh for every shape, "low" draws a
 * sphere as an icosphere of one subdivision and leaves flat-faced shapes alone, and the detail is
 * part of a source mesh's identity, so low- and full-detail nodes never share a cached mesh.
 */
import { MeshBuilder, NullEngine, Scene } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { FLAT_NODE_SHAPES, NodeShapes, type NodeStyleConfig } from "../../src/config/NodeStyle";
import { MeshCache } from "../../src/meshes/MeshCache";
import { NodeMesh } from "../../src/meshes/NodeMesh";
import { createStylesApi } from "../../src/session/styles/index";
import { createLayerRepaint } from "../../src/session/styles/repaint";

type Detail = NonNullable<NodeStyleConfig["shape"]>["detail"];

let scene: Scene;

beforeEach(() => {
    scene = new Scene(new NullEngine());
});

afterEach(() => {
    scene.getEngine().dispose();
});

/**
 * How many vertices a node of one shape and detail is built with.
 * @param type - The shape.
 * @param detail - The detail, or undefined for unset.
 * @returns The vertex count.
 */
function vertices(type: string, detail?: Detail): number {
    const shape = { type, size: 1, ...(detail === undefined ? {} : { detail }) } as NodeStyleConfig["shape"];
    const mesh = NodeMesh.createMeshWithoutCache({ styleId: "t", is2D: false, size: 1 }, { shape }, scene);
    const count = mesh.getTotalVertices();
    mesh.dispose();

    return count;
}

const SOLID_SHAPES = NodeShapes.options.filter((type) => !(FLAT_NODE_SHAPES as readonly string[]).includes(type));

describe("node.meshDetail geometry", () => {
    it('"full" and unset build the same mesh as before for every shape', () => {
        for (const type of SOLID_SHAPES) {
            assert.strictEqual(vertices(type, "full"), vertices(type), type);
        }

        // Pinned against Babylon's own defaults, which is what every shape drew before the channel.
        const sphere = MeshBuilder.CreateSphere("s", { diameter: 1 }, scene);
        assert.strictEqual(vertices("sphere"), sphere.getTotalVertices());
        const ico = MeshBuilder.CreateIcoSphere("i", { radius: 0.75 }, scene);
        assert.strictEqual(vertices("icosphere"), ico.getTotalVertices());
    });

    it('"low" draws a sphere as an icosphere of one subdivision', () => {
        const ico1 = MeshBuilder.CreateIcoSphere("i", { radius: 0.5, subdivisions: 1 }, scene);

        assert.strictEqual(vertices("sphere", "low"), ico1.getTotalVertices());
        assert.isBelow(vertices("sphere", "low"), vertices("sphere") / 10);
    });

    it('"low" leaves flat-faced shapes unchanged and thins the other round ones', () => {
        for (const type of ["box", "tetrahedron", "octahedron", "goldberg", "geodesic"]) {
            assert.strictEqual(vertices(type, "low"), vertices(type), type);
        }

        for (const type of ["cylinder", "cone", "capsule", "torus", "torus-knot", "icosphere"]) {
            assert.isBelow(vertices(type, "low"), vertices(type), type);
        }
    });

    it("a number is the segment count", () => {
        const eight = MeshBuilder.CreateSphere("s", { diameter: 1, segments: 8 }, scene);

        assert.strictEqual(vertices("sphere", 8), eight.getTotalVertices());
    });
});

describe("node.meshDetail and the mesh cache", () => {
    it("nodes of one shape and different detail get different source meshes; equal detail shares one", async () => {
        const rows = [{ "data.low": true }, { "data.low": true }, {}, {}];
        const elements = {
            nodeValue: (index: number, path: string) => (rows[index] as Record<string, unknown>)[path],
            edgeValue: () => undefined,
            nodeIdOf: (index: number) => `n${String(index)}`,
            edgeIdOf: (index: number) => `e${String(index)}`,
        };
        const engine = createLayerRepaint({ nodeCount: () => rows.length, edgeCount: () => 0, elements });
        const styles = createStylesApi({
            elements,
            base: [
                {
                    name: "Default",
                    source: { by: "element", reason: "default" },
                    selector: { match: "everything" },
                    set: { "node.shape": "sphere" },
                },
            ],
            repaint: engine.repaint,
            encoding: engine.encoding,
            onChange: () => undefined,
        });
        await styles.add({
            name: "Low",
            selector: { match: "expression", where: "data.low == `true`" },
            set: { "node.meshDetail": "low" },
        });

        const keys = rows.map((_, index) => engine.meshKeyOf("node", index));
        assert.strictEqual(keys[0], keys[1]);
        assert.strictEqual(keys[2], keys[3]);
        assert.notStrictEqual(keys[0], keys[2]);

        const cache = new MeshCache();
        rows.forEach((_, index) => {
            const detail = engine.styleOf("node", index)["node.meshDetail"];
            NodeMesh.create(
                cache,
                { styleId: String(keys[index]), is2D: false, size: 1 },
                { shape: { type: "sphere", size: 1, ...(detail === undefined ? {} : { detail }) } },
                scene,
            );
        });

        assert.strictEqual(cache.size(), 2);
        assert.strictEqual(cache.misses, 2);
        assert.strictEqual(cache.hits, 2);
    });

    it("a layer may set a whole number, and refuses a fraction", async () => {
        const elements = {
            nodeValue: () => undefined,
            edgeValue: () => undefined,
            nodeIdOf: (index: number) => `n${String(index)}`,
            edgeIdOf: (index: number) => `e${String(index)}`,
        };
        const engine = createLayerRepaint({ nodeCount: () => 1, edgeCount: () => 0, elements });
        const styles = createStylesApi({
            elements,
            base: [],
            repaint: engine.repaint,
            encoding: engine.encoding,
            onChange: () => undefined,
        });

        await styles.add({ name: "Twelve", selector: { match: "everything" }, set: { "node.meshDetail": 12 } });
        assert.strictEqual(engine.styleOf("node", 0)["node.meshDetail"], 12);

        let refused = false;
        try {
            await styles.add({ name: "Half", selector: { match: "everything" }, set: { "node.meshDetail": 2.5 } });
        } catch {
            refused = true;
        }

        assert.isTrue(refused);
    });
});
