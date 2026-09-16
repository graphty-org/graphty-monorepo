import { set as deepSet } from "lodash";
import { assert, describe, expect, it } from "vitest";

import { CalculatedValue } from "../src/CalculatedValue";
import { ChangeManager } from "../src/ChangeManager";
import { AdHocData, NodeStyle } from "../src/config";

describe("ChangeManager", () => {
    it("exists", () => {
        assert.isFunction(ChangeManager);
    });

    it("sets a value without crashing", () => {
        let obj = { beer: "yum" } as unknown as AdHocData;
        const path = "foo.bar.thing";

        const cm = new ChangeManager();
        obj = cm.watch("data", obj);

        deepSet(obj, path, "someval");
    });

    it("runs calculated value", () => {
        // setup test
        const inputPath = "graphty.degree.total";
        const outputPath = "style.shape.size";
        const cm = new ChangeManager();
        const algObj = cm.watch("algorithmResults", {} as unknown as AdHocData);
        const styleObj = cm.addData("style", {} as unknown as AdHocData);
        cm.addCalculatedValue(new CalculatedValue([`algorithmResults.${inputPath}`], outputPath, "arguments[0] * 2"));

        // run test
        deepSet(algObj, inputPath, 5);

        // validate test results
        const expectedStyle = { shape: { size: 10 } } as unknown as AdHocData;
        assert.deepStrictEqual(styleObj, expectedStyle);
    });

    it("validates schema", () => {
        // setup test
        const inputPath = "graphty.degree.total";
        const outputPath = "style.shape.size";
        const cm = new ChangeManager();
        const algObj = cm.watch("algorithmResults", {} as unknown as AdHocData);
        const styleObj = cm.addData("style", {} as unknown as AdHocData, NodeStyle);
        cm.addCalculatedValue(new CalculatedValue([`algorithmResults.${inputPath}`], outputPath, "arguments[0] * 2"));

        // run test
        deepSet(algObj, inputPath, 5);

        // validate test results
        const expectedStyle = { shape: { size: 10 } } as unknown as AdHocData;
        assert.deepStrictEqual(styleObj, expectedStyle);
    });

    it("throws on bad schema", () => {
        // setup test
        const inputPath = "graphty.degree.total";
        const outputPath = "style.shape.type";
        const cm = new ChangeManager();
        const algObj = cm.watch("algorithmResults", {} as unknown as AdHocData);
        cm.addData("style", {} as unknown as AdHocData, NodeStyle);
        cm.addCalculatedValue(new CalculatedValue([`algorithmResults.${inputPath}`], outputPath, "arguments[0] * 2"));

        // run test
        expect(() => {
            deepSet(algObj, inputPath, 5);
        }).toThrow(/Invalid option: expected one of /);
    });

    it("converts color", () => {
        // setup test
        const inputPath = "graphty.degree.total";
        const outputPath = "style.texture.color";
        const cm = new ChangeManager();
        const algObj = cm.watch("algorithmResults", {} as unknown as AdHocData);
        const styleObj = cm.addData("style", {} as unknown as AdHocData, NodeStyle);
        cm.addCalculatedValue(new CalculatedValue([`algorithmResults.${inputPath}`], outputPath, '"lightblue"'));

        // run test
        deepSet(algObj, inputPath, 5);

        // validate test results
        const expectedStyle = { texture: { color: "#ADD8E6" } } as unknown as AdHocData;
        assert.deepStrictEqual(styleObj, expectedStyle);
    });

    it("supports multiple calculated values watching the same input", () => {
        // Regression test for bug where only one CV per input was supported
        // This tests the Map<string, Set<CalculatedValue>> fix
        const inputPath = "data.value";
        const cm = new ChangeManager();
        const dataObj = cm.watch("data", {} as unknown as AdHocData);
        const styleObj = cm.addData("style", {} as unknown as AdHocData);

        // Add two calculated values watching the same input
        cm.addCalculatedValue(
            new CalculatedValue([`data.${inputPath}`], "style.line.color", 'arguments[0] > 5 ? "#00FF00" : "#FF0000"'),
        );
        cm.addCalculatedValue(new CalculatedValue([`data.${inputPath}`], "style.line.width", "arguments[0] * 2"));

        // Set the value - both CVs should run
        deepSet(dataObj, inputPath, 8);

        // Both outputs should be set
        assert.deepStrictEqual(styleObj, {
            line: {
                color: "#00FF00",
                width: 16,
            },
        } as unknown as AdHocData);
    });

    it("loads calculated values with runImmediately=false", () => {
        const cm = new ChangeManager();
        const dataObj = cm.watch("data", { value: 10 } as unknown as AdHocData);
        const styleObj = cm.addData("style", {} as unknown as AdHocData);

        const cvs = [new CalculatedValue(["data.value"], "style.result", "arguments[0] * 3")];

        // Load without running immediately
        cm.loadCalculatedValues(cvs, false);

        // Style should be empty since CVs didn't run
        assert.deepStrictEqual(styleObj, {} as unknown as AdHocData);

        // Now trigger by updating data
        deepSet(dataObj, "value", 15);

        // Now it should have run
        assert.deepStrictEqual(styleObj, { result: 45 } as unknown as AdHocData);
    });

    it("loads calculated values with runImmediately=true", () => {
        const cm = new ChangeManager();
        cm.watch("data", { value: 10 } as unknown as AdHocData);
        const styleObj = cm.addData("style", {} as unknown as AdHocData);

        const cvs = [new CalculatedValue(["data.value"], "style.result", "arguments[0] * 3")];

        // Load and run immediately
        cm.loadCalculatedValues(cvs, true);

        // Style should have result immediately
        assert.deepStrictEqual(styleObj, { result: 30 } as unknown as AdHocData);
    });

    it("runAllCalculatedValues executes all CVs", () => {
        const cm = new ChangeManager();
        cm.watch("data", { a: 5, b: 10 } as unknown as AdHocData);
        const styleObj = cm.addData("style", {} as unknown as AdHocData);

        cm.addCalculatedValue(new CalculatedValue(["data.a"], "style.resultA", "arguments[0] + 100"));
        cm.addCalculatedValue(new CalculatedValue(["data.b"], "style.resultB", "arguments[0] + 200"));

        // Run all CVs
        cm.runAllCalculatedValues();

        // Both should have run
        assert.deepStrictEqual(styleObj, {
            resultA: 105,
            resultB: 210,
        } as unknown as AdHocData);
    });

    it("clears watchedInputs when loading new calculated values", () => {
        const cm = new ChangeManager();
        const dataObj = cm.watch("data", {} as unknown as AdHocData);
        const styleObj = cm.addData("style", {} as unknown as AdHocData);

        // Add initial CV
        cm.addCalculatedValue(new CalculatedValue(["data.old"], "style.result", "arguments[0]"));

        // Load new CVs - should clear old ones
        const newCvs = [new CalculatedValue(["data.new"], "style.result", "arguments[0] * 2")];
        cm.loadCalculatedValues(newCvs, false);

        // Old path should no longer trigger
        deepSet(dataObj, "old", 5);
        assert.deepStrictEqual(styleObj, {} as unknown as AdHocData);

        // New path should trigger
        deepSet(dataObj, "new", 10);
        assert.deepStrictEqual(styleObj, { result: 20 } as unknown as AdHocData);
    });

    // Regression test for the defect where a REMOVED style layer kept painting.
    // `loadCalculatedValues` used to clear `watchedInputs` but not `calculatedValues`, so
    // `runAllCalculatedValues` re-ran every value the node had EVER been handed. In the app that
    // meant: run "Most connected" (a viridis ramp over the degree results), then run "Groups" --
    // the dead ramp recomputed the identical colour into `styleUpdates` and `Node.update` merged
    // it OVER the community colours with `_.defaultsDeep(plainStyleUpdates, style)`, whose first
    // argument wins. The canvas stayed byte-identical viridis while the legend said groups.
    // The existing watchedInputs test above only ever covered the data-change trigger path; this
    // one covers the runAll path, which is the one every repaint actually takes.
    it("drops calculated values from a removed style layer when loading new ones", () => {
        const cm = new ChangeManager();
        cm.watch("algorithmResults", { degree: 5 } as unknown as AdHocData);
        const styleObj = cm.addData("style", {} as unknown as AdHocData);

        // the metric layer is loaded and paints
        const viridisCv = new CalculatedValue(
            ["algorithmResults.degree"],
            "style.color",
            "'#VIRIDIS' + arguments[0]",
        );
        cm.loadCalculatedValues([viridisCv], true);
        assert.deepStrictEqual(styleObj, { color: "#VIRIDIS5" } as unknown as AdHocData);

        // Node.update consumes every key out of styleUpdates once it has merged them
        for (const key of Object.keys(styleObj)) {
            Reflect.deleteProperty(styleObj, key);
        }

        // the metric layer is removed: nothing may repaint into style
        cm.loadCalculatedValues([], true);
        assert.deepStrictEqual(styleObj, {} as unknown as AdHocData);
        assert.strictEqual(cm.calculatedValues.size, 0);
    });

    // The safety half of the same change: clearing the set must not drop live layers that share
    // one output path. `Styles.getCalculatedStylesForNode` rebuilds the whole list from the
    // CURRENT layers on every call, so both of these are handed back in on every load and both
    // still run -- the later one wins, exactly as before the clear was added.
    it("keeps every loaded calculated value that shares an output path", () => {
        const cm = new ChangeManager();
        cm.watch("algorithmResults", { degree: 5 } as unknown as AdHocData);
        const styleObj = cm.addData("style", {} as unknown as AdHocData);

        const bottomLayerCv = new CalculatedValue(["algorithmResults.degree"], "style.color", "'#BOTTOM'");
        const topLayerCv = new CalculatedValue(["algorithmResults.degree"], "style.color", "'#TOP'");
        cm.loadCalculatedValues([bottomLayerCv, topLayerCv], true);

        assert.strictEqual(cm.calculatedValues.size, 2);
        assert.deepStrictEqual(styleObj, { color: "#TOP" } as unknown as AdHocData);
    });

    // Regression tests for calculated outputs that land inside a wrapped branch of the
    // schema. `NodeStyle.label` is `RichTextStyle.prefault({...}).optional()`, and the
    // schema walker used to stop at the first wrapper, so every `style.label.*` output
    // threw "don't know how to retreive path for: ..." instead of validating.
    it("runs a calculated value into a wrapped (optional + prefault) branch", () => {
        // setup test
        const inputPath = "graphty.degree.total";
        const outputPath = "style.label.enabled";
        const cm = new ChangeManager();
        const algObj = cm.watch("algorithmResults", {} as unknown as AdHocData);
        const styleObj = cm.addData("style", {} as unknown as AdHocData, NodeStyle);
        cm.addCalculatedValue(new CalculatedValue([`algorithmResults.${inputPath}`], outputPath, "arguments[0] > 2"));

        // run test
        deepSet(algObj, inputPath, 5);

        // validate test results
        const expectedStyle = { label: { enabled: true } } as unknown as AdHocData;
        assert.deepStrictEqual(styleObj, expectedStyle);
    });

    it("validates the leaf schema inside a wrapped branch", () => {
        // setup test: textColor is a ColorStyle, so a named color is coerced to hex --
        // which only happens if the walker reached the real leaf and not a wrapper
        const inputPath = "graphty.degree.total";
        const outputPath = "style.label.textColor";
        const cm = new ChangeManager();
        const algObj = cm.watch("algorithmResults", {} as unknown as AdHocData);
        const styleObj = cm.addData("style", {} as unknown as AdHocData, NodeStyle);
        cm.addCalculatedValue(new CalculatedValue([`algorithmResults.${inputPath}`], outputPath, '"lightblue"'));

        // run test
        deepSet(algObj, inputPath, 5);

        // validate test results
        const expectedStyle = { label: { textColor: "#ADD8E6" } } as unknown as AdHocData;
        assert.deepStrictEqual(styleObj, expectedStyle);
    });

    it("rejects a bad value inside a wrapped branch", () => {
        // setup test
        const inputPath = "graphty.degree.total";
        const outputPath = "style.label.fontSize";
        const cm = new ChangeManager();
        const algObj = cm.watch("algorithmResults", {} as unknown as AdHocData);
        cm.addData("style", {} as unknown as AdHocData, NodeStyle);
        cm.addCalculatedValue(new CalculatedValue([`algorithmResults.${inputPath}`], outputPath, '"not a number"'));

        // run test
        expect(() => {
            deepSet(algObj, inputPath, 5);
        }).toThrow(/expected number/);
    });

    it("still rejects an output path the schema does not have", () => {
        // setup test
        const inputPath = "graphty.degree.total";
        const outputPath = "style.notAThing.nope";
        const cm = new ChangeManager();
        const algObj = cm.watch("algorithmResults", {} as unknown as AdHocData);
        cm.addData("style", {} as unknown as AdHocData, NodeStyle);
        cm.addCalculatedValue(new CalculatedValue([`algorithmResults.${inputPath}`], outputPath, "arguments[0]"));

        // run test
        expect(() => {
            deepSet(algObj, inputPath, 5);
        }).toThrow(/don't know how to retreive path for: nope/);
    });

    // TODO: converts color
});
