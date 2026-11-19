/**
 * The Style tab's rows for properties outside graphty-element's file-styles experiment, on the REAL
 * graphty-element, driven by real input (issue #6812): Halo, Unlit and Flat shading are rows of
 * Shape's "+", the halo's Shown is added from Halo's own "+" and the size's Mode from Size's own
 * "+"; Route is a row of Path's "+" and its Arc height is added from Route's own "+". Each is written
 * to the layer once a value is picked or typed. The file-styles channels are the panel by part's
 * (parts/__tests__).
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { Channel } from "@graphty/graphty-element/schema";
import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { withoutFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { showKind } from "./kindTab";

// With file-styles on the Style tab is the panel by part; these are today's sections.
withoutFeatures(["file-styles"]);

/** How a value is typed: a number box, a color's hex, or a pick from a list. */
type Input = "number" | "color" | "choice";

/** One property: the menu word, its channel, what is typed, and what is written. */
type Setting = readonly [word: string, channel: Channel, input: Input, typed: string, written: unknown];

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
    const target = channel.startsWith("edge.") ? "edge" : "node";
    return session.styles.list().find((layer) => layer.name === "Everything" && layer.target === target)?.set?.[
        channel
    ];
}

/**
 * A section of the open Style tab.
 * @param id - the section's `data-section`, such as `node-shape`.
 * @returns the section.
 */
function section(id: string): HTMLElement {
    const found = screen.getByTestId("style-tab").querySelector<HTMLElement>(`[data-section="${id}"]`);
    if (found === null) {
        throw new Error(`no ${id} section`);
    }
    return found;
}

/**
 * A line of a section, once it is drawn.
 * @param id - the section.
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
 * @param id - the section.
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

/**
 * Opens the Everything row's Style tab on one kind.
 * @param kind - nodes or edges.
 */
async function openStyle(kind: "node" | "edge"): Promise<void> {
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Everything, / }));
    const inspector = screen.getByRole("complementary", { name: "Inspector" });
    const style = await within(inspector).findByRole("tab", { name: "Style" });
    if (style.getAttribute("aria-selected") !== "true") {
        await userEvent.click(style);
    }
    await showKind(kind);
}

describe("the Style tab's rows outside file-styles", () => {
    it("adds Halo, Unlit and Flat shading from Shape's '+', and Shown and Mode from their rows' '+'", async () => {
        const session = await openScene();
        await openStyle("node");
        const rows: readonly Setting[] = [
            ["Halo", "node.haloColor", "color", "FF00FF", "#FF00FF"],
            ["Unlit", "node.unlit", "choice", "On", true],
            ["Flat shading", "node.flat", "choice", "On", true],
        ];
        for (const row of rows) {
            const drawn = await addFrom(session, "node-shape", "Add to node shape", row);
            assert.isUndefined(drawn.dataset.setting, `${row[1]} is a row of Shape`);
        }
        const settings: readonly (readonly [plus: string, setting: Setting])[] = [
            ["Add to node halo", ["Shown", "node.halo", "choice", "Off", false]],
            ["Add to node size", ["Mode", "node.sizeMode", "choice", "Diameter", "diameter"]],
            ["Add to node size", ["Space", "node.sizeSpace", "choice", "Screen", "screen"]],
        ];
        for (const [plus, setting] of settings) {
            const drawn = await addFrom(session, "node-shape", plus, setting);
            assert.isDefined(drawn.dataset.setting, `${setting[1]} is drawn as its row's setting`);
        }
    });

    it("adds Route from Path's '+', and Arc height from Route's own '+'", async () => {
        const session = await openScene();
        await openStyle("edge");
        const route = await addFrom(session, "edge-path", "Add to edge path", [
            "Route",
            "edge.route",
            "choice",
            "Arc",
            "arc",
        ]);
        assert.isUndefined(route.dataset.setting, "Route is a row of Path");
        const height = await addFrom(session, "edge-path", "Add to edge route", [
            "Arc height",
            "edge.arcHeight",
            "number",
            "0.3",
            0.3,
        ]);
        assert.isDefined(height.dataset.setting, "Arc height is drawn under Route");
    });
});
