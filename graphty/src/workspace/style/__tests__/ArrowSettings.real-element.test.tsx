/**
 * Edges, Arrowheads on the REAL graphty-element, driven by real input (issue #6812): the middle
 * arrows are rows beside Target end and Source end, and every setting of an arrow (width, side,
 * outline width, position, gap, stack, image, label distance; a middle arrow's size, color and
 * opacity) is added from its arrow's own "+" and written to the layer once a value is typed. The
 * element offers them with its file-styles experiment on.
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

// graphty-element offers these arrow settings with its file-styles experiment on.
withFeatures(["file-styles"]);

/** A one-pixel picture, so an arrow's image never reaches the network. */
const PIXEL =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

/** How a setting's value is typed: a number box, words, a color's hex box, or a pick from a list. */
type Input = "number" | "text" | "color" | "choice";

/** One setting: the menu word under its arrow, its channel, what is typed, and what is written. */
type Setting = readonly [word: string, channel: Channel, input: Input, typed: string, written: unknown];

/**
 * An end arrow's settings.
 * @param end - Head (the target end) or Tail (the source end).
 * @returns the settings, in the order the test adds them.
 */
function endSettings(end: "Head" | "Tail"): Setting[] {
    return [
        ["Width", `edge.arrow${end}Width`, "number", "2", 2],
        ["Side", `edge.arrow${end}Side`, "choice", "Left", "left"],
        ["Outline width", `edge.arrow${end}OutlineWidth`, "number", "1", 1],
        ["Position", `edge.arrow${end}Position`, "number", "0.2", 0.2],
        ["Gap", `edge.arrow${end}Gap`, "number", "1", 1],
        ["Stack", `edge.arrow${end}Stack`, "text", "dot normal", "dot normal"],
        ["Image", `edge.arrow${end}Image`, "text", PIXEL, PIXEL],
        ["Label distance", `edge.arrow${end}TextDistance`, "number", "3", 3],
    ] as Setting[];
}

/**
 * A middle arrow's settings.
 * @param end - MiddleHead (toward the target) or MiddleTail (toward the source).
 * @returns the settings, in the order the test adds them.
 */
function middleSettings(end: "MiddleHead" | "MiddleTail"): Setting[] {
    return [
        ["Size", `edge.arrow${end}Size`, "number", "2", 2],
        ["Width", `edge.arrow${end}Width`, "number", "2", 2],
        ["Side", `edge.arrow${end}Side`, "choice", "Right", "right"],
        ["Outline width", `edge.arrow${end}OutlineWidth`, "number", "1", 1],
        ["Position", `edge.arrow${end}Position`, "number", "0.3", 0.3],
        ["Color", `edge.arrow${end}Color`, "color", "0072B2", "#0072B2"],
        ["Opacity", `edge.arrow${end}Opacity`, "number", "50", 0.5],
        ["Image", `edge.arrow${end}Image`, "text", PIXEL, PIXEL],
    ] as Setting[];
}

/**
 * Les Miserables made directed, so Arrowheads' "+" adds, with the starting rows holding the base look.
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
    await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top", data: { directed: true } });
    await session.styles.settled();
    assert.strictEqual(session.data.statistics().directedness, "directed");
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
 * The Arrowheads section of the open Style tab.
 * @returns the section.
 */
function ends(): HTMLElement {
    const found = screen.getByTestId("style-tab").querySelector<HTMLElement>('[data-section="edge-ends"]');
    if (found === null) {
        throw new Error("no Arrowheads section");
    }
    return found;
}

/**
 * A line of the Arrowheads section, once it is drawn.
 * @param channel - the line's property.
 * @returns the line.
 */
async function lineOf(channel: Channel): Promise<HTMLElement> {
    return waitFor(() => {
        const line = ends().querySelector<HTMLElement>(`.ws-row[data-line="${channel}"]`);
        assert.isNotNull(line);
        return line;
    });
}

/**
 * Types a value into a line's field and commits it with Enter.
 * @param line - the line.
 * @param input - how the value is typed.
 * @param typed - what is typed.
 */
