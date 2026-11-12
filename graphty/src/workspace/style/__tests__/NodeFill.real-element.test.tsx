/**
 * Nodes, Fill on the REAL graphty-element, driven by real input (issue #6812): Gradient, Glyph and
 * Image are rows of Fill's "+", and each row's settings (the gradient's direction, colors, stops,
 * kind, center and radius; the glyph's font, size, weight and color; the image's fallback, fit,
 * size, position, offset, repeat, clip, smoothing, auto size and opacity) are added from the row's
 * own "+" and written to the layer once a value is typed. The image and its fallback are URLs typed
 * in the words field. All of them are offered with the element's file-styles experiment on.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { Channel } from "@graphty/graphty-element/schema";
import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { showKind } from "./kindTab";

// graphty-element offers node gradients, glyphs and images with its file-styles experiment on.
withFeatures(["file-styles"]);

/** How a value is typed: a number box, words, a color's hex, or a pick from a list. */
type Input = "number" | "text" | "color" | "choice";

/** One property: the menu word, its channel, what is typed, and what is written. */
type Setting = readonly [word: string, channel: Channel, input: Input, typed: string, written: unknown];

/** The rows Fill's own "+" adds. */
const ROWS: readonly Setting[] = [
    ["Gradient", "node.gradientColor", "color", "0072B2", "#0072B2"],
    ["Glyph", "node.glyph", "text", "A", "A"],
    ["Image", "node.image", "text", "/favicon.svg", "/favicon.svg"],
];

/** Each row's settings, by the row's words as its "+" is named. */
const SETTINGS: readonly (readonly [row: string, settings: readonly Setting[]])[] = [
    [
        "gradient",
        [
            ["Direction", "node.gradientDirection", "number", "90", 90],
            ["Colors", "node.gradientColors", "text", "red blue", "red blue"],
            ["Stops", "node.gradientStops", "text", "0 1", "0 1"],
            ["Kind", "node.gradientKind", "choice", "Radial", "radial"],
            ["Center x", "node.gradientCenterX", "number", "0.25", 0.25],
            ["Center y", "node.gradientCenterY", "number", "0.75", 0.75],
            ["Radius", "node.gradientRadius", "number", "0.5", 0.5],
        ],
    ],
    [
        "glyph",
        [
            ["Font", "node.glyphFont", "text", "serif", "serif"],
            ["Size", "node.glyphSize", "number", "2", 2],
            ["Weight", "node.glyphWeight", "number", "700", 700],
            ["Color", "node.glyphColor", "color", "FFFFFF", "#FFFFFF"],
        ],
    ],
    [
        "image",
        [
            ["Fallback", "node.imageFallback", "text", "/favicon.ico", "/favicon.ico"],
            ["Fit", "node.imageFit", "choice", "None", "none"],
            ["Width", "node.imageWidth", "number", "2", 2],
            ["Height", "node.imageHeight", "number", "3", 3],
            ["Pixel size", "node.imagePixelSize", "number", "0.5", 0.5],
            ["Position x", "node.imagePositionX", "number", "0.25", 0.25],
            ["Position y", "node.imagePositionY", "number", "0.75", 0.75],
            ["Offset x", "node.imageOffsetX", "number", "1", 1],
            ["Offset y", "node.imageOffsetY", "number", "2", 2],
            ["Repeat", "node.imageRepeat", "choice", "Repeat x", "repeat-x"],
            ["Clip", "node.imageClip", "choice", "None", "none"],
            ["Smoothing", "node.imageSmoothing", "choice", "Off", false],
            ["Auto size", "node.imageAutoSize", "choice", "Natural", "natural"],
            ["Opacity", "node.imageOpacity", "number", "50", 0.5],
        ],
    ],
];

/**
 * Les Miserables, with the starting rows holding the base look.
 * @returns the session.
 */
async function openScene(): Promise<GraphSession> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
    render(<Workspace store={store} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
    await session.styles.settled();
    return session;
}

