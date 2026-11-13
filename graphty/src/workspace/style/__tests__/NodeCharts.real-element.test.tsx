/**
 * Nodes, Charts on the REAL graphty-element, driven by real input (issue #6812): Pie, Stripe and
 * Chart are rows of Charts' "+", and each row's settings (the pie's sizes, opacities, radius, hole,
 * rotation, fit box and offset; the stripes' sizes, frame, opacities, direction and size; the
 * chart's values, colors, range, orientation, box, offset, margin, gap, line width and border) are
 * added from the row's own "+" and written to the layer once a value is typed. Lists (colors,
 * sizes, values) are typed in the words field. All of them are offered with the element's
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

// graphty-element offers node pies, stripes and charts with its file-styles experiment on.
withFeatures(["file-styles"]);

/** How a value is typed: a number box, words, a color's hex, or a pick from a list. */
type Input = "number" | "text" | "color" | "choice";

/** One property: the menu word, its channel, what is typed, and what is written. */
type Setting = readonly [word: string, channel: Channel, input: Input, typed: string, written: unknown];

/** The rows Charts' own "+" adds. */
const ROWS: readonly Setting[] = [
    ["Pie", "node.pieColors", "text", "red blue", "red blue"],
    ["Stripe", "node.stripeColors", "text", "green gold", "green gold"],
    ["Chart", "node.chartKind", "choice", "Stacked bar", "stacked-bar"],
];

/** Each row's settings, by the row's words as its "+" is named. */
const SETTINGS: readonly (readonly [row: string, settings: readonly Setting[]])[] = [
    [
        "pie",
        [
            ["Sizes", "node.pieSizes", "text", "0.25 0.75", "0.25 0.75"],
            ["Opacities", "node.pieOpacities", "text", "1 0.5", "1 0.5"],
            ["Radius", "node.pieRadius", "number", "0.8", 0.8],
            ["Hole", "node.pieHole", "number", "0.3", 0.3],
            ["Rotation", "node.pieRotation", "number", "45", 45],
            ["Fit box", "node.pieFitBox", "choice", "On", true],
            ["Offset x", "node.pieOffsetX", "number", "0.1", 0.1],
            ["Offset y", "node.pieOffsetY", "number", "0.2", 0.2],
        ],
    ],
    [
        "stripe",
        [
            ["Sizes", "node.stripeSizes", "text", "0.5 0.5", "0.5 0.5"],
            ["Frame", "node.stripeFrame", "text", "0.1 0.1 0.1 0.1", "0.1 0.1 0.1 0.1"],
            ["Opacities", "node.stripeOpacities", "text", "1 0.5", "1 0.5"],
            ["Direction", "node.stripeDirection", "choice", "Right", "right"],
            ["Size", "node.stripeSize", "number", "0.9", 0.9],
        ],
    ],
    [
        "chart",
        [
            ["Values", "node.chartValues", "text", "1 2 3", "1 2 3"],
            ["Colors", "node.chartColors", "text", "red blue", "red blue"],
            ["Min", "node.chartMin", "number", "1", 1],
            ["Max", "node.chartMax", "number", "5", 5],
            ["Horizontal", "node.chartHorizontal", "choice", "On", true],
            ["Size", "node.chartSize", "number", "0.8", 0.8],
            ["Width", "node.chartWidth", "number", "0.7", 0.7],
            ["Height", "node.chartHeight", "number", "0.6", 0.6],
            ["Offset x", "node.chartOffsetX", "number", "0.1", 0.1],
            ["Offset y", "node.chartOffsetY", "number", "0.2", 0.2],
            ["Margin", "node.chartMargin", "number", "0.1", 0.1],
            ["Gap", "node.chartGap", "number", "0.2", 0.2],
            ["Line width", "node.chartLineWidth", "number", "2", 2],
            ["Border color", "node.chartBorderColor", "color", "FFFFFF", "#FFFFFF"],
            ["Border width", "node.chartBorderWidth", "number", "1", 1],
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
 * The Charts section of the open Style tab.
 * @returns the section.
 */
function charts(): HTMLElement {
    const found = screen.getByTestId("style-tab").querySelector<HTMLElement>('[data-section="node-charts"]');
    if (found === null) {
        throw new Error("no Charts section");
    }
    return found;
}

/**
 * A line of the Charts section, once it is drawn.
 * @param channel - the line's property.
 * @returns the line.
 */
async function lineOf(channel: Channel): Promise<HTMLElement> {
    return waitFor(() => {
        const found = charts().querySelector<HTMLElement>(`.ws-row[data-line="${channel}"]`);
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
    const button = await within(charts()).findByRole("button", { name: plus });
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

describe("Nodes, Charts: every pie, stripe and chart setting has a control", () => {
    it("adds Pie, Stripe and Chart from Charts' '+' and their settings from each row's '+'", async () => {
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
            const drawn = await addFrom(session, "Add to node charts", row);
            assert.isUndefined(drawn.dataset.setting, `${row[1]} is a row of Charts`);
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
