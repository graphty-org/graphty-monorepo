/**
 * The node models experiment's switch in the app (issue #3396), on the real element: with it off the
 * Style tab is today's -- no Model... in the Shape list, no Picture in Fill's "+", no Model settings
 * -- and saving a layer that names a model by web address asks nothing; with it on, Model... opens
 * the Models pop-over.
 */

import "@graphty/graphty-element";

import { browserProjects } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { withoutFeatures } from "../../test/features";
import { screen, waitFor, within } from "../../test/test-utils";
import { clearRecent } from "../project/recent";
import { openModels, openShapes, plusMenu, reaches, shapeChoices } from "../style/__tests__/modelHarness";
import { quadGlb } from "../style/__tests__/quadGlb";

// These tests drive the Style panel the app shows with file styles off; the panel by part of the
// drawing, which replaces the node tab with them on, is tested in PartsPanel.real-element.test.tsx.
withoutFeatures(["file-styles"]);

const MODEL = "https://models.example.com/kit/panel.glb";

beforeEach(() => {
    const original = globalThis.fetch.bind(globalThis);
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
        const url = input instanceof Request ? input.url : String(input);
        return url === MODEL ? Promise.resolve(new Response(quadGlb(), { status: 200 })) : original(input, init);
    });
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("the node models experiment's switch in the app", () => {
    it("offers no model, picture or model settings with the experiment off", async () => {
        const { tab } = await openShapes([]);
        assert.notInclude(await shapeChoices(tab), "Model...");
        assert.include(await shapeChoices(tab), "Sphere", "the built-in shapes are offered");
        assert.isNull(within(tab).queryByRole("button", { name: "Model settings" }));
        // Fill offers Color alone, so its "+" adds it with no menu.
        await userEvent.click(within(tab).getByRole("button", { name: "Add to node fill" }));
        await waitFor(() => {
            assert.isNotNull(tab.querySelector('[data-line="node.color"]'));
        });
        assert.isNull(screen.queryByRole("menuitem", { name: "Picture" }));
    });

    it("saves a layer naming a model by web address without asking, with the experiment off", async () => {
        await clearRecent();
        const { session } = await openShapes([]);
        // A layer naming a model by web address, as opening a project file applies one.
        await session.styles.applyTemplate({
            version: 1,
            layers: [
                {
                    name: "From a file",
                    target: "node",
                    selector: { match: "everything" },
                    set: { "node.model": MODEL },
                },
            ],
        });
        const ask = await screen.findByRole("dialog", { name: "Open a web address?" });
        await userEvent.click(within(ask).getByRole("button", { name: "Continue" }));
        await reaches(session, MODEL);

        await userEvent.keyboard("{Control>}s{/Control}");
        const saveAs = await screen.findByRole("dialog", { name: "Save Models as" });
        await userEvent.click(within(saveAs).getByRole("button", { name: "Save" }));
        // The save waits on no question: it is kept in this browser and the project is saved.
        await waitFor(async () => {
            assert.lengthOf(await browserProjects.list(), 1);
            assert.isFalse(session.project.dirty);
        });
        assert.isNull(screen.queryByRole("dialog", { name: "Save files from the web" }));
    });

    it("offers Model... last in the Shape list, which opens Models, with the experiment on", async () => {
        const { tab } = await openShapes(["node-models"]);
        const choices = await shapeChoices(tab);
        assert.equal(choices.at(-1), "Model...");
        assert.include(await plusMenu(tab, "node fill"), "Picture");
        const models = await openModels(tab);
        assert.isNotNull(within(models).getByRole("group", { name: "Samples" }));
    });
});
