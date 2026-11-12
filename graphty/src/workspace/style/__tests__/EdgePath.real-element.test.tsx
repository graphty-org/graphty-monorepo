/**
 * Edges, Path on the REAL graphty-element, driven by real input (issue #6812): Route, Bends, Fanned,
 * Node gap, Source port, Target port and Support are rows of Path's "+", and each row's settings
 * (Route's arc radius and height, Bends' curve, Fanned's spacing, Node gap's source and target
 * gaps, Support's unit, scale and forces) are added from the row's own "+" and written to the
 * layer once a value is typed. Most of them are offered with the element's file-styles experiment on.
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

// graphty-element offers most path settings with its file-styles experiment on.
withFeatures(["file-styles"]);

/** How a value is typed: a number box, words, or a pick from a list. */
type Input = "number" | "text" | "choice";

/** One property: the menu word, its channel, what is typed, and what is written. */
type Setting = readonly [word: string, channel: Channel, input: Input, typed: string, written: unknown];

/** The rows Path's own "+" adds. */
const ROWS: readonly Setting[] = [
    ["Route", "edge.route", "choice", "Arc", "arc"],
    ["Bends", "edge.bends", "text", "0.5,0.2", "0.5,0.2"],
    ["Fanned", "edge.fanned", "choice", "Off", false],
    ["Node gap", "edge.nodeGap", "number", "2", 2],
    ["Source port", "edge.sourcePort", "text", "1,0", "1,0"],
    ["Target port", "edge.targetPort", "text", "0,1", "0,1"],
    ["Support", "edge.supportModel", "choice", "Force atlas2", "forceAtlas2"],
];

/** Each row's settings, by the row's words as its "+" is named. */
const SETTINGS: readonly (readonly [row: string, settings: readonly Setting[]])[] = [
    [
        "route",
        [
            ["Arc radius", "edge.arcRadius", "number", "1", 1],
            ["Arc height", "edge.arcHeight", "number", "0.3", 0.3],
        ],
    ],
    ["bends", [["Bend curve", "edge.bendCurve", "choice", "Bezier", "bezier"]]],
    ["fanned", [["Fan spacing", "edge.fanSpacing", "number", "2", 2]]],
    [
        "node gap",
        [
            ["Source node gap", "edge.sourceNodeGap", "number", "1", 1],
            ["Target node gap", "edge.targetNodeGap", "number", "3", 3],
        ],
    ],
    [
        "support",
        [
            ["Unit", "edge.supportUnit", "number", "2", 2],
            ["Scale", "edge.supportScale", "choice", "Drawing", "drawing"],
            ["Spring length", "edge.supportSpringLength", "number", "90", 90],
            ["Spring constant", "edge.supportSpringConstant", "number", "0.05", 0.05],
            ["Repulsion", "edge.supportRepulsion", "number", "1500", 1500],
            ["Central gravity", "edge.supportCentralGravity", "number", "0.2", 0.2],
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
 * The Path section of the open Style tab.
 * @returns the section.
 */
function path(): HTMLElement {
    const found = screen.getByTestId("style-tab").querySelector<HTMLElement>('[data-section="edge-path"]');
    if (found === null) {
        throw new Error("no Path section");
    }
    return found;
}

/**
 * A line of the Path section, once it is drawn.
 * @param channel - the line's property.
 * @returns the line.
 */
async function lineOf(channel: Channel): Promise<HTMLElement> {
    return waitFor(() => {
        const found = path().querySelector<HTMLElement>(`.ws-row[data-line="${channel}"]`);
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
        // Picked with the pointer: a choice of two words ("Force atlas2") cannot be typed ahead.
        await userEvent.click(within(row).getByRole("combobox"));
        await userEvent.click(await screen.findByRole("option", { name: typed }));
        return;
    }
    const box = row.querySelector<HTMLInputElement>("input");
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
    const button = await within(path()).findByRole("button", { name: plus });
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

describe("Edges, Path: every path setting has a control", () => {
    it("adds Path's rows from its '+' and their settings from each row's '+'", async () => {
        const session = await openScene();
        const tree = await screen.findByRole("tree", { name: "Style layers" });
        await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Everything, / }));
        const inspector = screen.getByRole("complementary", { name: "Inspector" });
        const style = await within(inspector).findByRole("tab", { name: "Style" });
        if (style.getAttribute("aria-selected") !== "true") {
            await userEvent.click(style);
        }
        await showKind("edge");

        for (const row of ROWS) {
            const drawn = await addFrom(session, "Add to edge path", row);
            assert.isUndefined(drawn.dataset.setting, `${row[1]} is a row of Path`);
        }

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
