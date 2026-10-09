import { describe, expect, it } from "vitest";

import { parseScalar } from "../../../src/formats/xgmml/values.js";
import { cpuMilliseconds } from "../../helpers/work-meter.js";

describe("xgmml parseScalar: real", () => {
    it("reads the Java Double spellings Cytoscape writes and rejects the rest", () => {
        const accepted: [string, number][] = [
            ["1", 1],
            ["1.", 1],
            ["1.5", 1.5],
            [".5", 0.5],
            ["-2.5e3", -2500],
            ["+1E-2", 0.01],
            [" 7 ", 7],
            ["NaN", Number.NaN],
            ["-Infinity", -Infinity],
        ];
        for (const [text, value] of accepted) {
            expect(parseScalar(text, "real", false)?.value, text).toBe(value);
        }
        for (const text of [".", "1..2", "1e", "e5", "0x10", "1d", "1,5", ""]) {
            expect(parseScalar(text, "real", false), text).toBeNull();
        }
    });

    it("rejects a pathologically long number in linear time", async () => {
        // A run of digits before a bad character took quadratic time (about 36 s at this length)
        // when the pattern could split the run between two digit repetitions; linear takes about 1 ms.
        const text = `1${"0".repeat(200_000)}x`;
        const cpu = await cpuMilliseconds(() => {
            expect(parseScalar(text, "real", false)).toBeNull();
        });
        expect(cpu).toBeLessThan(1000);
    });
});
