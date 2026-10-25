/**
 * After a style line is written or taken away, on the REAL graphty-element and driven by real keys
 * and clicks, focus stays where the next keystroke belongs: Enter in a new Color box keeps focus in
 * the box (a layer on nodes and edges that the first value turns into a node layer, and a layer
 * made from a condition), with no tooltip over the section's title; a line keeps its place in its
 * section once written; Remove lands on the emptied section's "+"; Undo of Stop varying lands in
 * the restored line; Enter on a Memberships entry lands inside the group's layer.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { Channel } from "@graphty/graphty-element/schema";
import type { GraphSession, Layer, Selector } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { act, render, screen, waitFor, within } from "../../../test/test-utils";
import { INSPECTOR_TITLE_ID } from "../../frame/focus";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { showKind } from "./kindTab";

/** A hang guard for the element coming up and a run finishing, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/**
 * Les Miserables in the workspace with the starting rows.
 * @returns the session.
 */
async function openScene(): Promise<GraphSession> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
    render(<Workspace store={store} />);
    const session = await waitFor(
        () => {
            const found = document.querySelector("graphty-element")?.session;
            assert.isDefined(found);
            return found;
        },
        { timeout: TIMEOUT_MS },
    );
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
    return session;
}

/**
 * Opens a tree row's Style tab by a click on the row.
 * @param name - the row's visible name.
 */
async function openStyle(name: string): Promise<void> {
    const tree = await screen.findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) }));
    const inspector = screen.getByRole("complementary", { name: "Inspector" });
    const style = await within(inspector).findByRole("tab", { name: "Style" });
    if (style.getAttribute("aria-selected") !== "true") {
        await userEvent.click(style);
    }
    await screen.findByTestId("style-tab");
}

/**
 * A line of the Style tab, once drawn.
 * @param channel - its property.
 * @returns the line.
 */
async function lineOf(channel: Channel): Promise<HTMLElement> {
    return waitFor(
        () => {
            const line = document.querySelector<HTMLElement>(
                `[data-testid="style-tab"] .ws-row[data-line="${channel}"]`,
            );
            assert.isNotNull(line, `${channel} drawn`);
            return line;
        },
        { timeout: TIMEOUT_MS },
    );
}

/**
 * Adds a property with a section's "+" (and its menu, when it has one), as a reader does.
 * @param kind - nodes or edges.
 * @param title - the section's title.
 * @param item - the property's name in the menu.
 * @param channel - the property.
 * @returns the new line.
 */
async function addLine(kind: "node" | "edge", title: string, item: string, channel: Channel): Promise<HTMLElement> {
    await userEvent.click(await screen.findByRole("button", { name: `Add to ${kind} ${title}` }));
    const menu = await waitFor(() => {
        const found = screen.queryByRole("menuitem", { name: item });
        const line = document.querySelector(`[data-testid="style-tab"] .ws-row[data-line="${channel}"]`);
        assert.isTrue(found !== null || line !== null, "a menu or the line");
        return found;
    });
    if (menu !== null) {
        await userEvent.click(menu);
    }
    return lineOf(channel);
}

/**
 * Waits until every write has been drawn, then one frame more, so a focus move made after a redraw
 * (in a frame callback) has happened.
 * @param session - the session.
 */
async function drawn(session: GraphSession): Promise<void> {
    await session.styles.settled();
    await document.querySelector("graphty-element")?.waitForStableFrame();
    await new Promise((done) => requestAnimationFrame(done));
}

/**
 * The value the test's own layer, "Paint", writes for a property.
 * @param session - the session.
 * @param channel - the property.
 * @returns the value, or none.
 */
function written(session: GraphSession, channel: Channel): unknown[] {
    return session.styles
        .list()
        .filter((layer: Layer) => layer.set?.[channel] !== undefined && layer.name === "Paint")
        .map((layer: Layer) => layer.set?.[channel]);
}

/**
 * Types a color and Enter into the focused box, and waits for it to be written and drawn.
 * @param session - the session.
 * @param channel - the property.
 * @param typed - the color's words.
 * @param hex - the hex it is written as.
 */
