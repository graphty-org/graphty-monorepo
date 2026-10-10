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
import { page, userEvent as realInput } from "vitest/browser";

import { act, render, screen, waitFor, within } from "../../../test/test-utils";
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

/**
 * A layer's edge color as `#RRGGBB`, its opacity dropped.
 * @param value - what the layer sets for `edge.color`.
 * @returns the hex, or null when it is not a written hex.
 */
function edgeHex(value: unknown): string | null {
    return typeof value === "string" ? value.toUpperCase().slice(0, 7) : null;
}

/**
 * Sets the Edges side's Color line to a hex, adding the line first when the row has none.
 * @param hex - the color, six hex digits.
 */
async function setEdgeColor(hex: string): Promise<void> {
    const line = await within(styleTab()).findByRole("group", { name: "Line" }, { timeout: TIMEOUT_MS });
    if (within(line).queryByRole("group", { name: "Color" }) === null) {
        const one = within(line).queryByRole("button", { name: "Add Color" });
        if (one === null) {
            await userEvent.click(within(line).getByRole("button", { name: "Add to Line" }));
            await userEvent.click(await screen.findByRole("menuitem", { name: "Color" }));
        } else {
            await userEvent.click(one);
        }
    }
    const field = await within(
        await within(styleTab()).findByRole("group", { name: "Color" }, { timeout: TIMEOUT_MS }),
    ).findByRole("textbox", { name: "Color hex value" });
    await userEvent.clear(field);
    await userEvent.type(field, `${hex}{Enter}`);
}

