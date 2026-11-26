/**
 * A font a reader uploads through a label's FontPicker is carried inside the saved project file (owner,
 * 2026-11-24: "uploaded fonts get embedded in save files"), on the real graphty-element and real input: the
 * reader opens the label's settings, opens the font list, uploads a font file, and the project's saved text
 * holds that font's family and its bytes.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import fontUrl from "../../start/brand/Outfit-VariableFont_wght.ttf?url";
import { choose } from "./modelHarness";
import { openGraph, openStyle, sectionOf } from "./v2Harness";

describe("an uploaded font is saved inside the project file", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("uploads a font through the label's font picker and finds its bytes in the saved text", async () => {
        const { session, nodes } = await openGraph();
        await session.styles.update(nodes, { set: { "node.label": "Alpha" } });
        await session.styles.settled();
        const tab = await openStyle("Key people");
        const row = await waitFor(() => {
            const found = sectionOf(tab, "node-text").querySelector<HTMLElement>('[data-thing="label"]');
            assert.isNotNull(found);
            return found;
        });
        await userEvent.click(within(row).getByRole("button", { name: /^Node label settings/ }));
        await userEvent.click(await screen.findByRole("combobox", { name: "Node label font" }));

        const bytes = await (await fetch(fontUrl)).arrayBuffer();
        await choose(document.body, "Upload font", [new File([bytes], "Outfit.ttf", { type: "font/ttf" })]);

        const family = await waitFor(() => {
            const [font] = session.fonts.list();
            assert.isDefined(font, "the uploaded font is in the project");
            return font.family;
        });
        const saved = JSON.parse((await session.project.save()).text) as unknown;
        const fonts = findFonts(saved);
        assert.isDefined(fonts, "the saved file has a fonts list");
        const entry = fonts.find((font) => font.family === family);
        assert.isDefined(entry, `the saved file names ${family}`);
        assert.isString(entry.data);
        // Base64 of the file: four characters for every three bytes.
        assert.isAtLeast(entry.data.length, Math.floor((bytes.byteLength * 4) / 3));
    });
});

/** A saved font: its family and its bytes. */
interface SavedFont {
    readonly family: string;
    readonly data?: string;
}

/**
 * The first "fonts" list anywhere in a saved file.
 * @param value - the parsed file, or a part of it.
 * @returns the list, or undefined.
 */
function findFonts(value: unknown): SavedFont[] | undefined {
    if (typeof value !== "object" || value === null) {
        return undefined;
    }
    if (!Array.isArray(value) && Array.isArray((value as { fonts?: unknown }).fonts)) {
        return (value as { fonts: SavedFont[] }).fonts;
    }
    for (const child of Object.values(value)) {
        const found = findFonts(child);
        if (found !== undefined) {
            return found;
        }
    }
    return undefined;
}
