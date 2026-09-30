import { expect, it } from "vitest";

import { legacyResult } from "../golden.js";

// Two tests with one name share one golden key; the second must not silently replay the first's record.
it("shares a name", () => {
    expect(legacyResult() as number).toBe(1);
});

it("shares a name", () => {
    expect(legacyResult() as number).toBe(1);
});
