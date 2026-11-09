/**
 * @file A story's play run outside Storybook waits until the one hang guard, not Testing Library's
 * 1000 ms default.
 *
 * No test project loads .storybook/preview.ts, so stories/assertions.ts, where every story's waits
 * come from, sets the guard itself: without it the Undo stories failed render-parity on a busy
 * machine with "no graph ever arrived" a second after they started (#6368).
 */

import "../../stories/assertions";

import { getConfig } from "storybook/test";
import { assert, it } from "vitest";

import { WAIT_GUARD_MS } from "../../../tools/test-wait-guard.mjs";

it("gives storybook/test's waitFor the hang guard as its only deadline", () => {
    assert.equal(getConfig().asyncUtilTimeout, WAIT_GUARD_MS);
});