async function type(line: HTMLElement, input: Input, typed: string): Promise<void> {
    if (input === "choice") {
        await userEvent.click(within(line).getByRole("combobox"));
        await userEvent.keyboard(`${typed}{Enter}`);
        return;
    }
    const box = line.querySelector<HTMLInputElement>(
        input === "color" ? '[data-testid="compact-color-input-hex"]' : "input",
    );
    if (box === null) {
        throw new Error("no box to type in");
    }
    await userEvent.click(box);
    await userEvent.keyboard(`{Control>}a{/Control}${typed}{Enter}`);
}

/**
 * Adds each setting from its arrow's own "+" and types its value.
 * @param session - the session.
 * @param arrow - the arrow's words, as its "+" is named.
 * @param settings - the settings.
 */
async function addSettings(session: GraphSession, arrow: string, settings: readonly Setting[]): Promise<void> {
    for (const [word, channel, input, typed, value] of settings) {
        const plus = await within(ends()).findByRole("button", { name: `Add to edge ${arrow}` });
        // An arrow's "+" lists its settings not set yet; with one left, it adds it at once.
        const menu = plus.getAttribute("aria-haspopup") === "menu";
        await userEvent.click(plus);
        if (menu) {
            await userEvent.click(await screen.findByRole("menuitem", { name: word }));
        }
        const line = await lineOf(channel);
        assert.equal(line.querySelector(".ws-field-name")?.textContent, word, `${channel} is named under its arrow`);
        assert.isDefined(line.dataset.setting, `${channel} is drawn as its arrow's setting`);
        await type(line, input, typed);
        await waitFor(() => {
            assert.deepEqual(written(session, channel), value, channel);
        });
    }
}

describe("Edges, Arrowheads: every arrow setting has a control", () => {
    it("adds the middle arrows from Arrowheads' '+' and each arrow's settings from its own '+'", async () => {
        const session = await openScene();
        const everything = session.styles
            .list()
            .find((layer) => layer.name === "Everything" && layer.target === "edge");
        if (everything === undefined) {
            throw new Error("no Everything edge layer");
        }
        await session.styles.update(everything.id, {
            set: { ...everything.set, "edge.arrowHead": "normal", "edge.arrowTail": "normal" },
        });
        const tree = await screen.findByRole("tree", { name: "Style layers" });
        await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Everything, / }));
        const inspector = screen.getByRole("complementary", { name: "Inspector" });
        const style = await within(inspector).findByRole("tab", { name: "Style" });
        if (style.getAttribute("aria-selected") !== "true") {
            await userEvent.click(style);
        }
        await showKind("edge");

        // The middle arrows are rows of their own, picked from the same arrow glyphs as the ends.
        // Everything sets both ends already, so Arrowheads' "+" lists the two middle arrows and no
        // arrow's settings; with one left, it adds it at once.
        const plus = (): HTMLElement => within(ends()).getByRole("button", { name: "Add to edge arrowheads" });
        assert.isNull(plus().getAttribute("aria-disabled"), "a directed graph's Arrowheads add");
        await userEvent.click(plus());
        assert.deepEqual(
            (await screen.findAllByRole("menuitem")).map((item) => item.textContent),
            ["Middle to target", "Middle to source"],
        );
        await userEvent.click(await screen.findByRole("menuitem", { name: "Middle to target" }));
        await type(await lineOf("edge.arrowMiddleHead"), "choice", "Tee");
        await waitFor(() => {
            assert.strictEqual(written(session, "edge.arrowMiddleHead"), "tee");
        });
        await userEvent.click(plus());
        await type(await lineOf("edge.arrowMiddleTail"), "choice", "Vee");
        await waitFor(() => {
            assert.strictEqual(written(session, "edge.arrowMiddleTail"), "vee");
        });

        await addSettings(session, "target end", endSettings("Head"));
        await addSettings(session, "source end", endSettings("Tail"));
        await addSettings(session, "middle to target", middleSettings("MiddleHead"));
        await addSettings(session, "middle to source", middleSettings("MiddleTail"));
    });
});
