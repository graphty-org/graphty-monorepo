/**
 * A method the REAL graphty-element refuses: "No crossings" on a graph that is not planar. The
 * drawing stays as it was, and a line under Method says which method could not lay it out.
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

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

describe("a refused layout method", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it(
        "says under Method that No crossings could not lay out a non-planar graph",
        async () => {
            const store = createWorkspaceStore({ project: { name: "K6", id: 1 } });
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

            // K6: 15 edges, more than 3 * 6 - 6 = 12, so no drawing of it is free of crossings.
            const ids = ["a", "b", "c", "d", "e", "f"];
            await session.data.addNodes(ids.map((id) => ({ id })));
            await session.data.addEdges(ids.flatMap((src, i) => ids.slice(i + 1).map((dst) => ({ src, dst }))));

            const layoutTool = screen.getByRole("button", { name: "Layout" });
            await waitFor(() => {
                assert.isFalse(layoutTool.hasAttribute("aria-disabled"));
            });
            await userEvent.click(layoutTool);
            const popover = await screen.findByRole("dialog", { name: "Layout" });
            await userEvent.click(within(popover).getByRole("combobox", { name: "Method" }));
            await userEvent.click(await within(popover).findByRole("option", { name: /^No crossings/ }));
            await within(popover).findByText("No crossings could not lay out this graph, so the drawing is unchanged");
            assert.strictEqual(session.layout.id, "force", "the drawing is unchanged");
        },
        TIMEOUT_MS,
    );
});
