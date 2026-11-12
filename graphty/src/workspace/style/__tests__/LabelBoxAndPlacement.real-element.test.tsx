/**
 * Label settings' box, outline, placement and visibility fields, the entry's Position and its
 * Table on the REAL graphty-element, driven by real input (issue #6812): each field typed or picked
 * in the pop-over is written to the label's style (an opacity typed as a percent, written as a
 * fraction), each field graphty-element varies through a channel of its own has the vary glyph
 * beside it, which binds that channel, and a label's own "+" adds its table. The per-element
 * channels are offered with the element's file-styles experiment on.
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

// graphty-element offers the per-element label channels with its file-styles experiment on.
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
 * Adds a text entry of one kind from its group's "+", its words read from a value.
 * @param session - the element's session.
 * @param side - nodes or edges.
 * @param kind - the kind's menu word.
 * @param words - the kind's words channel.
 * @param source - the value its words read.
 */
async function addText(
    session: GraphSession,
    side: "node" | "edge",
    kind: RegExp,
    words: Channel,
    source: string,
): Promise<void> {
    await showKind(side);
    await userEvent.click(within(textList(side)).getByRole("button", { name: `Add to ${side} text` }));
    await userEvent.click(await screen.findByRole("menuitem", { name: kind }));
    await userEvent.click(within(await findValuePicker()).getByRole("option", { name: new RegExp(`^${source}(,|$)`) }));
    await waitFor(() => {
        assert.isDefined(writer(session, words));
    });
}

/**
 * Opens an entry's settings.
 * @param side - nodes or edges.
 * @param button - the settings button's name.
 * @param title - the pop-out's name.
 * @returns the pop-out.
 */
async function openSettings(side: "node" | "edge", button: string, title: string): Promise<HTMLElement> {
    await userEvent.click(await within(textList(side)).findByRole("button", { name: button }));
    return screen.findByRole("dialog", { name: title });
}

/** One field: its name in the pop-over, how it is set, what is typed or picked, and what is written. */
type FieldSetting = readonly [
    word: string,
    input: "number" | "choice" | "color",
    typed: string,
    field: keyof LabelStyle,
    written: unknown,
];

const BOX_AND_PLACEMENT: readonly FieldSetting[] = [
    ["Text opacity", "number", "50", "opacity", 0.5],
    ["Background opacity", "number", "25", "backgroundOpacity", 0.25],
    ["Box padding", "number", "4", "boxPadding", 4],
    ["Box size", "choice", "Target width", "box", "target-width"],
    ["Border opacity", "number", "40", "borderOpacity", 0.4],
    ["Panel shadow", "choice", "On", "panelShadow", true],
    ["Panel shadow color", "color", "FF0000", "panelShadowColor", "#FF0000"],
    ["Panel shadow blur", "number", "6", "panelShadowBlur", 6],
    ["Panel shadow right", "number", "2", "panelShadowOffsetX", 2],
    ["Panel shadow down", "number", "3", "panelShadowOffsetY", 3],
    ["Outline opacity", "number", "60", "outlineOpacity", 0.6],
    ["Right", "number", "1.5", "offsetX", 1.5],
    ["Down", "number", "2", "offsetY", 2],
    ["Shift right", "number", "0.5", "shiftX", 0.5],
    ["Shift down", "number", "0.5", "shiftY", 0.5],
    ["Shift of", "choice", "Words", "shiftOf", "words"],
    ["Gap of", "choice", "Words", "gapOf", "words"],
    ["Smallest size on screen", "number", "8", "minScreenSize", 8],
    ["Overlap order", "choice", "Largest", "declutter", "size"],
    ["Hide on nodes smaller than", "number", "10", "minNodeScreenSize", 10],
];

/**
 * Sets one field of the open pop-over by real input.
 * @param settings - the pop-over.
 * @param setting - the field and its value.
 */
