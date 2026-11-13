/**
 * Nodes, Shape's geometry settings and the drawing order on the REAL graphty-element, driven by real
 * input (issue #6812): Size's own "+" adds Mode; the Shape row's own "+" adds the corner, rotation,
 * polygon, parts, lines and texts settings; Wireframe's own "+" holds Mesh detail; Visibility's "+"
 * adds Z-index and Draw order. Each is written to the layer once a value is picked or typed. Most are
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

// graphty-element offers the corner, polygon, parts, lines, texts and drawing-order channels with
// its file-styles experiment on.
withFeatures(["file-styles"]);

/** How a value is typed: a number box, a color's hex, a pick from a list, or words. */
type Input = "number" | "color" | "choice" | "text";

/** One property: the menu word, its channel, what is typed, and what is written. */
type Setting = readonly [word: string, channel: Channel, input: Input, typed: string, written: unknown];

/** The Shape row's settings, added from its own "+". */
const SHAPE_SETTINGS: readonly Setting[] = [
    ["Corner radius", "node.cornerRadius", "number", "2", 2],
    ["Exact corner radius", "node.exactCornerRadius", "choice", "On", true],
    ["Corner fraction", "node.cornerFraction", "number", "0.1", 0.1],
    ["Rotation", "node.shapeRotation", "number", "45", 45],
    ["Polygon points", "node.shapePoints", "text", "0,1 1,-1 -1,-1", "0,1 1,-1 -1,-1"],
    ["Polygon stretch", "node.shapeStretchPoints", "choice", "Off", false],
    ["Parts", "node.shapeParts", "text", "-1,0.1 1,0.1 1,0.5", "-1,0.1 1,0.1 1,0.5"],
    ["Lines", "node.shapeLines", "text", "-1,0 1,0", "-1,0 1,0"],
    ["Texts", "node.shapeTexts", "text", '[[0, 0, "a"]]', '[[0, 0, "a"]]'],
    ["Line width", "node.shapeLineWidth", "number", "2", 2],
    ["Line halo color", "node.shapeLineHaloColor", "color", "00FFFF", "#00FFFF"],
    ["Line halo width", "node.shapeLineHaloWidth", "number", "3", 3],
];

/** Visibility's rows. */
const VISIBILITY_ROWS: readonly Setting[] = [
    ["Z-index", "node.zIndex", "number", "-5", -5],
    ["Draw order", "node.drawOrder", "number", "7", 7],
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
 * A node section of the open Style tab.
 * @param id - the section's id.
 * @returns the section.
 */
function section(id: string): HTMLElement {
    const found = screen.getByTestId("style-tab").querySelector<HTMLElement>(`[data-section="node-${id}"]`);
    if (found === null) {
        throw new Error(`no ${id} section`);
    }
    return found;
}

/**
 * A line of a section, once it is drawn.
 * @param id - the section's id.
 * @param channel - the line's property.
 * @returns the line.
 */
async function lineOf(id: string, channel: Channel): Promise<HTMLElement> {
    return waitFor(() => {
        const found = section(id).querySelector<HTMLElement>(`.ws-row[data-line="${channel}"]`);
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
    if (input === "text") {
        const box = row.querySelector<HTMLInputElement>("input, textarea");
        if (box === null) {
            throw new Error("no box to type in");
        }
        await userEvent.click(box);
        // "[" and "{" open a key name in userEvent's keyboard: doubled, each is typed as itself.
        await userEvent.keyboard(`{Control>}a{/Control}${typed.replaceAll("[", "[[").replaceAll("{", "{{")}{Enter}`);
        return;
    }
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
 * @param id - the section's id.
 * @param plus - the "+" button's name.
 * @param setting - the property.
 * @returns the property's line.
 */
async function addFrom(session: GraphSession, id: string, plus: string, setting: Setting): Promise<HTMLElement> {
    const [word, channel, input, typed, value] = setting;
    const button = await within(section(id)).findByRole("button", { name: plus });
    const menu = button.getAttribute("aria-haspopup") === "menu";
    await userEvent.click(button);
    if (menu) {
        await userEvent.click(await screen.findByRole("menuitem", { name: word }));
    }
    const row = await lineOf(id, channel);
    await type(row, input, typed);
    await waitFor(() => {
        assert.deepEqual(written(session, channel), value, channel);
    });
    return row;
}

describe("Nodes, Shape: every geometry and drawing-order setting has a control", () => {
    it("adds each from its row's or section's '+' and writes what is typed", async () => {
        const session = await openScene();
        const tree = await screen.findByRole("tree", { name: "Style layers" });
        await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Everything, / }));
        const inspector = screen.getByRole("complementary", { name: "Inspector" });
        const style = await within(inspector).findByRole("tab", { name: "Style" });
        if (style.getAttribute("aria-selected") !== "true") {
            await userEvent.click(style);
        }
        await showKind("node");

        const settings: readonly (readonly [plus: string, setting: Setting])[] = [
            ["Add to node size", ["Mode", "node.sizeMode", "choice", "Diameter", "diameter"]],
            ...SHAPE_SETTINGS.map((setting) => ["Add to node shape settings", setting] as const),
        ];
        for (const [plus, setting] of settings) {
            const drawn = await addFrom(session, "shape", plus, setting);
            assert.equal(
                drawn.querySelector(".ws-field-name")?.textContent,
                setting[0],
                `${setting[1]} is named under its row`,
            );
            assert.isDefined(drawn.dataset.setting, `${setting[1]} is drawn as its row's setting`);
        }

        // Wireframe On writes a low-detail mesh, drawn as its setting, which the reader can change.
        await userEvent.click(await within(section("shape")).findByRole("button", { name: "Add to node shape" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Wireframe" }));
        const detail = await lineOf("shape", "node.meshDetail");
        assert.isDefined(detail.dataset.setting, "Mesh detail is drawn under Wireframe");
        await waitFor(() => {
            assert.equal(written(session, "node.meshDetail"), "low");
        });
        await type(detail, "choice", "Full");
        await waitFor(() => {
            assert.equal(written(session, "node.meshDetail"), "full");
        });

        for (const row of VISIBILITY_ROWS) {
            const drawn = await addFrom(session, "visibility", "Add to node visibility", row);
            assert.isUndefined(drawn.dataset.setting, `${row[1]} is a row of Visibility`);
        }
    });
});
