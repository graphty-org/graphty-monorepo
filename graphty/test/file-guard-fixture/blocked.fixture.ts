// Not a test of the suite: graphty/test/file-guard.test.ts runs it. No timer of this page fires again.
import { it } from "vitest";

it("blocks the page", () => {
    while (Date.now() > 0) {
        // the page's main thread never comes back
    }
});
