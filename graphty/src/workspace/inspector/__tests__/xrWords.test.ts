/**
 * The notice for an immersive session the browser would not start, in the app's words.
 */
import { assert, describe, it } from "vitest";

import { xrEntryFailureWords } from "../words";

describe("the XR words", () => {
    it("says why an entry failed without the element's code", () => {
        assert.equal(xrEntryFailureWords("vr", undefined), "Could not enter VR");
        assert.equal(xrEntryFailureWords("ar", "E_UNSUPPORTED"), "Could not enter AR: it is turned off for this graph");
    });
});
