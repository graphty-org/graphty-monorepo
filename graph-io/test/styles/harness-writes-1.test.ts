/**
 * Slice 1 of 3 of the style harness's round trip and hostile-block checks (see harness-cases.ts).
 */

import { describe, expect, it } from "vitest";

import { hostileProblems, writeProblems, writeSlice } from "./harness-cases.js";

describe.each(writeSlice(0))("%s", (_format, writer, { pass, fail, hostile }) => {
    it.each(pass)("%s writes styles that read back as the same rules and values", async (_name, input) => {
        expect(await writeProblems(writer, input)).toEqual([]);
    });
    it.each(hostile)("%s ignores a hostile graphty.styles block in the written file", async (_name, input) => {
        expect(await hostileProblems(writer, input)).toEqual([]);
    });
    if (fail.length > 0) {
        it.fails.each(fail)(
            "%s writes styles that read back as the same rules and values (known failure)",
            async (_name, input) => {
                expect(await writeProblems(writer, input)).toEqual([]);
            },
        );
    }
});
