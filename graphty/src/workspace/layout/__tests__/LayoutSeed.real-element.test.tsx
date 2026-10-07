/**
 * The app's layout seed on the REAL graphty-element: the element imposes none, so the app passes
 * its own with the layout it starts every project on and with every method the reader picks, and
 * one file draws the same way each time it is opened.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { assert, beforeAll, describe, it } from "vitest";
import { page } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { LAYOUT_SEED } from "../methods";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

describe("the app's layout seed", () => {
    // At the runner's default 414 px the toolbar is clipped, and Mantine hides a popover whose
    // anchor is hidden.
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it(
        "starts every project on the seeded force layout, and keeps the seed on a method change",
        async () => {
            const store = createWorkspaceStore({ project: { name: "Ring", id: 1 } });
            render(<Workspace store={store} />);
            let session: GraphSession | undefined;
            await waitFor(
                () => {
                    session = document.querySelector("graphty-element")?.session;
                    assert.isDefined(session);
                },
                { timeout: TIMEOUT_MS },
            );
            if (session === undefined) {
                throw new Error("the element never came up");
            }

            assert.strictEqual(session.layout.engine, "ngraph");
            assert.strictEqual(session.layout.options.seed, LAYOUT_SEED, "the project starts seeded");
            assert.strictEqual(
                screen.getByRole("button", { name: "Undo" }).getAttribute("aria-disabled"),
                "true",
                "the seed is where the project starts, not a step to undo",
            );

            await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
            const layoutTool = screen.getByRole("button", { name: "Layout" });
            await waitFor(() => {
                assert.isFalse(layoutTool.hasAttribute("aria-disabled"));
            });
            await userEvent.click(layoutTool);
            const popover = await screen.findByRole("dialog", { name: "Layout" });
            await userEvent.click(within(popover).getByRole("combobox", { name: "Method" }));
            await userEvent.click(await within(popover).findByRole("option", { name: /^Random/ }));
            const live = session;
            await waitFor(() => {
                assert.strictEqual(live.layout.id, "random");
            });
            assert.strictEqual(live.layout.options.seed, LAYOUT_SEED, "a picked method is seeded too");
            assert.strictEqual(within(popover).getByRole<HTMLInputElement>("spinbutton", { name: "Seed" }).value, "1");
        },
        TIMEOUT_MS,
    );
});
