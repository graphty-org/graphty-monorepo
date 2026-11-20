/**
 * The Parts pop-over when a model's set leaves graphty-element unsure which file to use, on the
 * real graphty-element, by real input: a set holding two pictures both named colormap.png (the
 * pop-over asks which file is colormap.png), and a set holding two models (it asks which file is
 * the model). Also what the pop-over says when
 * typed text is taken back with Escape, and the Load custom model dialog offering a dropped file
 * nothing names as the missing picture. Every assertion reads what the element reports or what the
 * reader sees and hears.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withoutFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import type { WorkspaceStore } from "../../state/store";
import policeUrl from "../__fixtures__/car-kit/police.glb?url";
import colormapUrl from "../__fixtures__/car-kit/Textures/colormap.png?url";
import { addModel, drawn, dropOn, openCustom, openShapes, previewOf } from "./modelHarness";

// The Style panel the app shows with file styles off, as ModelParts.real-element.test.tsx drives it.
withoutFeatures(["file-styles"]);

/**
 * A fixture's bytes, from the test server.
 * @param url - its URL.
 * @returns the bytes.
 */
async function bytesOf(url: string): Promise<Uint8Array<ArrayBuffer>> {
    return new Uint8Array(await (await fetch(url)).arrayBuffer());
}

/**
 * A project whose "Shapes" layer names a model added from a set of files by path.
 * @param files - path to bytes.
 * @returns the session, the Style tab and the store.
 */
async function layerNamingSet(
    files: ReadonlyMap<string, Uint8Array>,
): Promise<{ session: GraphSession; tab: HTMLElement; store: WorkspaceStore }> {
    return openShapes(["node-models"], async (session) => ({
        "node.model": (await session.assets.add({ files })).id,
    }));
}

/**
 * Opens the Parts pop-over from the Shape field's Parts button.
 * @param tab - the Style tab.
 * @returns the pop-over's content.
 */
async function openParts(tab: HTMLElement): Promise<HTMLElement> {
    const parts = await within(tab).findByRole("button", { name: /: / });
    assert.equal(parts.textContent, "Parts");
    await userEvent.click(parts);
    return screen.findByTestId("parts-popover");
}

/**
 * Picks a choice from a select field by its label.
 * @param scope - where the field is.
 * @param label - the field's label.
 * @param choice - the choice's name.
 */
async function pick(scope: HTMLElement, label: string, choice: string): Promise<void> {
    await userEvent.click(within(scope).getByRole("combobox", { name: label }));
    await userEvent.click(await screen.findByRole("option", { name: choice }));
}

describe("the Parts pop-over when graphty-element cannot tell which file", () => {
    it("asks which file is colormap.png when two folders hold one, and draws with the one picked", async () => {
        const picture = await bytesOf(colormapUrl);
        const { session, tab, store } = await layerNamingSet(
            new Map([
                ["police.glb", await bytesOf(policeUrl)],
                ["a/colormap.png", picture],
                ["b/colormap.png", picture],
            ]),
        );
        const popover = await openParts(tab);
        const row = within(popover).getByRole("group", { name: "colormap.png" });
        // No file loader for a part the set already holds twice: only which of the two.
        assert.isNull(within(row).queryByRole("button", { name: "Choose colormap.png" }));
        await pick(row, "Which file is colormap.png", "b/colormap.png");
        await drawn(session);
        await waitFor(() => {
            assert.isNull(screen.queryByTestId("parts-popover"));
        });
        assert.equal(store.get().announcement, "police drawn");
    });

    it("asks which file is the model when the set holds two, and draws the one picked", async () => {
        const police = await bytesOf(policeUrl);
        const { session, tab } = await layerNamingSet(
            new Map([
                ["police.glb", police],
                ["truck.glb", police],
                ["Textures/colormap.png", await bytesOf(colormapUrl)],
            ]),
        );
        const popover = await openParts(tab);
        const row = within(popover).getByRole("group", { name: "Model" });
        await pick(row, "Which file is the model", "truck.glb");
        await drawn(session);
        await waitFor(() => {
            assert.isNull(screen.queryByTestId("parts-popover"));
        });
    });
});

describe("the Parts pop-over's address field", () => {
    it("says 'Address discarded' when Escape takes typed text back", async () => {
        const { tab, store } = await layerNamingSet(new Map([["police.glb", await bytesOf(policeUrl)]]));
        const popover = await openParts(tab);
        const field = within(popover).getByRole<HTMLInputElement>("textbox", { name: "colormap.png address" });
        await userEvent.type(field, "https://example.com/colormap.png");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.equal(store.get().announcement, "Address discarded");
        });
        assert.equal(field.value, "");
    });
});

describe("the Load custom model dialog's missing part", () => {
    it("offers a dropped file nothing names as the missing picture, and draws with it", async () => {
        const { session, tab } = await openShapes();
        const dialog = await openCustom(tab);
        dropOn(within(dialog).getByTestId("custom-model"), [
            new File([await bytesOf(policeUrl)], "police.glb", { type: "model/gltf-binary" }),
            new File([await bytesOf(colormapUrl)], "renamed.png", { type: "image/png" }),
        ]);
        const files = await within(dialog).findByTestId("model-files");
        const row = await within(files).findByRole("group", { name: "colormap.png" });
        await pick(row, "File for colormap.png", "renamed.png");
        await previewOf(dialog, "police");
        await waitFor(() => {
            assert.isFalse(row.isConnected, "colormap.png is no longer asked for");
        });
        await addModel(dialog);
        await drawn(session);
    });
});