async function setField(settings: HTMLElement, [word, input, typed]: FieldSetting): Promise<void> {
    const name = new RegExp(`^${word}(,|$)`);
    if (input === "choice") {
        await userEvent.click(within(settings).getByRole("combobox", { name }));
        await userEvent.click(await screen.findByRole("option", { name: typed }));
        return;
    }
    const box =
        input === "color"
            ? within(settings)
                  .getAllByTestId("compact-color-input-hex")
                  .find((each) => each.getAttribute("aria-label")?.startsWith(word) === true)
            : within(settings).getByLabelText(name);
    if (box === undefined) {
        throw new Error(`no ${word} box to type in`);
    }
    await userEvent.tripleClick(box);
    await userEvent.keyboard(`${typed}{Enter}`);
}

/** A channel the vary glyph binds, and the value it is bound to. */
type Varied = readonly [channel: Channel, glyph: string, source: string];

/**
 * Binds each channel by the vary glyph beside its field in an entry's settings, and checks the
 * binding is written.
 * @param session - the element's session.
 * @param side - nodes or edges.
 * @param pop - the settings button's name and the pop-out's name.
 * @param varied - the channels, their glyphs' words and the values they are bound to.
 */
async function varyEach(
    session: GraphSession,
    side: "node" | "edge",
    [button, title]: readonly [string, string],
    varied: readonly Varied[],
): Promise<void> {
    for (const [channel, glyph, source] of varied) {
        const settings = screen.queryByRole("dialog", { name: title }) ?? (await openSettings(side, button, title));
        await userEvent.click(within(settings).getByRole("button", { name: `${glyph} by attribute` }));
        await bindTo(session, channel, source);
    }
}

/**
 * Picks the value a vary glyph's list binds to, and checks the binding is written.
 * @param session - the element's session.
 * @param channel - the channel the glyph varies.
 * @param source - the value.
 */
async function bindTo(session: GraphSession, channel: Channel, source: string): Promise<void> {
    await userEvent.click(within(await findValuePicker()).getByRole("option", { name: new RegExp(`^${source}(,|$)`) }));
    await waitFor(() => {
        const binding = writer(session, channel)?.encode?.[channel];
        assert.equal(binding !== undefined && "by" in binding ? binding.by : undefined, `data.${source}`, channel);
    });
}

