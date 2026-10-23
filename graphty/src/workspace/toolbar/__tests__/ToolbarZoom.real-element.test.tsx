/**
 * The canvas toolbar at 200% zoom (a 1440 x 900 window is 720 x 450 CSS pixels), on the REAL
 * graphty-element with both panels open: the canvas is narrower than the toolbar's one row, so
 * the toolbar wraps, and every tool is reached from the keyboard -- Tab into the toolbar, then
 * the arrow keys -- and is on screen when it is focused (WCAG 1.4.10, 2.1.1).
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/** More Tab presses than the page has stops before the toolbar: a missing stop fails, never hangs. */
const MAX_TABS = 80;

describe("the canvas toolbar at 200% zoom", () => {
    it("reaches and shows every tool from the keyboard", async () => {
        await page.viewport(720, 450);
        const store = createWorkspaceStore({ project: { name: "Pair", id: 1 }, inspected: null });
        render(<Workspace store={store} />);
        const element = await waitFor(
            () => {
                const found = document.querySelector("graphty-element");
                assert.isDefined(found?.session);
                return found;
            },
            { timeout: TIMEOUT_MS },
        );
        await element?.session.data.addNodes([{ id: "a" }, { id: "b" }]);
        await element?.session.data.addEdges([{ source: "a", target: "b" }]);
        const toolbar = await screen.findByRole("toolbar", { name: "Canvas tools" }, { timeout: TIMEOUT_MS });
        const canvas = toolbar.closest<HTMLElement>(".ws-canvas");
        assert.isNotNull(canvas);
        const tools = [...toolbar.querySelectorAll<HTMLElement>("button")];
        assert.isAtLeast(tools.length, 6);

        (document.activeElement as HTMLElement | null)?.blur();
        for (let i = 0; i < MAX_TABS && !toolbar.contains(document.activeElement); i++) {
            await userEvent.keyboard("{Tab}");
        }
        assert.isTrue(toolbar.contains(document.activeElement), "Tab reaches the toolbar");

        const reached = new Set<Element>();
        const area = canvas?.getBoundingClientRect();
        for (let i = 0; i < tools.length * 2 && reached.size < tools.length; i++) {
            const focused = document.activeElement;
            if (focused instanceof HTMLElement && tools.includes(focused)) {
                reached.add(focused);
                const box = focused.getBoundingClientRect();
                const name = focused.getAttribute("aria-label") ?? focused.textContent ?? "";
                assert.isAtLeast(box.left, area?.left ?? 0, `${name} is inside the canvas`);
                assert.isAtMost(box.right, area?.right ?? 0, `${name} is inside the canvas`);
                assert.isAtMost(box.bottom, Math.min(area?.bottom ?? 0, window.innerHeight), `${name} is on screen`);
            }
            await userEvent.keyboard("{ArrowRight}");
        }
        assert.lengthOf([...reached], tools.length, "every tool is reached");
        await page.screenshot({
            path: "../../../../../design/ui/studio/tier3/build/key-values-settings/toolbar-200.png",
        });
    });
});
