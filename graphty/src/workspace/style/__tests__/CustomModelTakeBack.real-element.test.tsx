/**
 * The Load custom model dialog taking back what the reader started, on the real graphty-element, by
 * real input: the x on the layer's picture takes it back, a model chosen as a picture closes the
 * Picture pop-over and changes nothing, and a third copy of a file the project holds twice is named
 * with the next number. (Escape in an address field closes the whole dialog today: #10550.)
 * Every assertion reads what the reader sees and hears, or what the element reports.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withoutFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import policeUrl from "../__fixtures__/car-kit/police.glb?url";
import { addModel, choose, openCustom, openShapes, previewOf, written } from "./modelHarness";
import { dotPng, quadGlb } from "./quadGlb";

// The Style panel the app shows with file styles off, as CustomModelDialog.real-element.test.tsx drives it.
withoutFeatures(["file-styles"]);

/**
 * quad.glb, as a chosen file.
 * @returns the file.
 */
function quadFile(): File {
    return new File([quadGlb()], "quad.glb", { type: "model/gltf-binary" });
}

/**
 * Opens the dialog's Model settings with the button at the end of Name.
 * @param dialog - the dialog.
 * @returns the settings, in their pop-over.
 */
async function openSettings(dialog: HTMLElement): Promise<HTMLElement> {
    await userEvent.click(page.elementLocator(dialog).getByRole("button", { name: "Model settings", exact: true }));
    const popover = await screen.findByRole("dialog", { name: "Model settings" });
    return within(popover).findByTestId("model-settings");
}

describe("the Load custom model dialog taking back what the reader started", () => {
    it("takes back the layer's picture with its x, and Add writes no picture", async () => {
        const { session, tab } = await openShapes();
        const dialog = await openCustom(tab);
        await choose(dialog, "Choose file", [quadFile()]);
        await previewOf(dialog, "quad");
        const rows = await openSettings(dialog);
        await userEvent.click(page.elementLocator(rows).getByLabelText("Model picture, Choose", { exact: true }));
        const picture = await screen.findByRole("dialog", { name: "Picture" });
        await choose(picture, "Choose picture", [new File([dotPng()], "dot.png", { type: "image/png" })]);
        assert.isNotNull(await within(rows).findByLabelText("Model picture, dot"));
        await userEvent.click(
            page.elementLocator(rows).getByRole("button", { name: "Remove model picture", exact: true }),
        );
        assert.isNotNull(await within(rows).findByLabelText("Model picture, Choose"), "back to no picture");
        assert.isNull(within(rows).queryByRole("button", { name: "Remove model picture" }), "its x goes");
        await addModel(dialog);
        await waitFor(() => {
            assert.match(String(written(session, "node.model")), /^asset:/);
        });
        assert.isUndefined(written(session, "node.texture"), "the layer gets no picture");
    });

    it("closes the Picture pop-over when a model chosen there is used as the model, keeping the dialog's model", async () => {
        const { session, tab } = await openShapes();
        const dialog = await openCustom(tab);
        const police = new File([await (await fetch(policeUrl)).arrayBuffer()], "police.glb");
        await choose(dialog, "Choose file", [police]);
        await previewOf(dialog, "police");
        const rows = await openSettings(dialog);
        await userEvent.click(page.elementLocator(rows).getByLabelText("Model picture, Choose", { exact: true }));
        const picture = await screen.findByRole("dialog", { name: "Picture" });
        await choose(picture, "Choose picture", [quadFile()]);
        await userEvent.click(page.getByRole("button", { name: "Use quad as model", exact: true }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Picture" }), "the pop-over closed");
        });
        assert.isNotNull(within(rows).getByLabelText("Model picture, Choose"), "no picture was taken");
        assert.equal(within(dialog).getByRole<HTMLInputElement>("textbox", { name: "Name" }).value, "police");
        assert.isUndefined(written(session, "node.model"), "nothing is written before Add");
    });

    it("names a third copy of a file the project holds twice with the next number", async () => {
        const { session } = await openShapes();
        await session.assets.add(quadFile());
        for (const name of ["quad 2", "quad 3"]) {
            await userEvent.click(page.getByRole("button", { name: "Main menu", exact: true }));
            await userEvent.click(page.getByRole("menuitem", { name: "Add custom model...", exact: true }));
            const dialog = await screen.findByRole("dialog", { name: "Load custom model" });
            await choose(dialog, "Choose file", [quadFile()]);
            await previewOf(dialog, name);
            assert.equal(within(dialog).getByRole<HTMLInputElement>("textbox", { name: "Name" }).value, name);
            await addModel(dialog, "Add to project");
        }
        const names = session.assets
            .list()
            .filter((r) => r.kind === "model" && r.state === "accepted")
            .map((r) => r.plainName ?? "");
        assert.includeMembers(names, ["quad 2", "quad 3"], "each copy keeps its own name");
    });
});
