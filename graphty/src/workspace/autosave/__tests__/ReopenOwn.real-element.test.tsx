/**
 * A reload that reopens this tab's kept work writes to that work's entry and starts no other one
 * (issue #9978: each such load also left a second, empty entry in the kept-work list). Real
 * element, real autosave, real input.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { listAutosaves } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeAll, beforeEach, describe, it } from "vitest";
import { page } from "vitest/browser";

import { forgetAutosave, openAutosaved, reload } from "../../../test/reload";
import { waitFor } from "../../../test/test-utils";
import { WORKSPACE_AUTOSAVE_KEY } from "../autosave";

/** Starts with nothing kept: no autosaved work and nothing in this tab's session storage. */
async function forget(): Promise<void> {
    await forgetAutosave();
    sessionStorage.clear();
}

/**
 * The opened element, once its autosave has written everything.
 * @returns the entry it writes to.
 */
async function savedEntry(): Promise<string> {
    const element = await waitFor(() => {
        const found = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
            "graphty-element:not([data-start-page])",
        );
        assert.isNotNull(found);
        return found;
    });
    await element.autosaver.flush();
    return waitFor(() => {
        const { status } = element.autosaver;
        assert.strictEqual(status.state, "saved");
        assert.isNotNull(status.entry);
        return status.entry;
    });
}

describe.each([{ lostSession: false }, { lostSession: true }])(
    "a reload that reopens this tab's work (session storage emptied: $lostSession)",
    ({ lostSession }) => {
        beforeAll(async () => {
            await page.viewport(1440, 900);
        });
        beforeEach(forget);
        afterEach(forget);

        it("keeps one entry, the reopened one (issue #9978)", async () => {
            const before = await openAutosaved("Les Miserables");
            const entry = await savedEntry();
            const after = await reload(before, { lostSession });
            assert.strictEqual(await savedEntry(), entry, "the reopened work is written to its own entry");
            const ids = (await listAutosaves(WORKSPACE_AUTOSAVE_KEY)).map((each) => each.id);
            assert.deepStrictEqual(ids, [entry], "no other entry was started");
            after.view.unmount();
        });
    },
);
