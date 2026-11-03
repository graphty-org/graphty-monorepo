/**
 * Label entries in the Style tab's Text list, on the REAL graphty-element, driven by real input:
 * the "+" menu (also opened by the empty list's title), the source picker, the look select, the
 * Label settings popover, the entry's eye, a label written beneath drawn as nothing here, and the
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
import { showKind } from "./kindTab";

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
    await waitFor(() => {
        found = document.querySelector("graphty-element");
        assert.isDefined(found?.session);
    });
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
    return within(nodes).getByRole("group", { name: "Text" });
}

/**
 * The Text list of the Style tab's Edges group, looked up afresh: a write can redraw the tab.
 * @returns the list.
 */
function edgeTextList(): HTMLElement {
    const edges = screen.getByTestId("style-tab").querySelector<HTMLElement>('[data-group="edge"]');
    if (edges === null) {
        throw new Error("the Style tab draws no Edges group");
    }
    return within(edges).getByRole("group", { name: "Text" });
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

    it("'+' lists Label, Card and Tooltip; Label picks a source and writes only it; a look applies; a font edit reads edited and its reset clears it", async () => {
        const { session, element } = await openWithGraph();
        await screen.findByTestId("style-tab", {});
        const keyRows = document.querySelectorAll(".ws-legend-section").length;

        await userEvent.click(within(textList()).getByRole("button", { name: "Add to node text" }));
        const items = await screen.findAllByRole("menuitem");
        assert.deepEqual(
            items.map((item) => item.textContent),
            ["Label", "Card", "Tooltip"],
            "the Text menu lists both kinds of node text, and a label as a card",
        );
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Label(?! at )/ }));
        // Nothing is written before a source is picked.
        assert.isUndefined(writer(session, "node.label"));
        const list = await findValuePicker();
        await userEvent.click(within(list).getByRole("option", { name: /^name(,|$)/ }));

        await waitFor(() => {
            const binding = writer(session, "node.label")?.encode?.["node.label"];
            assert.equal(binding !== undefined && "by" in binding ? binding.by : undefined, "data.name");
            assert.equal(element.labelOf("1")?.text, "Alpha", "the nodes are labeled by name");
        });
        // Only the words are written: no size, unit or look comes with them, and the canvas key
        // gains no row.
        assert.isUndefined(writer(session, "node.labelStyle"), "no label style is written");
        assert.isUndefined(writer(session, "node.labelSize"), "no label size is written");
        assert.isNull(within(textList()).queryByRole("combobox", { name: /^Node label look/ }), "Look is not set");
        assert.equal(document.querySelectorAll(".ws-legend-section").length, keyRows, "no key row is added");
        assert.isNotNull(
            within(textList()).getByRole("button", { name: "Label source: name" }),
            "the entry names its source",
        );
        // The entry says what kind of text it is, and its controls carry the kind.
        const entry = textList().querySelector<HTMLElement>('[data-line="node.label"]');
        assert.include(entry?.querySelector(".ws-text-kind")?.textContent ?? "", "Label");
        // Only what the entry sets is drawn: no size, look or position it does not set.
        assert.isNull(within(textList()).queryByRole("combobox", { name: /^Node label position/ }));
        assert.isNull(within(textList()).queryByRole("button", { name: "Node label size by attribute" }));
        // "+" now offers Tooltip and the label's look, size and position, never a second label.
        await userEvent.click(within(textList()).getByRole("button", { name: "Add to node text" }));
        assert.deepEqual(
            (await screen.findAllByRole("menuitem")).map((item) => item.textContent),
            ["Label look", "Label size", "Label position", "Tooltip"],
        );
        await userEvent.click(await screen.findByRole("menuitem", { name: "Label look" }));
        await within(textList()).findByRole("combobox", { name: /^Node label look/ });

        // Picking a look applies it.
        await choose("Node label look", "Dark", textList());
        await waitFor(() => {
            assert.equal(labelStyle(session).look, "dark");
            assert.equal(shown("Node label look"), "Dark");
        });
        // A font of the reader's own makes the look read edited; the font's reset clears it back.
        await userEvent.click(within(textList()).getByRole("button", { name: "Node label settings" }));
        const settings = await screen.findByRole("dialog", { name: "Label settings" });
        await choose("Font", "Serif", settings);
        await waitFor(() => {
            assert.equal(labelStyle(session).font, "serif");
            assert.equal(shown("Node label look"), "Dark, edited");
        });
        await userEvent.click(within(settings).getByRole("button", { name: "Reset Font to default" }));
        await waitFor(() => {
            assert.isUndefined(labelStyle(session).font);
            assert.equal(shown("Node label look"), "Dark");
        });
        await userEvent.keyboard("{Escape}");

        // The minus takes the look back off, and its line with it.
        await userEvent.click(within(textList()).getByRole("button", { name: "Remove node label look" }));
        await waitFor(() => {
            assert.isUndefined(labelStyle(session).look);
            assert.isNull(within(textList()).queryByRole("combobox", { name: /^Node label look/ }));
        });
    });

    it("the entry's eye off removes its labels from the canvas, and the minus removes the entry", async () => {
        const { session, element } = await openWithGraph();
        await screen.findByTestId("style-tab", {});
        await userEvent.click(within(textList()).getByRole("button", { name: "Add to node text" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Label(?! at )/ }));
        await userEvent.click(within(await findValuePicker()).getByRole("option", { name: /^name(,|$)/ }));
        await waitFor(() => {
            assert.equal(element.labelOf("2")?.text, "Beta");
        });

        await userEvent.click(within(textList()).getByRole("button", { name: "Hide label" }));
        await waitFor(() => {
            assert.isFalse(labelStyle(session).enabled);
            assert.notEqual(element.labelOf("2")?.drawn, true, "the label is gone from the canvas");
        });

        await userEvent.click(within(textList()).getByRole("button", { name: "Remove label" }));
        await waitFor(() => {
            assert.isUndefined(writer(session, "node.label"));
            assert.isUndefined(writer(session, "node.labelStyle"));
            assert.isNull(within(textList()).queryByRole("button", { name: "Hide label" }));
        });
    });

    it("a label written beneath draws nothing on this row: Text stays its dimmed title and '+'", async () => {
        const { session, element, store } = await openWithGraph();
        await session.styles.encode({ column: { kind: "node", name: "name" }, channel: "node.label" });
        const top = await session.styles.add({
            name: "Top",
            target: "node",
            selector: { match: "everything" },
            set: { "node.opacity": 1 },
        });
        store.set({ inspected: { kind: "layer-row", id: top.id } });
        await waitFor(() => {
            assert.equal(element.labelOf("3")?.text, "Gamma");
            assert.isNotNull(textList().closest('[data-empty="true"]'), "Text is dimmed");
        });
        assert.isNull(textList().querySelector("[data-line]"), "no entry from beneath");
        assert.notInclude(textList().textContent ?? "", "from", "no line names a layer beneath");
    });

    it("the size's vary glyph binds label size to degree", async () => {
        const { session } = await openWithGraph();
        const { runId } = await session.runs.start("degree");
        await session.styles.settled();
        await screen.findByTestId("style-tab", {});
        await userEvent.click(within(textList()).getByRole("button", { name: "Add to node text" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Label(?! at )/ }));
        await userEvent.click(within(await findValuePicker()).getByRole("option", { name: /^name(,|$)/ }));
        await waitFor(() => {
            assert.isDefined(writer(session, "node.label"));
        });
        await userEvent.click(within(textList()).getByRole("button", { name: "Add to node text" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Label size" }));

        await userEvent.click(await within(textList()).findByRole("button", { name: "Node label size by attribute" }));
        const list = await findValuePicker();
        await userEvent.click(within(list).getByRole("option", { name: /^Degree(,|$)/ }));
        const path = session.results.path(runId);
        await waitFor(() => {
            const size = writer(session, "node.labelSize")?.encode?.["node.labelSize"];
            assert.equal(size !== undefined && "by" in size ? size.by : undefined, path);
        });
        assert.isNotNull(within(textList()).getByRole("button", { name: "Stop varying node label size by data" }));
    });

    it("Escape on a new tooltip's source list leaves the Text list unchanged and returns focus to '+'", async () => {
        const { session } = await openWithGraph();
        await screen.findByTestId("style-tab", {});
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

    it("Tab crosses one stop per section: Text's '+' then Fill's '+'", async () => {
        await openWithGraph();
        await screen.findByTestId("style-tab", {});
        const nodes = screen.getByTestId("style-tab").querySelector<HTMLElement>('[data-group="node"]');
        if (nodes === null) {
            throw new Error("the Style tab draws no Nodes group");
        }
        within(textList()).getByRole("button", { name: "Add to node text" }).focus();
        await userEvent.keyboard("{Tab}");
        assert.equal(
            document.activeElement?.getAttribute("aria-label"),
            "Add to node fill",
            "the next stop is the next section's '+', not a section title",
        );
    });

    it("a label of fixed text: Fixed text, type Hello, and the canvas label reads Hello", async () => {
        const { session, element } = await openWithGraph();
        await screen.findByTestId("style-tab", {});
        await userEvent.click(within(textList()).getByRole("button", { name: "Add to node text" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Label(?! at )/ }));
        const list = await findValuePicker();
        await userEvent.click(within(list).getByRole("option", { name: "Fixed text" }));
        const field = await within(textList()).findByRole("textbox", { name: "Node label text" });
        await waitFor(() => {
            assert.equal(document.activeElement, field, "focus lands in the words field");
        });
        assert.isUndefined(writer(session, "node.label"), "nothing is written before the words are typed");
        await userEvent.keyboard("Hello{Enter}");
        await waitFor(() => {
            assert.equal(writer(session, "node.label")?.set?.["node.label"], "Hello");
            assert.equal(element.labelOf("1")?.text, "Hello", "the canvas label reads Hello");
        });
        assert.isUndefined(writer(session, "node.labelStyle"), "the words alone: no style");
        assert.isUndefined(writer(session, "node.labelSize"), "the words alone: no size");
    });

    it("an edge label of fixed text writes only its words, adds no Size line, and its kind reads whole", async () => {
        const { session } = await openWithGraph();
        await screen.findByTestId("style-tab", {});
        await showKind("edge");
        await userEvent.click(within(edgeTextList()).getByRole("button", { name: "Add to edge text" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Label(?! at )/ }));
        await userEvent.click(within(await findValuePicker()).getByRole("option", { name: "Fixed text" }));
        await within(edgeTextList()).findByRole("textbox", { name: "Edge label text" });
        await userEvent.keyboard("Bob{Enter}");
        const mine = (): Layer[] => session.styles.list().filter((l) => l.source.by !== "element");
        await waitFor(() => {
            assert.equal(mine().find((l) => l.set?.["edge.label"] !== undefined)?.set?.["edge.label"], "Bob");
        });
        for (const channel of ["edge.labelStyle", "edge.labelSize"] as const) {
            assert.isUndefined(
                mine().find((l) => l.set?.[channel] !== undefined || l.encode?.[channel] !== undefined),
                `${channel} is not written with the words`,
            );
        }
        // The entry's kind sits whole in the label column, not cut to "La...", and no Size line is drawn.
        await waitFor(() => {
            const list = edgeTextList();
            const kind = list.querySelector<HTMLElement>('[data-line="edge.label"] .ws-text-kind .ws-field-name');
            assert.equal(kind?.textContent, "Label");
            assert.isAtMost(kind?.scrollWidth ?? 1, kind?.clientWidth ?? 0, "the word 'Label' is not cut");
            assert.isNull(within(list).queryByRole("button", { name: "Edge label size by attribute" }), "no Size line");
        });
    });

    it("a label bound to a number prints three significant digits", async () => {
        const { session, element } = await openWithGraph();
        await screen.findByTestId("style-tab", {});
        await userEvent.click(within(textList()).getByRole("button", { name: "Add to node text" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Label(?! at )/ }));
        await userEvent.click(within(await findValuePicker()).getByRole("option", { name: /^score(,|$)/ }));
        await waitFor(() => {
            const binding = writer(session, "node.label")?.encode?.["node.label"];
            assert.deepEqual(binding !== undefined && "format" in binding ? binding.format : undefined, {
                maximumSignificantDigits: 3,
            });
            assert.equal(element.labelOf("1")?.text, "1.23");
            assert.equal(element.labelOf("2")?.text, "0.0123");
            assert.equal(element.labelOf("3")?.text, "98.8");
        });
    });

    it("Label settings starts below the header, shows no gradient editor until a gradient is on, reads what lies beneath, and Escape closes it", async () => {
        await openWithGraph();
        await screen.findByTestId("style-tab", {});
        await userEvent.click(within(textList()).getByRole("button", { name: "Add to node text" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Label(?! at )/ }));
        await userEvent.click(within(await findValuePicker()).getByRole("option", { name: /^name(,|$)/ }));
        const button = await within(textList()).findByRole("button", { name: "Node label settings" });
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
        // Drawn, not held: the font beneath is the unset field's placeholder.
        const font = within(settings).getByRole<HTMLInputElement>("combobox", { name: /^Font(,|$)/ });
        assert.equal(font.value, "", "no font is set here");
        assert.equal(font.placeholder, "Verdana");
        // The groups are headings one level under the pop-out's title.
        assert.deepEqual(
            [...settings.querySelectorAll("h3")].map((h) => h.textContent),
            ["Type", "Box", "Letters", "Placement", "Motion and distance", "Badge"],
        );
        await choose("Gradient", "On", settings);
        await within(settings).findByRole("group", { name: "Gradient colors" });

        within(settings)
            .getByRole("combobox", { name: /^Font(,|$)/ })
            .focus();
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Label settings" }), "Escape closes it");
        });
    });
});

describe("a label entry's size, keys, lists and widths", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    /**
     * Adds a node label read from `name` and waits for it.
     * @param session - the element's session.
     */
    async function addNameLabel(session: GraphSession): Promise<void> {
        await screen.findByTestId("style-tab", {});
        await userEvent.click(within(textList()).getByRole("button", { name: "Add to node text" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Label(?! at )/ }));
        await userEvent.click(within(await findValuePicker()).getByRole("option", { name: /^name(,|$)/ }));
        await waitFor(() => {
            assert.isDefined(writer(session, "node.label"));
        });
    }

    /**
     * Opens the node label's settings.
     * @returns the pop-out.
     */
    async function openSettings(): Promise<HTMLElement> {
        await userEvent.click(await within(textList()).findByRole("button", { name: "Node label settings" }));
        return screen.findByRole("dialog", { name: "Label settings" });
    }

    it("Label settings has the text size beside 'Size in', and a size typed there is the size drawn", async () => {
        const { session } = await openWithGraph();
        await addNameLabel(session);
        const settings = await openSettings();
        const size = within(settings).getByLabelText<HTMLInputElement>(/^Size(,|$)/);
        const unit = within(settings).getByRole("combobox", { name: /^Size in(,|$)/ });
        assert.equal(
            size.closest(".mantine-SimpleGrid-root"),
            unit.closest(".mantine-SimpleGrid-root"),
            "the size and its unit share a line",
        );
        assert.equal(size.value, "48", "an unset size reads the size drawn");
        // Read as the default it is, never as "not set, 48"; on screen it says its unit.
        assert.equal(size.getAttribute("aria-label"), "Size, default 48");
        await choose("Size in", "Screen pixels", settings);
        await waitFor(() => {
            assert.equal(
                within(settings)
                    .getByLabelText<HTMLInputElement>(/^Size(,|$)/)
                    .getAttribute("aria-label"),
                "Size, default 48 px",
            );
        });
        await userEvent.tripleClick(size);
        await userEvent.keyboard("14{Enter}");
        await waitFor(() => {
            assert.equal(labelStyle(session).sizePx, 14);
            assert.equal(labelStyle(session).sizeMode, "screen");
        });
    });

    it("Escape after typing in the settings' Size box keeps the settings open and says the discard", async () => {
        const { session } = await openWithGraph();
        await addNameLabel(session);
        const settings = await openSettings();
        const size = within(settings).getByLabelText<HTMLInputElement>(/^Size(,|$)/);
        await userEvent.click(size);
        await userEvent.keyboard("96{Escape}");
        assert.isNotNull(screen.queryByRole("dialog", { name: "Label settings" }), "the settings stay open");
        const field = within(settings).getByLabelText<HTMLInputElement>(/^Size(,|$)/);
        assert.equal(document.activeElement, field, "focus stays in the Size box");
        assert.equal(field.value, "48", "the typing is taken back");
        assert.include(
            within(settings)
                .getAllByRole("status")
                .map((status) => status.textContent),
            "Edit discarded; this stays 48.",
        );
        assert.isUndefined(labelStyle(session).sizePx, "nothing is written");
    });

    it("Escape in a settings field takes back the typing and keeps focus; Escape on a Reset closes the settings", async () => {
        const { session } = await openWithGraph();
        await addNameLabel(session);
        const settings = await openSettings();
        const lineHeight = within(settings).getByLabelText<HTMLInputElement>(/^Line height(,|$)/);
        await userEvent.tripleClick(lineHeight);
        await userEvent.keyboard("1.5{Enter}");
        await waitFor(() => {
            assert.equal(labelStyle(session).lineHeight, 1.5);
        });
        await userEvent.keyboard("2");
        await userEvent.keyboard("{Escape}");
        const field = within(settings).getByLabelText<HTMLInputElement>(/^Line height(,|$)/);
        assert.equal(document.activeElement, field, "focus stays in the field");
        assert.equal(field.value, "1.5", "the typing is taken back");
        assert.isNotNull(screen.queryByRole("dialog", { name: "Label settings" }), "the settings stay open");

        const reset = within(settings).getByRole("button", { name: "Reset Line height to default" });
        reset.focus();
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Label settings" }), "Escape closes the settings");
        });
        assert.equal(labelStyle(session).lineHeight, 1.5, "nothing is reset");
    });

    it("the source list reopened on a label read from name highlights name; Tab from its search closes it", async () => {
        const { session } = await openWithGraph();
        await addNameLabel(session);
        await userEvent.click(within(textList()).getByRole("button", { name: "Label source: name" }));
        const list = await findValuePicker();
        assert.equal(
            list.querySelector('[role="option"][aria-selected="true"]')?.textContent?.trim().startsWith("name"),
            true,
            "the value in force is highlighted",
        );
        await userEvent.keyboard("{Tab}");
        await waitFor(() => {
            assert.isNull(queryValuePicker(), "Tab closes the list");
        });
        assert.equal(
            document.activeElement,
            within(textList()).getByRole("button", { name: "Label source: name" }),
            "focus is back on the source",
        );
    });

    it("the Fixed text box shows what is typed, and adding a label narrows no other field", async () => {
        const { session } = await openWithGraph();
        await screen.findByTestId("style-tab", {});
        await userEvent.click(
            within(screen.getByTestId("style-tab")).getByRole("button", { name: "Add to node shape" }),
        );
        await userEvent.click(await screen.findByRole("menuitem", { name: "Shape" }));
        // A line "+" adds waits for a value, with focus in its field once the line is drawn; typed
        // before that, the keys go to the menu's button and no shape is picked.
        await waitFor(() => {
            assert.isNotNull(
                document.activeElement?.closest('[data-line="node.shape"]'),
                "focus is in the new Shape line",
            );
        });
        // A picked value is written and stays.
        await userEvent.keyboard("Box{Enter}");
        await waitFor(() => {
            assert.isTrue(session.styles.list().some((layer) => layer.set?.["node.shape"] === "box"));
        });
        const shapeBox = async (): Promise<HTMLElement> =>
            waitFor(() => {
                const box = document.querySelector<HTMLElement>('[data-line="node.shape"] .ws-field-control');
                assert.isNotNull(box);
                return box;
            });
        const before = (await shapeBox()).getBoundingClientRect().width;

        await userEvent.click(within(textList()).getByRole("button", { name: "Add to node text" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Label(?! at )/ }));
        await userEvent.click(within(await findValuePicker()).getByRole("option", { name: "Fixed text" }));
        const field = await within(textList()).findByRole<HTMLInputElement>("textbox", { name: "Node label text" });
        await userEvent.keyboard("Volunteer");
        assert.isAtMost(field.scrollWidth, field.clientWidth, "the typed word is not cut");
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.equal(writer(session, "node.label")?.set?.["node.label"], "Volunteer");
        });
        const typed = within(textList()).getByRole<HTMLInputElement>("textbox", { name: "Node label text" });
        assert.isAtMost(typed.scrollWidth, typed.clientWidth, "the words are not cut once written");
        assert.equal((await shapeBox()).getBoundingClientRect().width, before, "the Shape box keeps its width");
    });

    it("a label read from name switched to Fixed text opens its words box focused, and the typing is written", async () => {
        const { session } = await openWithGraph();
        await addNameLabel(session);
        await userEvent.click(within(textList()).getByRole("button", { name: "Label source: name" }));
        await userEvent.click(within(await findValuePicker()).getByRole("option", { name: "Fixed text" }));
        const field = await within(textList()).findByRole<HTMLInputElement>("textbox", { name: "Node label text" });
        await waitFor(() => {
            assert.equal(document.activeElement, field, "focus is in the words box");
        });
        await userEvent.keyboard("Hello{Enter}");
        await waitFor(() => {
            assert.equal(writer(session, "node.label")?.set?.["node.label"], "Hello");
        });
        assert.isNotNull(within(textList()).getByRole("button", { name: "Label source: Fixed text" }));
    });

    it("the source list, opened again, marks the choice in force: the value this line reads, then Fixed text", async () => {
        const { session } = await openWithGraph();
        await addNameLabel(session);
        await userEvent.click(within(textList()).getByRole("button", { name: "Label source: name" }));
        let picker = await findValuePicker();
        const name = within(within(picker).getByRole("group", { name: "In use" })).getByRole("option", {
            name: /^name(,|$)/,
        });
        assert.equal(name.getAttribute("aria-selected"), "true", "the value this line reads is marked");
        await userEvent.click(within(picker).getByRole("option", { name: "Fixed text" }));
        await within(textList()).findByRole("textbox", { name: "Node label text" });
        await userEvent.keyboard("Hello{Enter}");
        await waitFor(() => {
            assert.equal(writer(session, "node.label")?.set?.["node.label"], "Hello");
        });

        await userEvent.click(await within(textList()).findByRole("button", { name: "Label source: Fixed text" }));
        picker = await findValuePicker();
        assert.equal(
            within(picker).getByRole("option", { name: "Fixed text" }).getAttribute("aria-selected"),
            "true",
            "typed words: Fixed text is marked",
        );
        assert.isNull(
            within(picker).queryByRole("group", { name: "In use" }),
            "the line reads no value, so nothing is In use",
        );
    });
});