/**
 * What the Everything node layer writes for a channel.
 * @param session - the session.
 * @param channel - the channel.
 * @returns the value, or undefined.
 */
function written(session: GraphSession, channel: Channel): unknown {
    return session.styles.list().find((layer) => layer.name === "Everything" && layer.target === "node")?.set?.[
        channel
    ];
}

/**
 * The Fill section of the open Style tab.
 * @returns the section.
 */
function fill(): HTMLElement {
    const found = screen.getByTestId("style-tab").querySelector<HTMLElement>('[data-section="node-fill"]');
    if (found === null) {
        throw new Error("no Fill section");
    }
    return found;
}

/**
 * A line of the Fill section, once it is drawn.
 * @param channel - the line's property.
 * @returns the line.
 */
async function lineOf(channel: Channel): Promise<HTMLElement> {
    return waitFor(() => {
        const found = fill().querySelector<HTMLElement>(`.ws-row[data-line="${channel}"]`);
        assert.isNotNull(found);
        return found;
    });
}

/**
 * Types a value into a line's field and commits it with Enter.
 * @param row - the line.
 * @param input - how the value is typed.
 * @param typed - what is typed.
 */
async function type(row: HTMLElement, input: Input, typed: string): Promise<void> {
    if (input === "choice") {
        await userEvent.click(within(row).getByRole("combobox"));
        await userEvent.click(await screen.findByRole("option", { name: typed }));
        return;
    }
    const box = row.querySelector<HTMLInputElement>(
        input === "color" ? '[data-testid="compact-color-input-hex"]' : "input",
    );
    if (box === null) {
        throw new Error("no box to type in");
    }
    await userEvent.click(box);
    await userEvent.keyboard(`{Control>}a{/Control}${typed}{Enter}`);
}

/**
 * Adds a property from a "+" (a menu, or the one item it adds at once), types its value and waits
 * for the layer to hold it.
 * @param session - the session.
 * @param plus - the "+" button's name.
 * @param setting - the property.
 * @returns the property's line.
 */
async function addFrom(session: GraphSession, plus: string, setting: Setting): Promise<HTMLElement> {
    const [word, channel, input, typed, value] = setting;
    const button = await within(fill()).findByRole("button", { name: plus });
    const menu = button.getAttribute("aria-haspopup") === "menu";
    await userEvent.click(button);
    if (menu) {
        await userEvent.click(await screen.findByRole("menuitem", { name: word }));
    }
    const row = await lineOf(channel);
    await type(row, input, typed);
    await waitFor(() => {
        assert.deepEqual(written(session, channel), value, channel);
    });
    return row;
}

describe("Nodes, Fill: every gradient, glyph and image setting has a control", () => {
    it("adds Gradient, Glyph and Image from Fill's '+' and their settings from each row's '+'", async () => {
        const session = await openScene();
        const tree = await screen.findByRole("tree", { name: "Style layers" });
        await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Everything, / }));
        const inspector = screen.getByRole("complementary", { name: "Inspector" });
        const style = await within(inspector).findByRole("tab", { name: "Style" });
        if (style.getAttribute("aria-selected") !== "true") {
            await userEvent.click(style);
        }
        await showKind("node");

        for (const row of ROWS) {
            const drawn = await addFrom(session, "Add to node fill", row);
            assert.isUndefined(drawn.dataset.setting, `${row[1]} is a row of Fill`);
        }

        for (const [row, settings] of SETTINGS) {
            for (const setting of settings) {
                const drawn = await addFrom(session, `Add to node ${row}`, setting);
                assert.equal(
                    drawn.querySelector(".ws-field-name")?.textContent,
                    setting[0],
                    `${setting[1]} is named under its row`,
                );
                assert.isDefined(drawn.dataset.setting, `${setting[1]} is drawn as its row's setting`);
            }
        }
    });
});
