/**
 * The Load custom model dialog's picture checkboxes and a set's list of models (issue #6673), on
 * the real graphty-element, by real input: each picture of Model settings' Textures drawn or not
 * one by one, All textures checking them all again, and a set's models taken out with their x
 * whichever model the preview shows. Every assertion reads what the element reports or what the
 * dialog shows.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withoutFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import policeUrl from "../__fixtures__/car-kit/police.glb?url";
import { addModel, choose, dropOn, openCustom, openShapes, previewOf, previewPicture } from "./modelHarness";
import { quadGlb } from "./quadGlb";

// The Style panel the app shows with file styles off, as CustomModelDialog.real-element.test.tsx drives it.
withoutFeatures(["file-styles"]);

/** The car kit's folder (police.glb and its one picture), as the file chooser reads it. */
const KIT_FOLDER = "src/workspace/style/__fixtures__/car-kit";

/**
 * The accepted models of the project.
 * @param session - the element's session.
 * @returns their main files.
 */
function models(session: GraphSession): (string | undefined)[] {
    return session.assets
        .list()
        .filter((r) => r.kind === "model" && r.state === "accepted")
        .map((r) => r.path);
}

/**
 * The checkbox of a name in a scope, as it is now.
 * @param scope - where it is.
 * @param name - its accessible name.
 * @returns the checkbox.
 */
function box(scope: HTMLElement, name: string | RegExp): HTMLInputElement {
    return within(scope).getByRole<HTMLInputElement>("checkbox", { name });
}

describe("Load custom model: pictures one by one, and a set's x", () => {
    it("draws a picture again when its own box is checked, and All textures checks every picture again", async () => {
        const { session } = await openShapes();
        await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Add custom model..." }));
        const dialog = await screen.findByRole("dialog", { name: "Load custom model" });
        await choose(dialog, "Choose folder", [KIT_FOLDER]);
        await previewOf(dialog, "police");
        const own = previewPicture(dialog, "police");
        await userEvent.click(within(dialog).getByRole("button", { name: "Model settings" }));
        const popover = await screen.findByRole("dialog", { name: "Model settings" });
        const textures = within(popover).getByRole("group", { name: "Textures" });
        const pictures = within(textures)
            .getAllByRole<HTMLInputElement>("checkbox")
            .filter((c) => c !== box(textures, "All textures"));
        assert.lengthOf(pictures, 1, "the kit's model has one picture");
        const picture = pictures[0].getAttribute("aria-label") ?? pictures[0].labels?.[0]?.textContent ?? "";
        assert.isNotEmpty(picture);

        // Its own box cleared: drawn without it, and All textures is cleared with it.
        await userEvent.click(box(textures, picture));
        await waitFor(() => {
            assert.isFalse(box(textures, picture).checked);
            assert.isFalse(box(textures, "All textures").checked);
            assert.notEqual(previewPicture(dialog, "police"), own, "drawn without its picture");
        });
        // Checked again: drawn with it.
        await userEvent.click(box(textures, picture));
        await waitFor(() => {
            assert.isTrue(box(textures, "All textures").checked);
        });
        // All textures cleared, then checked: every picture drawn again.
        await userEvent.click(box(textures, "All textures"));
        await waitFor(() => {
            assert.isFalse(box(textures, picture).checked);
        });
        await userEvent.click(box(textures, "All textures"));
        await waitFor(() => {
            assert.isTrue(box(textures, picture).checked);
        });
        await previewOf(dialog, "police");

        await addModel(dialog, "Add to project");
        const record = await waitFor(() => {
            const found = session.assets.list().find((r) => r.path === "police.glb" && r.state === "accepted");
            assert.isDefined(found);
            return found;
        });
        assert.isEmpty(record.defaults?.hiddenTextures ?? [], "every picture is drawn with the model");
    });

    it("takes the model shown out of a set with its x, then one before it, down to one model", async () => {
        const { session, tab } = await openShapes();
        const dialog = await openCustom(tab);
        const quad = new File([quadGlb()], "quad.glb", { type: "model/gltf-binary" });
        const wall = new File([quadGlb()], "wall.glb", { type: "model/gltf-binary" });
        const police = new File([await (await fetch(policeUrl)).arrayBuffer()], "police.glb");
        dropOn(within(dialog).getByTestId("custom-model"), [quad, wall, police]);
        await previewOf(dialog, "police");
        const position = within(dialog).getByTestId("model-position");
        assert.equal(position.textContent, "1 of 3");

        // A key other than the arrows on Next model moves focus on and steps nothing.
        const next = within(dialog).getByRole("button", { name: "Next model" });
        await userEvent.click(next);
        await previewOf(dialog, "quad");
        await userEvent.keyboard("{Tab}");
        assert.notEqual(document.activeElement, next, "Tab moved on");
        assert.equal(position.textContent, "2 of 3", "Tab stepped nothing");
        await userEvent.click(next);
        await previewOf(dialog, "wall");
        assert.equal(position.textContent, "3 of 3");

        // The x on the model shown, the last: the one before it is shown.
        const list = within(dialog).getByRole("region", { name: "Models" });
        await userEvent.click(within(list).getByRole("button", { name: "Remove wall.glb" }));
        await waitFor(() => {
            assert.equal(within(dialog).getByTestId("model-position").textContent, "2 of 2");
        });
        await previewOf(dialog, "quad");

        // The x on a model before the one shown: the same model stays shown, now the only one.
        await userEvent.click(within(list).getByRole("button", { name: "Remove police.glb" }));
        await waitFor(() => {
            assert.isNull(within(dialog).queryByTestId("model-position"), "one model: no arrows");
            assert.isNull(within(dialog).queryByRole("region", { name: "Models" }), "one model: no list");
        });
        await previewOf(dialog, "quad");

        await addModel(dialog);
        await waitFor(() => {
            assert.deepEqual(models(session), ["quad.glb"], "the models taken out are let go");
        });
    });
});
