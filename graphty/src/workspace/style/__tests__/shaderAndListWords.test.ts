import type { ShaderProblem } from "@graphty/graphty-element/catalog";
import type { ReadableValue } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import {
    bindingTitle,
    channelPhrase,
    copyNameWords,
    countName,
    dialogPlaceWords,
    heldShadersWords,
    layersWord,
    listWords,
    madeWords,
    nameRank,
    pasteProblemsWord,
    pasteProblemWords,
    placeWords,
    plainRule,
    prefixFirst,
    renderQualityWords,
    settingWord,
    shaderPlaceWords,
    shaderProblemWords,
    targetOfPlace,
    usedByWords,
    valueFact,
} from "../words";

/**
 * A shader problem.
 * @param code - its code.
 * @param params - its values.
 * @returns the problem.
 */
const problem = (code: string, params: ShaderProblem["params"] = {}): ShaderProblem => ({ code, params });

describe("pasteProblemWords", () => {
    it("says each problem in pasted shader text in a short phrase, with its values", () => {
        const cases: readonly (readonly [string, ShaderProblem["params"], string])[] = [
            ["shader.header-missing", {}, "No header"],
            ["shader.header-json", { message: "Unexpected token" }, "Header is not JSON: Unexpected token"],
            ["shader.header-json", { message: "" }, "Header is not JSON"],
            ["shader.header-key", { key: "colour" }, 'Header key "colour"'],
            ["shader.target-mismatch", { found: "edge" }, "Written for edges"],
            ["shader.place-unsupported", { place: "around" }, "Cannot draw around"],
            ["shader.min-size-place", {}, "Minimum size needs a place outside the node"],
            ["shader.id-invalid", { id: "A B" }, 'Bad id "A B"'],
            ["shader.id-taken", { id: "pearl" }, 'Id "pearl" is taken'],
            ["shader.param-invalid", { param: "speed", field: "max" }, "Parameter speed: bad max"],
            ["shader.too-many-params", { limit: 8 }, "Over 8 parameters"],
            ["shader.too-large", {}, "Too long"],
            ["shader.too-many", { limit: 32 }, "Over 32 shaders in this project"],
            ["shader.not-ascii", {}, "Not plain ASCII"],
            ["shader.preprocessor", {}, "No # lines"],
            ["shader.reserved", { name: "gl_Position" }, '"gl_Position" is reserved'],
            ["shader.loop-unbounded", {}, "Loop without a fixed count"],
            ["shader.loop-too-long", { limit: 64 }, "Loop over 64 steps"],
            ["shader.too-costly", {}, "Too costly"],
            ["shader.too-deep", {}, "Nested too deep"],
            ["shader.texture-unsupported", {}, "No textures"],
            ["shader.entry-missing", {}, "No shade function"],
            [
                "shader.entry-signature",
                { expected: "vec4 shade(NodeInput node)" },
                "Write it as vec4 shade(NodeInput node)",
            ],
            ["shader.entry-signature", { expected: "shade" }, "shade has the wrong inputs"],
            ["shader.apply-target", {}, "Not for this layer's kind"],
            ["shader.compile", { message: "dimension mismatch" }, "Does not compile: dimension mismatch"],
            ["shader.compile", {}, "Does not compile"],
            ["shader.over-budget", {}, "Too slow to draw"],
            // A code with no paste words of its own falls back on the gallery's.
            ["shader.held", {}, "Held until you run it"],
            ["shader.from-the-future", {}, "Cannot be drawn here"],
        ];
        for (const [code, params, words] of cases) {
            assert.strictEqual(pasteProblemWords(problem(code, params)), words, code);
        }
    });
});

describe("shaderProblemWords", () => {
    it("says why a gallery tile cannot be picked", () => {
        const words = [
            "shader.webgpu-unsupported",
            "shader.held",
            "shader.quarantined",
            "shader.compile",
            "shader.guard-off",
            "shader.unknown",
            "shader.something-new",
        ].map((code) => shaderProblemWords(problem(code)));
        assert.deepStrictEqual(words, [
            "Not drawn with WebGPU",
            "Held until you run it",
            "Turned off after a crash",
            "Does not compile here",
            "Off: the graphics card is slow",
            "Not in this project",
            "Cannot be drawn here",
        ]);
    });

    it("says where a problem is, by line and column when it has them", () => {
        assert.strictEqual(shaderPlaceWords(problem("shader.compile", { line: 12, column: 8 })), "Line 12:8");
        assert.strictEqual(shaderPlaceWords(problem("shader.compile", { line: 3 })), "Line 3");
        assert.isUndefined(shaderPlaceWords(problem("shader.too-large")));
    });
});

describe("shader places", () => {
    it("names a place by the tab it is on, and a place a newer element adds by its own name", () => {
        assert.strictEqual(placeWords("replace"), "Instead of the node");
        assert.strictEqual(placeWords("behind"), "Behind");
        assert.strictEqual(placeWords("along", "edge"), "Along the line");
        assert.strictEqual(placeWords("group"), "Around the group");
        assert.strictEqual(placeWords("paint", "edge"), "On the line");
        assert.strictEqual(placeWords(undefined), "On the node");
        assert.strictEqual(placeWords("orbit" as never), "orbit");
    });

    it("gives the dialog's over its own name, so no two choices share one", () => {
        assert.strictEqual(dialogPlaceWords("over", "node"), "On the node, over its paint");
        assert.strictEqual(dialogPlaceWords("paint", "node"), "On the node");
    });

    it("draws a group outline on the group, and the background tab on the background", () => {
        assert.strictEqual(targetOfPlace("node", "group"), "group");
        assert.strictEqual(targetOfPlace("node", "paint"), "node");
        assert.strictEqual(targetOfPlace("edge", "along"), "edge");
        assert.strictEqual(targetOfPlace("background", undefined), "background");
    });
});

