/**
 * @file The llm-regression lane's hue check reads any CSS color a model may write: a name,
 * rgb(), hsl() or any hex, and channels.
 */

import { assert, describe, it } from "vitest";

import { isHue } from "./llm-regression/red";

describe("isHue", () => {
    it("reads every green a model writes as green", () => {
        for (const green of [
            "green",
            "lime",
            "limegreen",
            "forestgreen",
            "#0f0",
            "#2ecc71",
            "#00FF00",
            "rgb(0, 128, 0)",
            "hsl(120, 100%, 40%)",
            { r: 0, g: 200, b: 50 },
            { r: 0, g: 0.8, b: 0.2 },
        ]) {
            assert.isTrue(isHue(green, "green"), JSON.stringify(green));
        }
    });

    it("reads reds and blues by their hue", () => {
        for (const red of ["red", "#f00", "crimson", "rgb(220, 20, 60)", "#D55E00"]) {
            assert.isTrue(isHue(red, "red"), red);
            assert.isFalse(isHue(red, "green"), red);
        }

        for (const blue of ["blue", "navy", "#0077BB", "royalblue", "hsl(230, 80%, 50%)"]) {
            assert.isTrue(isHue(blue, "blue"), blue);
            assert.isFalse(isHue(blue, "red"), blue);
        }
    });

    it("gives grays, other hues and non-colors no primary hue", () => {
        for (const other of ["#9E9E9E", "white", "black", "orange", "purple", "yellow", "not a color", 7, undefined]) {
            for (const hue of ["red", "green", "blue"] as const) {
                assert.isFalse(isHue(other, hue), `${String(other)} ${hue}`);
            }
        }
    });
});
