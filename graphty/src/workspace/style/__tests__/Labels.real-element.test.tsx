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
    { id: "1", name: "Alpha", score: 1.234567 },
    { id: "2", name: "Beta", score: 0.0123456 },
    { id: "3", name: "Gamma", score: 98.7654 },
    { id: "4", name: "Delta", score: 4 },
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
        const glyphs = items.map((item) => item.querySelector("svg")?.getAttribute("class") ?? "");
        assert.notEqual(glyphs[0], glyphs[1], "Label and Tooltip are drawn with different glyphs");
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
        // A new label is sized on screen at 12 px; its look stays what lies beneath, and the canvas
        // key gains no row.
        assert.deepEqual(labelStyle(session), { sizeUnit: "screen" }, "only the size unit is written");
        assert.equal(writer(session, "node.labelSize")?.set?.["node.labelSize"], 12, "a new label is 12 px");
        assert.isNull(within(textList()).queryByRole("button", { name: "Clear Node label look" }), "Look is not set");
        assert.equal(document.querySelectorAll(".ws-legend-section").length, keyRows, "no key row is added");
        assert.isNotNull(
            within(textList()).getByRole("button", { name: "Label source: name" }),
            "the entry names its source",
        );
        // The entry says what kind of text it is, and its controls carry the kind.
        const entry = textList().querySelector<HTMLElement>('[data-line="node.label"]');
        assert.include(entry?.querySelector(".ws-text-kind")?.textContent ?? "", "Label");
        assert.isNotNull(within(textList()).getByRole("combobox", { name: /^Node label look/ }));
        assert.isNotNull(within(textList()).getByRole("combobox", { name: /^Node label position/ }));
        assert.isNotNull(within(textList()).getByRole("button", { name: "Node label size by attribute" }));
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
        await choose("Node label look", "Dark", textList());
        await waitFor(() => {
            assert.equal(labelStyle(session).look, "dark");
            assert.equal(shown("Node label look"), "Dark");
        });
        // Clear takes the look back off.
        await userEvent.click(within(textList()).getByRole("button", { name: "Clear Node label look" }));
        await waitFor(() => {
            assert.isUndefined(labelStyle(session).look);
            assert.equal(shown("Node label look"), "Default");
        });

        // A font of the reader's own makes the look read edited; the font's reset clears it back.
        await userEvent.click(within(textList()).getByRole("button", { name: "Node label settings" }));
        const settings = await screen.findByRole("dialog", { name: "Label settings" });
        await choose("Font", "Serif", settings);
        await waitFor(() => {
            assert.equal(labelStyle(session).font, "serif");
            assert.equal(shown("Node label look"), "Default, edited");
        });
        await userEvent.click(within(settings).getByRole("button", { name: "Reset Font to default" }));
        await waitFor(() => {
            assert.isUndefined(labelStyle(session).font);
            assert.equal(shown("Node label look"), "Default");
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

        await userEvent.click(within(textList()).getByRole("button", { name: "Node label size by attribute" }));
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
        assert.isNotNull(within(textList()).getByRole("button", { name: "Stop varying node label size by data" }));
    });

    it("Escape on a new tooltip's source list leaves the Text list unchanged and returns focus to '+'", async () => {
        const { session } = await openWithGraph();
        await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
        const before = textList().querySelectorAll("[data-line], [data-beneath]").length;
        await userEvent.click(within(textList()).getByRole("button", { name: "Add to node text" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Tooltip/ }));
        await findValuePicker();
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(queryValuePicker());
        });
        await waitFor(() => {
            assert.equal(
                textList().querySelectorAll("[data-line], [data-beneath]").length,
                before,
                "the list is as it was",
            );
            assert.equal(document.activeElement?.getAttribute("aria-label"), "Add to node text", "focus is on '+'");
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
        assert.deepEqual(labelStyle(session), { sizeUnit: "screen" }, "the words, sized on screen");
    });

    it("a label bound to a number prints three significant digits", async () => {
        const { session, element } = await openWithGraph();
        await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
        await userEvent.click(within(textList()).getByRole("button", { name: "Add to node text" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Label/ }));
        await userEvent.click(within(await findValuePicker()).getByRole("option", { name: "score" }));
        await waitFor(
            () => {
                const binding = writer(session, "node.label")?.encode?.["node.label"];
                assert.deepEqual(binding !== undefined && "format" in binding ? binding.format : undefined, {
                    maximumSignificantDigits: 3,
                });
                assert.equal(element.labelOf("1")?.text, "1.23");
                assert.equal(element.labelOf("2")?.text, "0.0123");
                assert.equal(element.labelOf("3")?.text, "98.8");
            },
            { timeout: TIMEOUT_MS },
        );
    });

    it("Label settings starts below the header, shows no gradient editor until a gradient is on, reads what lies beneath, and Escape closes it", async () => {
        await openWithGraph();
        await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
        await userEvent.click(within(textList()).getByRole("button", { name: "Add to node text" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Label/ }));
        await userEvent.click(within(await findValuePicker()).getByRole("option", { name: "name" }));
        const button = await within(textList()).findByRole(
            "button",
            { name: "Node label settings" },
            { timeout: TIMEOUT_MS },
        );
        await userEvent.click(button);
        const settings = await screen.findByRole("dialog", { name: "Label settings" });
        const header = document.querySelector(".ws-header");
        assert.isNotNull(header);
        await waitFor(() => {
            assert.isAtLeast(
                Math.round(settings.getBoundingClientRect().top),
                Math.round(header?.getBoundingClientRect().bottom ?? 0),
                "the pop-out starts below the app header",
            );
        });
        // Gradient is not set: no gradient colors, shape or direction.
        assert.isNull(within(settings).queryByRole("group", { name: "Gradient colors" }));
        assert.isNull(within(settings).queryByRole("combobox", { name: /^Gradient shape/ }));
        // Unset fields read the value beneath, never "Default".
        assert.notInclude(settings.textContent ?? "", "Default", "no field reads Default");
        assert.equal(within(settings).getByRole<HTMLInputElement>("combobox", { name: /^Font(,|$)/ }).value, "Verdana");
        // The groups are headings one level under the pop-out's title.
        assert.deepEqual(
            [...settings.querySelectorAll("h3")].map((h) => h.textContent),
            ["Type", "Box", "Letters", "Placement", "Motion and distance", "Badge"],
        );
        await choose("Gradient", "On", settings);
        await within(settings).findByRole("group", { name: "Gradient colors" }, { timeout: TIMEOUT_MS });

        within(settings)
            .getByRole("combobox", { name: /^Font(,|$)/ })
            .focus();
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Label settings" }), "Escape closes it");
        });
    });
});