describe("the Style tab on the real element", () => {
    // The design's frame. At the runner's default width the inspector has no room.
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
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
            // Style and Values read as tabs: the chosen one is not drawn as a filled button.
            const chosen = screen.getByRole("tab", { name: "Style" });
            assert.equal(chosen.getAttribute("aria-selected"), "true");
            assert.equal(getComputedStyle(chosen).backgroundColor, "rgba(0, 0, 0, 0)");
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

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
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

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
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
            const nodes = within(styleTab()).getByRole("radio", { name: "Nodes, set" });
            assert.isNotNull(nodes);
            // The dot sits clear of the word, and the side says what it means on hover.
            const label = styleTab().querySelector<HTMLElement>(`label[for="${nodes.id}"]`);
            const word = label?.querySelector("[aria-hidden]")?.getBoundingClientRect();
            const dot = label?.querySelector(".mantine-Indicator-indicator")?.getBoundingClientRect();
            assert.isTrue(
                word !== undefined && dot !== undefined && dot.left >= word.right,
                "the dot does not touch the word",
            );
            await realInput.hover(label ?? nodes);
            assert.isNotNull(await screen.findByText("This row sets node properties"));
        },
        TIMEOUT_MS * 2,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
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
    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
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

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "T9: sizes a measure row by its result, storing the chosen scale and the range",
        async () => {
            const { session, store, element } = await openWithGraph();
            const { runId } = await session.runs.start("pagerank");
            await session.styles.settled();
            const runLabel = "PageRank";
            const measure = readerLayers(session).find((l) => l.source.by === "run");
            if (measure === undefined) {
                throw new Error("PageRank painted nothing");
            }
            assert.isNotTrue(element.layoutBehavior?.node?.depthIndependentSize);
            store.set({ inspected: { kind: "measure-row", id: runId } });
            await pickStyleTab();

            // Shape "+" > Size adds a Size line and opens its From data list at once.
            // The tab remounts for the new row: read it afresh.
            await waitFor(
                () => {
                    assert.isNotNull(within(styleTab()).getByRole("button", { name: "Add to Shape" }));
                },
                { timeout: TIMEOUT_MS },
            );
            await userEvent.click(within(styleTab()).getByRole("button", { name: "Add to Shape" }));
            await userEvent.click(await screen.findByRole("menuitem", { name: /^Size/ }));
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
            // A size bound to a result is drawn depth-independent, so 3D perspective cannot invert
            // two values; before the bind, sizes follow the perspective.
            await waitFor(() => {
                assert.isTrue(element.layoutBehavior?.node?.depthIndependentSize);
            });

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

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "T9: a new Size line's list offers Fixed size first, one Enter away; the bind icon stays",
        async () => {
            const { session, store } = await openWithGraph();
            const { runId } = await session.runs.start("pagerank");
            await session.styles.settled();
            store.set({ inspected: { kind: "measure-row", id: runId } });
            await pickStyleTab();
            await waitFor(
                () => {
                    assert.isNotNull(within(styleTab()).getByRole("button", { name: "Add to Shape" }));
                },
                { timeout: TIMEOUT_MS },
            );
            await userEvent.click(within(styleTab()).getByRole("button", { name: "Add to Shape" }));
            await userEvent.click(await screen.findByRole("menuitem", { name: /^Size/ }));
            const list = await screen.findByRole("dialog", { name: "From data" });
            const [first] = within(list).getAllByRole("option");
            assert.equal(first.textContent, "Fixed size");
            assert.equal(first.getAttribute("aria-selected"), "true", "Fixed size is highlighted");
            await waitFor(() => {
                assert.isNotNull(document.activeElement?.closest('[role="dialog"]'), "focus is in the list");
            });

            await userEvent.keyboard("{Enter}");
            await waitFor(() => {
                assert.isNull(screen.queryByRole("dialog", { name: "From data" }));
            });
            const measure = readerLayers(session).find((l) => l.source.by === "run");
            assert.equal(measure?.set?.["node.size"], 1, "the line keeps its fixed size");
            await waitFor(() => {
                assert.isNotNull(document.activeElement?.closest('[data-line="node.size"]'), "focus is on the line");
            });
            // The chain-link is still the way back to the list.
            assert.isNotNull(within(styleTab()).getByRole("button", { name: "Size by attribute" }));
        },
        TIMEOUT_MS * 2,
    );

    // Plan T9: sizing by a result stores the element's size range, 1 to 3, as sizing by a column
    // does (#915).
    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
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

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
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
            const section = remove.closest("[data-section]")?.getAttribute("data-section");
            assert.isString(section);
            remove.focus();
            await userEvent.keyboard("{Enter}");
            await waitFor(() => {
                assert.lengthOf(readerLayers(session), 0, "the emptied Everything layer is gone");
                assert.equal(store.get().notice?.message, "Removed Color");
            });
            // The Remove button went with its line; focus goes to the section, not the page.
            await waitFor(() => {
                assert.isNotNull(
                    document.activeElement?.closest(`[data-section="${section ?? ""}"]`),
                    "focus is not in the line's section",
                );
            });
            store.get().notice?.action?.run();
            await waitFor(() => {
                assert.isDefined(readerLayers(session)[0]?.encode?.["node.color"]);
            });
        },
        TIMEOUT_MS * 2,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
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
            // Unset, the color shows what the element draws, not an invented black.
            const glowColor = String(channelsFor("node").find((d) => d.channel === "node.glow")?.default);
            assert.include(
                [...popover.querySelectorAll("input")].map((i) => `#${i.value}`.toUpperCase()),
                glowColor.toUpperCase(),
            );
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

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "lists an edge's arrows as Head arrow and Tail arrow, and Pattern's count and animation in its popover",
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
            // Animation moves only a straight solid line: a setting of Pattern, not a line of its own.
            assert.isNotNull(within(popover).getByRole("combobox", { name: /animation/i }));
            assert.isNull(within(line).queryByRole("button", { name: /^Animation/ }));
            assert.isNull(within(line).queryByText(/^Animation/));
        },
        TIMEOUT_MS * 2,
    );
});

describe("labels from an attribute (task T10) on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
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
                        within(styleTab()).getByText(`${String(labeled)} labels, ${String(hiddenByOverlap)} hidden`),
                    );
                },
                { timeout: TIMEOUT_MS },
            );
            // Show all labels turns the overlap rule off on the element: every label is drawn.
            const showAll = within(styleTab()).getByRole("checkbox", { name: "Show all labels" });
            assert.isFalse((showAll as HTMLInputElement).checked);
            await userEvent.click(showAll);
            await waitFor(
                () => {
                    assert.isFalse(element.layoutBehavior?.labels?.declutter);
                    assert.equal(element.nodeLabelCounts.hiddenByOverlap, 0);
                    for (const node of NODES) {
                        assert.isTrue(element.labelOf(node.id)?.drawn, node.name);
                    }
                    assert.isNotNull(within(styleTab()).getByText(`${String(NODES.length)} labels`));
                },
                { timeout: TIMEOUT_MS },
            );
            // And back: the rule hides the stacked labels again.
            await userEvent.click(within(styleTab()).getByRole("checkbox", { name: "Show all labels" }));
            await waitFor(
                () => {
                    assert.isTrue(element.layoutBehavior?.labels?.declutter);
                    assert.isAbove(element.nodeLabelCounts.hiddenByOverlap, 0);
                },
                { timeout: TIMEOUT_MS },
            );
            // One label line per row for now: "+" says so.
            const plus = within(styleTab()).getByRole("button", { name: "Add label line" });
            assert.equal(plus.getAttribute("aria-disabled"), "true");
        },
        TIMEOUT_MS * 2,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
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

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
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

