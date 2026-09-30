import { expect, it } from "vitest";

import { legacyResult } from "../golden.js";

// The golden file holds a second record for this test that nothing reads.
it("reads one record", () => {
    expect(legacyResult() as number).toBe(1);
});
