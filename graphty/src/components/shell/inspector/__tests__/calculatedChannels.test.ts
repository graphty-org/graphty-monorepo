import { describe, expect, it } from "vitest";

import { DEGREE_INPUT_PATH, LABEL_ENABLED_OUTPUT_PATH, topDegreeLabelLayer } from "../../defaults/styleDescriptors";
import {
    calculatedChannelOf,
    calculatedChannelWord,
    calculatedReason,
    calculatedSentence,
    calculatedSourceWord,
    type LayerChannelId,
} from "../calculatedChannels";

/**
 * A layer half carrying one calculated rule.
 * @param output - the rule's output path.
 * @param expr - the rule's expression.
 * @param inputs - the rule's input paths.
 * @returns the half, in the shape `calculatedChannelOf` reads.
 */
function half(
    output: string,
    expr = "arguments[0]",
    inputs: readonly string[] = [DEGREE_INPUT_PATH],
): { calculatedStyle: Record<string, unknown> } {
    return { calculatedStyle: { inputs: [...inputs], output, expr } };
}

describe("calculatedChannelOf maps every output path the repository uses", () => {
    const cases: readonly (readonly [string, LayerChannelId])[] = [
        ["style.texture.color", "node.color"],
        ["style.shape.size", "node.size"],
        ["style.label.enabled", "node.label"],
        ["style.line.color", "edge.color"],
        ["style.line.width", "edge.width"],
    ];

    it.each(cases)("%s owns the %s row", (output, channel) => {
        expect(calculatedChannelOf(half(output))?.channel).toBe(channel);
    });

    it("reports an UNKNOWN output path rather than dropping it", () => {
        /* The blind spot repeating itself for the next algorithm that writes a new path
           is the whole failure mode this module exists to prevent, so an unmapped path
           must still come back as a rule -- with no row to own it. */
        const read = calculatedChannelOf(half("style.opacity"));

        expect(read).toBeDefined();
        expect(read?.channel).toBeUndefined();
        expect(read?.output).toBe("style.opacity");
    });

    it("gives an unmapped path its own raw name beside Channel", () => {
        expect(calculatedChannelWord(undefined, "style.opacity")).toBe("style.opacity");
        expect(calculatedChannelWord("node.label", "style.label.enabled")).toBe("Node label");
    });
});

describe("calculatedChannelOf refuses a malformed rule rather than throwing", () => {
    it("returns undefined for a half with no rule at all", () => {
        expect(calculatedChannelOf(undefined)).toBeUndefined();
        expect(calculatedChannelOf({})).toBeUndefined();
    });

    it("returns undefined when the rule is not an object", () => {
        expect(calculatedChannelOf({ calculatedStyle: "style.label.enabled" })).toBeUndefined();
        expect(calculatedChannelOf({ calculatedStyle: [1, 2, 3] })).toBeUndefined();
    });

    it("returns undefined when expr is missing", () => {
        expect(
            calculatedChannelOf({ calculatedStyle: { inputs: [DEGREE_INPUT_PATH], output: "style.label.enabled" } }),
        ).toBeUndefined();
    });

    it("returns undefined when inputs is not an array", () => {
        expect(
            calculatedChannelOf({
                calculatedStyle: { inputs: DEGREE_INPUT_PATH, output: "style.label.enabled", expr: "true" },
            }),
        ).toBeUndefined();
    });

    it("returns undefined when output is absent or empty", () => {
        expect(calculatedChannelOf({ calculatedStyle: { inputs: [], expr: "true" } })).toBeUndefined();
        expect(calculatedChannelOf({ calculatedStyle: { inputs: [], output: "", expr: "true" } })).toBeUndefined();
    });

    it("keeps a rule whose inputs array is empty, and still says something readable", () => {
        const read = calculatedChannelOf({ calculatedStyle: { inputs: [], output: "style.opacity", expr: "0.5" } });

        expect(read?.inputs).toEqual([]);
        expect(read?.sourceWord).toBe("the data");
    });
});

describe("calculatedSourceWord", () => {
    it("turns the element's degree path into one word", () => {
        expect(calculatedSourceWord([DEGREE_INPUT_PATH])).toBe("degree");
    });

    it("reads the FIRST input, and only its last segment", () => {
        expect(calculatedSourceWord(["data.weight", "algorithmResults.graphty.degree.degree"])).toBe("weight");
    });

    it("falls back to a word that makes the reason a sentence", () => {
        expect(calculatedSourceWord([])).toBe("the data");
        expect(calculatedSourceWord([""])).toBe("the data");
    });
});

describe("calculatedReason", () => {
    it("is the exact ASCII sentence the disabled control appends to its own title", () => {
        expect(calculatedReason("degree")).toBe("Computed from degree. Convert it to a fixed value to edit it");
    });

    it("carries no trailing full stop, because compact-mantine composes the punctuation", () => {
        /* `useControlAnnotation` writes `${name}. ${reason}`, so a trailing stop here
           would draw "Label. Computed from degree. ... edit it." with two of them. */
        expect(calculatedReason("degree").endsWith(".")).toBe(false);
    });

    it("is ASCII only", () => {
        const reason = calculatedReason("degree");

        for (let index = 0; index < reason.length; index += 1) {
            expect(reason.charCodeAt(index)).toBeLessThan(128);
        }
    });
});

describe("calculatedSentence says what the layer does, never what the expression says", () => {
    it("reads the shell's own Top degree labels layer", () => {
        const layer = topDegreeLabelLayer({ degreeThreshold: 3 });
        const read = calculatedChannelOf(layer.node);

        expect(read).toBeDefined();
        expect(read?.channel).toBe("node.label");
        expect(read?.output).toBe(LABEL_ENABLED_OUTPUT_PATH);
        expect(calculatedSentence(read as NonNullable<typeof read>, "node")).toBe(
            "This layer draws a label on every node whose degree is 3 or more.",
        );
    });

    it("drops the threshold clause when the expression is not a numeric lower bound", () => {
        const read = calculatedChannelOf(half("style.texture.color", "StyleHelpers.color.sequential.viridis(pct)"));

        expect(calculatedSentence(read as NonNullable<typeof read>, "node")).toBe(
            "This layer colors every node from its degree.",
        );
    });

    it("names an unmapped output path in the sentence too", () => {
        const read = calculatedChannelOf(half("style.opacity", "arguments[0] >= 2"));

        expect(calculatedSentence(read as NonNullable<typeof read>, "node")).toBe(
            "This layer computes style.opacity for every node whose degree is 2 or more.",
        );
    });

    it("says edge for the edge half", () => {
        const read = calculatedChannelOf(half("style.line.width", "arguments[0]", ["data.weight"]));

        expect(calculatedSentence(read as NonNullable<typeof read>, "edge")).toBe(
            "This layer sets the width of every edge from its weight.",
        );
    });

    it("is not fooled by a <= or a != into reading a threshold", () => {
        const read = calculatedChannelOf(half("style.shape.size", "arguments[0] <= 4"));

        expect(calculatedSentence(read as NonNullable<typeof read>, "node")).toBe(
            "This layer sizes every node from its degree.",
        );
    });
});
