/**
 * Models in the Style tab's Shape field with the node models experiment on (issue #3396), on the
 * real graphty-element, by real input: the Shape list's Model... opens the Models pop-over; a
 * sample or a chosen .glb becomes the field's value; a built-in shape takes the model off in one
 * undo step; Model settings writes the model's channels; the minus removes the model; a lone
 * picture is offered as the layer's picture. Every assertion
 * reads what the element reports: its layers, its assets and its model states.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { afterEach, assert, describe, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { screen, waitFor, within } from "../../../test/test-utils";
import { dropOn, fileInput, openModels, openShapes, reaches, shapeField, written } from "./modelHarness";
import { dotPng, quadGlb } from "./quadGlb";

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

        // Choose model files: a .glb from the file chooser, drawn on the layer's nodes.
        let models = await openModels(tab);
        assert.isNotNull(within(models).getByRole("button", { name: "Choose model files" }));
        await userEvent.upload(fileInput(models), [new File([quadGlb()], "quad.glb", { type: "model/gltf-binary" })]);
        await waitFor(() => {
            assert.match(String(written(session, "node.model")), /^asset:/);
            assert.notEqual(written(session, "node.model"), "asset:sample/box");
        });
        const quad = String(written(session, "node.model"));
        await reaches(session, quad);
        assert.isNotNull(await within(tab).findByRole("combobox", { name: "Node shape, quad" }));

        // The Models pop-over marks quad, in this project, as the one in force.
        models = await openModels(tab);
        const own = within(models).getByRole("group", { name: "In this project" });
        assert.equal(within(own).getByRole("button", { name: "quad" }).getAttribute("aria-pressed"), "true");
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
        // One Tab leaves the grid.
        await userEvent.tab();
        assert.isFalse(samples.contains(document.activeElement));
        assert.equal(document.activeElement?.getAttribute("aria-label"), "Model address");
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

    it("offers a lone picture as the layer's picture, never refusing it as a model", async () => {
        const { session, tab } = await openShapes();
        const models = await openModels(tab);
        dropOn(within(models).getByTestId("models-popover"), [new File([dotPng()], "colormap.png")]);

        const use = await within(models).findByRole("button", { name: "Use colormap as picture" });
        assert.isNotNull(within(models).getByText("Not a model"));
        await userEvent.click(use);
        await waitFor(() => {
            assert.match(String(written(session, "node.texture")), /^asset:/);
        });
        assert.isUndefined(written(session, "node.model"), "nothing names the picture as a model");
    });

    it("writes nothing for an address that finishes loading after the pop-over closed", async () => {
        const url = "https://models.example.com/late/panel.glb";
        const asked: string[] = [];
        let answer: (response: Response) => void = () => undefined;
        const original = globalThis.fetch.bind(globalThis);
        vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
            const to = input instanceof Request ? input.url : String(input);
            if (to !== url) {
                return original(input, init);
            }
            asked.push(to);
            return new Promise<Response>((resolve) => {
                answer = resolve;
            });
        });
        const { session, tab } = await openShapes();
        let models = await openModels(tab);
        await userEvent.type(within(models).getByRole("textbox", { name: "Model address" }), url);
        await userEvent.click(within(models).getByRole("button", { name: "Add model address" }));
        await waitFor(() => {
            assert.include(asked, url);
        });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Models" }));
        });

        answer(new Response(quadGlb(), { status: 200 }));
        // Open again: once the add has finished, its button is no longer loading.
        models = await openModels(tab);
        await waitFor(() => {
            assert.isNull(
                within(models).getByRole("button", { name: "Add model address" }).getAttribute("data-loading"),
            );
        });
        assert.isUndefined(written(session, "node.model"), "the reader closed it before it loaded");
        assert.isNull(screen.queryByRole("dialog", { name: "Parts" }));
    });
});
