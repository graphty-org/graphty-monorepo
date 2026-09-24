import { assert, beforeEach, describe, test } from "vitest";

import { type GraphtyError, isGraphtyError } from "../../extend";

describe("Graph.loadFromFile", () => {
    beforeEach(() => {
        // Create a fresh canvas for each test
        document.body.innerHTML = '<canvas id="test-canvas"></canvas>';
    });

    test("loads GraphML file with auto-detection", async () => {
        const xml =
            '<?xml version="1.0"?><graphml xmlns="http://graphml.graphdrawing.org/xmlns"><graph><node id="n1"/></graph></graphml>';
        const file = new File([xml], "test.graphml", { type: "application/xml" });

        const { Graph } = await import("../../src/Graph.js");
        const canvas = document.getElementById("test-canvas") as HTMLCanvasElement;
        const graph = new Graph(canvas);

        await graph.loadFromFile(file);

        assert.strictEqual(graph.getDataManager().nodes.size, 1);
    });

    test("loads CSV file with auto-detection", async () => {
        const csv = "source,target\nn1,n2\nn2,n3";
        const file = new File([csv], "edges.csv", { type: "text/csv" });

        const { Graph } = await import("../../src/Graph.js");
        const canvas = document.getElementById("test-canvas") as HTMLCanvasElement;
        const graph = new Graph(canvas);

        await graph.loadFromFile(file);

        assert.strictEqual(graph.getDataManager().edges.size, 2);
    });

    test("supports explicit format override", async () => {
        const csv = "source,target\nn1,n2";
        const file = new File([csv], "data.txt", { type: "text/plain" });

        const { Graph } = await import("../../src/Graph.js");
        const canvas = document.getElementById("test-canvas") as HTMLCanvasElement;
        const graph = new Graph(canvas);

        await graph.loadFromFile(file, { format: "csv" });

        assert.strictEqual(graph.getDataManager().edges.size, 1);
    });

    test("throws error for unknown format", async () => {
        const file = new File(["unknown content"], "data.xyz", { type: "application/octet-stream" });

        const { Graph } = await import("../../src/Graph.js");
        const canvas = document.getElementById("test-canvas") as HTMLCanvasElement;
        const graph = new Graph(canvas);

        let errorThrown = false;
        try {
            await graph.loadFromFile(file);
        } catch (error) {
            errorThrown = true;

            // A CODE RATHER THAN A SENTENCE. This used to be a plain Error whose message named a
            // hard-coded list of the element's own seven formats, so a consumer whose format WAS
            // registered could still be told the element does not have it. `details.available` is
            // read from the catalogue, so it names whatever this page actually has.
            assert.isTrue(isGraphtyError(error), "a failure the element reports carries a code");
            assert.strictEqual((error as GraphtyError).code, "E_UNKNOWN_FORMAT");
            assert.include(
                (error as GraphtyError).details.available as string[],
                "graphml",
                "and says what it could have read instead",
            );
        }

        assert.isTrue(errorThrown, "Should throw error for unknown format");
    });
});