describe("shader counts and quality", () => {
    it("says the render quality and only what differs from full", () => {
        assert.strictEqual(renderQualityWords({ level: "high", motion: "full", heavy: "on" }), "High");
        assert.strictEqual(
            renderQualityWords({ level: "low", motion: "paused", heavy: "off" }),
            "Low, motion paused, heavy shaders off",
        );
        assert.strictEqual(
            renderQualityWords({ level: "medium", motion: "half", heavy: "on" }),
            "Medium, motion at half speed",
        );
    });

    it("names up to two held shaders, and counts more", () => {
        assert.strictEqual(heldShadersWords(["Plate"]), "Held: Plate");
        assert.strictEqual(heldShadersWords(["Plate", "Pearl"]), "Held: Plate, Pearl");
        assert.strictEqual(heldShadersWords(["Plate", "Pearl", "Aura"]), "Held: 3 shaders");
    });

    it("counts layers and problems in the singular and plural", () => {
        assert.strictEqual(layersWord(1), "1 layer");
        assert.strictEqual(layersWord(2), "2 layers");
        assert.strictEqual(pasteProblemsWord(1), "1 problem");
        assert.strictEqual(pasteProblemsWord(0), "0 problems");
        assert.strictEqual(usedByWords(2), "Used by 2");
        assert.strictEqual(copyNameWords("Pearl"), "Pearl copy");
    });
});

describe("selection words", () => {
    it("names a selection by its counts, dropping a zero", () => {
        assert.strictEqual(countName(8, 0), "8 nodes");
        assert.strictEqual(countName(1, 2), "1 node, 2 edges");
        assert.strictEqual(countName(0, 1), "1 edge");
    });

    it("does not name a layer named by its count again beside the count", () => {
        assert.strictEqual(madeWords("8 nodes", 8, 0), "Made a layer for the 8 selected nodes");
        assert.strictEqual(madeWords("1 edge", 0, 1), "Made a layer for the selected edge");
        assert.strictEqual(madeWords("3 nodes, 2 edges", 3, 2), "Made a layer for the 3 selected nodes and 2 edges");
        assert.strictEqual(madeWords("v09", 1, 0), "Made layer v09 for 1 node");
        assert.strictEqual(madeWords("v10", 24, 3), "Made layer v10 for 24 nodes and 3 edges");
    });
});

describe("search order", () => {
    it("ranks the exact name first, then names that start with the search", () => {
        assert.strictEqual(nameRank("On", "on"), 0);
        assert.strictEqual(nameRank("on_record", "on"), 1);
        assert.strictEqual(nameRank("donations", "on"), 2);
    });

    it("puts exact and prefix matches first and keeps each part's order; a blank search keeps it all", () => {
        const names = ["donations", "on_record", "money", "On", "online"];
        assert.deepStrictEqual(
            prefixFirst(names, (name) => name, " ON "),
            ["On", "on_record", "online", "donations", "money"],
        );
        assert.deepStrictEqual(
            prefixFirst(names, (name) => name, "  "),
            names,
        );
    });
});

describe("names and lists", () => {
    it("joins names as a reader lists them", () => {
        assert.strictEqual(listWords([]), "");
        assert.strictEqual(listWords(["A"]), "A");
        assert.strictEqual(listWords(["A", "B"]), "A and B");
        assert.strictEqual(listWords(["A", "B", "C"]), "A, B and C");
    });

    it("names a style's setting without repeating the style, and a property with its kind", () => {
        assert.strictEqual(settingWord("node.halo", "node.haloScale"), "Size");
        assert.strictEqual(settingWord("node.halo", "node.size"), "Size");
        assert.strictEqual(channelPhrase("edge.width"), "edge width");
        assert.strictEqual(bindingTitle("node.size", "Degree"), "Size by Degree");
        assert.strictEqual(bindingTitle("node.size"), "Size from each layer");
    });

    it("writes a rule's numbers bare, never a backticked text", () => {
        assert.strictEqual(plainRule("degree > `3` and weight < `-0.5`"), "degree > 3 and weight < -0.5");
        assert.strictEqual(plainRule("name = `abc`"), "name = `abc`");
    });

    it("says one fact about a value: its range, its count of values, else how many have one", () => {
        const fact = (value: Partial<ReadableValue>): string | undefined =>
            valueFact({ completeness: 1, ...value } as ReadableValue);
        assert.strictEqual(fact({ range: { min: 1, max: 40 } }), "1 to 40");
        assert.strictEqual(fact({ valueCount: 1 }), "1 value");
        assert.strictEqual(fact({ valueCount: 7 }), "7 values");
        assert.strictEqual(fact({ completeness: 0.456 }), "45% have a value");
        assert.isUndefined(fact({}));
    });
});