describe("Label settings: box, outline, placement and visibility", () => {
    beforeAll(async () => {
        await page.viewport(1440, 900);
    });

    it("writes each field typed or picked in the pop-over to the label's style, an opacity as a fraction", async () => {
        const session = await openWithGraph();
        await addText(session, "node", /^Label(?! at )/, "node.label", "name");
        const settings = await openSettings("node", "Node label settings", "Label settings");
        const style = (): LabelStyle =>
            (writer(session, "node.labelStyle")?.set?.["node.labelStyle"] ?? {}) as LabelStyle;
        for (const setting of BOX_AND_PLACEMENT) {
            await setField(settings, setting);
            const [word, input, , field, written] = setting;
            await waitFor(() => {
                const value = style()[field];
                assert.deepEqual(
                    input === "color" && typeof value === "string" ? value.toUpperCase() : value,
                    written,
                    `${word} writes ${field}`,
                );
            });
        }
    });

    it("draws no node-only field on an edge label", async () => {
        const session = await openWithGraph();
        await addText(session, "edge", /^Label(?! at )/, "edge.label", "weight");
        const settings = await openSettings("edge", "Edge label settings", "Label settings");
        assert.isNotNull(within(settings).queryByLabelText(/^Smallest size on screen(,|$)/));
        assert.isNull(within(settings).queryByRole("combobox", { name: /^Overlap order(,|$)/ }));
        assert.isNull(within(settings).queryByLabelText(/^Hide on nodes smaller than(,|$)/));
    });

    it("varies each field with a channel of its own by a value, on a node label", async () => {
        const session = await openWithGraph();
        await addText(session, "node", /^Label(?! at )/, "node.label", "name");
        await varyEach(
            session,
            "node",
            ["Node label settings", "Label settings"],
            [
                ["node.labelOpacity", "Node label text opacity", "score"],
                ["node.labelBackgroundOpacity", "Node label background opacity", "score"],
                ["node.labelPadding", "Node label box padding", "score"],
                ["node.labelBorderOpacity", "Node label border opacity", "score"],
                ["node.labelBox", "Node label box size", "name"],
                ["node.labelOutlineOpacity", "Node label outline opacity", "score"],
                ["node.labelOffsetX", "Node label right", "score"],
                ["node.labelOffsetY", "Node label down", "score"],
                ["node.labelShiftX", "Node label shift right", "score"],
                ["node.labelShiftY", "Node label shift down", "score"],
                ["node.labelShiftOf", "Node label shift of", "name"],
                ["node.labelGapOf", "Node label gap of", "name"],
                ["node.labelMinScreenSize", "Node label smallest size on screen", "score"],
                ["node.labelDeclutter", "Node label overlap order", "name"],
                ["node.labelMinNodeScreenSize", "Node label hidden on nodes smaller than", "score"],
            ],
        );
    });

    it("varies an edge label's and an end caption's opacity and offsets by a value", async () => {
        const session = await openWithGraph();
        await addText(session, "edge", /^Label(?! at )/, "edge.label", "weight");
        await varyEach(
            session,
            "edge",
            ["Edge label settings", "Label settings"],
            [
                ["edge.labelOpacity", "Edge label text opacity", "weight"],
                ["edge.labelOffsetX", "Edge label right", "weight"],
                ["edge.labelBox", "Edge label box size", "weight"],
            ],
        );
        await addText(session, "edge", /^Label at target end/, "edge.arrowHeadText", "weight");
        await varyEach(
            session,
            "edge",
            ["Edge label at target end settings", "Label at target end settings"],
            [
                ["edge.arrowHeadTextOpacity", "Edge label at target end text opacity", "weight"],
                ["edge.arrowHeadTextOffsetX", "Edge label at target end right", "weight"],
                ["edge.arrowHeadTextOffsetY", "Edge label at target end down", "weight"],
            ],
        );
    });

    it("varies a label's position from its own Position line", async () => {
        const session = await openWithGraph();
        await addText(session, "node", /^Label(?! at )/, "node.label", "name");
        await userEvent.click(within(textList("node")).getByRole("button", { name: "Add to node label" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Position" }));
        await waitFor(() => {
            const style = writer(session, "node.labelStyle")?.set?.["node.labelStyle"] as LabelStyle | undefined;
            assert.isDefined(style?.location);
        });
        await userEvent.click(
            within(textList("node")).getByRole("button", { name: "Node label position by attribute" }),
        );
        await bindTo(session, "node.labelLocation", "name");
    });

    it("adds a label's table from its own '+', drawn as a words field", async () => {
        const session = await openWithGraph();
        await addText(session, "node", /^Label(?! at )/, "node.label", "name");
        await userEvent.click(within(textList("node")).getByRole("button", { name: "Add to node label" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Table" }));
        const table = '{"rows":[{"cells":[{"lines":[{"text":"a"}]},{"lines":[{"text":"b"}]}]}]}';
        const box = await waitFor(() => {
            const line = textList("node").querySelector<HTMLElement>('[data-line="node.labelTable"]');
            const input = line?.querySelector<HTMLInputElement>("input, textarea");
            assert.isNotNull(input ?? null);
            return input as HTMLInputElement;
        });
        await userEvent.click(box);
        await userEvent.keyboard(`${table.replaceAll("{", "{{").replaceAll("[", "[[")}{Enter}`);
        await waitFor(() => {
            assert.equal(writer(session, "node.labelTable")?.set?.["node.labelTable"], table);
        });
    });
});
