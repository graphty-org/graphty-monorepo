/**
 * Node models in the app, on the real element, with no experiment switched on: the Style tab's
 * Shape list ends in Model..., which opens the Models pop-over, and Fill's "+" offers Picture.
 */

import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";

import { within } from "../../test/test-utils";
import { openModels, openShapes, plusMenu, shapeChoices } from "../style/__tests__/modelHarness";

describe("node models in the app", () => {
    it("offers Model... last in the Shape list, which opens Models, and Picture in Fill", async () => {
        const { tab } = await openShapes();
        const choices = await shapeChoices(tab);
        assert.equal(choices.at(-1), "Model...");
        assert.include(await plusMenu(tab, "node fill"), "Picture");
        const models = await openModels(tab);
        assert.isNotNull(within(models).getByRole("group", { name: "Samples" }));
    });
});
