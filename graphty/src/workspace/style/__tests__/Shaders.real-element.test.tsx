/**
 * The style options and the Shaders gallery on the REAL graphty-element, driven by real input:
 * Glow is a Shape option, added from Shape's "+" with focus in its hex box, written once a value
 * is typed and taken away by its minus; typing "glow" in the Shaders gallery finds the Glow option,
 * whose Enter adds the Glow row in Shape and no shader; Control-clicking two layers and adding
 * Reticle gives both layers Reticle, and one Control+Z takes both back; Target end added from
 * Arrowheads and set to None writes `none`. Every assertion reads what the element reports.
 */

import type { Channel, LayerId } from "@graphty/graphty-element/schema";
import type { GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { screen, waitFor, within } from "../../../test/test-utils";
import { showKind } from "./kindTab";
import {
    addByName,
    addNodeLayer,
    idOf,
    mountElement,
    mountWorkspace,
    removeElement,
    renderPanel,
    section,
    TIMEOUT_MS,
    treeRow,
    usesOn,
} from "./shaderHarness";

afterEach(removeElement);

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
 * @returns its hex, or undefined when no layer writes one.
 */
function glowOf(session: GraphSession): string | undefined {
    return session.styles.explain({ node: "1" }).merged["node.glow"]?.hex.slice(0, 7).toLowerCase();
}

describe("style options and the Shaders gallery", () => {
    beforeAll(async () => {
        await page.viewport(1024, 768);
    });

    it("Shape '+' then Glow adds a Glow row with focus in its hex box; a typed hex writes the glow; the minus removes it", async () => {
        const mounted = await mountElement();
        const layer = await addNodeLayer(mounted.session);
        renderPanel(mounted, [layer]);
        const shape = (): HTMLElement => section("node", "shape");

        await userEvent.click(within(shape()).getByRole("button", { name: "Add to node shape" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Glow" }));
        const row = await waitFor(() => {
            const found = shape().querySelector<HTMLElement>('.ws-row[data-line="node.glow"]');
            assert.isNotNull(found, "a Glow row");
            return found;
        });
        assert.isUndefined(written(mounted.session, layer, "node.glow"), "adding writes nothing before a value");
        const hex = within(row).getByRole<HTMLInputElement>("textbox", { name: /^Node glow/ });
        await userEvent.tripleClick(hex);
        await userEvent.keyboard("FF00FF{Enter}");
        await waitFor(
            () => {
                assert.equal(written(mounted.session, layer, "node.glow"), "#FF00FF");
                assert.equal(glowOf(mounted.session), "#ff00ff");
            },
            { timeout: TIMEOUT_MS },
        );

        await userEvent.click(within(row).getByRole("button", { name: "Remove node glow" }));
        await waitFor(() => {
            assert.isUndefined(written(mounted.session, layer, "node.glow"), "removed from the layer");
            assert.isNull(shape().querySelector('.ws-row[data-line="node.glow"]'), "the row is gone");
        });
    });

    it("typing glow in the gallery shows a Glow option tile; Enter adds a Glow row in Shape, not a shader", async () => {
        const mounted = await mountElement();
        const layer = await addNodeLayer(mounted.session);
        renderPanel(mounted, [layer]);

        await addByName("glow");
        await waitFor(() => {
            assert.isNotNull(
                section("node", "shape").querySelector('.ws-row[data-line="node.glow"]'),
                "a Glow row in Shape",
            );
        });
        assert.isNull(screen.queryByTestId("shader-gallery"), "the pick closes the gallery");
        assert.deepEqual(usesOn(mounted.session, layer), [], "no shader is added");
    });

    it("the Glow option tile is marked as a Shape option", async () => {
        const mounted = await mountElement();
        const layer = await addNodeLayer(mounted.session);
        renderPanel(mounted, [layer]);
        await userEvent.click(within(section("node", "shaders")).getByRole("button", { name: "Add to node shaders" }));
        const gallery = await screen.findByTestId("shader-gallery", {}, { timeout: TIMEOUT_MS });
        await userEvent.keyboard("glow");
        const tile = await within(gallery).findByRole("button", { name: "Glow" });
        assert.include(tile.textContent, "Shape option");
    });

    it("Control-clicking two layers and adding Reticle gives both Reticle; one Control+Z takes both back", async () => {
        const session = await mountWorkspace();
        const alpha = await addNodeLayer(session, { "node.size": 1 }, "Alpha");
        const beta = await addNodeLayer(session, { "node.size": 1 }, "Beta");
        await session.styles.settled();
        const reticle = idOf(session, "Reticle");

        await userEvent.click(await treeRow("Beta"));
        await userEvent.click(await treeRow("Alpha"), { modifiers: ["Control"] });
        await waitFor(() => {
            assert.include(
                screen.queryAllByRole("heading").map((heading) => heading.textContent),
                "2 layers",
            );
        });
        await addByName("Reticle");
        await waitFor(
            () => {
                assert.deepEqual(usesOn(session, alpha), [{ shader: reticle }]);
                assert.deepEqual(usesOn(session, beta), [{ shader: reticle }]);
            },
            { timeout: TIMEOUT_MS },
        );

        await userEvent.keyboard("{Escape}{Control>}z{/Control}");
        await waitFor(() => {
            assert.deepEqual(usesOn(session, alpha), [], "one undo takes it off the first layer");
            assert.deepEqual(usesOn(session, beta), [], "and off the second");
        });
    });

    it("Target end added from Arrowheads and set to None writes none", async () => {
        const mounted = await mountElement();
        const nodes = await addNodeLayer(mounted.session);
        const edges = await mounted.session.styles.add({
            name: "Top edges",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.opacity": 1 },
        });
        renderPanel(mounted, [nodes, edges.id]);
        await showKind("edge");
        const ends = screen.getByRole("group", { name: "Arrowheads" });
        await userEvent.click(within(ends).getByRole("button", { name: "Add to edge arrowheads" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Target end" }));
        const head = await within(ends).findByRole("combobox", { name: /^Edge target end/ });
        await userEvent.click(head);
        await userEvent.click(await screen.findByRole("option", { name: "None" }));
        await waitFor(
            () => {
                assert.equal(written(mounted.session, edges.id, "edge.arrowHead"), "none");
            },
            { timeout: TIMEOUT_MS },
        );
    });
});
