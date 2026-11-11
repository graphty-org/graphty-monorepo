/**
 * Models in the Style tab's Shape field with the node models experiment on (issue #3396), on the
 * real graphty-element, by real input: the Shape list's Model... opens the Models pop-over; a
 * sample, or a .glb chosen in the Load custom model dialog its Custom model... opens, becomes the
 * field's value and a picture tile; a built-in shape takes the model off in one undo step; Model
 * settings writes the model's channels; the minus removes the model. Every assertion
 * reads what the element reports: its layers, its assets and its model states.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { afterEach, assert, describe, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { screen, waitFor, within } from "../../../test/test-utils";
import {
    addModel,
    fileInput,
    openCustom,
    openModels,
    openShapes,
    previewOf,
    reaches,
    shapeField,
    written,
} from "./modelHarness";
import { quadGlb } from "./quadGlb";

/**
 * Waits until focus is on a tile of the pop-over, by its name.
 * @param name - the tile's name.
 */
async function focusOn(name: string): Promise<void> {
    await waitFor(() => {
        assert.equal(document.activeElement?.getAttribute("aria-label"), name);
    });
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe("models in the Shape field, on the real element", () => {
    it("picks Box by the keyboard, draws a chosen .glb, takes a shape back in one undo step, and sets Up", async () => {
        const { session, tab } = await openShapes();

        // Focus starts on the first sample; Enter takes it.
        await openModels(tab);
        await focusOn("Box");
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.equal(written(session, "node.model"), "asset:sample/box");
        });
        assert.isNotNull(await within(tab).findByRole("combobox", { name: "Node shape, Box" }));
        assert.isNull(screen.queryByRole("dialog", { name: "Models" }), "picking closes the pop-over");
        await reaches(session, "asset:sample/box");

        // Custom model...: a .glb from the dialog's file chooser, drawn on the layer's nodes.
        const dialog = await openCustom(tab);
        await userEvent.upload(fileInput(dialog), [new File([quadGlb()], "quad.glb", { type: "model/gltf-binary" })]);
        await previewOf(dialog, "quad");
        await addModel(dialog);
        await waitFor(() => {
            assert.match(String(written(session, "node.model")), /^asset:/);
            assert.notEqual(written(session, "node.model"), "asset:sample/box");
        });
        const quad = String(written(session, "node.model"));
        await reaches(session, quad);
        assert.isNotNull(await within(tab).findByRole("combobox", { name: "Node shape, quad" }));

        // The Models pop-over marks quad, in this project, as the one in force, drawn as its picture.
        const models = await openModels(tab);
        const own = within(models).getByRole("group", { name: "In this project" });
        const tile = within(own).getByRole("button", { name: "quad" });
        assert.equal(tile.getAttribute("aria-pressed"), "true");
        await waitFor(() => {
            assert.match(tile.querySelector("img")?.src ?? "", /^data:image\/png;base64,/);
        });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Models" }));
        });

        // Model settings: Up set to Z writes node.modelSourceUp.
        await userEvent.click(within(tab).getByRole("button", { name: "Model settings" }));
        const panel = await screen.findByRole("dialog", { name: "Model settings" });
        await userEvent.click(within(panel).getByRole("combobox", { name: /^Up, / }));
        await userEvent.click(await screen.findByRole("option", { name: "Z" }));
        await waitFor(() => {
            assert.equal(written(session, "node.modelSourceUp"), "z");
        });
        await userEvent.keyboard("{Escape}");

        // A built-in shape: the model and its settings go, in one undo step.
        await userEvent.click(shapeField(tab));
        await userEvent.click(await screen.findByRole("option", { name: "Sphere" }));
        await waitFor(() => {
            assert.isUndefined(written(session, "node.model"));
            assert.equal(written(session, "node.shape"), "sphere");
        });
        assert.isUndefined(written(session, "node.modelSourceUp"), "its settings go with it");
        await session.undo();
        await waitFor(() => {
            assert.equal(written(session, "node.model"), quad);
            assert.equal(written(session, "node.modelSourceUp"), "z");
        });
    });

    it("walks the samples as one Tab stop with the arrows, stopping at the edges", async () => {
        const { tab } = await openShapes();
        const models = await openModels(tab);
        await focusOn("Box");
        const samples = within(models).getByRole("group", { name: "Samples" });
        const tiles = within(samples).getAllByRole("button");
        assert.isAbove(tiles.length, 1);
        await userEvent.keyboard("{ArrowLeft}");
        assert.equal(document.activeElement, tiles[0], "the first tile is an edge");
        await userEvent.keyboard("{ArrowRight}");
        assert.equal(document.activeElement, tiles[1]);
        await userEvent.keyboard("{End}{ArrowRight}");
        assert.equal(document.activeElement, tiles.at(-1), "the last tile is an edge");
        // One Tab leaves the grid, for Custom model....
        await userEvent.tab();
        assert.isFalse(samples.contains(document.activeElement));
        assert.equal(document.activeElement?.textContent, "Custom model...");
    });

    it("removes the model with the Shape line's minus, and says so", async () => {
        const { session, tab, store } = await openShapes();
        await openModels(tab);
        await focusOn("Box");
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.equal(written(session, "node.model"), "asset:sample/box");
        });
        await userEvent.click(await within(tab).findByRole("button", { name: "Remove node shape" }));
        await waitFor(() => {
            assert.isUndefined(written(session, "node.model"));
            assert.equal(store.get().announcement, "Node shape removed");
        });
        assert.isUndefined(written(session, "node.shape"), "the shape kept under the model goes with it");
    });

    it("opens the Load custom model dialog in its place from Custom model...", async () => {
        const { tab } = await openShapes();
        const models = await openModels(tab);
        await userEvent.click(within(models).getByRole("button", { name: "Custom model..." }));
        assert.isNotNull(await screen.findByRole("dialog", { name: "Load custom model" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Models" }), "the pop-over closed");
        });
    });
});
