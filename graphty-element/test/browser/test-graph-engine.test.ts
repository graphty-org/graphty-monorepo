import { Engine, NullEngine } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import type { Graph } from "../../src/Graph";
import { cleanupTestGraph, createTestGraph } from "../helpers/testSetup";

describe("createTestGraph", () => {
    let graph: Graph | undefined;

    afterEach(() => {
        if (graph) {
            cleanupTestGraph(graph);
            graph = undefined;
        }
    });

    it("renders on a real WebGL engine, not a NullEngine", async () => {
        graph = await createTestGraph();
        const engine = graph.getScene().getEngine();

        assert.instanceOf(engine, Engine);
        assert.notInstanceOf(engine, NullEngine);
        assert.isNotNull(engine.getRenderingCanvas());
    });
});
