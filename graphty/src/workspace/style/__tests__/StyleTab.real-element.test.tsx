/**
 * The Style tab on the REAL graphty-element, and tier 1 tasks T9 (color or size by a value or a
 * result) and T10 (labels from an attribute). From the empty app: open a project, put a small
 * graph in through the element's session, then work the Style tab as a reader would. Every
 * assertion reads what the element reports: the layer stack, the bindings, the label counts.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { channelsFor } from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { assert, beforeAll, describe, it } from "vitest";
import { page } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { registration } from "../commands";
import { EVERYTHING_KEY } from "../row";

/** A hang guard for the element coming up and painting, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

const NODES = [
    { id: "1", name: "Alpha", dept: "east", code: 1 },
    { id: "2", name: "Beta", dept: "west", code: 2 },
    { id: "3", name: "Gamma", dept: "east", code: 1 },
    { id: "4", name: "Delta", dept: "north", code: 3 },
];
const EDGES = [
    { source: "1", target: "2" },
    { source: "2", target: "3" },
    { source: "3", target: "4" },
    { source: "4", target: "1" },
];

/** The workspace with a project open, the element's session, its element and the store. */
interface Opened {
    readonly session: GraphSession;
    readonly element: HTMLElementTagNameMap["graphty-element"];
    readonly store: WorkspaceStore;
}

/**
 * Renders the workspace with a project open, waits for the element and loads the graph.
 * @param stacked - put every node on one spot with the fixed layout, so their labels overlap.
 * @returns the session, the element and the store.
 */
async function openWithGraph(stacked = false): Promise<Opened> {
    const store = createWorkspaceStore({ project: { name: "Ring", id: 1 } });
    render(<Workspace store={store} />);
    let element: HTMLElementTagNameMap["graphty-element"] | null = null;
    await waitFor(
        () => {
            element = document.querySelector("graphty-element");
            assert.isDefined(element?.session);
        },
        { timeout: TIMEOUT_MS },
    );
    if (element === null) {
        throw new Error("the element never came up");
    }
    const { session } = element as HTMLElementTagNameMap["graphty-element"];
    if (stacked) {
        await session.layout.set("fixed");
    }
    await session.data.addNodes(stacked ? NODES.map((n) => ({ ...n, position: { x: 0, y: 0, z: 0 } })) : NODES);
    await session.data.addEdges(EDGES);
    return { session, element, store };
}

/**
 * The Style tab, inside the inspector.
 * @returns the tab.
 */
function styleTab(): HTMLElement {
    return screen.getByTestId("style-tab");
}

/**
 * The reader's own layers: everything but the element's.
 * @param session - the element's session.
 * @returns the layers, bottom first.
 */
function readerLayers(session: GraphSession): ReturnType<GraphSession["styles"]["list"]> {
    return session.styles.list().filter((l) => l.source.by !== "element");
}

