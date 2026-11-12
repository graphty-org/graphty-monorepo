/**
 * Edges, Line on the REAL graphty-element, driven by real input (issue #6812): Outline, Underlay,
 * Overlay and Gradient are rows of Line's "+", and each look's settings (outline width, opacity
 * and pattern; underlay and overlay opacity and padding; gradient stops and kind), the dash and
 * wave sizes under Pattern and the minimum screen width under Width are added from their row's
 * own "+" and written to the layer once a value is typed. The gradient and dash settings are
 * offered with the element's file-styles experiment on.
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

// graphty-element offers the gradient and dash settings with its file-styles experiment on.
withFeatures(["file-styles"]);

/** How a value is typed: a number box, words, a color's hex box, or a pick from a list. */
type Input = "number" | "text" | "color" | "choice";

/** One property: the menu word, its channel, what is typed, and what is written. */
type Setting = readonly [word: string, channel: Channel, input: Input, typed: string, written: unknown];

/** The looks Line's own "+" adds as rows. */
const ROWS: readonly Setting[] = [
    ["Outline", "edge.outlineColor", "color", "D55E00", "#D55E00"],
    ["Underlay", "edge.underlayColor", "color", "0072B2", "#0072B2"],
    ["Overlay", "edge.overlayColor", "color", "009E73", "#009E73"],
    ["Gradient", "edge.gradientColors", "text", "red blue", "red blue"],
];

/** Each row's settings, by the row's words as its "+" is named. */
const SETTINGS: readonly (readonly [row: string, settings: readonly Setting[]])[] = [
    ["width", [["Min screen width", "edge.minScreenWidth", "number", "2", 2]]],
    [
        "pattern",
        [
            ["Dash length", "edge.dashLength", "number", "4", 4],
            ["Dash gap", "edge.dashGap", "number", "2", 2],
            ["Wave amplitude", "edge.waveAmplitude", "number", "1", 1],
            ["Wave period", "edge.wavePeriod", "number", "6", 6],
        ],
    ],
    [
        "outline",
        [
            ["Width", "edge.outlineWidth", "number", "1", 1],
            ["Opacity", "edge.outlineOpacity", "number", "50", 0.5],
            ["Pattern", "edge.outlineStyle", "choice", "Dash", "dash"],
        ],
    ],
    [
        "underlay",
        [
            ["Opacity", "edge.underlayOpacity", "number", "40", 0.4],
            ["Padding", "edge.underlayPadding", "number", "2", 2],
        ],
    ],
    [
        "overlay",
        [
            ["Opacity", "edge.overlayOpacity", "number", "30", 0.3],
            ["Padding", "edge.overlayPadding", "number", "1", 1],
        ],
    ],
    [
        "gradient",
        [
            ["Stops", "edge.gradientStops", "text", "0 1", "0 1"],
            ["Kind", "edge.gradientKind", "choice", "Radial", "radial"],
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
 * What the Everything edge layer writes for a channel.
 * @param session - the session.
 * @param channel - the channel.
 * @returns the value, or undefined.
 */
function written(session: GraphSession, channel: Channel): unknown {
    return session.styles.list().find((layer) => layer.name === "Everything" && layer.target === "edge")?.set?.[
        channel
    ];
}

/**
 * The Line section of the open Style tab.
 * @returns the section.
 */
function line(): HTMLElement {
    const found = screen.getByTestId("style-tab").querySelector<HTMLElement>('[data-section="edge-line"]');
    if (found === null) {
        throw new Error("no Line section");
    }
    return found;
}

/**
 * A line of the Line section, once it is drawn.
 * @param channel - the line's property.
 * @returns the line.
 */
async function lineOf(channel: Channel): Promise<HTMLElement> {
    return waitFor(() => {
        const found = line().querySelector<HTMLElement>(`.ws-row[data-line="${channel}"]`);
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
        await userEvent.keyboard(`${typed}{Enter}`);
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
    const button = await within(line()).findByRole("button", { name: plus });
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

describe("Edges, Line: every line look has a control", () => {
    it("adds Outline, Underlay, Overlay and Gradient from Line's '+' and their settings from each row's '+'", async () => {
        const session = await openScene();
        const everything = session.styles
            .list()
            .find((layer) => layer.name === "Everything" && layer.target === "edge");
        if (everything === undefined) {
            throw new Error("no Everything edge layer");
        }
        // Width and Pattern are rows already, so their settings are added under them.
        await session.styles.update(everything.id, {
            set: { ...everything.set, "edge.width": 1, "edge.style": "dash" },
        });
        const tree = await screen.findByRole("tree", { name: "Style layers" });
        await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Everything, / }));
        const inspector = screen.getByRole("complementary", { name: "Inspector" });
        const style = await within(inspector).findByRole("tab", { name: "Style" });
        if (style.getAttribute("aria-selected") !== "true") {
            await userEvent.click(style);
        }
        await showKind("edge");

        for (const row of ROWS) {
            const drawn = await addFrom(session, "Add to edge line", row);
            assert.isUndefined(drawn.dataset.setting, `${row[1]} is a row of Line`);
        }
        // Line's own "+" never lists a row's settings.
        await userEvent.click(within(line()).getByRole("button", { name: "Add to edge line" }));
        const offered = (await screen.findAllByRole("menuitem")).map((item) => item.textContent);
        for (const word of ["Min screen width", "Dash length", "Outline width", "Underlay padding", "Gradient stops"]) {
            assert.notInclude(offered, word);
        }
        await userEvent.keyboard("{Escape}");

        for (const [row, settings] of SETTINGS) {
            for (const setting of settings) {
                const drawn = await addFrom(session, `Add to edge ${row}`, setting);
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
