/**
 * A tooltip that names the node under the pointer, made from the Style tab on the REAL
 * graphty-element: "+" adds the Tooltip line, its bind icon reads an attribute, and hovering a
 * node on the canvas shows that node's own value. What the tooltip says is read from the
 * element's `graphty-node-hover` event, which carries the words the tooltip draws.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and painting, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/** What the element's hover event carries. */
type NodeEventDetail = HTMLElementEventMap["graphty-node-hover"]["detail"];

const NODES = [
    { id: "1", name: "Alpha" },
    { id: "2", name: "Beta" },
    { id: "3", name: "Gamma" },
];
const EDGES = [
    { source: "1", target: "2" },
    { source: "2", target: "3" },
];

describe("a tooltip from an attribute on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("Add Tooltip, Tooltip by attribute, name: hovering a node shows that node's name", async () => {
        const store = createWorkspaceStore({
            project: { name: "Line", id: 1 },
            inspected: { kind: "everything-row" },
        });
        render(<Workspace store={store} />);
        let found: HTMLElementTagNameMap["graphty-element"] | null = null;
        await waitFor(
            () => {
                found = document.querySelector("graphty-element");
                assert.isDefined(found?.session);
            },
            { timeout: TIMEOUT_MS },
        );
        if (found === null) {
            throw new Error("the element never came up");
        }
        const element: HTMLElementTagNameMap["graphty-element"] = found;
        await element.session.data.addNodes(NODES);
        await element.session.data.addEdges(EDGES);

        const tab = await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
        await userEvent.click(within(tab).getByRole("button", { name: "Add Tooltip" }));
        // The first edit of the Everything row adds its layer, which redraws the tab.
        const bind = await screen.findByRole("button", { name: "Tooltip by attribute" });
        await userEvent.click(bind);
        const list = await screen.findByRole("dialog", { name: "From data" });
        assert.isNotNull(within(list).queryByRole("option", { name: "id" }), "the node id can be picked");
        await userEvent.click(within(list).getByRole("option", { name: "name" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("button", { name: "Tooltip by attribute" }));
        });

        const heard: NodeEventDetail[] = [];
        element.addEventListener("graphty-node-hover", (event) => {
            heard.push(event.detail);
        });
        await element.waitForSettled();
        let at = element.nodeScreenPosition("2");
        await waitFor(
            () => {
                at = element.nodeScreenPosition("2");
                assert.isTrue(at?.visible, "node 2 is on screen");
            },
            { timeout: TIMEOUT_MS },
        );
        await userEvent.hover(element, { position: { x: at?.x ?? 0, y: at?.y ?? 0 } });

        await waitFor(
            () => {
                assert.deepEqual(
                    heard.map((d) => [d.nodeId, d.tooltip]),
                    [["2", "Beta"]],
                    "the tooltip on the hovered node says its name",
                );
            },
            { timeout: TIMEOUT_MS },
        );
    });
});
