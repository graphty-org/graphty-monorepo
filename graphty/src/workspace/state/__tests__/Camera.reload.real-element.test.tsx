/**
 * A reload of this tab puts the camera back where the reader left it, and the Views place still
 * marks the saved camera last gone to (issue #9663). Safari ends a background tab and loads it
 * again, often with its session storage emptied, so each case runs with that storage kept and with
 * it emptied. Real element, real autosave, real input.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { afterEach, assert, beforeAll, beforeEach, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { forgetAutosave, openAutosaved, reload } from "../../../test/reload";
import { waitFor } from "../../../test/test-utils";

type GraphElement = HTMLElementTagNameMap["graphty-element"];

/** Starts with nothing kept: no autosaved work and nothing in this tab's session storage. */
async function forget(): Promise<void> {
    await forgetAutosave();
    sessionStorage.clear();
}

/**
 * The opened element.
 * @returns it.
 */
async function elementNow(): Promise<GraphElement> {
    return waitFor(() => {
        const found = document.querySelector<GraphElement>("graphty-element:not([data-start-page])");
        assert.isNotNull(found);
        assert.isDefined(found.session);
        return found;
    });
}

/**
 * The camera's position, rounded, once it has stopped moving.
 * @param element - the element.
 * @returns the position.
 */
async function restingCamera(element: GraphElement): Promise<string> {
    const now = (): string => {
        const { position } = element.getCameraState();
        return JSON.stringify([position?.x, position?.y, position?.z].map((value) => (value ?? 0).toFixed(1)));
    };
    let before: string;
    do {
        before = now();
        await element.waitForStableFrame();
    } while (now() !== before);
    return before;
}

describe.each([{ lostSession: false }, { lostSession: true }])(
    "the camera across a reload (session storage emptied: $lostSession)",
    ({ lostSession }) => {
        beforeAll(async () => {
            await page.viewport(1440, 900);
        });
        beforeEach(forget);
        afterEach(forget);

        it("puts the camera back, with the saved camera last gone to still marked (issue #9663)", async () => {
            const before = await openAutosaved("Les Miserables");
            const element = await elementNow();
            (document.activeElement as HTMLElement | null)?.blur();
            // A camera key flies to a saved camera, as the reader's press does.
            await userEvent.keyboard("1");
            await waitFor(() => {
                assert.isNotNull(before.store.get().lastView);
            });
            const view = before.store.get().lastView;
            const camera = await restingCamera(element);

            const after = await reload(before, { lostSession });
            const reopened = await elementNow();
            await waitFor(async () => {
                assert.strictEqual(await restingCamera(reopened), camera, "the camera is where the reader left it");
            });
            await userEvent.click(page.getByRole("button", { name: "Views", exact: true }));
            await waitFor(() => {
                const marked = document.querySelector('[aria-current="true"]');
                assert.isNotNull(marked, "a saved camera is marked as the last one gone to");
                assert.strictEqual(marked.getAttribute("aria-label"), `Go to ${view ?? ""}`);
            });
            after.view.unmount();
        });
    },
);
