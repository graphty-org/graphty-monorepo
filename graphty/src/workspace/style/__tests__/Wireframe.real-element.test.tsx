/**
 * Wireframe as a Shape option on the REAL graphty-element, driven by real input (decisions-v2,
 * section 7): Shape's "+" then Wireframe writes `node.wireframe` true with `node.meshDetail` "low"
 * as one step, and one Undo takes both back; Off writes it off and drops the detail; the minus
 * takes both away. Every assertion reads what the element's layer holds and its history.
 */

import { afterEach, assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { screen, waitFor, within } from "../../../test/test-utils";
import { addNodeLayer, mountElement, removeElement, renderPanel, section, TIMEOUT_MS } from "./shaderHarness";

afterEach(removeElement);

describe("Wireframe in Shape", () => {
    beforeAll(async () => {
        await page.viewport(1024, 768);
    });

    it("Shape '+' then Wireframe writes wireframe and low detail in one step; one Undo removes both", async () => {
        const mounted = await mountElement();
        const { session } = mounted;
        const layer = await addNodeLayer(session);
        renderPanel(mounted, [layer]);
        const set = (): Record<string, unknown> => ({ ...session.styles.get(layer)?.set });
        const steps = session.history.position;

        await userEvent.click(within(section("node", "shape")).getByRole("button", { name: "Add to node shape" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Wireframe" }));
        await waitFor(
            () => {
                assert.strictEqual(set()["node.wireframe"], true);
                assert.strictEqual(set()["node.meshDetail"], "low");
            },
            { timeout: TIMEOUT_MS },
        );
        assert.strictEqual(session.history.position, steps + 1, "one step");
        assert.isNotNull(section("node", "shape").querySelector('.ws-row[data-line="node.wireframe"]'));

        await session.undo();
        await waitFor(() => {
            assert.notProperty(set(), "node.wireframe");
            assert.notProperty(set(), "node.meshDetail");
        });
    });

    it("Off writes the wireframe off and drops the detail; the minus takes both away", async () => {
        const mounted = await mountElement();
        const { session } = mounted;
        const layer = await addNodeLayer(session, { "node.wireframe": true, "node.meshDetail": "low" });
        renderPanel(mounted, [layer]);
        const set = (): Record<string, unknown> => ({ ...session.styles.get(layer)?.set });
        const row = await waitFor(() => {
            const found = section("node", "shape").querySelector<HTMLElement>('.ws-row[data-line="node.wireframe"]');
            assert.isNotNull(found);
            return found;
        });

        await userEvent.click(within(row).getByLabelText(/^Node wireframe/));
        await userEvent.click(await screen.findByRole("option", { name: "Off" }));
        await waitFor(() => {
            assert.strictEqual(set()["node.wireframe"], false);
            assert.notProperty(set(), "node.meshDetail");
        });

        await userEvent.click(within(row).getByRole("button", { name: "Remove wireframe" }));
        await waitFor(() => {
            assert.notProperty(set(), "node.wireframe");
        });
    });
});
