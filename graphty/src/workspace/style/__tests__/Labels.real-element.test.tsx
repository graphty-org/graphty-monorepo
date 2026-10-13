/**
 * Label entries in the Style tab's Text list, on the REAL graphty-element, driven by real input:
 * the "+" menu (also opened by the empty list's title), the source picker, the look select, the
 * Label settings popover, the entry's eye, a label written beneath shown as a gray line, and the
 * size's vary glyph. Every assertion reads what the element reports: the layer stack, the label
 * the element draws, and the bindings.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { LabelStyle } from "@graphty/graphty-element/schema";
import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { findValuePicker, queryValuePicker, render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and painting, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

const NODES = [
    { id: "1", name: "Alpha" },
    { id: "2", name: "Beta" },
    { id: "3", name: "Gamma" },
    { id: "4", name: "Delta" },
];
const EDGES = [
    { source: "1", target: "2" },
    { source: "2", target: "3" },
    { source: "3", target: "4" },
    { source: "4", target: "1" },
    { source: "1", target: "3" },
];

/** The workspace with a project open, the element's session, its element and the store. */
interface Opened {
    readonly session: GraphSession;
    readonly element: HTMLElementTagNameMap["graphty-element"];
    readonly store: WorkspaceStore;
}

/**
 * Renders the workspace on the Everything row, waits for the element and loads the graph.
 * @returns the session, the element and the store.
 */
async function openWithGraph(): Promise<Opened> {
    const store = createWorkspaceStore({ project: { name: "Ring", id: 1 }, inspected: { kind: "everything-row" } });
    render(<Workspace store={store} />);
    let found: HTMLElementTagNameMap["graphty-element"] | null = null;
    await waitFor(
        () => {
            found = document.querySelector("graphty-element");
            assert.isDefined(found?.session);
        },
        { timeout: TIMEOUT_MS },
    );
    if (found === null) {
        throw new Error("the element never came up");
    }
    const element: HTMLElementTagNameMap["graphty-element"] = found;
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges(EDGES);
    return { session: element.session, element, store };
}

/**
 * The Text list of the Style tab.
 * @returns the list.
 */
function textList(): HTMLElement {
    // The Nodes group's list: the Edges group draws a Text list of its own.
    const nodes = screen.getByTestId("style-tab").querySelector<HTMLElement>('[data-group="node"]');
    if (nodes === null) {
        throw new Error("the Style tab draws no Nodes group");
    }
    return within(nodes).getByRole("group", { name: "Node text" });
}

/**
 * The reader's layer that writes a node channel.
 * @param session - the element's session.
 * @param channel - the channel.
 * @returns the layer, if any.
 */
function writer(
    session: GraphSession,
    channel: "node.label" | "node.labelStyle" | "node.labelSize",
): Layer | undefined {
    return session.styles
        .list()
        .filter((l) => l.source.by !== "element")
        .find((l) => l.set?.[channel] !== undefined || l.encode?.[channel] !== undefined);
}

/**
 * The label style the reader's layers write.
 * @param session - the element's session.
 * @returns the style.
 */
function labelStyle(session: GraphSession): LabelStyle {
    return (writer(session, "node.labelStyle")?.set?.["node.labelStyle"] ?? {}) as LabelStyle;
}

/**
 * Picks an option of a select by real clicks.
 * @param name - the select's name.
 * @param option - the option's name.
 * @param within_ - where the select is.
 */
async function choose(name: string, option: string, within_: HTMLElement): Promise<void> {
    await userEvent.click(within(within_).getByRole("combobox", { name: new RegExp(`^${name}(,|$)`) }));
    await userEvent.click(await screen.findByRole("option", { name: option }));
}

/**
 * What a select shows.
 * @param name - the select's name.
 * @returns its text.
 */
function shown(name: string): string {
    return within(textList()).getByRole<HTMLInputElement>("combobox", { name: new RegExp(`^${name}(,|$)`) }).value;
}