describe("the Style tab on the real element", () => {
    // The design's frame. At the runner's default width the inspector has no room.
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it(
        "draws the Everything row's base style as lines, in the fixed sections",
        async () => {
            await openWithGraph();
            const tab = await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
            const fill = within(tab).getByRole("group", { name: "Fill" });
            assert.isNotNull(within(fill).getByRole("button", { name: /^Color #6366F1 100%$/ }));
            // The app's own words: the shape line is Shape.
            assert.isNotNull(
                within(within(tab).getByRole("group", { name: "Shape" })).getByRole("button", { name: /^Shape / }),
            );
            // Nothing of the reader's is set yet, so neither side carries the dot.
            assert.isNotNull(within(tab).getByRole("radio", { name: "Nodes" }));
            assert.isNotNull(within(tab).getByRole("radio", { name: "Edges" }));
            // A base line belongs to the element: it can be changed, not removed.
            assert.isNull(within(fill).queryByRole("button", { name: "Remove Color" }));
            const sections = within(tab)
                .getAllByRole("group")
                .map((g) => g.getAttribute("data-section"))
                .filter((s) => s !== null);
            assert.deepEqual(sections, ["fill", "shape", "effects", "label", "tooltip"]);
        },
        TIMEOUT_MS * 2,
    );

    it(
        "has no two controls with one accessible name",
        async () => {
            await openWithGraph();
            const tab = await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
            const names = [...tab.querySelectorAll("button, input, [role=radio]")]
                .map((el) => el.getAttribute("aria-label") ?? el.textContent ?? "")
                .filter((name) => name !== "");
            assert.deepEqual(names, [...new Set(names)]);
        },
        TIMEOUT_MS * 2,
    );

    it(
        "T9: colors Everything by a file attribute on the row it is on, with no new row",
        async () => {
            const { session } = await openWithGraph();
            const tab = await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
            await userEvent.click(within(tab).getByRole("button", { name: "Color by attribute" }));
            const list = await screen.findByRole("dialog", { name: "From data" });
            await userEvent.click(within(list).getByRole("option", { name: "dept" }));

            await waitFor(() => {
                const mine = readerLayers(session);
                assert.lengthOf(mine, 1, "the bind edited the row; it made one Everything layer, no other row");
                assert.equal(mine[0].userData?.[EVERYTHING_KEY], true);
                const stored = mine[0].encode?.["node.color"];
                const proposal = session.styles.proposeEncoding({
                    column: { kind: "node", name: "dept" },
                    channel: "node.color",
                });
                assert.isTrue(proposal.ok);
                assert.deepEqual(stored, proposal.ok ? proposal.binding : undefined, "the element's binding, stored");
            });
            // The line now reads what it is bound to, and the Nodes side carries the dot.
            assert.isNotNull(within(styleTab()).getByRole("button", { name: /Detach Color/ }));
            assert.isNotNull(within(styleTab()).getByRole("radio", { name: "Nodes, set" }));
        },
        TIMEOUT_MS * 2,
    );

    it(
        "T9: a declared code column colors one color per group, and a group column cannot size",
        async () => {
            const { session } = await openWithGraph();
            const code = session.data.attributes().find((a) => a.kind === "node" && a.name === "code");
            if (code === undefined) {
                throw new Error("no code column");
            }
            await session.data.declare(code, { measurement: "categorical" });
            const tab = await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
            await userEvent.click(within(tab).getByRole("button", { name: "Color by attribute" }));
            const list = await screen.findByRole("dialog", { name: "From data" });
            await userEvent.click(within(list).getByRole("option", { name: "code" }));
            await waitFor(() => {
                const binding = readerLayers(session)[0]?.encode?.["node.color"];
                assert.isDefined(binding);
                assert.equal(binding !== undefined && "by" in binding ? binding.scale : undefined, "ordinal");
            });

            // Size: the attribute holding groups is listed last, disabled with the element's reason.
            await userEvent.click(within(styleTab()).getByRole("button", { name: "Size by attribute" }));
            const sizes = await screen.findByRole("dialog", { name: "From data" });
            const refused = within(sizes).getByRole("group", { name: "Cannot be used: Holds groups, not amounts" });
            const dept = within(refused).getByRole("option", { name: "dept" });
            assert.equal(dept.getAttribute("aria-disabled"), "true");
        },
        TIMEOUT_MS * 2,
    );

    it(
        "T9: sizes a measure row by its result, storing the chosen scale and the range",
        async () => {
            const { session, store } = await openWithGraph();
            const { runId } = await session.runs.start("pagerank");
            await session.styles.settled();
            const runLabel = session.runs.get(runId)?.label ?? "";
            const measure = readerLayers(session).find((l) => l.source.by === "run");
            if (measure === undefined) {
                throw new Error("PageRank painted nothing");
            }
            store.set({ inspected: { kind: "measure-row", id: measure.id } });

            // Shape "+" > Size adds a Size line.
            // The tab remounts for the new row: read it afresh.
            await waitFor(
                () => {
                    assert.isNotNull(within(styleTab()).getByRole("button", { name: "Add to Shape" }));
                },
                { timeout: TIMEOUT_MS },
            );
            await userEvent.click(within(styleTab()).getByRole("button", { name: "Add to Shape" }));
            await userEvent.click(await screen.findByRole("menuitem", { name: /^Size/ }));
            await userEvent.click(await within(styleTab()).findByRole("button", { name: "Size by attribute" }));
            const list = await screen.findByRole("dialog", { name: "From data" });
            await userEvent.click(
                within(within(list).getByRole("group", { name: runLabel })).getByRole("option", { name: runLabel }),
            );
            await waitFor(() => {
                const size = session.styles.get(measure.id)?.encode?.["node.size"];
                assert.equal(size !== undefined && "by" in size ? size.by : undefined, session.results.path(runId));
            });
            // The bind edited the PageRank row; no new row.
            assert.lengthOf(readerLayers(session), 1);

            // The Binding popover: Square root, from 1 to 3. With no range stored (#915) one end
            // alone writes nothing; both ends write the pair.
            const pill = await within(styleTab()).findByRole("button", { name: `Size, variable ${runLabel}` });
            await userEvent.click(pill);
            const popover = await screen.findByRole("group", { name: "Size binding" });
            await userEvent.click(within(popover).getByRole("combobox", { name: "Scale" }));
            await userEvent.click(await screen.findByRole("option", { name: "Square root" }));
            const sizeOf = (): unknown => {
                const size = session.styles.get(measure.id)?.encode?.["node.size"];
                return size !== undefined && "by" in size ? size : undefined;
            };
            await waitFor(() => {
                assert.equal((sizeOf() as { scale?: string } | undefined)?.scale, "sqrt");
            });
            const range = within(screen.getByRole("group", { name: "Size binding" })).getByRole("group", {
                name: "Range",
            });
            await userEvent.type(within(range).getByRole("combobox", { name: "From" }), "1{Enter}");
            assert.isUndefined((sizeOf() as { range?: unknown } | undefined)?.range, "one end alone is not written");
            await userEvent.type(within(range).getByRole("combobox", { name: "To" }), "3{Enter}");
            await waitFor(() => {
                assert.deepEqual((sizeOf() as { range?: unknown } | undefined)?.range, [1, 3]);
            });
        },
        TIMEOUT_MS * 2,
    );

    // Plan T9: sizing by a result stores the element's size range, 1 to 3, as sizing by a column
    // does. It does not yet (#915); this fails loudly once the element is fixed, to be turned into
    // a plain test.
    it.fails(
        "T9: sizing a measure row by its result stores the range 1 to 3 (#915)",
        async () => {
            const { session } = await openWithGraph();
            const { runId } = await session.runs.start("pagerank");
            const proposal = session.styles.proposeEncoding({ run: runId, channel: "node.size" });
            assert.isTrue(proposal.ok);
            assert.deepEqual(proposal.ok ? proposal.binding.range : undefined, [1, 3]);
        },
        TIMEOUT_MS * 2,
    );

    it(
        "removes a line with Undo",
        async () => {
            const { session, store } = await openWithGraph();
            const tab = await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
            await userEvent.click(within(tab).getByRole("button", { name: "Color by attribute" }));
            await userEvent.click(
                within(await screen.findByRole("dialog", { name: "From data" })).getByRole("option", { name: "dept" }),
            );
            const remove = await within(styleTab()).findByRole("button", { name: "Remove Color" });
            await userEvent.click(remove);
            await waitFor(() => {
                assert.lengthOf(readerLayers(session), 0, "the emptied Everything layer is gone");
                assert.equal(store.get().notice?.message, "Removed Color");
            });
            store.get().notice?.action?.run();
            await waitFor(() => {
                assert.isDefined(readerLayers(session)[0]?.encode?.["node.color"]);
            });
        },
        TIMEOUT_MS * 2,
    );
});

describe("labels from an attribute (task T10) on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it(
        "the Label + adds a label line and opens its attribute list; picking binds it and states the counts",
        async () => {
            // Every node on one spot, so the overlap rule (on in the workspace) hides all labels but one.
            const { session, element } = await openWithGraph(true);
            const tab = await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
            const label = within(tab).getByRole("group", { name: "Label" });
            await userEvent.click(within(label).getByRole("button", { name: "Add label line" }));
            const list = await screen.findByRole("dialog", { name: "From data" });
            // The new line starts empty, at Above.
            assert.isNotNull(within(label).getByRole("button", { name: "Label, Above: no attribute, draws nothing" }));
            await userEvent.click(within(list).getByRole("option", { name: "name" }));

            await waitFor(() => {
                const binding = readerLayers(session)[0]?.encode?.["node.label"];
                assert.equal(binding !== undefined && "by" in binding ? binding.by : undefined, "data.name");
            });
            // The statement is the element's counts, read live, the hidden part included.
            await waitFor(
                () => {
                    const { labeled, hiddenByOverlap } = element.nodeLabelCounts;
                    assert.equal(labeled, NODES.length);
                    assert.isAbove(hiddenByOverlap, 0, "stacked labels overlap");
                    assert.isNotNull(
                        within(styleTab()).getByText(
                            `${String(labeled)} labels, ${String(hiddenByOverlap)} hidden to avoid overlap`,
                        ),
                    );
                },
                { timeout: TIMEOUT_MS },
            );
            // One label line per row for now: "+" says so.
            const plus = within(styleTab()).getByRole("button", { name: "Add label line" });
            assert.equal(plus.getAttribute("aria-disabled"), "true");
        },
        TIMEOUT_MS * 2,
    );

    it(
        "the heading word adds the line too; Esc leaves it empty, it writes nothing and is dropped on selection change",
        async () => {
            const { session, store } = await openWithGraph();
            const tab = await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
            await userEvent.click(within(tab).getByRole("button", { name: "Label" }));
            await screen.findByRole("dialog", { name: "From data" });
            await userEvent.keyboard("{Escape}");
            await waitFor(() => {
                assert.isNull(screen.queryByRole("dialog", { name: "From data" }));
            });
            const empty = within(styleTab()).getByRole("button", { name: "Label, Above: no attribute, draws nothing" });
            assert.equal(empty.textContent, "Pick an attribute");
            assert.lengthOf(readerLayers(session), 0, "an empty line writes nothing");
            assert.equal(
                within(styleTab()).getByRole("button", { name: "Add label line" }).getAttribute("aria-disabled"),
                "true",
                "while an empty line exists, + adds no second one",
            );

            await session.runs.start("degree");
            await session.styles.settled();
            const degree = readerLayers(session)[0];
            store.set({ inspected: { kind: "measure-row", id: degree.id } });
            await waitFor(() => {
                assert.isNull(within(styleTab()).queryByText("Pick an attribute"));
            });
        },
        TIMEOUT_MS * 2,
    );

    it(
        "Add label line from an attribute makes a row on top, bound to it, and selects it",
        async () => {
            const { session, element, store } = await openWithGraph();
            const [command] = registration.commands;
            const ctx = { session, element, workspace: store };
            assert.equal(command.disabled?.(ctx), "Pick a node attribute first");
            store.set({ inspected: { kind: "attribute", id: "data.name" } });
            assert.isNull(command.disabled?.(ctx) ?? null);
            await command.run(ctx);
            const top = session.styles.list().at(-1);
            const binding = top?.encode?.["node.label"];
            assert.equal(binding !== undefined && "by" in binding ? binding.by : undefined, "data.name");
            assert.deepEqual(store.get().inspected, { kind: "layer", id: top?.id });
        },
        TIMEOUT_MS * 2,
    );
});

describe("editing lines on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    /**
     * The value the reader's Everything layer holds for a node channel, set or bound.
     * @param session - the element's session.
     * @param channel - the channel.
     * @returns the literal value, or the binding.
     */
    function mine(session: GraphSession, channel: "node.color" | "node.shape" | "node.tooltip"): unknown {
        const layer = readerLayers(session)[0];
        return layer?.set?.[channel] ?? layer?.encode?.[channel];
    }

    /**
     * Colors Everything by an attribute and opens the Binding popover on it.
     * @param name - the attribute.
     * @returns the popover.
     */
    async function bindColor(name: string): Promise<HTMLElement> {
        const tab = await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
        await userEvent.click(within(tab).getByRole("button", { name: "Color by attribute" }));
        await userEvent.click(
            within(await screen.findByRole("dialog", { name: "From data" })).getByRole("option", { name }),
        );
        await userEvent.click(await within(styleTab()).findByRole("button", { name: new RegExp(`^${name},`) }));
        return screen.findByRole("group", { name: "Color binding" });
    }

    it(
        "the Color popover writes a color, and the Shape popover a shape",
        async () => {
            const { session } = await openWithGraph();
            const tab = await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
            await userEvent.click(within(tab).getByRole("button", { name: /^Color #/ }));
            const hex = await screen.findByTestId("color-picker-value");
            await userEvent.clear(hex);
            await userEvent.type(hex, "FF0000{Enter}");
            await waitFor(() => {
                assert.match(String(mine(session, "node.color")), /^#FF0000/i);
            });
            await userEvent.keyboard("{Escape}");

            await userEvent.click(within(styleTab()).getByRole("button", { name: /^Shape / }));
            const shapes = await screen.findByRole("dialog", { name: "Shapes" });
            const [first] = within(shapes).getAllByRole("option");
            const shape = first.textContent ?? "";
            await userEvent.click(first);
            await waitFor(() => {
                assert.isString(mine(session, "node.shape"));
            });
            assert.isNotNull(within(styleTab()).getByRole("button", { name: `Shape ${shape}` }));
        },
        TIMEOUT_MS * 2,
    );

    it(
        "Palette, Reverse and Values from write the binding; Detach puts the element's default back",
        async () => {
            const { session } = await openWithGraph();
            const popover = await bindColor("code");
            const binding = (): Record<string, unknown> =>
                (mine(session, "node.color") ?? {}) as Record<string, unknown>;

            await userEvent.click(within(popover).getByRole("combobox", { name: "Palette" }));
            await userEvent.click(await screen.findByRole("option", { name: "Shades of blue" }));
            await waitFor(() => {
                assert.equal(binding().palette, "blues");
            });
            await userEvent.click(within(popover).getByRole("checkbox", { name: "Reverse" }));
            await waitFor(() => {
                assert.equal(binding().reverse, true);
            });
            // Typing the extent starts from the one the element read: codes 1 to 3.
            await userEvent.click(within(popover).getByRole("checkbox", { name: "Values from the data" }));
            await waitFor(() => {
                assert.deepEqual(binding().domain, [1, 3]);
            });

            await userEvent.click(within(popover).getByRole("button", { name: "Detach" }));
            const start = channelsFor("node").find((d) => d.channel === "node.color")?.default;
            await waitFor(() => {
                assert.equal(mine(session, "node.color"), start, "a literal again: the element's own default");
            });
        },
        TIMEOUT_MS * 2,
    );

    it(
        "the Edges side lists its own sections and lines",
        async () => {
            await openWithGraph();
            const tab = await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
            await userEvent.click(within(tab).getByRole("radio", { name: "Edges" }));
            await waitFor(() => {
                const sections = within(styleTab())
                    .getAllByRole("group")
                    .map((g) => g.getAttribute("data-section"))
                    .filter((s) => s !== null);
                assert.deepEqual(sections, ["line", "arrows", "label"]);
            });
            assert.isNotNull(within(styleTab()).getByRole("button", { name: "Width by attribute" }));
        },
        TIMEOUT_MS * 2,
    );

    it(
        "a section's single + adds its one property; a text line follows Undo",
        async () => {
            const { session } = await openWithGraph();
            const tab = await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
            await userEvent.click(within(tab).getByRole("button", { name: "Add Tooltip" }));
            const field = await within(styleTab()).findByRole("textbox", { name: "Tooltip" });
            await userEvent.type(field, "hello{Enter}");
            await waitFor(() => {
                assert.equal(mine(session, "node.tooltip"), "hello");
            });
            await session.undo();
            await waitFor(() => {
                assert.equal(within(styleTab()).getByRole("textbox", { name: "Tooltip" }).getAttribute("value"), "");
            });
        },
        TIMEOUT_MS * 2,
    );

    it(
        "the Show checkbox appears over a label drawn beneath, and hides it on this row",
        async () => {
            const { session, store } = await openWithGraph();
            await session.styles.encode({ column: { kind: "node", name: "name" }, channel: "node.label" });
            const top = await session.styles.add({
                name: "Top",
                target: "node",
                selector: { match: "everything" },
                set: { "node.opacity": 1 },
            });
            store.set({ inspected: { kind: "layer", id: top.id } });
            // The tab remounts for the new row: read it afresh.
            await waitFor(
                () => {
                    assert.isNotNull(within(styleTab()).getByRole("checkbox", { name: "Show" }));
                },
                { timeout: TIMEOUT_MS },
            );
            await userEvent.click(within(styleTab()).getByRole("checkbox", { name: "Show" }));
            await waitFor(() => {
                const style = session.styles.get(top.id)?.set?.["node.labelStyle"];
                assert.deepEqual(style, { enabled: false });
            });
        },
        TIMEOUT_MS * 2,
    );

    it(
        "binds with the keyboard alone: the bind icon, then the list",
        async () => {
            const { session } = await openWithGraph();
            const tab = await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
            within(tab).getByRole("button", { name: "Color by attribute" }).focus();
            await userEvent.keyboard("{Enter}");
            const list = await screen.findByRole("dialog", { name: "From data" });
            const first = within(list).getAllByRole("option")[0].textContent;
            await userEvent.keyboard("{Enter}");
            await waitFor(() => {
                const bound = mine(session, "node.color") as { by?: string } | undefined;
                assert.equal(bound?.by, `data.${first}`);
            });
        },
        TIMEOUT_MS * 2,
    );

    it(
        "says what a line draws: the element's unresolved path reads nothing, a literal label shows its text",
        async () => {
            const { session, store } = await openWithGraph();
            const layer = await session.styles.add({
                name: "Missing",
                target: "node",
                selector: { match: "everything" },
                encode: { "node.color": { by: "data.department", scale: "ordinal" } },
                set: { "node.label": "Hi" },
            });
            store.set({ inspected: { kind: "layer", id: layer.id } });
            // The tab remounts for the new row: read it afresh.
            await waitFor(
                () => {
                    assert.isNotNull(
                        within(styleTab()).getByRole("button", { name: "data.department, reads nothing" }),
                    );
                },
                { timeout: TIMEOUT_MS },
            );
            assert.isNotNull(within(styleTab()).getByRole("button", { name: 'Label, Above: "Hi"' }));
        },
        TIMEOUT_MS * 2,
    );

    it(
        "shows no Style tab for an inspected thing that is not a layer, instead of editing Everything",
        async () => {
            const { session, store } = await openWithGraph();
            await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
            const { runId } = await session.runs.start("degree");
            store.set({ inspected: { kind: "run", id: runId } });
            await waitFor(() => {
                assert.isNull(screen.queryByTestId("style-tab"));
            });
        },
        TIMEOUT_MS * 2,
    );
});