// A pick that adds or binds a line closes the menu it came from and can remove that menu's own
// trigger; focus must land on the new line, never fall to the page body (WCAG 2.4.3).
describe("focus after a pick on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    /**
     * Waits until keyboard focus is on a control of the line for a channel.
     * @param channel - the line's channel.
     */
    async function focusIsOnLine(channel: string): Promise<void> {
        await waitFor(() => {
            const active = document.activeElement;
            assert.notEqual(
                active,
                document.body,
                `focus fell to the page body, not the ${channel} line; line drawn: ${String(document.querySelector(`[data-line="${channel}"]`) !== null)}`,
            );
            assert.isNotNull(active?.closest(`[data-line="${channel}"]`), `focus is on the ${channel} line`);
        });
    }

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "a + pick, a single +, a Size by attribute pick and a label pick each focus the line they made",
        async () => {
            const { session } = await openWithGraph();
            const tab = await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });

            // A single "+": the button goes away with the one property it added.
            await userEvent.click(within(tab).getByRole("button", { name: "Add Tooltip" }));
            await focusIsOnLine("node.tooltip");
            assert.isNull(within(styleTab()).queryByRole("button", { name: "Add Tooltip" }));

            // A "+" menu pick.
            await userEvent.click(within(styleTab()).getByRole("button", { name: "Add to Effects" }));
            const [item] = (await screen.findAllByRole("menuitem")).filter(
                (el) => el.getAttribute("data-disabled") === null,
            );
            const effect = item.textContent ?? "";
            await userEvent.click(item);
            await waitFor(() => {
                const active = document.activeElement;
                const line = active?.closest("[data-line]");
                assert.isNotNull(line, `focus is on the new ${effect} line, not ${String(active?.tagName)}`);
                assert.isNotNull(line?.closest('[data-section="effects"]'));
            });

            // The base Size line, sized by an attribute.
            // Size by attribute: the bind icon is gone once the line is bound; focus is on its pill.
            await userEvent.click(within(styleTab()).getByRole("button", { name: "Size by attribute" }));
            const list = await screen.findByRole("dialog", { name: "From data" });
            await userEvent.click(within(list).getByRole("option", { name: "code" }));
            await waitFor(() => {
                const size = readerLayers(session)[0]?.encode?.["node.size"];
                assert.isDefined(size);
            });
            await focusIsOnLine("node.size");
            assert.isNull(within(styleTab()).queryByRole("button", { name: "Size by attribute" }));

            // The label's attribute pick.
            await userEvent.click(within(styleTab()).getByRole("button", { name: "Add label line" }));
            const names = await screen.findByRole("dialog", { name: "From data" });
            await userEvent.click(within(names).getByRole("option", { name: "name" }));
            await waitFor(() => {
                assert.isDefined(readerLayers(session)[0]?.encode?.["node.label"]);
            });
            await focusIsOnLine("node.label");
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

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
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

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
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

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
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
                // eslint-disable-next-line local/no-test-timing -- fixed sleep, to become a wait on the condition it stands in for, tracked in #1636
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

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
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

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "a PageRank run paints only nodes, so its Style tab offers no Edges side",
        async () => {
            const { session, store } = await openWithGraph();
            const { runId } = await session.runs.start("pagerank");
            await session.styles.settled();
            assert.isNotEmpty(session.runs.bindings(runId), "PageRank painted");
            store.set({ inspected: { kind: "run-row", id: runId } });
            await pickStyleTab();
            await waitFor(
                () => {
                    assert.isNotNull(within(styleTab()).getByRole("button", { name: /Detach Color/ }));
                },
                { timeout: TIMEOUT_MS },
            );
            // No Nodes | Edges switch at all: an edge line would have had no layer of the run's to go to.
            assert.isNull(within(styleTab()).queryByRole("radio", { name: /^Edges/ }));
            assert.isNull(within(styleTab()).queryByRole("group", { name: "Arrows" }));
        },
        TIMEOUT_MS * 2,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "Everything's edge Color goes to the Everything layer, and an edge's to its own row",
        async () => {
            const { session } = await openWithGraph();
            const tab = await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
            await userEvent.click(within(tab).getByRole("radio", { name: /^Edges/ }));
            await setEdgeColor("FF0000");
            await waitFor(() => {
                const everything = readerLayers(session).filter((l) => l.userData?.[EVERYTHING_KEY] === true);
                assert.deepEqual(
                    everything.map((l) => [l.target, edgeHex(l.set?.["edge.color"])]),
                    [["edge", "#FF0000"]],
                );
            });

            const [edge] = session.data.edges();
            await act(async () => {
                await session.selection.apply({ edges: [edge.id] });
            });
            await pickStyleTab();
            await setEdgeColor("00FF00");
            await waitFor(() => {
                const own = readerLayers(session).filter((l) => l.selector.match === "ids");
                assert.deepEqual(
                    own.map((l) => [l.target, edgeHex(l.set?.["edge.color"])]),
                    [["edge", "#00FF00"]],
                );
            });
        },
        TIMEOUT_MS * 2,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
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

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
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

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
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

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
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

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
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

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
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

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
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

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
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

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "a Color and a Width added to two selected ties start at the highlight look, drawn once the selection clears",
        async () => {
            const { session, element } = await openWithGraph();
            const tie = (source: string, target: string): string => {
                const found = session.data.edges().find((e) => e.source === source && e.target === target);
                if (found === undefined) {
                    throw new Error(`no tie ${source}-${target}`);
                }
                return found.id;
            };
            await act(async () => {
                await session.selection.apply({ edges: [tie("1", "2"), tie("2", "3")] });
            });
            await pickStyleTab();
            await addEdgeLine("Color");
            await waitFor(() => {
                assert.equal(idLayers(session).length, 1);
            });
            await addEdgeLine("Width");
            const look = session.styles.highlightStyle("edge");
            await waitFor(() => {
                const [layer] = idLayers(session);
                assert.equal(layer.set?.["edge.color"], look["edge.color"]);
                assert.equal(layer.set?.["edge.width"], look["edge.width"]);
            });

            await act(async () => {
                session.selection.clear();
                await element.waitForStableFrame();
            });
            const styled = await drawnAtTie(element, "1", "2");
            const plain = await drawnAtTie(element, "3", "4");
            const apart = styled.reduce((d, v, i) => d + Math.abs(v - plain[i]), 0);
            assert.isAbove(apart, 30, `styled ${styled.join(",")} against plain ${plain.join(",")}`);
        },
        TIMEOUT_MS * 2,
    );
});