describe("label entries on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("'+' lists Label and Tooltip; Label picks a source and writes only it; a look applies; a font edit reads edited and its reset clears it", async () => {
        const { session, element } = await openWithGraph();
        await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
        const keyRows = document.querySelectorAll(".ws-legend-section").length;

        await userEvent.click(within(textList()).getByRole("button", { name: "Add to node text" }));
        const items = await screen.findAllByRole("menuitem");
        assert.deepEqual(
            items.map((item) => item.textContent),
            ["Label", "Tooltip"],
            "the Text menu lists both kinds of node text",
        );
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Label/ }));
        // Nothing is written before a source is picked.
        assert.isUndefined(writer(session, "node.label"));
        const list = await findValuePicker();
        await userEvent.click(within(list).getByRole("option", { name: "name" }));

        await waitFor(
            () => {
                const binding = writer(session, "node.label")?.encode?.["node.label"];
                assert.equal(binding !== undefined && "by" in binding ? binding.by : undefined, "data.name");
                assert.equal(element.labelOf("1")?.text, "Alpha", "the nodes are labeled by name");
            },
            { timeout: TIMEOUT_MS },
        );
        // Only the source is written: the look and the size stay what lies beneath (no reset on
        // either), and the canvas key gains no row.
        assert.isUndefined(writer(session, "node.labelStyle"), "no look is written");
        assert.isUndefined(writer(session, "node.labelSize"), "no size is written");
        assert.isNull(within(textList()).queryByRole("button", { name: /^Reset Look/ }), "Look is not set");
        assert.isNull(within(textList()).queryByRole("button", { name: /^Reset Size/ }), "Size is not set");
        assert.equal(document.querySelectorAll(".ws-legend-section").length, keyRows, "no key row is added");
        assert.isNotNull(
            within(textList()).getByRole("button", { name: "Label source: name" }),
            "the entry names its source",
        );
        // A second label cannot be added: with only Tooltip left, "+" is Tooltip's own button.
        const plus = within(textList()).getByRole("button", { name: "Add tooltip" });
        await userEvent.hover(plus);
        // The theme's tooltips open after a second, mounted hidden until then.
        await waitFor(
            () => {
                const tips = screen.queryAllByRole("tooltip", { hidden: true }).map((tip) => tip.textContent);
                assert.include(tips, "Add tooltip", "its tooltip is its name");
            },
            { timeout: 5000 },
        );
        await userEvent.unhover(plus);

        // Picking a look applies it.
        await choose("Look", "Dark", textList());
        await waitFor(() => {
            assert.equal(labelStyle(session).look, "dark");
            assert.equal(shown("Look"), "Dark");
        });
        await choose("Look", "Default", textList());
        await waitFor(() => {
            assert.equal(shown("Look"), "Default");
        });

        // A font of the reader's own makes the look read edited; the font's reset clears it back.
        await userEvent.click(within(textList()).getByRole("button", { name: "Label settings" }));
        const settings = await screen.findByRole("dialog", { name: "Label settings" });
        await choose("Font", "Serif", settings);
        await waitFor(() => {
            assert.equal(labelStyle(session).font, "serif");
            assert.equal(shown("Look"), "Default, edited");
        });
        await userEvent.click(within(settings).getByRole("button", { name: "Reset Font to default" }));
        await waitFor(() => {
            assert.isUndefined(labelStyle(session).font);
            assert.equal(shown("Look"), "Default");
        });
    });

    it("the entry's eye off removes its labels from the canvas, and the minus removes the entry", async () => {
        const { session, element } = await openWithGraph();
        await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
        await userEvent.click(within(textList()).getByRole("button", { name: "Add to node text" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Label/ }));
        await userEvent.click(within(await findValuePicker()).getByRole("option", { name: "name" }));
        await waitFor(
            () => {
                assert.equal(element.labelOf("2")?.text, "Beta");
            },
            { timeout: TIMEOUT_MS },
        );

        await userEvent.click(within(textList()).getByRole("button", { name: "Hide label" }));
        await waitFor(
            () => {
                assert.isFalse(labelStyle(session).enabled);
                assert.notEqual(element.labelOf("2")?.drawn, true, "the label is gone from the canvas");
            },
            { timeout: TIMEOUT_MS },
        );

        await userEvent.click(within(textList()).getByRole("button", { name: "Remove label" }));
        await waitFor(() => {
            assert.isUndefined(writer(session, "node.label"));
            assert.isUndefined(writer(session, "node.labelStyle"));
            assert.isNull(within(textList()).queryByRole("button", { name: "Hide label" }));
        });
    });

    it("a label written beneath shows as a gray line; its eye adds an entry here that hides it on the canvas", async () => {
        const { session, element, store } = await openWithGraph();
        const names = await session.styles.encode({ column: { kind: "node", name: "name" }, channel: "node.label" });
        const top = await session.styles.add({
            name: "Top",
            target: "node",
            selector: { match: "everything" },
            set: { "node.opacity": 1 },
        });
        store.set({ inspected: { kind: "layer-row", id: top.id } });
        await waitFor(
            () => {
                assert.isNotNull(within(textList()).getByText(`Label, from ${names.name}`));
                assert.equal(element.labelOf("3")?.text, "Gamma");
            },
            { timeout: TIMEOUT_MS },
        );

        await userEvent.click(within(textList()).getByRole("button", { name: `Hide label from ${names.name}` }));
        await waitFor(
            () => {
                assert.deepEqual(session.styles.get(top.id)?.set?.["node.labelStyle"], { enabled: false });
                assert.notEqual(element.labelOf("3")?.drawn, true, "the label beneath is covered");
                // The entry is now this layer's own, with its minus.
                assert.isNotNull(within(textList()).getByRole("button", { name: "Remove label" }));
            },
            { timeout: TIMEOUT_MS },
        );
    });

    it("the size's vary glyph binds label size to degree", async () => {
        const { session } = await openWithGraph();
        const { runId } = await session.runs.start("degree");
        await session.styles.settled();
        await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
        await userEvent.click(within(textList()).getByRole("button", { name: "Add to node text" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Label/ }));
        await userEvent.click(within(await findValuePicker()).getByRole("option", { name: "name" }));
        await waitFor(() => {
            assert.isDefined(writer(session, "node.label"));
        });

        await userEvent.click(within(textList()).getByRole("button", { name: "Label size by attribute" }));
        const list = await findValuePicker();
        await userEvent.click(within(list).getByRole("option", { name: "Degree" }));
        const path = session.results.path(runId);
        await waitFor(
            () => {
                const size = writer(session, "node.labelSize")?.encode?.["node.labelSize"];
                assert.equal(size !== undefined && "by" in size ? size.by : undefined, path);
            },
            { timeout: TIMEOUT_MS },
        );
        assert.isNotNull(within(textList()).getByRole("button", { name: "Detach label size" }));
    });

    it("Escape on a new tooltip's source list leaves the Text list unchanged", async () => {
        const { session } = await openWithGraph();
        await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
        const before = textList().innerHTML;
        await userEvent.click(within(textList()).getByRole("button", { name: "Add to node text" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Tooltip/ }));
        await findValuePicker();
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(queryValuePicker());
        });
        await waitFor(() => {
            assert.equal(textList().innerHTML, before, "the list is as it was");
        });
        assert.isUndefined(
            session.styles
                .list()
                .filter((l) => l.source.by !== "element")
                .find((l) => l.set?.["node.tooltip"] !== undefined || l.encode?.["node.tooltip"] !== undefined),
            "nothing is written",
        );
    });

    it("Tab crosses one stop per add action: Text's '+' then Effects' '+'", async () => {
        await openWithGraph();
        await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
        const nodes = screen.getByTestId("style-tab").querySelector<HTMLElement>('[data-group="node"]');
        if (nodes === null) {
            throw new Error("the Style tab draws no Nodes group");
        }
        within(textList()).getByRole("button", { name: "Add to node text" }).focus();
        await userEvent.keyboard("{Tab}");
        assert.equal(
            document.activeElement?.getAttribute("aria-label"),
            "Add to node effects",
            "the next stop is the Effects '+', not a list title",
        );
        await userEvent.keyboard("{Tab}");
        assert.isFalse(nodes.contains(document.activeElement), "the Effects '+' is the Nodes group's last stop");
    });

    it("a label of fixed text: Fixed text, type Hello, and the canvas label reads Hello", async () => {
        const { session, element } = await openWithGraph();
        await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
        await userEvent.click(within(textList()).getByRole("button", { name: "Add to node text" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Label/ }));
        const list = await findValuePicker();
        await userEvent.click(within(list).getByRole("option", { name: "Fixed text" }));
        const field = await within(textList()).findByRole("textbox", { name: "Node label text" });
        await waitFor(() => {
            assert.equal(document.activeElement, field, "focus lands in the words field");
        });
        assert.isUndefined(writer(session, "node.label"), "nothing is written before the words are typed");
        await userEvent.keyboard("Hello{Enter}");
        await waitFor(
            () => {
                assert.equal(writer(session, "node.label")?.set?.["node.label"], "Hello");
                assert.equal(element.labelOf("1")?.text, "Hello", "the canvas label reads Hello");
            },
            { timeout: TIMEOUT_MS },
        );
        assert.isUndefined(writer(session, "node.labelStyle"), "only the words are written");
    });
});
