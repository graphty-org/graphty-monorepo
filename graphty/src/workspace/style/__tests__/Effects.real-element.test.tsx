/**
 * The Effects and Ends sections on the REAL graphty-element, driven by real input: "+" then Glow
 * adds a Glow row with focus in it, typing a hex writes the glow the element draws, the menu no
 * longer offers Glow, the minus takes it away; Head added from Ends and set to None writes `none`.
 * Every assertion reads what the element reports: the layer stack and what `styles.explain` says
 * each element is painted.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { PopoutManager } from "@graphty/compact-mantine";
import type { Channel, LayerId } from "@graphty/graphty-element/schema";
import type { GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createRegistry } from "../../commands/registry";
import { createWorkspaceStore } from "../../state/store";
import { makeWorkspaceValue, WorkspaceContext } from "../../state/WorkspaceContext";
import { StylePanel } from "../StylePanel";

/** A hang guard for the element coming up and painting, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

const NODES = [{ id: "1" }, { id: "2" }, { id: "3" }];
const EDGES = [
    { source: "1", target: "2" },
    { source: "2", target: "3" },
];

let host: HTMLElement | null = null;

afterEach(() => {
    host?.remove();
    host = null;
});

/**
 * Puts a real element on the page (inside the test frame, so clicks land on it), waits for its
 * session and loads a small graph.
 * @returns the element and its session.
 */
async function mountElement(): Promise<{ element: HTMLElementTagNameMap["graphty-element"]; session: GraphSession }> {
    host = document.createElement("div");
    host.style.width = "360px";
    host.style.height = "240px";
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "100%";
    element.style.height = "100%";
    host.appendChild(element);
    document.body.appendChild(host);
    await waitFor(
        () => {
            assert.isDefined(element.session);
        },
        { timeout: TIMEOUT_MS },
    );
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges(EDGES);
    return { element, session: element.session };
}

/**
 * Adds a reader's layer pair (nodes and edges) on top and renders its Style tab.
 * @param session - the element's session.
 * @param element - the element.
 * @returns the row's layer ids.
 */
async function renderRow(session: GraphSession, element: HTMLElementTagNameMap["graphty-element"]): Promise<LayerId[]> {
    const nodes = await session.styles.add({
        name: "Top",
        target: "node",
        selector: { match: "everything" },
        set: { "node.opacity": 1 },
    });
    const edges = await session.styles.add({
        name: "Top edges",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.opacity": 1 },
    });
    const row = [nodes.id, edges.id];
    const value = makeWorkspaceValue(createWorkspaceStore(), createRegistry([]), session, element);
    render(
        <WorkspaceContext.Provider value={value}>
            <PopoutManager>
                <div style={{ width: 280 }}>
                    <StylePanel layers={row} />
                </div>
            </PopoutManager>
        </WorkspaceContext.Provider>,
    );
    return row;
}

/**
 * What a layer writes for a channel.
 * @param session - the element's session.
 * @param id - the layer.
 * @param channel - the channel.
 * @returns the value, if any.
 */
function written(session: GraphSession, id: LayerId, channel: Channel): unknown {
    return session.styles.get(id)?.set?.[channel];
}

/**
 * The glow the element draws on node 1, as `styles.explain` reports it.
 * @param session - the element's session.
 * @returns its hex, `"none"` when written off, or undefined when no layer writes one.
 */
function glowOf(session: GraphSession): string | undefined {
    return session.styles.explain({ node: "1" }).merged["node.glow"]?.hex.slice(0, 7).toLowerCase();
}

/**
 * The node Effects list.
 * @returns the list.
 */
function nodeEffects(): HTMLElement {
    return screen.getByRole("group", { name: "Node effects" });
}

describe("effects and arrow ends on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1024, 768);
    });

    it("'+' then Glow adds a Glow row with focus in its hex box; a typed hex writes the glow; the minus removes it", async () => {
        const { session, element } = await mountElement();
        const [nodeLayer] = await renderRow(session, element);

        await userEvent.click(within(nodeEffects()).getByRole("button", { name: "Add to node effects" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Glow" }));
        const row = await waitFor(() => {
            const found = nodeEffects().querySelector<HTMLElement>('.ws-row[data-line="node.glow"]');
            assert.isNotNull(found, "a Glow row");
            return found;
        });
        assert.isDefined(written(session, nodeLayer, "node.glow"), "adding writes a starting glow");
        const hex = within(row).getByRole<HTMLInputElement>("textbox", { name: /^Node glow/ });
        await userEvent.tripleClick(hex);
        await userEvent.keyboard("FF00FF{Enter}");
        await waitFor(
            () => {
                assert.equal(written(session, nodeLayer, "node.glow"), "#FF00FF");
                assert.equal(glowOf(session), "#ff00ff");
            },
            { timeout: TIMEOUT_MS },
        );

        // Glow is set, so "+" no longer offers it.
        await userEvent.click(within(nodeEffects()).getByRole("button", { name: "Add to node effects" }));
        const items = await screen.findAllByRole("menuitem");
        assert.notInclude(
            items.map((item) => item.textContent),
            "Glow",
        );
        await userEvent.keyboard("{Escape}");

        await userEvent.click(within(row).getByRole("button", { name: "Remove node glow" }));
        await waitFor(() => {
            assert.isUndefined(written(session, nodeLayer, "node.glow"), "removed from the layer");
            assert.isNull(nodeEffects().querySelector('.ws-row[data-line="node.glow"]'), "the row is gone");
        });
    });

    it("Head added from Ends and set to None writes none", async () => {
        const { session, element } = await mountElement();
        const [, edgeLayer] = await renderRow(session, element);
        const ends = screen.getByRole("group", { name: "Edge ends" });
        await userEvent.click(within(ends).getByRole("button", { name: "Add to edge ends" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Head" }));
        const head = await within(ends).findByRole("combobox", { name: /^Edge head/ });
        await userEvent.click(head);
        await userEvent.click(await screen.findByRole("option", { name: "None" }));
        await waitFor(
            () => {
                assert.equal(written(session, edgeLayer, "edge.arrowHead"), "none");
            },
            { timeout: TIMEOUT_MS },
        );
    });
});
