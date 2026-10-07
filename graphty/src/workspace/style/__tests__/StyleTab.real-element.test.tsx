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

/** A pause in a slow drag: longer than any debounce, so each move could be its own write. */
const PAUSE_MS = 300;

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
 * Renders the workspace with a project open on the Everything row, as a click on it in the
 * Graph place opens it, waits for the element and loads the graph.
 * @param stacked - put every node on one spot with the fixed layout, so their labels overlap.
 * @returns the session, the element and the store.
 */
async function openWithGraph(stacked = false): Promise<Opened> {
    const store = createWorkspaceStore({ project: { name: "Ring", id: 1 }, inspected: { kind: "everything-row" } });
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
 * Picks the inspector's Style tab, as a reader does on a row that opens on Values (a run's row).
 * The choice is remembered per kind, so the tab may already be picked.
 */
async function pickStyleTab(): Promise<void> {
    const tab = await screen.findByRole("tab", { name: "Style" }, { timeout: TIMEOUT_MS });
    if (tab.getAttribute("aria-selected") !== "true") {
        await userEvent.click(tab);
    }
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

/**
 * What a Color line's paint field shows: its hex and its opacity.
 * @param container - where the line is.
 * @returns the hex and the opacity text, as "#6366F1 100%".
 */
function paintShown(container: HTMLElement): string {
    const field = within(container).getByRole("group", { name: "Color" });
    const hex = within(field).getByRole<HTMLInputElement>("textbox", { name: "Color hex value" });
    const opacity = within(field).getByRole<HTMLInputElement>("textbox", { name: "Opacity" });
    return `#${hex.value} ${opacity.value}%`;
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
            // Figma's paint field, whole: the hex and the opacity, nothing cut off.
            assert.equal(paintShown(fill), "#6366F1 100%");
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

    // The paint tree opens a row as `{ kind, id }` with the row's kind and id: a run's row carries
    // the run id, never a layer id, and the Everything row its own name.
    it(
        "T9: a run's row, opened as the paint tree opens it, lists the run's layers",
        async () => {
            const { session, store } = await openWithGraph();
            const { runId } = await session.runs.start("pagerank");
            await session.styles.settled();
            const layers = session.runs.bindings(runId);
            assert.isNotEmpty(layers, "PageRank painted");
            assert.notInclude(layers, runId, "a run id is not a layer id");

            for (const kind of ["measure-row", "run-row"]) {
                store.set({ inspected: { kind, id: runId } });
                await pickStyleTab();
                // The run's own Color line, bound to its result: the Detach door is the run's.
                await waitFor(
                    () => {
                        assert.isNotNull(within(styleTab()).getByRole("button", { name: /Detach Color/ }));
                        assert.isNotNull(within(styleTab()).getByRole("radio", { name: "Nodes, set" }));
                    },
                    { timeout: TIMEOUT_MS },
                );
                // The line's chip is the ramp the run paints, as the element's legend reports it.
                const chip = styleTab().querySelector<HTMLElement>(".cm-var-chit");
                assert.include(chip?.style.background ?? "", "linear-gradient", "the chip shows the ramp, not gray");
            }

            store.set({ inspected: { kind: "everything-row", id: "everything" } });
            await waitFor(() => {
                assert.isNull(within(styleTab()).queryByRole("button", { name: /Detach Color/ }));
                assert.equal(paintShown(styleTab()), "#6366F1 100%");
            });
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
            store.set({ inspected: { kind: "measure-row", id: runId } });
            await pickStyleTab();

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

            const sizeOf = (): unknown => {
                const size = session.styles.get(measure.id)?.encode?.["node.size"];
                return size !== undefined && "by" in size ? size : undefined;
            };
            // Sizing by a result stores the element's size range, 1 to 3, as sizing by a column does
            // (#915), and the pill states it.
            await waitFor(() => {
                assert.deepEqual((sizeOf() as { range?: unknown } | undefined)?.range, [1, 3]);
            });

            // The Binding popover: Square root, then a wider range, 1 to 5.
            const pill = await within(styleTab()).findByRole("button", { name: `1 to 3, variable ${runLabel}` });
            await userEvent.click(pill);
            const popover = await screen.findByRole("group", { name: "Size binding" });
            await userEvent.click(within(popover).getByRole("combobox", { name: "Scale" }));
            await userEvent.click(await screen.findByRole("option", { name: "Square root" }));
            await waitFor(() => {
                assert.equal((sizeOf() as { scale?: string } | undefined)?.scale, "sqrt");
            });
            const range = within(screen.getByRole("group", { name: "Size binding" })).getByRole("group", {
                name: "Range",
            });
            const to = within(range).getByRole("combobox", { name: "To" });
            await userEvent.clear(to);
            await userEvent.type(to, "5{Enter}");
            await waitFor(() => {
                assert.deepEqual((sizeOf() as { range?: unknown } | undefined)?.range, [1, 5]);
            });
        },
        TIMEOUT_MS * 2,
    );

    // Plan T9: sizing by a result stores the element's size range, 1 to 3, as sizing by a column
    // does (#915).
    it(
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

    it(
        "Glow is one line: added as its strength alone, edited in a titled popover, removed in one undo step",
        async () => {
            const { session } = await openWithGraph();
            const tab = await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
            const effects = within(tab).getByRole("group", { name: "Effects" });
            await userEvent.click(within(effects).getByRole("button", { name: "Add to Effects" }));
            const items = (await screen.findAllByRole("menuitem")).map((i) => i.textContent);
            assert.include(items, "Glow");
            assert.notInclude(items, "Glow strength");
            await userEvent.click(screen.getByRole("menuitem", { name: "Glow" }));
            await waitFor(() => {
                const set = readerLayers(session)[0]?.set;
                assert.equal(set?.["node.glowStrength"], 1);
                assert.isUndefined(set?.["node.glow"], "the element draws its own glow color");
            });

            await userEvent.click(within(styleTab()).getByRole("button", { name: /^Glow: / }));
            const popover = await screen.findByRole("dialog", { name: "Glow" });
            assert.isNotNull(within(popover).getByRole("group", { name: "Color" }));
            assert.isNotNull(within(popover).getByRole("combobox", { name: "Glow strength" }));
            await userEvent.click(within(popover).getByRole("button", { name: /close/i }));
            await waitFor(() => {
                assert.isNull(screen.queryByRole("dialog", { name: "Glow" }));
            });

            await session.styles.update(readerLayers(session)[0].id, {
                set: { ...readerLayers(session)[0].set, "node.glow": "#FF0000" },
            });
            const steps = session.history.steps.length;
            await userEvent.click(await within(styleTab()).findByRole("button", { name: "Remove Glow" }));
            await waitFor(() => {
                assert.lengthOf(readerLayers(session), 0, "both parts went, and the emptied layer with them");
            });
            assert.equal(session.history.steps.length, steps + 1, "one step for both parts");
            await session.undo();
            await waitFor(() => {
                const set = readerLayers(session)[0]?.set;
                assert.equal(set?.["node.glow"], "#FF0000");
                assert.equal(set?.["node.glowStrength"], 1);
            });
        },
        TIMEOUT_MS * 2,
    );

    it(
        "lists an edge's arrows as Head arrow and Tail arrow, and Pattern's count with the element's caveat",
        async () => {
            await openWithGraph();
            const tab = await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
            await userEvent.click(within(tab).getByRole("radio", { name: "Edges" }));
            const arrows = within(styleTab()).getByRole("group", { name: "Arrows" });
            const plus = within(arrows).queryByRole("button", { name: "Add to Arrows" });
            if (plus === null) {
                // A directed graph's base layer already draws the head: Tail arrow is the one left.
                assert.isNotNull(within(arrows).getByRole("button", { name: "Add Tail arrow" }));
            } else {
                await userEvent.click(plus);
                const items = (await screen.findAllByRole("menuitem")).map((i) => i.textContent);
                assert.deepEqual(items, ["Head arrow", "Tail arrow"]);
                await userEvent.keyboard("{Escape}");
            }

            // The element's base layer draws the pattern, so Pattern is a line already.
            const line = within(styleTab()).getByRole("group", { name: "Line" });
            await userEvent.click(within(line).getByRole("button", { name: /^Pattern: / }));
            const popover = await screen.findByRole("dialog", { name: "Pattern" });
            const caveat = channelsFor("edge").find((d) => d.channel === "edge.patternCount")?.caveat ?? "";
            assert.isNotEmpty(caveat);
            assert.isNotNull(within(popover).getByText(caveat));
            assert.isNotNull(within(popover).getByRole("combobox", { name: "Pattern count" }));
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

            const degree = await session.runs.start("degree");
            await session.styles.settled();
            store.set({ inspected: { kind: "measure-row", id: degree.runId } });
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
            assert.deepEqual(store.get().inspected, { kind: "layer-row", id: top?.id });
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
            await userEvent.click(
                within(within(tab).getByRole("group", { name: "Color" })).getByRole("button", {
                    name: "Color swatch",
                }),
            );
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
        "the bind icon, the bound value, the Shape value and the label line open titled pop-outs their X closes",
        async () => {
            await openWithGraph();
            const tab = await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
            /**
             * Opens a pop-out from a trigger, then closes it with its own X.
             * @param trigger - what opens it.
             * @param title - the pop-out's title.
             */
            async function openAndClose(trigger: HTMLElement, title: string): Promise<void> {
                await userEvent.click(trigger);
                const panel = await screen.findByRole("dialog", { name: title });
                await userEvent.click(within(panel).getByTestId("popout-header-close"));
                await waitFor(() => {
                    assert.isNull(screen.queryByRole("dialog", { name: title }));
                });
            }

            await openAndClose(within(tab).getByRole("button", { name: "Color by attribute" }), "Color by attribute");
            const shape = within(within(styleTab()).getByRole("group", { name: "Shape" })).getByRole("button", {
                name: /^Shape /,
            });
            await openAndClose(shape, "Shape");

            // The bound value: bind Color, then open and close its Binding pop-out.
            await userEvent.click(within(styleTab()).getByRole("button", { name: "Color by attribute" }));
            await userEvent.click(
                within(await screen.findByRole("dialog", { name: "From data" })).getByRole("option", { name: "dept" }),
            );
            await openAndClose(await within(styleTab()).findByRole("button", { name: /^dept,/ }), "Color from data");

            // The label line: its attribute list, then its position.
            await userEvent.click(within(styleTab()).getByRole("button", { name: "Add label line" }));
            const list = await screen.findByRole("dialog", { name: "Label" });
            await userEvent.click(within(list).getByTestId("popout-header-close"));
            await waitFor(() => {
                assert.isNull(screen.queryByRole("dialog", { name: "Label" }));
            });
            await openAndClose(within(styleTab()).getByRole("button", { name: "Label position" }), "Label position");
        },
        TIMEOUT_MS * 2,
    );

    it(
        "a drag across the Color picker is one undo step",
        async () => {
            const { session } = await openWithGraph();
            const tab = await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
            await userEvent.click(
                within(within(tab).getByRole("group", { name: "Color" })).getByRole("button", {
                    name: "Color swatch",
                }),
            );
            const field = await screen.findByTestId("color-picker-saturation");
            const before = session.history.steps.length;
            const box = field.getBoundingClientRect();
            const at = (fx: number, fy: number): MouseEventInit => ({
                bubbles: true,
                clientX: box.left + box.width * fx,
                clientY: box.top + box.height * fy,
            });
            field.dispatchEvent(new MouseEvent("mousedown", at(0.2, 0.2)));
            // A slow drag: the reader pauses between moves, as a finger does.
            for (const f of [0.3, 0.5, 0.7, 0.9]) {
                document.dispatchEvent(new MouseEvent("mousemove", at(f, f)));
                await new Promise((done) => setTimeout(done, PAUSE_MS));
            }
            document.dispatchEvent(new MouseEvent("mouseup", at(0.9, 0.9)));
            await waitFor(() => {
                const written = mine(session, "node.color");
                assert.isString(written);
                assert.notMatch(String(written), /^#6366F1/i);
            });
            await session.styles.settled();
            assert.equal(session.history.steps.length, before + 1, "the drag wrote once, on release");
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
            store.set({ inspected: { kind: "layer-row", id: top.id } });
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
            store.set({ inspected: { kind: "layer-row", id: layer.id } });
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

describe("the selection's own row on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    /**
     * The reader's layers that name ids: the selections' own rows.
     * @param session - the element's session.
     * @returns the layers, bottom first.
     */
    function idLayers(session: GraphSession): ReturnType<GraphSession["styles"]["list"]> {
        return readerLayers(session).filter((l) => l.selector.match === "ids");
    }

    it(
        "a node's first edit adds its row and selects it; selecting it again edits that row",
        async () => {
            const { session, store } = await openWithGraph();
            await session.selection.apply({ nodes: ["1"] });
            await pickStyleTab();
            await userEvent.click(await within(styleTab()).findByRole("button", { name: "Add Tooltip" }));
            await waitFor(() => {
                assert.equal(idLayers(session).length, 1);
            });
            const [row] = idLayers(session);
            assert.equal(row.name, "1");
            assert.deepEqual(row.selector, { match: "ids", nodes: ["1"], edges: [] });
            await waitFor(() => {
                assert.deepEqual(store.get().inspected, { kind: "layer-row", id: row.id });
            });

            session.selection.clear();
            await session.selection.apply({ nodes: ["1"] });
            await pickStyleTab();
            const field = await within(styleTab()).findByRole("textbox", { name: "Tooltip" });
            await userEvent.type(field, "hello{Enter}");
            await waitFor(() => {
                assert.equal(session.styles.get(row.id)?.set?.["node.tooltip"], "hello");
            });
            assert.equal(idLayers(session).length, 1, "the same ids reuse their row");
        },
        TIMEOUT_MS * 2,
    );

    it(
        "several selected share one row, named by their count, and Undo takes it away",
        async () => {
            const { session } = await openWithGraph();
            await session.selection.apply({ nodes: ["2", "3", "4"] });
            await pickStyleTab();
            await userEvent.click(await within(styleTab()).findByRole("button", { name: "Add Tooltip" }));
            await waitFor(() => {
                assert.deepEqual(
                    idLayers(session).map((l) => l.name),
                    ["3 nodes"],
                );
            });
            await session.undo();
            await waitFor(() => {
                assert.equal(idLayers(session).length, 0);
            });
        },
        TIMEOUT_MS * 2,
    );
});
