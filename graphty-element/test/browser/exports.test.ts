import { assert, test } from "vitest";

import * as entry from "../../index.js";
import { AnimationCancelledError } from "../../index.js";

test("captures report GraphtyError codes, so there is no second screenshot error family", () => {
    assert.notProperty(entry, "ScreenshotError");
    assert.notProperty(entry, "ScreenshotErrorCode");
    assert.include(entry.GRAPHTY_ERROR_CODES, "E_CAPTURE_FAILED");
    assert.include(entry.GRAPHTY_ERROR_CODES, "E_NOT_SETTLED");
});

test("AnimationCancelledError is exported and can be instantiated", () => {
    const error = new AnimationCancelledError();

    assert.equal(error.name, "AnimationCancelledError");
    assert.ok(error.message.includes("cancel"), "Error message should mention cancellation");
});