/**
 * Adds a line to the Edges side's Line section of the Style tab, by its "+" or its menu.
 * @param name - the line's name, as "Color" or "Width".
 */
async function addEdgeLine(name: string): Promise<void> {
    const line = await within(styleTab()).findByRole("group", { name: "Line" }, { timeout: TIMEOUT_MS });
    const one = within(line).queryByRole("button", { name: `Add ${name}` });
    if (one === null) {
        await userEvent.click(within(line).getByRole("button", { name: "Add to Line" }));
        await userEvent.click(await screen.findByRole("menuitem", { name }));
    } else {
        await userEvent.click(one);
    }
}

/**
 * The mean color the element draws in a small square around the middle of a tie, from its own
 * screenshot.
 * @param element - the element.
 * @param source - one end's id.
 * @param target - the other end's id.
 * @returns the mean red, green and blue, 0 to 255.
 */
async function drawnAtTie(
    element: HTMLElementTagNameMap["graphty-element"],
    source: string,
    target: string,
): Promise<[number, number, number]> {
    const a = element.nodeScreenPosition(source);
    const b = element.nodeScreenPosition(target);
    if (a === undefined || b === undefined) {
        throw new Error(`no position for ${source} or ${target}`);
    }
    const shot = await element.captureScreenshot({ format: "png" });
    const bitmap = await createImageBitmap(shot.blob);
    const scale = bitmap.width / element.getBoundingClientRect().width;
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d");
    if (context === null) {
        throw new Error("no 2d context to read the screenshot back");
    }
    context.drawImage(bitmap, 0, 0);
    const half = Math.round(4 * scale);
    const x = Math.round(((a.x + b.x) / 2) * scale) - half;
    const y = Math.round(((a.y + b.y) / 2) * scale) - half;
    const { data } = context.getImageData(x, y, half * 2 + 1, half * 2 + 1);
    const sum = [0, 0, 0];
    for (let i = 0; i < data.length; i += 4) {
        sum[0] += data[i];
        sum[1] += data[i + 1];
        sum[2] += data[i + 2];
    }
    const count = data.length / 4;
    return [sum[0] / count, sum[1] / count, sum[2] / count];
}

