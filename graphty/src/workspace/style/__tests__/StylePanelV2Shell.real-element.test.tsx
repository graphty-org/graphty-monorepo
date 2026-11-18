/**
 * Style panel v2's shell on the REAL graphty-element, driven by real clicks (design/ui/style-panel-v2/design.md,
 * sections 2.3 and 2.4): with the style-panel-v2 experiment on, the node tab draws its eight sections in the
 * design's order; a section of one thing adds it from its "+", a section of several opens a "+" menu in groups
 * from its title; a thing row's minus takes the whole thing off the layer and one Undo brings it back. With the
 * experiment off, the panel by part of the drawing is drawn as before.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { openProject, openStyle, sectionOf, written } from "./v2Harness";

/** The node tab's sections, in the design's order. */
const NODE_SECTIONS = ["Shape", "Fill", "Border", "Text", "Effects", "Visibility", "Order and groups", "Shaders"];

describe("Style panel v2 on", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("draws the node tab's sections in order, each with its header rule", async () => {
        await openProject();
        const tab = await openStyle("Key people");
        const panel = await waitFor(() => {
            const found = tab.querySelector<HTMLElement>("[data-style-panel-v2]");
            assert.isNotNull(found);
            return found;
        });
        const headings = within(panel)
            .getAllByRole("heading", { level: 3 })
            .map((heading) => heading.textContent);
        assert.deepEqual(headings, NODE_SECTIONS);
        assert.lengthOf(panel.querySelectorAll('[data-testid="control-section"]'), NODE_SECTIONS.length);
        // Fill holds the layer's color; Shape sets nothing yet, so it is the empty state.
        assert.isNull(sectionOf(tab, "node-fill").querySelector('[data-testid="control-section"][data-empty]'));
        assert.isNotNull(sectionOf(tab, "node-shape").querySelector('[data-testid="control-section"][data-empty]'));
    });

    it("Shape's '+' adds the shape, its row's minus removes it, and one Undo brings it back", async () => {
        const { session, id } = await openProject();
        const tab = await openStyle("Key people");
        const shape = sectionOf(tab, "node-shape");
        await userEvent.click(within(shape).getByRole("button", { name: "Add Shape" }));
        await waitFor(() => {
            assert.isString(written(session, id, "node.shape"), "Shape's start is written");
        });
        const added = written(session, id, "node.shape");
        const row = await waitFor(() => {
            const found = shape.querySelector<HTMLElement>('[data-thing="shape"]');
            assert.isNotNull(found);
            return found;
        });
        assert.isNotNull(within(row).getByRole("button", { name: "Node shape settings" }));

        await userEvent.click(within(row).getByRole("button", { name: "Remove node shape" }));
        await waitFor(() => {
            assert.isUndefined(written(session, id, "node.shape"));
            assert.isNull(shape.querySelector('[data-thing="shape"]'), "the row is gone");
        });
        assert.equal(written(session, id, "node.color"), "#E8590C", "the rest of the layer stays");

        await userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));
        await waitFor(() => {
            assert.equal(written(session, id, "node.shape"), added, "one Undo restores it");
            assert.isNotNull(shape.querySelector('[data-thing="shape"]'));
        });
    });

    it("an empty section's title opens its '+' menu in groups, and Rings is added from it", async () => {
        const { session, id } = await openProject();
        const tab = await openStyle("Key people");
        const border = sectionOf(tab, "node-border");
        const title = border.querySelector<HTMLElement>('[data-testid="control-section-lead"]');
        assert.isNotNull(title);
        await userEvent.click(title);
        const menu = await screen.findByRole("menu");
        assert.deepEqual(
            within(menu)
                .getAllByRole("menuitem")
                .map((item) => item.textContent),
            ["Border", "Rings", "Raised edge", "Outline", "Inner lines"],
        );
        assert.lengthOf(menu.querySelectorAll(".mantine-Menu-divider"), 1, "a divider between the two groups");
        await userEvent.click(within(menu).getByRole("menuitem", { name: "Rings" }));
        await waitFor(() => {
            assert.isDefined(written(session, id, "node.outerBorderColor"), "Rings starts with its color");
        });
        const rings = await waitFor(() => {
            const found = border.querySelector<HTMLElement>('[data-thing="rings"]');
            assert.isNotNull(found);
            return found;
        });
        assert.include(rings.textContent, "Rings", "the row is named, as its section does not name it");

        // Set now, the section's "+" no longer lists Rings.
        await userEvent.click(within(border).getByRole("button", { name: "Add to node border" }));
        const again = await screen.findByRole("menu");
        assert.notInclude(
            within(again)
                .getAllByRole("menuitem")
                .map((item) => item.textContent),
            "Rings",
        );
    });
});

describe("Style panel v2 off", () => {
    withFeatures(["file-styles"]);

    it("draws the panel by part of the drawing, and none of v2", async () => {
        await openProject();
        const tab = await openStyle("Key people");
        await waitFor(() => {
            assert.isNotNull(tab.querySelector("[data-style-parts]"));
        });
        assert.isNull(tab.querySelector("[data-style-panel-v2]"));
        assert.isNull(tab.querySelector("[data-thing]"));
    });
});
