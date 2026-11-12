/**
 * Nodes, Borders on the REAL graphty-element, driven by real input (issue #6812): Border, Border
 * width, Outer border and Raised border are rows of Borders' "+", and each row's settings (the
 * border's style, opacity, position, width on screen and wave; the outer border's width, opacity,
 * style, offset and count; the raised border's light and dark colors) are added from the row's own
 * "+" and written to the layer once a value is typed. All of them are offered with the element's
 * file-styles experiment on.
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

// graphty-element offers node borders with its file-styles experiment on.
withFeatures(["file-styles"]);

/** How a value is typed: a number box, a color's hex, or a pick from a list. */
type Input = "number" | "color" | "choice";

/** One property: the menu word, its channel, what is typed, and what is written. */
type Setting = readonly [word: string, channel: Channel, input: Input, typed: string, written: unknown];

/** The rows Borders' own "+" adds. */
const ROWS: readonly Setting[] = [
    ["Border", "node.borderColor", "color", "FF0000", "#FF0000"],
    ["Border width", "node.borderWidth", "number", "2", 2],
    ["Outer border", "node.outerBorderColor", "color", "00FF00", "#00FF00"],
    ["Raised border", "node.raisedBorderWidth", "number", "1", 1],
];

/** Each row's settings, by the row's words as its "+" is named. */
const SETTINGS: readonly (readonly [row: string, settings: readonly Setting[]])[] = [
    [
        "border",
        [
            ["Style", "node.borderStyle", "choice", "Dashed", "dashed"],
            ["Opacity", "node.borderOpacity", "number", "50", 0.5],
            ["Position", "node.borderPosition", "choice", "Inside", "inside"],
            ["Width on screen", "node.borderScreenWidth", "number", "3", 3],
            ["Wave amplitude", "node.borderWaveAmplitude", "number", "0.5", 0.5],
            ["Wave period", "node.borderWavePeriod", "number", "4", 4],
        ],
    ],
    [
        "outer border",
        [
            ["Width", "node.outerBorderWidth", "number", "1", 1],
            ["Opacity", "node.outerBorderOpacity", "number", "40", 0.4],
            ["Style", "node.outerBorderStyle", "choice", "Dotted", "dotted"],
            ["Offset", "node.outerBorderOffset", "number", "2", 2],
            ["Count", "node.outerBorderCount", "number", "3", 3],
        ],
    ],
    [
        "raised border",
        [
            ["Light color", "node.raisedBorderLightColor", "color", "EEEEEE", "#EEEEEE"],
            ["Dark color", "node.raisedBorderDarkColor", "color", "111111", "#111111"],
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
 * The Borders section of the open Style tab.
 * @returns the section.
 */
function borders(): HTMLElement {
    const found = screen.getByTestId("style-tab").querySelector<HTMLElement>('[data-section="node-border"]');
    if (found === null) {
        throw new Error("no Borders section");
    }
    return found;
}

/**
 * A line of the Borders section, once it is drawn.
 * @param channel - the line's property.
 * @returns the line.
 */
async function lineOf(channel: Channel): Promise<HTMLElement> {
    return waitFor(() => {
        const found = borders().querySelector<HTMLElement>(`.ws-row[data-line="${channel}"]`);
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
    const button = await within(borders()).findByRole("button", { name: plus });
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

describe("Nodes, Borders: every border setting has a control", () => {
    it("adds Borders' rows from its '+' and their settings from each row's '+'", async () => {
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
            const drawn = await addFrom(session, "Add to node borders", row);
            assert.isUndefined(drawn.dataset.setting, `${row[1]} is a row of Borders`);
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
