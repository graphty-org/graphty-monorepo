/**
 * Spelling graphty's generic style names in a format's program vocabulary before a writer writes them.
 */
import { describe, expect, it } from "vitest";

import { yedRowOf } from "../../../src/styles/io/spell.js";

describe("yedRowOf", () => {
    it("names the yEd arrow an end cap and its row draw, at any line width", () => {
        expect(yedRowOf("stem", "tee*1x16")).toBe("other:crows_foot_one");
        expect(yedRowOf("stem", "tee*2x32")).toBe("other:crows_foot_one");
        // the same pieces, half as wide: yEd's dash
        expect(yedRowOf("stem", "tee*1x8")).toBe("other:dash");
        expect(yedRowOf("crow", "circle-open*10x10")).toBe("other:crows_foot_many_optional");
        expect(yedRowOf("triangle-open", "stem*5 tee*1x16")).toBe("other:white_delta_bar");
        expect(yedRowOf("stem", "slash")).toBe("other:skewed-dash");
    });

    it("names no yEd arrow for a row yEd does not draw", () => {
        // Graphviz's crowodot: a ring with no width of its own
        expect(yedRowOf("crow", "circle-open")).toBeUndefined();
        expect(yedRowOf("crow", "circle-open:left*10x10")).toBeUndefined();
        expect(yedRowOf("stem", "tee*1x12")).toBeUndefined();
        expect(yedRowOf("triangle", null)).toBeUndefined();
    });
});
