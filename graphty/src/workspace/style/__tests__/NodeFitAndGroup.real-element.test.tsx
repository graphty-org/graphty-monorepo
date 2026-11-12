/**
 * Nodes, Shape's Fit to label and Group padding on the REAL graphty-element, driven by real input
 * (issue #6812): Shape's "+" adds Fit to label and Group padding, and each row's own "+" adds its
 * settings. Each is written to the layer once a value is picked or typed. They are offered with the
 * element's file-styles experiment on.
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

// graphty-element offers the label-fit and group-sizing channels with its file-styles experiment on.
withFeatures(["file-styles"]);

/** How a value is typed: a number box or a pick from a list. */
type Input = "number" | "choice";

/** One property: the menu word, its channel, what is typed, and what is written. */
type Setting = readonly [word: string, channel: Channel, input: Input, typed: string, written: unknown];

/** A row Shape's "+" adds, and the settings its own "+" adds. */
type Row = readonly [row: Setting, plus: string, settings: readonly Setting[]];

const ROWS: readonly Row[] = [
    [
        ["Fit to label", "node.labelFit", "choice", "Inside", "inside"],
        "Add to node fit to label",
        [
            ["Label padding across", "node.labelPaddingX", "number", "0.5", 0.5],
            ["Label padding down", "node.labelPaddingY", "number", "0.25", 0.25],
            ["Keep square when fitted", "node.labelFitSquare", "choice", "On", true],
            ["Round fitted size to", "node.labelFitQuantum", "number", "2", 2],
            ["Fit image pixel size", "node.labelFitImage", "number", "0.1", 0.1],
            ["Fit image padding", "node.labelFitImagePadding", "number", "1", 1],
        ],
    ],
    [
        ["Group padding", "node.groupPadding", "number", "3", 3],
        "Add to node group padding",
        [
            ["Ratio", "node.groupPaddingRatio", "number", "0.2", 0.2],
            ["Ratio of", "node.groupPaddingOf", "choice", "Height", "height"],
            ["Group min width", "node.groupMinWidth", "number", "10", 10],
            ["Group min width bias left", "node.groupMinWidthBiasLeft", "number", "0.25", 0.25],
            ["Group min height", "node.groupMinHeight", "number", "12", 12],
            ["Group min height bias top", "node.groupMinHeightBiasTop", "number", "0.75", 0.75],
            ["Group includes labels", "node.groupIncludeLabels", "choice", "On", true],
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
 * The open Style tab's node Shape section.
 * @returns the section.
 */
function shape(): HTMLElement {
    const found = screen.getByTestId("style-tab").querySelector<HTMLElement>('[data-section="node-shape"]');
    if (found === null) {
        throw new Error("no Shape section");
    }
    return found;
}

/**
 * Adds a property from a "+", types or picks its value and waits for the layer to hold it.
 * @param session - the session.
 * @param plus - the "+" button's name.
 * @param setting - the property.
 * @returns the property's line.
 */
async function addFrom(session: GraphSession, plus: string, setting: Setting): Promise<HTMLElement> {
    const [word, channel, input, typed, value] = setting;
    const button = await within(shape()).findByRole("button", { name: plus });
    const menu = button.getAttribute("aria-haspopup") === "menu";
    await userEvent.click(button);
    if (menu) {
        await userEvent.click(await screen.findByRole("menuitem", { name: word }));
    }
    const row = await waitFor(() => {
        const found = shape().querySelector<HTMLElement>(`.ws-row[data-line="${channel}"]`);
        assert.isNotNull(found);
        return found;
    });
    if (input === "choice") {
        await userEvent.click(within(row).getByRole("combobox"));
        await userEvent.click(await screen.findByRole("option", { name: typed }));
    } else {
        const box = row.querySelector<HTMLInputElement>("input");
        if (box === null) {
            throw new Error("no box to type in");
        }
        await userEvent.click(box);
        await userEvent.keyboard(`{Control>}a{/Control}${typed}{Enter}`);
    }
    await waitFor(() => {
        assert.deepEqual(written(session, channel), value, channel);
    });
    return row;
}

describe("Nodes, Shape: Fit to label and Group padding have controls", () => {
    it("adds each row from Shape's '+', each setting from its row's '+', and writes what is set", async () => {
        const session = await openScene();
        const tree = await screen.findByRole("tree", { name: "Style layers" });
        await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Everything, / }));
        const inspector = screen.getByRole("complementary", { name: "Inspector" });
        const style = await within(inspector).findByRole("tab", { name: "Style" });
        if (style.getAttribute("aria-selected") !== "true") {
            await userEvent.click(style);
        }
        await showKind("node");

        for (const [row, plus, settings] of ROWS) {
            const drawn = await addFrom(session, "Add to node shape", row);
            assert.isUndefined(drawn.dataset.setting, `${row[1]} is a row of Shape`);
            for (const setting of settings) {
                const line = await addFrom(session, plus, setting);
                assert.equal(line.querySelector(".ws-field-name")?.textContent, setting[0], `${setting[1]}'s name`);
                assert.isDefined(line.dataset.setting, `${setting[1]} is drawn under ${row[0]}`);
            }
        }
    });
});