describe("one look for names and headings on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    /**
     * How a piece of text is drawn: its size, weight, ink and left edge.
     * @param element - the text.
     * @returns the four, as one string to compare.
     */
    function drawn(element: HTMLElement): string {
        const style = getComputedStyle(element);
        return `${style.fontSize} ${style.fontWeight} ${style.color} ${String(Math.round(element.getBoundingClientRect().left))}`;
    }

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "a Color line's name is drawn as the Size and Shape lines' names, and the Label heading as Fill's",
        async () => {
            await openWithGraph();
            await pickStyleTab();
            const line = (channel: string): HTMLElement => {
                const found = styleTab().querySelector<HTMLElement>(`[data-line="${channel}"]`);
                if (found === null) {
                    throw new Error(`no ${channel} line`);
                }
                return found;
            };
            await waitFor(() => {
                line("node.color");
            });
            const color = within(line("node.color")).getByText("Color", { exact: true });
            const size = within(line("node.size")).getByText("Size", { exact: true });
            const shape = within(line("node.shape")).getByText("Shape", { exact: true });
            assert.equal(drawn(color), drawn(size));
            assert.equal(drawn(shape), drawn(size));

            const heading = (section: string, word: string): HTMLElement =>
                within(within(styleTab()).getByRole("group", { name: section })).getByText(word, { exact: true });
            assert.equal(drawn(heading("Label", "Label")), drawn(heading("Fill", "Fill")));
        },
        TIMEOUT_MS * 2,
    );
});

describe("the Selection row's highlight on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "shows the edge band beside the node halo, and writes the band's color and size back to the element",
        async () => {
            const { session, store } = await openWithGraph();
            act(() => {
                store.set({ inspected: { kind: "selection-row", id: "selection" } });
            });
            const highlight = await screen.findByRole("group", { name: "Highlight" }, { timeout: TIMEOUT_MS });
            const part = (name: string): HTMLElement => within(highlight).getByRole("group", { name });
            const hexOf = (name: string): HTMLInputElement =>
                within(part(name)).getByRole<HTMLInputElement>("textbox", { name: "Color hex value" });
            assert.equal(hexOf("Nodes").value, "FFD700");
            assert.equal(hexOf("Edges").value, "0077BB", "the band the element draws selected edges with");

            await userEvent.clear(hexOf("Edges"));
            await userEvent.type(hexOf("Edges"), "FF0000{Enter}");
            await waitFor(() => {
                assert.equal(session.config.selectionStyle.edgeColor.toUpperCase(), "#FF0000");
            });
            assert.equal(session.config.selectionStyle.color.toUpperCase(), "#FFD700", "the halo is left alone");

            const size = within(part("Edges")).getByRole("combobox", { name: "Size" });
            await userEvent.clear(size);
            await userEvent.type(size, "4{Enter}");
            await waitFor(() => {
                assert.equal(session.config.selectionStyle.edgeScale, 4);
            });
            assert.equal(session.config.selectionStyle.scale, 1.45, "the halo's size is left alone");
            await waitFor(() => {
                assert.equal(hexOf("Edges").value, "FF0000");
            });
        },
        TIMEOUT_MS * 2,
    );
});
