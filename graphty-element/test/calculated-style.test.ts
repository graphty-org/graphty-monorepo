import { get as deepGet } from "lodash";
import { assert, describe, it } from "vitest";

import { CalculatedValue } from "../src/CalculatedValue";
import { ChangeManager } from "../src/ChangeManager";
import { AdHocData, EdgeStyle, NodeStyle } from "../src/config";
import { Styles } from "../src/Styles";

describe("CalculatedValue", () => {
    it("exists", () => {
        assert.isFunction(CalculatedValue);
    });

    it("does a simple calculation", () => {
        // Expression should be a simple expression (not a block statement)
        // arguments[0] is input1 (42), arguments[1] is input2 (7)
        // 42 + 7 * 7 = 42 + 49 = 91
        const expr = "arguments[0] + arguments[1] * arguments[1]";
        const cv = new CalculatedValue(["data.obj.input1", "data.obj.input2"], "style.shape.size", expr);

        const data: Record<string, unknown> = {
            obj: {
                input1: 42,
                input2: 7,
            },
        };
        const style = NodeStyle.parse({});
        cv.run({ style, algorithmResults: {}, data } as unknown as AdHocData);

        assert.strictEqual(deepGet(style, "shape.size"), 91);
    });
});

/**
 * Builds a two-layer style template where BOTH layers match every node and every edge and BOTH
 * write the same calculated output path, which is the exact shape that used to invert.
 * @param outputPath - The shared calculated output path, e.g. "style.texture.color"
 * @param bottomValue - The value the BOTTOM layer (array index 0) computes
 * @param topValue - The value the TOP layer (array index 1, the last one) computes
 * @param kind - Whether the calculated style hangs off the layer's node or its edge
 * @returns A style template object ready for Styles.fromObject
 */
function twoCalculatedLayers(
    outputPath: string,
    bottomValue: string,
    topValue: string,
    kind: "node" | "edge",
): object {
    const layerFor = (value: string): object => {
        const applied = {
            selector: "",
            style: {},
            calculatedStyle: {
                inputs: ["data.id"],
                output: outputPath,
                expr: JSON.stringify(value),
            },
        };

        return kind === "node" ? { node: applied } : { edge: applied };
    };

    return {
        graphtyTemplate: true,
        majorVersion: "1",
        graph: { addDefaultStyle: false },
        layers: [layerFor(bottomValue), layerFor(topValue)],
    };
}

/**
 * Runs a list of calculated values through a real ChangeManager exactly the way Node and Edge do,
 * so the test pins the whole chain (array order -> Set insertion order -> deepSet) rather than
 * just the array this method returns.
 * @param cvs - The calculated values, in the order Styles handed them back
 * @param data - The node or edge data the expressions read from
 * @param schema - NodeStyle or EdgeStyle, matching what Node.ts:77 / Edge.ts:109 register
 * @returns The accumulated style updates object
 */
function runCalculatedValues(cvs: CalculatedValue[], data: AdHocData, schema: typeof NodeStyle | typeof EdgeStyle) {
    const cm = new ChangeManager();
    cm.watch("data", data);
    cm.watch("algorithmResults", {} as unknown as AdHocData);
    const styleUpdates = cm.addData("style", {} as unknown as AdHocData, schema);
    cm.loadCalculatedValues(cvs, true);

    return styleUpdates;
}

describe("calculated style layer precedence", () => {
    // These pin the rule that used to be inverted: for a path written by a calculatedStyle, the
    // BOTTOM layer used to win, while the very same path written by a static `style` was won by the
    // TOP layer. Styles.getCalculatedStylesForNode / ...ForEdge now return ASCENDING layer order
    // (bottom first) because their consumer, ChangeManager.runAllCalculatedValues into
    // CalculatedValue.run's unconditional deepSet, is last-writer-wins.
    const nodeData = { id: "n1" } as unknown as AdHocData;
    const edgeData = { id: "e1", src: "n1", dst: "n2" } as unknown as AdHocData;

    it("gives the top layer a shared calculated node color", () => {
        const s = Styles.fromObject(twoCalculatedLayers("style.texture.color", "#BB0000", "#00BB00", "node"));

        const cvs = s.getCalculatedStylesForNode(nodeData);
        const styleUpdates = runCalculatedValues(cvs, nodeData, NodeStyle);

        assert.lengthOf(cvs, 2);
        assert.strictEqual(deepGet(styleUpdates, "texture.color"), "#00BB00");
    });

    it("returns node calculated values in ascending layer order", () => {
        const s = Styles.fromObject(twoCalculatedLayers("style.texture.color", "#BB0000", "#00BB00", "node"));

        const cvs = s.getCalculatedStylesForNode(nodeData);

        // index 0 is the BOTTOM layer, so it runs first and is overwritten
        assert.strictEqual(cvs[0].expr, '"#BB0000"');
        assert.strictEqual(cvs[1].expr, '"#00BB00"');
    });

    it("gives the top layer a shared calculated edge color", () => {
        const s = Styles.fromObject(twoCalculatedLayers("style.line.color", "#BB0000", "#00BB00", "edge"));

        const cvs = s.getCalculatedStylesForEdge(edgeData);
        const styleUpdates = runCalculatedValues(cvs, edgeData, EdgeStyle);

        assert.lengthOf(cvs, 2);
        assert.strictEqual(deepGet(styleUpdates, "line.color"), "#00BB00");
    });

    it("returns edge calculated values in ascending layer order", () => {
        const s = Styles.fromObject(twoCalculatedLayers("style.line.color", "#BB0000", "#00BB00", "edge"));

        const cvs = s.getCalculatedStylesForEdge(edgeData);

        assert.strictEqual(cvs[0].expr, '"#BB0000"');
        assert.strictEqual(cvs[1].expr, '"#00BB00"');
    });

    it("agrees with static layer precedence on the same stack", () => {
        // The point of the fix: one layer stack must not answer "which layer is on top" two
        // different ways. Static layers merge first-wins through defaultsDeep over a DESCENDING
        // array; calculated values run last-wins over an ASCENDING array. Both must pick layer 1.
        const staticStack = Styles.fromObject({
            graphtyTemplate: true,
            majorVersion: "1",
            graph: { addDefaultStyle: false },
            layers: [
                { node: { selector: "", style: { texture: { color: "#BB0000" } } } },
                { node: { selector: "", style: { texture: { color: "#00BB00" } } } },
            ],
        });
        const staticStyle = Styles.getStyleForNodeStyleId(staticStack.getStyleForNode(nodeData));

        const calculatedStack = Styles.fromObject(
            twoCalculatedLayers("style.texture.color", "#BB0000", "#00BB00", "node"),
        );
        const styleUpdates = runCalculatedValues(
            calculatedStack.getCalculatedStylesForNode(nodeData),
            nodeData,
            NodeStyle,
        );

        assert.strictEqual(staticStyle.texture?.color, "#00BB00");
        assert.strictEqual(deepGet(styleUpdates, "texture.color"), "#00BB00");
    });
});
