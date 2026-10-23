/**
 * The View menu's VR and AR rows from the element's XR facts: one "VR / AR" row when neither
 * mode can be entered for the same reason, a row each otherwise, with the reason in words.
 */
import type { XrCapability } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import { xrEntryFailureWords, xrRows } from "../words";

/**
 * XR facts with the given reasons.
 * @param vr - why VR cannot be entered, or null.
 * @param ar - why AR cannot be entered, or null.
 * @returns the facts.
 */
function facts(vr: XrCapability["reasons"]["vr"], ar: XrCapability["reasons"]["ar"]): XrCapability {
    return { vr: vr === null, ar: ar === null, reasons: { vr, ar }, active: null };
}

describe("the XR rows", () => {
    it("draws one row when neither mode can be entered for the same reason", () => {
        assert.deepEqual(xrRows(facts("no-webxr", "no-webxr")), [
            { mode: "both", reason: "This browser has no VR or AR" },
        ]);
        assert.deepEqual(xrRows(facts("unsupported", "unsupported")), [
            { mode: "both", reason: "This device has no VR or AR" },
        ]);
    });

    it("draws a row each, with its own reason, when the reasons differ", () => {
        assert.deepEqual(xrRows(facts(null, "unsupported")), [
            { mode: "vr", reason: null },
            { mode: "ar", reason: "This device has no AR" },
        ]);
        assert.deepEqual(xrRows(facts("unsupported", "insecure-context")), [
            { mode: "vr", reason: "No VR headset found" },
            { mode: "ar", reason: "Needs a secure (https) page" },
        ]);
        assert.deepEqual(xrRows(facts(null, null)), [
            { mode: "vr", reason: null },
            { mode: "ar", reason: null },
        ]);
    });

    it("says why an entry failed without the element's code", () => {
        assert.equal(xrEntryFailureWords("vr", undefined), "Could not enter VR");
        assert.equal(xrEntryFailureWords("ar", "E_UNSUPPORTED"), "Could not enter AR: it is turned off for this graph");
    });
});
