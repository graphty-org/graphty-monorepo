/**
 * Label settings' Type and Wrap fields on the REAL graphty-element, driven by real input (issue
 * #6812): each field typed or picked in the pop-over is written to the label's style, and each
 * field graphty-element varies through a channel of its own (its `labelField`) has the vary glyph
 * beside it, which binds that channel -- on a node label, an edge label and an edge's end caption.
 * The per-element channels are offered with the element's file-styles experiment on.
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
    { id: "1", name: "Alpha", score: 1.5 },
    { id: "2", name: "Beta", score: 2 },
    { id: "3", name: "Gamma", score: 3.25 },
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
    input: "number" | "choice",
    typed: string,
    field: keyof LabelStyle,
    written: unknown,
];

const TYPE_AND_WRAP: readonly FieldSetting[] = [
    ["Italic", "choice", "On", "italic", true],
    ["Letter size", "number", "20", "letterSize", 20],
    ["Rotation", "number", "15", "rotation", 15],
    ["Line alignment", "choice", "Tops", "runAlign", "hanging"],
    ["Wrap width", "number", "5", "wrapWidth", 5],
    ["Max lines", "number", "2", "maxLines", 2],
    ["Ellipsis", "choice", "On", "wrapEllipsis", true],
    ["Wrap anywhere", "choice", "On", "wrapAnywhere", true],
    ["Trailing space", "choice", "On", "wrapTrailingSpace", true],
    ["Space count", "number", "2", "wrapSpaceCount", 2],
    ["Keep blank lines", "choice", "On", "keepBlankLines", true],
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
    await userEvent.tripleClick(within(settings).getByLabelText(name));
    await userEvent.keyboard(`${typed}{Enter}`);
}

/** A channel the vary glyph binds, and the value it is bound to. */
type Varied = readonly [channel: Channel, glyph: string, source: string];

describe("Label settings: Type and Wrap", () => {
    beforeAll(async () => {
        await page.viewport(1440, 900);
    });

    it("writes each Type and Wrap field typed or picked in the pop-over to the label's style", async () => {
        const session = await openWithGraph();
        await addText(session, "node", /^Label(?! at )/, "node.label", "name");
        const settings = await openSettings("node", "Node label settings", "Label settings");
        const style = (): LabelStyle =>
            (writer(session, "node.labelStyle")?.set?.["node.labelStyle"] ?? {}) as LabelStyle;
        for (const setting of TYPE_AND_WRAP) {
            await setField(settings, setting);
            const [word, , , field, written] = setting;
            await waitFor(() => {
                assert.deepEqual(style()[field], written, `${word} writes ${field}`);
            });
        }
    });

    it("varies each Type and Wrap field with a channel of its own by a value, on a node label", async () => {
        const session = await openWithGraph();
        await addText(session, "node", /^Label(?! at )/, "node.label", "name");
        const varied: readonly Varied[] = [
            ["node.labelLetterSize", "Node label letter size", "score"],
            ["node.labelRotation", "Node label rotation", "score"],
            ["node.labelLineHeight", "Node label line height", "score"],
            ["node.labelWrapWidth", "Node label wrap width", "score"],
            ["node.labelWrapSpaceCount", "Node label wrap space count", "score"],
            ["node.labelFont", "Node label font", "name"],
            ["node.labelWeight", "Node label weight", "name"],
            ["node.labelRunAlign", "Node label run align", "name"],
            ["node.labelTextAlign", "Node label text align", "name"],
        ];
        await varyEach(session, "node", ["Node label settings", "Label settings"], varied);
    });

    it("varies an edge label's and an end caption's Type fields by a value", async () => {
        const session = await openWithGraph();
        await addText(session, "edge", /^Label(?! at )/, "edge.label", "weight");
        await varyEach(
            session,
            "edge",
            ["Edge label settings", "Label settings"],
            [
                ["edge.labelLetterSize", "Edge label letter size", "weight"],
                ["edge.labelWrapWidth", "Edge label wrap width", "weight"],
                ["edge.labelFont", "Edge label font", "weight"],
            ],
        );
        await addText(session, "edge", /^Label at target end/, "edge.arrowHeadText", "weight");
        await varyEach(
            session,
            "edge",
            ["Edge label at target end settings", "Label at target end settings"],
            [
                ["edge.arrowHeadTextLetterSize", "Edge label at target end letter size", "weight"],
                ["edge.arrowHeadTextRotation", "Edge label at target end rotation", "weight"],
                ["edge.arrowHeadTextFont", "Edge label at target end font", "weight"],
                ["edge.arrowHeadTextWeight", "Edge label at target end weight", "weight"],
            ],
        );
    });
});

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
        await userEvent.click(
            within(await findValuePicker()).getByRole("option", { name: new RegExp(`^${source}(,|$)`) }),
        );
        await waitFor(() => {
            const binding = writer(session, channel)?.encode?.[channel];
            assert.equal(binding !== undefined && "by" in binding ? binding.by : undefined, `data.${source}`, channel);
        });
    }
}
