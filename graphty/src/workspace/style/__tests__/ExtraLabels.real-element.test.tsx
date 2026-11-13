/**
 * The extra label (graphty-element's external label, `node.xlabel` and `edge.xlabel`) in the Style
 * tab's Text list on the REAL graphty-element, driven by real input (issue #6812): the Text list's
 * "+" adds it as an entry like Label and Tooltip, its source writes its words, its own "+" adds its
 * look and position to its style, its Position line varies its location by a value, and its
 * settings' Right and Down vary its offsets by a value. The channels are offered with the
 * element's file-styles experiment on.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { Channel, LabelStyle } from "@graphty/graphty-element/schema";
import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { findValuePicker, render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { showKind } from "./kindTab";

// graphty-element offers the external label channels with its file-styles experiment on.
withFeatures(["file-styles"]);

const NODES = [
    { id: "1", name: "Alpha", score: 0.5 },
    { id: "2", name: "Beta", score: 0.75 },
    { id: "3", name: "Gamma", score: 1 },
];
const EDGES = [
    { source: "1", target: "2", weight: 1 },
    { source: "2", target: "3", weight: 2 },
    { source: "3", target: "1", weight: 3 },
];

/**
 * Renders the workspace on the Everything row and loads the graph.
 * @returns the element's session.
 */
async function openWithGraph(): Promise<GraphSession> {
    const store = createWorkspaceStore({ project: { name: "Ring", id: 1 }, inspected: { kind: "everything-row" } });
    render(<Workspace store={store} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.addNodes(NODES);
    await session.data.addEdges(EDGES);
    await screen.findByTestId("style-tab", {});
    return session;
}

/**
 * A group's Text list, looked up afresh: a write can redraw the tab.
 * @param side - nodes or edges.
 * @returns the list.
 */
function textList(side: "node" | "edge"): HTMLElement {
    const group = screen.getByTestId("style-tab").querySelector<HTMLElement>(`[data-group="${side}"]`);
    if (group === null) {
        throw new Error(`the Style tab draws no ${side} group`);
    }
    return within(group).getByRole("group", { name: "Text" });
}

/**
 * The reader's layer that writes a channel.
 * @param session - the element's session.
 * @param channel - the channel.
 * @returns the layer, if any.
 */
function writer(session: GraphSession, channel: Channel): Layer | undefined {
    return session.styles
        .list()
        .filter((l) => l.source.by !== "element")
        .find((l) => l.set?.[channel] !== undefined || l.encode?.[channel] !== undefined);
}

/**
 * Picks the value an open value list binds to, and checks the binding is written.
 * @param session - the element's session.
 * @param channel - the channel the list binds.
 * @param source - the value.
 */
async function bindTo(session: GraphSession, channel: Channel, source: string): Promise<void> {
    await userEvent.click(within(await findValuePicker()).getByRole("option", { name: new RegExp(`^${source}(,|$)`) }));
    await waitFor(() => {
        const binding = writer(session, channel)?.encode?.[channel];
        assert.equal(binding !== undefined && "by" in binding ? binding.by : undefined, `data.${source}`, channel);
    });
}

/**
 * Adds one part from an entry's own "+": picked from its menu, or, when it is the one part left, by
 * the "+" itself, which then opens no menu.
 * @param side - nodes or edges.
 * @param item - the part.
 */
async function addPart(side: "node" | "edge", item: string): Promise<void> {
    const plus = within(textList(side)).getByRole("button", { name: `Add to ${side} extra label` });
    const menu = plus.getAttribute("aria-haspopup") !== null;
    await userEvent.click(plus);
    if (menu) {
        await userEvent.click(await screen.findByRole("menuitem", { name: item }));
    }
}

/**
 * Opens an extra label entry's settings.
 * @param side - nodes or edges.
 * @param kindWord - the side's word on the entry's controls.
 * @returns the pop-out.
 */
async function openSettings(side: "node" | "edge", kindWord: string): Promise<HTMLElement> {
    await userEvent.click(within(textList(side)).getByRole("button", { name: `${kindWord} extra label settings` }));
    return screen.findByRole("dialog", { name: "Extra label settings" });
}

describe("the extra label on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1440, 900);
    });

    // Each side's words and position read a value it has; its offsets read a number.
    for (const [side, kindWord, source, number] of [
        ["node", "Node", "name", "score"],
        ["edge", "Edge", "weight", "weight"],
    ] as const) {
        it(`sets every ${side} extra label channel through its Text entry`, async () => {
            const session = await openWithGraph();
            await showKind(side);

            // The Text list's "+" adds it, and its source writes its words.
            await userEvent.click(within(textList(side)).getByRole("button", { name: `Add to ${side} text` }));
            await userEvent.click(await screen.findByRole("menuitem", { name: "Extra label" }));
            await bindTo(session, `${side}.xlabel`, source);

            // Its own "+" adds its look and its position to its style.
            const style = (): LabelStyle =>
                (writer(session, `${side}.xlabelStyle`)?.set?.[`${side}.xlabelStyle`] ?? {}) as LabelStyle;
            await addPart(side, "Look");
            await waitFor(() => {
                assert.isDefined(style().look, "Look writes the extra label's style");
            });
            await addPart(side, "Position");
            await waitFor(() => {
                assert.isDefined(style().location, "Position writes the extra label's location");
            });

            // Its Position line varies its location by a value.
            await userEvent.click(
                within(textList(side)).getByRole("button", { name: `${kindWord} extra label position by attribute` }),
            );
            await bindTo(session, `${side}.xlabelLocation`, source);

            // Its settings' Right and Down vary its offsets by a value.
            for (const [channel, glyph] of [
                [`${side}.xlabelOffsetX`, `${kindWord} extra label right`],
                [`${side}.xlabelOffsetY`, `${kindWord} extra label down`],
            ] as const) {
                const settings =
                    screen.queryByRole("dialog", { name: "Extra label settings" }) ??
                    (await openSettings(side, kindWord));
                await userEvent.click(within(settings).getByRole("button", { name: `${glyph} by attribute` }));
                await bindTo(session, channel, number);
            }
        });
    }
});