async function typeColor(session: GraphSession, channel: Channel, typed: string, hex: string): Promise<void> {
    await userEvent.keyboard(`${typed}{Enter}`);
    await waitFor(() => {
        assert.include(
            written(session, channel).map((value) => String(value).toUpperCase()),
            hex,
        );
    });
    await drawn(session);
}

/**
 * What has focus, by name, for a failure message.
 * @returns its name.
 */
function focusName(): string {
    const active = document.activeElement;
    return active?.getAttribute("aria-label") ?? active?.textContent ?? "nothing";
}

/**
 * The tooltips on screen.
 * @returns their words.
 */
function tooltips(): string[] {
    return screen.queryAllByRole("tooltip").map((tip) => tip.textContent);
}

const MME: Selector = {
    match: "rule",
    where: { kind: "text", reads: "data.name", mode: "substring", text: "Mme" },
};

describe("focus after a style line is written or removed", () => {
    it.each<[string, Selector]>([
        ["a layer on every node and edge", { match: "everything" }],
        ["a layer made from a condition", MME],
    ])("Enter in a new Color box keeps focus in the box, on %s", async (_, selector) => {
        const session = await openScene();
        await session.styles.addRow({ name: "Paint", target: "both", selector });
        await session.styles.settled();
        await openStyle("Paint");
        await showKind("node");
        await addLine("node", "fill", "Color", "node.color");
        await typeColor(session, "node.color", "purple", "#800080");
        const line = await lineOf("node.color");
        const box = within(line).getByRole("textbox", { name: /^Node color(,|$)/ });
        assert.strictEqual(document.activeElement, box, `focus stays in the color box, not on ${focusName()}`);
        assert.notInclude(tooltips(), "Everything in node fill is set", "no tooltip over Fill");
    });

    it("a line keeps its place in its section once written", async () => {
        const session = await openScene();
        await session.styles.addRow({ name: "Paint", target: "both", selector: { match: "everything" } });
        await session.styles.settled();
        await openStyle("Paint");
        await showKind("edge");
        await addLine("edge", "line", "Width", "edge.width");
        await userEvent.keyboard("3{Enter}");
        await waitFor(() => {
            assert.include(written(session, "edge.width"), 3);
        });
        await drawn(session);
        await addLine("edge", "line", "Color", "edge.color");
        const order = (): string[] =>
            [...document.querySelectorAll<HTMLElement>('[data-section="edge-line"] .ws-row')].map(
                (row) => row.dataset.line ?? "",
            );
        assert.deepEqual(order(), ["edge.width", "edge.color"], "added below Width");
        await typeColor(session, "edge.color", "blue", "#0000FF");
        assert.deepEqual(order(), ["edge.width", "edge.color"], "still below Width once written");
        const box = within(await lineOf("edge.color")).getByRole("textbox", { name: /^Edge color(,|$)/ });
        assert.strictEqual(document.activeElement, box, `focus stays in the color box, not on ${focusName()}`);
    });

    it.each(["Paint", "Everything"])("Remove node color on %s lands on the emptied Fill section's +", async (row) => {
        const session = await openScene();
        await session.styles.addRow({ name: "Paint", target: "both", selector: { match: "everything" } });
        await session.styles.settled();
        await openStyle(row);
        await showKind("node");
        // Everything starts with a color; a layer of the reader's own adds it.
        const set = document.querySelector<HTMLElement>('[data-testid="style-tab"] .ws-row[data-line="node.color"]');
        if (set === null) {
            await addLine("node", "fill", "Color", "node.color");
        } else {
            await userEvent.click(within(set).getByRole("textbox", { name: /^Node color(,|$)/ }));
            await userEvent.keyboard("{Control>}a{/Control}");
        }
        await userEvent.keyboard("red{Enter}");
        await waitFor(() => {
            assert.isNotNull(document.querySelector('.ws-row[data-line="node.color"]:not(:has([data-first-value]))'));
            assert.include(
                document.querySelector<HTMLInputElement>('.ws-row[data-line="node.color"] input')?.value ?? "",
                "FF0000",
            );
        });
        await drawn(session);
        await userEvent.click(within(await lineOf("node.color")).getByRole("button", { name: "Remove node color" }));
        await waitFor(() => {
            assert.isNull(document.querySelector('[data-testid="style-tab"] .ws-row[data-line="node.color"]'));
        });
        await drawn(session);
        assert.strictEqual(focusName(), "Add to node fill");
    });

    it.each([
        ["a line just added", false],
        ["a line already set", true],
    ])("Tab after typing a width moves on to the next control, on %s", async (_, set) => {
        const session = await openScene();
        await session.styles.addRow({ name: "Paint", target: "edge", selector: { match: "everything" } });
        await session.styles.settled();
        await openStyle("Paint");
        await addLine("edge", "line", "Width", "edge.width");
        if (set) {
            await userEvent.keyboard("3{Enter}");
            await waitFor(() => {
                assert.include(written(session, "edge.width"), 3);
            });
            await drawn(session);
        }
        await userEvent.keyboard("24{Tab}");
        await waitFor(() => {
            assert.include(written(session, "edge.width"), 24);
        });
        await drawn(session);
        const box = within(await lineOf("edge.width")).getByRole("spinbutton", { name: /^Edge width/ });
        const active = document.activeElement;
        assert.notStrictEqual(active, box, "focus left the width box");
        assert.isTrue(
            active !== null && (box.compareDocumentPosition(active) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
            `focus is after the width box, not on ${focusName()}`,
        );
        assert.notStrictEqual(active?.getAttribute("role"), "tab", `focus is not on a tab (${focusName()})`);
    });

    it("Tab out of a selection's first color moves on, not to the Style tab", async () => {
        const session = await openScene();
        const valjean = String(session.data.nodes().find((n) => n.name === "Valjean")?.id);
        await act(async () => {
            await session.selection.apply({ nodes: [valjean] });
        });
        await userEvent.click(await screen.findByRole("tab", { name: "Style" }, { timeout: TIMEOUT_MS }));
        await screen.findByTestId("style-tab");
        await showKind("node");
        const before = session.styles.list().length;
        await addLine("node", "fill", "Color", "node.color");
        await userEvent.keyboard("purple{Tab}");

        await waitFor(() => {
            assert.isAbove(session.styles.list().length, before, "the selection's layer is made");
        });
        await drawn(session);
        const box = within(await lineOf("node.color")).getByRole("textbox", { name: /^Node color(,|$)/ });
        const active = document.activeElement;
        assert.notStrictEqual(active?.getAttribute("role"), "tab", `focus is not on a tab (${focusName()})`);
        assert.isTrue(
            active !== null && (box.compareDocumentPosition(active) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
            `focus is after the color box, not on ${focusName()}`,
        );
    });

    it.each(["Paint", "Everything"])(
        "Remove a line with Enter on %s lands on its section's +, so a second Enter removes nothing",
        async (row) => {
            const session = await openScene();
            await session.styles.addRow({ name: "Paint", target: "both", selector: { match: "everything" } });
            await session.styles.settled();
            await openStyle(row);
            await showKind("edge");
            const has = (channel: Channel): boolean =>
                document.querySelector(`[data-testid="style-tab"] .ws-row[data-line="${channel}"]`) !== null;
            if (!has("edge.color")) {
                await addLine("edge", "line", "Color", "edge.color");
                await typeColor(session, "edge.color", "blue", "#0000FF");
            }
            if (!has("edge.width")) {
                await addLine("edge", "line", "Width", "edge.width");
                await userEvent.keyboard("3{Enter}");
            }
            await waitFor(() => {
                assert.isTrue(has("edge.color") && has("edge.width"));
            });
            await drawn(session);
            const lines = (): string[] =>
                [...document.querySelectorAll<HTMLElement>('[data-section="edge-line"] .ws-row')].map(
                    (line) => line.dataset.line ?? "",
                );
            assert.isBelow(lines().indexOf("edge.color"), lines().indexOf("edge.width"), "Width is below Color");
            within(await lineOf("edge.color"))
                .getByRole("button", { name: "Remove edge color" })
                .focus();
            await userEvent.keyboard("{Enter}");
            await waitFor(() => {
                assert.isFalse(has("edge.color"));
            });
            await drawn(session);
            assert.strictEqual(focusName(), "Add to edge line");
            assert.isTrue(has("edge.width"), "Width is still set");
        },
    );

    it.each([
        ["width", "edge.width", "3", "24", /^Edge width/, "spinbutton"],
        ["color", "edge.color", "blue", "red", /^Edge color(,|$)/, "textbox"],
    ] as const)(
        "Escape after typing in a %s box says the discard and draws nothing (Figma)",
        async (_, channel, first, typed, name, role) => {
            const session = await openScene();
            await session.styles.addRow({ name: "Paint", target: "edge", selector: { match: "everything" } });
            await session.styles.settled();
            await openStyle("Paint");
            await addLine("edge", "line", channel === "edge.width" ? "Width" : "Color", channel);
            await userEvent.keyboard(`${first}{Enter}`);
            await waitFor(() => {
                assert.lengthOf(written(session, channel), 1);
            });
            await drawn(session);
            const box = within(await lineOf(channel)).getByRole(role, { name });
            await userEvent.keyboard(`${typed}{Escape}`);
            assert.strictEqual(document.activeElement, box, `focus stays in the box, not on ${focusName()}`);
            const line = await lineOf(channel);
            const kept = channel === "edge.width" ? "3" : "0000FF";
            const words = `Edit discarded; this stays ${kept}.`;
            await waitFor(() => {
                const said = within(line)
                    .getAllByRole("status")
                    .map((status) => status.textContent);
                assert.include(said, words, "said aloud");
                const shown = within(line)
                    .getAllByText(words)
                    .filter(
                        (node) => node.getAttribute("role") !== "status" && node.getBoundingClientRect().height > 1,
                    );
                assert.lengthOf(shown, 0, "nothing drawn, as in Figma");
            });
        },
    );

    it("Control+Z after Stop varying lands in the restored line", async () => {
        const session = await openScene();
        await session.styles.add({
            name: "Paint",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.color": { by: "data.name" } },
        });
        await session.styles.settled();
        await openStyle("Paint");
        await userEvent.click(await screen.findByRole("button", { name: "Stop varying node color by data" }));
        await waitFor(() => {
            assert.lengthOf(written(session, "node.color"), 1, "one color again");
        });
        await drawn(session);
        await userEvent.keyboard("{Control>}z{/Control}");
        await waitFor(() => {
            assert.deepEqual(written(session, "node.color"), [], "the binding is back");
        });
        await drawn(session);
        const line = await lineOf("node.color");
        assert.isTrue(
            line.querySelector(".ws-field-control")?.contains(document.activeElement) === true,
            `focus in the restored line's box, not on ${focusName()}`,
        );
    });

    it("Enter on a Memberships entry lands inside the group's layer", async () => {
        const session = await openScene();
        await session.runs.start("louvain", {}, { seed: 1, style: { groups: "layers", name: "Louvain" } });
        await session.styles.settled();
        const valjean = String(session.data.nodes().find((n) => n.name === "Valjean")?.id);
        await act(async () => {
            await session.selection.apply({ nodes: [valjean] });
        });
        await userEvent.click(await screen.findByRole("tab", { name: "Values" }, { timeout: TIMEOUT_MS }));
        const memberships = await screen.findByRole("heading", { name: "Memberships" });
        const section = memberships.closest("section") ?? document.body;
        const entry = within(section).getByRole("button", { name: /^Louvain/ });
        entry.focus();
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.equal(document.querySelector("[data-inspected]")?.getAttribute("data-inspected"), "layer-row");
        });
        await drawn(session);
        const title = document.getElementById(INSPECTOR_TITLE_ID);
        assert.strictEqual(document.activeElement, title, `focus on the layer's heading, not on ${focusName()}`);
        const said = entry.textContent;
        const heard = title?.getAttribute("aria-label") ?? title?.textContent ?? "";
        assert.isTrue(heard !== "" && said.includes(title?.textContent ?? "?"), `"${heard}" names "${said}"`);
    });
});
