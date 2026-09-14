import { afterEach, describe, expect, it, vi } from "vitest";

import { CAT_SOCIAL_NETWORK, CAT_SOCIAL_NETWORK_NAME } from "../../../data/sampleGraphs";
import { SAMPLE_MANIFEST, type SampleRecord, sampleSizeString } from "../../../data/sampleManifest";
import { act, fireEvent, render, screen, within } from "../../../test/test-utils";
import { COMMUNITY_NAMESPACE, COMMUNITY_TYPE, DEGREE_NAMESPACE, DEGREE_TYPE } from "../analysis/runs";
import { AppShell } from "../AppShell";
import { ACTIVITY_RAIL_WIDTH, NARROW_BREAKPOINT, STATUS_BAR_HEIGHT, TOP_BAR_HEIGHT } from "../constants";
import { DEGREE_INPUT_PATH, LABEL_ENABLED_OUTPUT_PATH } from "../defaults/styleDescriptors";
import { SHELL_LAYOUT_STORAGE_KEY } from "../ShellContext";

/**
 * Renders the shell with the store pinned, so a board decides its own breakpoint and
 * nothing it does survives into the next one.
 * @param shellWidth - the viewport width the store starts from.
 * @returns the render result.
 */
function renderShell(shellWidth = 1440) {
    return render(<AppShell initialShellWidth={shellWidth} measureViewport={false} persist={false} />);
}

/**
 * Renders the shell and lets its measurement land inside `act`.
 *
 * `measureViewport={false}` pins the STORE's width; it does not stop the canvas region
 * measuring its own rect, and that measurement arrives from a ResizeObserver after the
 * synchronous render returns. A board that asserts without flushing it both prints an
 * unwrapped-update warning and asserts against a canvas of width 0.
 * @param shellWidth - the viewport width the store starts from.
 * @returns the render result, once the measurement has been applied.
 */
async function renderMeasuredShell(shellWidth = 1440) {
    const result = renderShell(shellWidth);

    await act(async () => {
        await Promise.resolve();
    });

    return result;
}

/**
 * Dispatches the `selection-changed` event graphty-element fires on pointerup, on the
 * element the shell's wrapper listens to.
 *
 * The ordering it stands for is the fact the node-tap carve-out depends on: the element
 * reports the pick BEFORE React's click, and reports a null id when the pick hit
 * nothing. See the carve-out's own board below.
 * @param container - the render result's container.
 * @param nodeId - the id the pick produced, or null for a pick that hit nothing.
 */
function reportSelection(container: HTMLElement, nodeId: string | null) {
    const element = container.querySelector("graphty-element");

    expect(element).not.toBeNull();

    act(() => {
        element?.dispatchEvent(
            new CustomEvent("selection-changed", {
                detail: {
                    previousNodeId: null,
                    currentNodeId: nodeId,
                    currentNode: nodeId === null ? null : { data: {} },
                },
            }),
        );
    });
}

/**
 * One style layer, as graphty-element reports it through `getLayers`.
 */
interface FakeStyleLayer {
    metadata?: Record<string, unknown>;
    node?: { selector: string; style: Record<string, unknown>; calculatedStyle?: Record<string, unknown> };
    edge?: { selector: string; style: Record<string, unknown>; calculatedStyle?: Record<string, unknown> };
}

/**
 * The StyleManager calls the shell makes, recorded.
 */
interface FakeStyleManager {
    getLayers: () => FakeStyleLayer[];
    updateLayerByIndex: ReturnType<typeof vi.fn>;
    reorderLayers: ReturnType<typeof vi.fn>;
}

/**
 * Stands a graph on the mounted host and reports its layers, the way graphty-element
 * does.
 *
 * `Graphty`'s handle reads `element.graph` through a getter every time it is asked, and
 * its `style-changed` listener re-reads `getLayers()` from it, so a graph put on the
 * element here reaches the shell by the same route the real element's does -- which is
 * what makes this a test of the shell's own upward channel rather than of a mock.
 * @param container - the render result's container.
 * @param layers - the layers the graph reports.
 * @returns the manager, to assert the calls the shell made on it.
 */
function installGraph(container: HTMLElement, layers: FakeStyleLayer[]): FakeStyleManager {
    const element = container.querySelector("graphty-element");

    expect(element).not.toBeNull();

    /* `updateLayerByIndex` WRITES, as the real `StyleManager` does: it replaces the
       layer and then emits `style-changed`, which is how a committed edit gets back down
       to the shell (StyleManager.ts:183-190). A recorder that only counted calls could
       not tell an edit that reached the element from one the shell spread away on the way
       out, which is exactly the defect the colour board below stands on. */
    const manager: FakeStyleManager = {
        getLayers: () => layers,
        updateLayerByIndex: vi.fn((index: number, layer: FakeStyleLayer) => {
            layers[index] = layer;

            element?.dispatchEvent(new CustomEvent("style-changed"));

            return true;
        }),
        reorderLayers: vi.fn(() => true),
    };

    // `graph` is a getter on the element's prototype, so the stand-in is an own
    // property on this instance rather than an assignment, which the getter refuses.
    Object.defineProperty(element, "graph", {
        configurable: true,
        value: {
            getLayers: () => layers,
            getStyleManager: () => manager,
        },
    });

    act(() => {
        element?.dispatchEvent(new CustomEvent("style-changed"));
    });

    return manager;
}

/* -------------------------------------------------------------------------- */
/* The novice path's stand-ins (spec 7)                                        */
/* -------------------------------------------------------------------------- */

/** How many microtask turns a flush walks: enough for the run-then-read-then-paint chain. */
const FLUSH_TURNS = 10;

/**
 * Lets the load path's promise chain settle inside `act`.
 *
 * The 7.2 defaults are a chain of awaits -- the degree pass, then the layers, then the
 * suggested run's own pass -- so one turn is not enough and a fixed timer would be a
 * guess. Walking a handful of microtask turns is what a `.then` chain of that depth
 * needs and costs nothing when the chain is shorter.
 */
async function flushMicrotasks(): Promise<void> {
    await act(async () => {
        for (let turn = 0; turn < FLUSH_TURNS; turn += 1) {
            await Promise.resolve();
        }
    });
}

/**
 * Reports the load COMPLETE, as graphty-element does when its last chunk is in.
 *
 * `DataManager.addDataFromSource` emits `data-added` per chunk and exactly one
 * `data-loaded` after the loop, and the element forwards every internal event as a DOM
 * CustomEvent that bubbles and is composed -- which is the event the shell's 7.2 defaults
 * wait for. A board that loads without reporting completion therefore gets no defaults,
 * exactly as a load that never completes gets none, so every board below that wants the
 * defaults says so here.
 * @param container - the render result's container.
 */
async function reportLoadComplete(container: HTMLElement): Promise<void> {
    const element = container.querySelector("graphty-element");

    expect(element).not.toBeNull();

    await act(async () => {
        element?.dispatchEvent(new CustomEvent("data-loaded", { bubbles: true, composed: true }));

        for (let turn = 0; turn < FLUSH_TURNS; turn += 1) {
            await Promise.resolve();
        }
    });
}

/** One `handle.loadData` or `handle.loadFromUrl` call, as the element received it. */
interface RecordedLoad {
    /** The data source type the shell named, e.g. "json" or "gml". */
    readonly dataSource: string | undefined;
    /** Its config: `{data}` for an inline load, `{url}` for a served one. */
    readonly config: unknown;
}

/**
 * Records what reaches the element's data source, WITHOUT letting the real element load.
 *
 * `GraphtyHandle.loadData` and `loadFromUrl` both end by setting `dataSource` and then
 * `dataSourceConfig` on the element, and the element's own setter kicks off a real load
 * on its own internal graph the moment both are set. Shadowing the two accessors with own
 * properties keeps the shell's route intact -- this IS the ordinary load path, observed at
 * its last step -- while leaving the element itself alone, which is what a shell board
 * should be testing.
 * @param container - the render result's container.
 * @returns the loads, in the order the shell issued them.
 */
function captureLoads(container: HTMLElement): readonly RecordedLoad[] {
    const element = container.querySelector("graphty-element");

    expect(element).not.toBeNull();

    const loads: RecordedLoad[] = [];
    let dataSource: string | undefined;

    Object.defineProperty(element, "dataSource", {
        configurable: true,
        get: () => dataSource,
        set: (value: string | undefined) => {
            dataSource = value;
        },
    });
    Object.defineProperty(element, "dataSourceConfig", {
        configurable: true,
        get: () => undefined,
        set: (value: unknown) => {
            loads.push({ dataSource, config: value });
        },
    });

    return loads;
}

/** One node, as both the element's data manager and its algorithm results spell it. */
interface StubNode {
    id: string;
    data: Record<string, unknown>;
    algorithmResults: Record<string, unknown>;
}

/**
 * How many layers graphty-element owns before the shell adds one: its `default` and its
 * `selection` layer. Boards count the shell's own layers on top of this rather than from
 * zero, so a removal that takes the element's layers with it cannot pass.
 */
const ELEMENT_OWN_LAYER_COUNT = 2;

/**
 * The layers the SHELL added, in order, with the element's own left out.
 *
 * The shell tags every layer it adds with an `algorithmSource`, which is also how it
 * retires them, so the tag is what separates its layers from the element's `default` and
 * `selection`. Boards index this rather than `getLayers()` so they assert on the shell's
 * own stack and stay correct whatever the element puts underneath it.
 * @param layers - every layer the style manager holds.
 * @returns the tagged layers, in stack order.
 */
function shellLayers(layers: readonly StubLayer[]): readonly StubLayer[] {
    return layers.filter((layer) => layer.metadata?.algorithmSource !== undefined);
}

/** One style layer, as the stub's StyleManager holds it. */
interface StubLayer {
    metadata?: Record<string, unknown>;
    node?: Record<string, unknown>;
    edge?: Record<string, unknown>;
}

/** The stub graph's own doors, so a board can assert what the shell asked of it. */
interface StubGraph {
    /** Every algorithm run the shell asked for, in order. */
    readonly runAlgorithm: ReturnType<typeof vi.fn>;
    /** The layers the shell added, and the two repaint spies. */
    readonly styleManager: {
        getLayers: () => StubLayer[];
        addLayer: ReturnType<typeof vi.fn>;
        removeLayerByIndex: ReturnType<typeof vi.fn>;
    };
    /** The data manager, for its two repaint spies and the clear a replacing load makes. */
    readonly dataManager: {
        applyStylesToExistingNodes: ReturnType<typeof vi.fn>;
        applyStylesToExistingEdges: ReturnType<typeof vi.fn>;
        clear: ReturnType<typeof vi.fn>;
    };
}

/**
 * What the Data panel's sample row is expected to draw in its trailing value slot.
 *
 * Spec 5648 puts the size string on both surfaces and spec 622 asks this row for its
 * tags as well, so the expectation is the register both share: the size first, then the
 * tags. It is spelled out here rather than imported so the board states the string it
 * wants rather than agreeing with whatever the panel built.
 * @param record - the manifest row.
 * @returns the value the row should draw.
 */
function expectedPanelSampleValue(record: SampleRecord): string {
    const size = sampleSizeString(record.size);

    return record.tags.length === 0 ? size : `${size}. ${record.tags.join(", ")}`;
}

/** The group sizes the stub's louvain reports: 7 + 6 + 4 + 3 = the fixture's 20 nodes. */
const STUB_GROUP_SIZES = [7, 6, 4, 3];

/** The modularity the stub's louvain reports, which bands as "clearly separated". */
const STUB_MODULARITY = 0.447;

/**
 * Writes one algorithm's per-node results where the real element writes them.
 * @param node - the node to write on.
 * @param type - the algorithm's type, e.g. "degree".
 * @param values - the named results.
 */
function writeNodeResult(node: StubNode, type: string, values: Record<string, number>): void {
    const namespace = (node.algorithmResults.graphty ?? {}) as Record<string, unknown>;

    namespace[type] = values;
    node.algorithmResults.graphty = namespace;
}

/**
 * Stands a graph on the mounted host that answers the whole novice path.
 *
 * It is a stand-in for graphty-element, not for the shell: it holds the cat fixture in
 * the two Maps `GraphtyHandle.getData` reads, and its `runAlgorithm` writes exactly what
 * `DegreeAlgorithm` and `LouvainAlgorithm` write -- per-node `degree`/`degreePct` and
 * `communityId`, plus the two graph results (`groupCount`, `modularity`) the Louvain edit
 * added. The real numbers are the element's own boards to assert; what these boards test
 * is that the shell runs the right passes, in the right order, and turns what comes back
 * into the right sentence.
 *
 * The degrees are computed from the fixture's own edges rather than invented, so the
 * label cut and the Most connected rows are the fixture's real ranking.
 * @param container - the render result's container.
 * @returns the stub's doors, to assert the calls the shell made on it.
 */
function installNovicePathGraph(container: HTMLElement): StubGraph {
    const element = container.querySelector("graphty-element");

    expect(element).not.toBeNull();

    const nodes = new Map<string, StubNode>();

    for (const node of CAT_SOCIAL_NETWORK.nodes) {
        nodes.set(node.id, { id: node.id, data: { ...node }, algorithmResults: {} });
    }

    const edges = new Map<string, { id: string; srcId: string; dstId: string; data: Record<string, unknown> }>();
    const degrees = new Map<string, number>();

    CAT_SOCIAL_NETWORK.edges.forEach((edge, index) => {
        const id = `edge-${String(index)}`;

        edges.set(id, { id, srcId: edge.src, dstId: edge.dst, data: { ...edge } });
        degrees.set(edge.src, (degrees.get(edge.src) ?? 0) + 1);
        degrees.set(edge.dst, (degrees.get(edge.dst) ?? 0) + 1);
    });

    const maxDegree = Math.max(...degrees.values());

    /* The element's OWN layers, present before the shell adds anything.
       graphty-element opens its stack with a `default` layer carrying
       `NodeStyle.parse(defaultNodeStyle)` -- every node's shape type (Styles.ts:54-67) --
       and adds a `selection` layer beside it. Seeding them is what makes a boundary that
       removes layers by INDEX rather than by tag fail a board: without them the stub had
       nothing to lose, and a wipe that took the element's shape types with it, and left
       the next load drawing zero nodes, passed every test. */
    const layers: StubLayer[] = [{ metadata: { name: "default" } }, { metadata: { name: "selection" } }];
    const styleManager = {
        getLayers: () => layers,
        addLayer: vi.fn((layer: StubLayer) => {
            layers.push(layer);
        }),
        removeLayerByIndex: vi.fn((index: number) => {
            layers.splice(index, 1);

            return true;
        }),
        updateLayerByIndex: vi.fn(() => true),
        reorderLayers: vi.fn(() => true),
    };
    const dataManager = {
        nodes,
        edges,
        graphResults: undefined as unknown,
        applyStylesToExistingNodes: vi.fn(),
        applyStylesToExistingEdges: vi.fn(),
        clear: vi.fn(),
    };

    const runAlgorithm = vi.fn(async (_namespace: string, type: string) => {
        await Promise.resolve();

        if (type === "degree") {
            for (const node of nodes.values()) {
                const degree = degrees.get(node.id) ?? 0;

                writeNodeResult(node, "degree", { degree, degreePct: degree / maxDegree });
            }

            return;
        }

        if (type === "louvain") {
            const ids = [...nodes.keys()];
            let cursor = 0;

            STUB_GROUP_SIZES.forEach((size, communityId) => {
                for (let taken = 0; taken < size; taken += 1) {
                    const id = ids[cursor];

                    cursor += 1;

                    const node = id === undefined ? undefined : nodes.get(id);

                    if (node !== undefined) {
                        writeNodeResult(node, "louvain", { communityId });
                    }
                }
            });

            dataManager.graphResults = {
                graphty: { louvain: { groupCount: STUB_GROUP_SIZES.length, modularity: STUB_MODULARITY } },
            };
        }
    });

    const graph = {
        dataManager,
        getDataManager: () => dataManager,
        getNodes: () => [...nodes.values()],
        getStyleManager: () => styleManager,
        getLayers: () => layers,
        runAlgorithm,
        addListener: vi.fn(),
    };

    Object.defineProperty(element, "graph", { configurable: true, value: graph });

    /* The ELEMENT's `clearData`, which is what `GraphtyHandle.clearData` calls: clearing
       the data has to reset the element's per-load data-source guard, and only the element
       can reach that, so the handle stopped reaching past it to `graph.dataManager.clear`.
       The stand-in clears the same records the real one does, so a board sees the graph
       actually empty rather than only the call recorded. */
    Object.defineProperty(element, "clearData", {
        configurable: true,
        value: () => {
            dataManager.clear();
        },
    });

    return { runAlgorithm, styleManager, dataManager };
}

describe("AppShell", () => {
    describe("the frame", () => {
        it("puts the rail in the main row and the status bar below it", () => {
            const { container } = renderShell();
            const shell = screen.getByTestId("app-shell");
            const mainRow = screen.getByTestId("shell-main-row");
            const rail = screen.getByRole("navigation", { name: "Activity rail" });

            expect(container).toContainElement(shell);
            expect(mainRow).toContainElement(rail);
            expect(getComputedStyle(shell).gridTemplateRows.split(" ").at(-1)).toBe(`${STATUS_BAR_HEIGHT}px`);
        });

        it("spans the top bar across the full shell width, above the rail", () => {
            renderShell();

            const shell = screen.getByTestId("app-shell");
            const bar = screen.getByRole("banner");

            // The bar is the frame's OWN first row, not a child of the row that holds
            // the rail: spec 02 section 1.1 had it inset by the rail's 48 px column
            // until the product owner reversed that on 2026-09-12 (design 5.1).
            expect(shell.firstElementChild).toBe(bar);
            expect(screen.getByTestId("shell-main-row")).not.toContainElement(bar);
            expect(getComputedStyle(shell).gridTemplateRows.split(" ")[0]).toBe(`${TOP_BAR_HEIGHT}px`);
        });

        it("still gives the rail its own 48 px column, left of panel, canvas and inspector", () => {
            renderShell();

            const columns = getComputedStyle(screen.getByTestId("shell-main-row")).gridTemplateColumns;

            expect(columns.split(" ")[0]).toBe(`${ACTIVITY_RAIL_WIDTH}px`);
        });

        it("leaves the main row unclipped, so the Help menu may stand outside the rail", () => {
            renderShell();

            expect(getComputedStyle(screen.getByTestId("shell-main-row")).overflow).toBe("visible");
        });

        it("draws the canvas region inside the body row", () => {
            const { container } = renderShell();
            const bodyRow = screen.getByTestId("shell-body-row");
            const canvas = container.querySelector('[data-shell-region="canvas"]');

            expect(canvas).not.toBeNull();
            expect(bodyRow).toContainElement(canvas as HTMLElement);
        });
    });

    describe("the rail's destinations", () => {
        it("opens a panel on the activity it names", () => {
            renderShell();

            fireEvent.click(screen.getByRole("button", { name: "Data" }));

            expect(screen.getByRole("region", { name: "Data" })).toBeInTheDocument();
        });

        it("closes the panel when the active activity is clicked again", () => {
            renderShell();

            fireEvent.click(screen.getByRole("button", { name: "Data" }));
            fireEvent.click(screen.getByRole("button", { name: "Data" }));

            expect(screen.queryByRole("region", { name: "Data" })).toBeNull();
        });

        it("routes Settings to its own overlay rather than through the active activity", () => {
            renderShell();

            fireEvent.click(screen.getByRole("button", { name: "Settings" }));

            expect(screen.getByTestId("settings-overlay")).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Settings" })).toHaveAttribute("aria-pressed", "false");
        });

        it("sends the assistant's setup prompt to the AI providers pane, not just to Settings", () => {
            renderShell();

            fireEvent.click(screen.getByRole("button", { name: "AI" }));
            fireEvent.click(screen.getByTestId("ai-open-settings"));

            expect(screen.getByRole("tabpanel", { name: "AI providers" })).toBeInTheDocument();
            expect(screen.getByTestId("ai-key-input-anthropic")).toBeInTheDocument();
        });

        it("returns Settings to the pane it was left on when the rail opens it", () => {
            renderShell();

            fireEvent.click(screen.getByRole("button", { name: "AI" }));
            fireEvent.click(screen.getByTestId("ai-open-settings"));
            fireEvent.click(screen.getByTestId("settings-close"));
            /* The rail's own Settings, not the setup prompt's: the AI panel is still
               open behind the overlay and its prompt draws a button of that name. */
            fireEvent.click(
                within(screen.getByRole("navigation", { name: "Activity rail" })).getByRole("button", {
                    name: "Settings",
                }),
            );

            expect(screen.getByRole("tabpanel", { name: "AI providers" })).toBeInTheDocument();
        });

        it("opens the Help menu as a sibling of the rail, not as one of its children", () => {
            renderShell();

            fireEvent.click(screen.getByRole("button", { name: "Help and keyboard shortcuts" }));

            const menu = screen.getByRole("menu");
            const rail = screen.getByRole("navigation", { name: "Activity rail" });

            expect(rail).not.toContainElement(menu);
            expect(screen.getByTestId("shell-main-row")).toContainElement(menu);
        });

        it("leaves Help hovered rather than active while its menu is open", () => {
            renderShell();

            fireEvent.click(screen.getByRole("button", { name: "Help and keyboard shortcuts" }));

            expect(screen.getByRole("button", { name: "Help and keyboard shortcuts" })).toHaveAttribute(
                "aria-pressed",
                "false",
            );
        });
    });

    describe("the Help menu's destinations", () => {
        it("opens the keyboard shortcuts surface from its first row", () => {
            renderShell();

            fireEvent.click(screen.getByRole("button", { name: "Help and keyboard shortcuts" }));
            fireEvent.click(screen.getByRole("menuitem", { name: /Keyboard shortcuts/ }));

            expect(screen.getByTestId("keyboard-shortcuts")).toBeInTheDocument();
        });

        it("opens the feedback dialog from Send feedback", async () => {
            renderShell();

            fireEvent.click(screen.getByRole("button", { name: "Help and keyboard shortcuts" }));
            fireEvent.click(screen.getByRole("menuitem", { name: "Send feedback" }));

            expect(await screen.findByRole("dialog")).toBeInTheDocument();
        });
    });

    describe("the Escape ladder", () => {
        it("closes the Help menu on rung 2", () => {
            renderShell();

            fireEvent.click(screen.getByRole("button", { name: "Help and keyboard shortcuts" }));
            fireEvent.keyDown(window, { key: "Escape" });

            expect(screen.queryByRole("menu")).toBeNull();
        });

        it("closes the keyboard shortcuts surface on the same rung", () => {
            renderShell();

            fireEvent.click(screen.getByRole("button", { name: "Help and keyboard shortcuts" }));
            fireEvent.click(screen.getByRole("menuitem", { name: /Keyboard shortcuts/ }));
            fireEvent.keyDown(window, { key: "Escape" });

            expect(screen.queryByTestId("keyboard-shortcuts")).toBeNull();
        });
    });

    describe("the command palette", () => {
        it("opens from the top bar's trigger pill", async () => {
            renderShell();

            fireEvent.click(screen.getByRole("button", { name: /Search commands, nodes and edges/ }));

            expect(await screen.findByTestId("command-palette")).toBeInTheDocument();
        });

        it("carries the only row that brings a hidden canvas toolbar back", async () => {
            renderShell();

            fireEvent.click(screen.getByRole("button", { name: /Search commands, nodes and edges/ }));
            await screen.findByTestId("command-palette");

            expect(screen.getByRole("option", { name: /Show canvas toolbar/ })).toBeInTheDocument();
        });
    });

    describe("the top bar's region switches", () => {
        it("opens the panel from the top bar, and closes it again", async () => {
            await renderMeasuredShell();

            const toggle = screen.getByRole("button", { name: "Toggle panel" });

            expect(toggle).toHaveAttribute("aria-pressed", "false");

            fireEvent.click(toggle);

            expect(screen.getByRole("region", { name: "Data" })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Toggle panel" })).toHaveAttribute("aria-pressed", "true");

            fireEvent.click(screen.getByRole("button", { name: "Toggle panel" }));

            expect(screen.queryByRole("region", { name: "Data" })).toBeNull();
        });

        it("runs the same callback as Mod+B, so the switch and the key cannot drift", async () => {
            await renderMeasuredShell();

            fireEvent.keyDown(window, { key: "b", ctrlKey: true });

            expect(screen.getByRole("region", { name: "Data" })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Toggle panel" })).toHaveAttribute("aria-pressed", "true");

            fireEvent.click(screen.getByRole("button", { name: "Toggle panel" }));

            expect(screen.queryByRole("region", { name: "Data" })).toBeNull();
        });

        it("leaves the switch unlit for Settings, which is not a panel", async () => {
            await renderMeasuredShell();

            fireEvent.click(screen.getByRole("button", { name: "Settings" }));

            expect(screen.getByRole("button", { name: "Toggle panel" })).toHaveAttribute("aria-pressed", "false");
        });
    });

    describe("the Keep open latch", () => {
        it("draws a latch on the panel header and reports it to the store", async () => {
            await renderMeasuredShell();

            fireEvent.click(screen.getByRole("button", { name: "Data" }));

            const latch = screen.getByTestId("panel-header-keep-open");

            expect(latch).toHaveAttribute("aria-pressed", "false");

            fireEvent.click(latch);

            expect(screen.getByTestId("panel-header-keep-open")).toHaveAttribute("aria-pressed", "true");
        });

        it("keeps a latched panel open when the inspector opens over it below 1280", async () => {
            await renderMeasuredShell(NARROW_BREAKPOINT - 1);

            fireEvent.click(screen.getByRole("button", { name: "Data" }));
            fireEvent.click(screen.getByTestId("panel-header-keep-open"));
            fireEvent.click(screen.getByRole("button", { name: "Toggle inspector" }));

            expect(screen.getByTestId("inspector")).toBeInTheDocument();
            expect(screen.getByRole("region", { name: "Data" })).toBeInTheDocument();
        });

        it("closes a latched panel from its own X, which is the one gesture that always means close", async () => {
            await renderMeasuredShell();

            fireEvent.click(screen.getByRole("button", { name: "Data" }));
            fireEvent.click(screen.getByTestId("panel-header-keep-open"));
            fireEvent.click(screen.getByTestId("panel-header-close"));

            expect(screen.queryByRole("region", { name: "Data" })).toBeNull();
        });
    });

    /* -------------------------------------------------------------------------- */
    /* The first visit, with the store ON (2026-09-13, second pass)                */
    /* -------------------------------------------------------------------------- */

    /*
     * Every other board here passes `persist={false}`, and that is why the first-visit
     * regression shipped with the suite green: the first-visit layout is taken ONLY when
     * persistence is on, so no board ever mounted the state a genuine first reader gets.
     * These mount it -- store on, nothing remembered -- at the widths the two reviewers
     * measured.
     */
    describe("the first visit, with nothing remembered", () => {
        afterEach(() => {
            window.localStorage.clear();
        });

        /**
         * Renders the shell as a FIRST VISIT reaches it: persistence on, an empty store,
         * and the measurement flushed so the canvas has a rect.
         * @param shellWidth - the viewport width the store starts from.
         * @returns the render result, once the measurement has been applied.
         */
        async function renderFirstVisitShell(shellWidth: number) {
            window.localStorage.clear();

            const result = render(<AppShell initialShellWidth={shellWidth} measureViewport={false} />);

            await act(async () => {
                await Promise.resolve();
            });

            return result;
        }

        it("opens no overlay at 1024, so Welcome is not covered by two surfaces it cannot dismiss", async () => {
            const { container } = await renderFirstVisitShell(1024);

            expect(screen.queryByRole("region", { name: "Data" })).toBeNull();
            expect(screen.queryByTestId("inspector")).toBeNull();
            expect(container.querySelector("[data-canvas-welcome='true']")).not.toBeNull();
        });

        it("lets a canvas tap dismiss the surface the reader opens at 1024", async () => {
            const { container } = await renderFirstVisitShell(1024);

            fireEvent.click(screen.getByRole("button", { name: "Data" }));

            // The rail's click OPENS the panel here, because a first visit at this width
            // no longer arrives with Data already active -- before the fix the same click
            // was the close-on-active-click and this board never reached the tap.
            expect(screen.getByRole("region", { name: "Data" })).toBeInTheDocument();
            expect(screen.getByTestId("panel-header-keep-open")).toHaveAttribute("aria-pressed", "false");

            reportSelection(container, null);
            fireEvent.click(container.querySelector('[data-shell-region="canvas"]') as HTMLElement);

            // Before the fix the default latch vetoed this close, so the panel stayed and
            // the reader had no gesture Welcome teaches that reclaimed any canvas.
            expect(screen.queryByRole("region", { name: "Data" })).toBeNull();
        });

        it("still locks both sidebars open at 1440, which is what was asked for", async () => {
            await renderFirstVisitShell(1440);

            expect(screen.getByRole("region", { name: "Data" })).toBeInTheDocument();
            expect(screen.getByTestId("inspector")).toBeInTheDocument();
            expect(screen.getByTestId("panel-header-keep-open")).toHaveAttribute("aria-pressed", "true");
            expect(screen.getByTestId("inspector-keep-open")).toHaveAttribute("aria-pressed", "true");
        });
    });

    describe("the node-tap carve-out", () => {
        it("dismisses the narrow overlay when the tap hit empty canvas", async () => {
            const { container } = await renderMeasuredShell(NARROW_BREAKPOINT - 1);

            fireEvent.click(screen.getByRole("button", { name: "Data" }));
            reportSelection(container, null);
            fireEvent.click(container.querySelector('[data-shell-region="canvas"]') as HTMLElement);

            expect(screen.queryByRole("region", { name: "Data" })).toBeNull();
        });

        it("keeps the narrow overlay open when the tap selected a node", async () => {
            const { container } = await renderMeasuredShell(NARROW_BREAKPOINT - 1);

            fireEvent.click(screen.getByRole("button", { name: "Data" }));
            reportSelection(container, "Garbage_Bandit");
            fireEvent.click(container.querySelector('[data-shell-region="canvas"]') as HTMLElement);

            // Design 5.2 already says a tap on the canvas toolbar is not a tap on the
            // canvas; this is the node case, and without it the tap that fills the
            // inspector is also the tap that dismisses it.
            expect(screen.getByRole("region", { name: "Data" })).toBeInTheDocument();
        });

        it("keeps the inspector open when a node is tapped under it, which is the reported bug", async () => {
            const { container } = await renderMeasuredShell(NARROW_BREAKPOINT - 1);

            fireEvent.click(screen.getByRole("button", { name: "Toggle inspector" }));
            reportSelection(container, "Garbage_Bandit");
            fireEvent.click(container.querySelector('[data-shell-region="canvas"]') as HTMLElement);

            expect(screen.getByTestId("inspector")).toBeInTheDocument();
        });

        it("reads a selection reported on POINTERUP, which is the ordering it depends on", async () => {
            const { container } = await renderMeasuredShell(NARROW_BREAKPOINT - 1);
            const element = container.querySelector("graphty-element") as HTMLElement;

            /* graphty-element fires `selection-changed` from its own pick, on pointerup,
               one event before React's click -- measured at pointerup t=11123 ms against
               click t=11124 ms. This listener stands for that phase: the carve-out is
               only correct while the selection is knowable from inside the click. */
            element.addEventListener("pointerup", () => {
                element.dispatchEvent(
                    new CustomEvent("selection-changed", {
                        detail: { previousNodeId: null, currentNodeId: "Ghost_Cat", currentNode: { data: {} } },
                    }),
                );
            });

            fireEvent.click(screen.getByRole("button", { name: "Data" }));

            await act(async () => {
                fireEvent.pointerDown(element);
                fireEvent.pointerUp(element);
                fireEvent.click(element);
                await Promise.resolve();
            });

            expect(screen.getByRole("region", { name: "Data" })).toBeInTheDocument();
        });

        it("cannot save the overlay from a selection reported after the click", async () => {
            const { container } = await renderMeasuredShell(NARROW_BREAKPOINT - 1);

            fireEvent.click(screen.getByRole("button", { name: "Data" }));
            fireEvent.click(container.querySelector('[data-shell-region="canvas"]') as HTMLElement);
            reportSelection(container, "Garbage_Bandit");

            /* This board is the ordering assumption written down as its consequence: if
               graphty-element ever moves `selection-changed` to the click phase, AFTER
               React's handler, this is what ships and the carve-out above stops working.
               A failure here is a signal to read the element's pick path again, not to
               relax the assertion. */
            expect(screen.queryByRole("region", { name: "Data" })).toBeNull();
        });
    });

    describe("the Empty state", () => {
        it("disables the four activities that need data", async () => {
            await renderMeasuredShell();

            expect(screen.getByRole("button", { name: "Explore. Load data first" })).toHaveAttribute(
                "aria-disabled",
                "true",
            );
        });

        it("renders no status bar slot, because the session holds no counts yet", async () => {
            const { container } = await renderMeasuredShell();

            expect(container.querySelectorAll("[data-status-slot]")).toHaveLength(0);
        });

        it("mounts the graph host behind Welcome, so the first load has a handle to call", async () => {
            const { container } = await renderMeasuredShell();

            // The blocker this board guards: loading data goes through the host's
            // imperative handle, so a host mounted only once data is loaded leaves the
            // shell unable to leave Empty at all.
            expect(container.querySelector("[data-canvas-graph='true']")).not.toBeNull();
            expect(container.querySelector("[data-canvas-welcome='true']")).not.toBeNull();
        });
    });

    describe("the Explore search field", () => {
        afterEach(() => {
            window.localStorage.clear();
        });

        /* The field is a controlled input, and the shell supplied neither its value nor
           its handler, so it was pinned to the empty string and every keystroke was
           discarded -- product owner, 2026-09-13: "I can't type in the search nodes and
           edges textbox under explore". Typing is the only assertion that fails on that:
           the field rendered perfectly well all along. The panel switch is the second
           half: `renderPanelBody` builds the Explore body per activity, so a field whose
           state lived inside the panel would come back empty, and this is why the query
           is held in the shell beside the panel's other remembered values. */
        it("holds what is typed, and still holds it after a panel switch", async () => {
            const { container } = await renderMeasuredShell();

            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);

            // The load's own 7.2 default leaves the panel on Explore, so the field is
            // already on screen: clicking the rail item here would close the panel.
            await screen.findByRole("region", { name: "Explore" });

            const field = screen.getByRole("textbox", { name: "Search nodes and edges" });

            fireEvent.change(field, { target: { value: "acct" } });

            expect(field).toHaveValue("acct");

            fireEvent.click(screen.getByRole("button", { name: "Style" }));
            fireEvent.click(screen.getByRole("button", { name: "Explore" }));

            expect(screen.getByRole("textbox", { name: "Search nodes and edges" })).toHaveValue("acct");
        });

        it("keeps the scope the reader picked", async () => {
            const { container } = await renderMeasuredShell();

            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);

            await screen.findByRole("region", { name: "Explore" });

            fireEvent.click(screen.getByTestId("explore-search-scope"));
            fireEvent.click(await screen.findByRole("menuitem", { name: "Visible nodes" }));

            fireEvent.click(screen.getByRole("button", { name: "Style" }));
            fireEvent.click(screen.getByRole("button", { name: "Explore" }));

            expect(screen.getByTestId("explore-search-scope")).toHaveTextContent("Visible nodes");
        });
    });

    describe("the style layers list", () => {
        afterEach(() => {
            window.localStorage.clear();
        });

        /**
         * Renders the shell with the Style panel already open, from the remembered
         * activity 6.5 allows the store to keep.
         * @returns the render result.
         */
        async function renderStylePanel() {
            window.localStorage.setItem(SHELL_LAYOUT_STORAGE_KEY, JSON.stringify({ activeActivity: "style" }));

            const result = render(<AppShell initialShellWidth={1440} measureViewport={false} />);

            await act(async () => {
                await Promise.resolve();
            });

            return result;
        }

        it("commits an inline rename to graphty-element, which owns the names", async () => {
            const { container } = await renderStylePanel();
            const manager = installGraph(container, [
                { metadata: { name: "default" } },
                { metadata: { name: "New Layer 1", algorithmSource: "pagerank" }, node: { selector: "", style: {} } },
            ]);

            const list = screen.getByTestId("style-layers");

            fireEvent.doubleClick(within(list).getByText("New Layer 1"));

            const input = within(list).getByRole("textbox");

            fireEvent.change(input, { target: { value: "Renamed" } });
            fireEvent.blur(input);

            /* The whole defect: the list's one upward channel could express a reorder and
               nothing else, so a rename -- same positional ids, same order -- reached the
               StyleManager never at all and the row kept drawing the old name. The
               metadata is spread rather than replaced, so a layer a run created keeps its
               `algorithmSource` binding (DECISIONS-1.7:1829, :1962). */
            expect(manager.updateLayerByIndex).toHaveBeenCalledWith(1, {
                metadata: { name: "Renamed", algorithmSource: "pagerank" },
                node: { selector: "", style: {} },
            });
            expect(manager.reorderLayers).not.toHaveBeenCalled();
        });

        /* The same in-place channel carries the style-layer inspector's own edits, and it
           used to read the live layer back, spread it and override `metadata.name` alone
           -- which spread every style edit away before it reached the element. Product
           owner, 2026-09-13: "changing the color of a style in the style inspector doesn't
           change the color in component or in the graph". The colour is asserted twice:
           once as the shell handed it over, and once read back OUT of the StyleManager,
           because only the second says the element now holds it. */
        it("commits a colour from the style inspector, and the layer reads it back", async () => {
            const { container } = await renderStylePanel();
            const manager = installGraph(container, [
                { metadata: { name: "default" } },
                {
                    metadata: { name: "Base", algorithmSource: "pagerank" },
                    node: {
                        selector: "",
                        style: {
                            color: { mode: "solid", color: "#5B8FF9", opacity: 1 },
                            texture: { color: "#5B8FF9" },
                        },
                    },
                },
            ]);

            fireEvent.click(within(screen.getByTestId("style-layers")).getByText("Base"));

            /* Several controls in the surface carry a hex field, so this one is reached
               through the node Color group it belongs to -- `Color Mode` is that group's
               own first row -- and the field is checked to be holding the layer's own
               colour before it is typed into. */
            const colorGroup = (await screen.findByText("Color Mode")).parentElement?.parentElement;

            expect(colorGroup).not.toBeNull();

            const hex = within(colorGroup as HTMLElement).getByLabelText("Color hex value");

            expect(hex).toHaveValue("5B8FF9");

            fireEvent.change(hex, { target: { value: "FF0000" } });
            fireEvent.blur(hex);

            expect(manager.updateLayerByIndex).toHaveBeenCalledTimes(1);

            const written = manager.getLayers()[1];

            expect(written?.node?.style.texture).toEqual({ color: "#FF0000" });

            /* And NO editor-only `color` key beside it. NodeStyle does not declare one --
               the element's colour lives at `texture.color` -- and a key the schema does not
               declare makes the merged style deep-UNEQUAL to an identical-looking one, so
               `Styles.styleToId` mints a fresh id and `NodeMesh` a fresh mesh for a look the
               graph already had. This assertion used to require the leak (2026-09-13). */
            expect(Object.keys(written?.node?.style ?? {})).not.toContain("color");
            // The layer keeps its name and its run binding: a colour edit is not a rename.
            expect(written?.metadata).toEqual({ name: "Base", algorithmSource: "pagerank" });
            expect(manager.reorderLayers).not.toHaveBeenCalled();
        });

        it("commits the node selector the inspector edits, through the same channel", async () => {
            const { container } = await renderStylePanel();
            const manager = installGraph(container, [
                { metadata: { name: "Base" }, node: { selector: "", style: {} } },
            ]);

            fireEvent.click(within(screen.getByTestId("style-layers")).getByText("Base"));

            const selector = await screen.findByLabelText("Node Selector");

            fireEvent.change(selector, { target: { value: "type == `person`" } });
            fireEvent.blur(selector);

            expect(manager.getLayers()[0]?.node?.selector).toBe("type == `person`");
        });

        it("leaves the layers alone when nothing was renamed", async () => {
            const { container } = await renderStylePanel();
            const manager = installGraph(container, [{ metadata: { name: "default" } }]);

            const list = screen.getByTestId("style-layers");

            fireEvent.doubleClick(within(list).getByText("default"));
            fireEvent.blur(within(list).getByRole("textbox"));

            expect(manager.updateLayerByIndex).not.toHaveBeenCalled();
            expect(manager.reorderLayers).not.toHaveBeenCalled();
        });
    });

    /* ---------------------------------------------------------------------- */
    /* The novice path (spec 7)                                                */
    /* ---------------------------------------------------------------------- */

    describe("the novice path", () => {
        afterEach(() => {
            window.localStorage.clear();
        });

        it("draws Welcome's three sample rows, with the size string each carries", async () => {
            await renderMeasuredShell();

            for (const record of SAMPLE_MANIFEST) {
                expect(screen.getByText(record.name)).toBeInTheDocument();
                expect(screen.getByText(sampleSizeString(record.size))).toBeInTheDocument();
            }

            expect(SAMPLE_MANIFEST).toHaveLength(3);
        });

        it("offers the same three samples in the Data panel, from the same manifest", async () => {
            await renderMeasuredShell();

            fireEvent.click(screen.getByRole("button", { name: "Data" }));

            const panel = screen.getByRole("region", { name: "Data" });

            for (const record of SAMPLE_MANIFEST) {
                /* Spec 5648 makes this ONE manifest with two surfaces. The canvas row is
                   still drawn behind the panel, so each name is on screen twice; finding
                   it inside the panel is what says the panel's section is filled. */
                expect(within(panel).getByText(record.name)).toBeInTheDocument();
            }
        });

        it("loads an inline sample through the ordinary load path, not around it", async () => {
            const { container } = await renderMeasuredShell();
            const loads = captureLoads(container);

            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);

            /* The `?test` fixture's own route: the format and the serialised payload reach
               the element's data source, and the counts are then read from the graph's own
               data events rather than written here from the fixture's length. */
            expect(loads).toHaveLength(1);
            expect(loads[0]?.dataSource).toBe("json");
            expect(JSON.parse(String((loads[0]?.config as { data?: unknown }).data))).toEqual(CAT_SOCIAL_NETWORK);
            expect(screen.getByText(CAT_SOCIAL_NETWORK_NAME)).toBeInTheDocument();
        });

        it("loads a served sample from the URL its manifest row names", async () => {
            const { container } = await renderMeasuredShell();
            const loads = captureLoads(container);

            fireEvent.click(container.querySelector('[data-sample-row="karate"]') as HTMLElement);
            await flushMicrotasks();

            expect(loads[0]?.dataSource).toBe("gml");
            expect(loads[0]?.config).toEqual({ url: "/samples/karate.gml" });
            expect(screen.getByText("karate.gml")).toBeInTheDocument();
        });

        it("reads the graph summary from the records the graph reported", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container);
            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);
            fireEvent.click(screen.getByRole("button", { name: "Toggle inspector" }));

            /* The hand-walk's own sentence. It is the template's, fed only facts one
               O(n+m) pass measured: no type clause, because no column-role model exists,
               and no "at most N steps", because a diameter is above the template's
               O(n+m) ceiling. */
            expect(
                screen.getByText("20 nodes, connected by 29 relationships. One connected part holds all 20 nodes."),
            ).toBeInTheDocument();
        });

        it("fills Most connected from the degree pass 7.2 runs at import", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container);
            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);
            fireEvent.click(screen.getByRole("button", { name: "Toggle inspector" }));

            const inspector = screen.getByTestId("inspector");

            expect(within(inspector).getByText("Chonky_Boy")).toBeInTheDocument();
        });

        /* ONE layer, not three. 7.2's neutral-colour and size-by-degree layers were
           reverted on 2026-09-13 so the element's hand-tuned node and edge defaults stand;
           only the label layer remains, because it adds a channel rather than overriding a
           tuned value. This board is what would catch either of them coming back without
           the normalisation fix the revert note asks for. */
        it("applies the 7.2 label layer and leaves the tuned node defaults alone", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);

            const graph = installNovicePathGraph(container);

            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);

            const added = shellLayers(graph.styleManager.getLayers());

            expect(added).toHaveLength(1);
            /* The label layer is a RULE, not a list: it matches every node (`selector: ""`)
               and decides per node from the degree pass, so `label.enabled` lives in the
               calculated half and the static half sets no appearance at all. This board used
               to read `style.label.enabled` off the static half, which was the id-set shape
               the rule replaced on 2026-09-13. */
            expect(added[0]?.node).toHaveProperty("selector", "");
            expect(added[0]?.node).toHaveProperty("calculatedStyle.output", LABEL_ENABLED_OUTPUT_PATH);
            expect(added[0]?.node).toHaveProperty("calculatedStyle.inputs", [DEGREE_INPUT_PATH]);
            /* Nothing the shell adds may set a node colour or a node size any more, by either
               half: the static one, or a calculated one aimed at anything but the label. */
            for (const layer of added) {
                expect(layer.node?.style).not.toHaveProperty("texture");
                expect(layer.node?.style).not.toHaveProperty("shape");
                const calculated = layer.node?.calculatedStyle as { output?: string } | undefined;

                if (calculated !== undefined) {
                    expect(calculated.output).toBe(LABEL_ENABLED_OUTPUT_PATH);
                }
            }
            /* And the repaint that makes an `algorithmResults` selector match at all. */
            expect(graph.dataManager.applyStylesToExistingNodes).toHaveBeenCalled();
        });

        it("shows the Insights strip with the cards this build can carry to a reading", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container);
            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);

            const strip = container.querySelector('[data-canvas-overlay="insights"]') as HTMLElement;

            expect(strip).not.toBeNull();
            expect(within(strip).getByText("Find groups")).toBeInTheDocument();
            expect(within(strip).getByText("Search for something you know")).toBeInTheDocument();
            /* The rule table produced a degree card too, and it is filtered out rather than
               drawn: it cannot write a reading in this build, which is the third thing 7.3
               makes a card click promise. */
            expect(within(strip).queryByText("Who is most connected")).toBeNull();
        });

        it("runs Find groups from its card: paints the groups, opens Analyze and writes the reading", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);

            const graph = installNovicePathGraph(container);

            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);

            const strip = container.querySelector('[data-canvas-overlay="insights"]') as HTMLElement;

            fireEvent.click(within(strip).getByText("Find groups"));
            await flushMicrotasks();

            expect(graph.runAlgorithm).toHaveBeenCalledWith(COMMUNITY_NAMESPACE, COMMUNITY_TYPE);
            expect(screen.getByRole("region", { name: "Analyze" })).toBeInTheDocument();

            fireEvent.click(screen.getByRole("button", { name: "Toggle inspector" }));

            const inspector = screen.getByTestId("inspector");

            /* Two sentences, which is RT-10's cap (design line 4672) rather than the four
               7.5's own worked example takes -- see `communityReading`'s doc comment. What
               the colours mean moved to the legend's channel line, asserted below. */
            expect(
                within(inspector).getByText("4 groups found. The groups are clearly separated (modularity 0.447)."),
            ).toBeInTheDocument();
            expect(within(inspector).getByText("Louvain, 20 nodes")).toBeInTheDocument();

            /* The legend now names the encoding the reading stopped claiming: design line
               201's "Color: groups, categorical". Without this the canvas repainted every
               node and nothing on screen said what the colours meant. */
            const legend = screen.getByLabelText("Legend");

            expect(within(legend).getByText("Color: Groups")).toBeInTheDocument();
            expect(within(legend).getByText("Communities, Louvain", { exact: false })).toBeInTheDocument();
            expect(within(legend).getByText("Group 1")).toBeInTheDocument();
            /* Eight colours, because the palette cycles past eight -- so eight of the four
               groups' layers is four, one per group, and each is tagged with the run's own
               source so Delete layer can take them all away together. */
            expect(
                graph.styleManager.getLayers().filter((layer) => layer.metadata?.algorithmSource === "graphty:louvain"),
            ).toHaveLength(4);
        });

        it("leaves exactly one undoable history entry for a card click", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container);
            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);

            const strip = container.querySelector('[data-canvas-overlay="insights"]') as HTMLElement;

            fireEvent.click(within(strip).getByText("Find groups"));
            await flushMicrotasks();

            fireEvent.click(screen.getByRole("button", { name: "History" }));

            /* Spec 7.1 item 2: ONE entry. The encoding does not get a second one, because
               nothing in this build can undo a style layer independently of the result, and
               a row whose Undo does nothing is worse than no row. */
            expect(await screen.findByText("1 entry, 0 undone")).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Undo" })).toBeEnabled();
        });

        it("loads and runs the suggested card from the sample's own hint, in one interaction", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);

            const graph = installNovicePathGraph(container);

            fireEvent.click(container.querySelector('[data-sample-hint="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);

            /* The order is the point: the degree pass and the neutral base land first, so
               the group colours are painted OVER them rather than under them. */
            expect(graph.runAlgorithm).toHaveBeenCalledWith(DEGREE_NAMESPACE, DEGREE_TYPE);
            expect(graph.runAlgorithm.mock.calls.map((call) => call[1])).toEqual([DEGREE_TYPE, COMMUNITY_TYPE]);
            expect(screen.getByRole("region", { name: "Analyze" })).toBeInTheDocument();
        });

        it("does not run the suggested card when the row itself was clicked", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);

            const graph = installNovicePathGraph(container);

            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);

            expect(graph.runAlgorithm.mock.calls.map((call) => call[1])).toEqual([DEGREE_TYPE]);
        });

        it("hides the strip from its own X, and remembers it", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container);
            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);

            fireEvent.click(screen.getByRole("button", { name: "Hide suggestions" }));

            expect(container.querySelector('[data-canvas-overlay="insights"]')).toBeNull();
        });

        it("takes the 7.2 decisions when the load reports COMPLETE, not on its first chunk", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);

            const graph = installNovicePathGraph(container);

            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await flushMicrotasks();

            /* The records are on the graph and the shell has read them, which is the
               state after the FIRST chunk of a chunked load: `DataManager` adds each
               chunk and emits `data-added` with an await between them. Nothing 7.2
               decides may be decided here. On a file over about a thousand nodes this is
               a fraction of the graph, and the layout, the label budget, the size scale,
               Most connected and the Search example would every one of them be measured
               over that fraction and never corrected -- so the above-threshold
               Performance branch could never be selected at all. */
            expect(graph.runAlgorithm).not.toHaveBeenCalled();
            expect(graph.styleManager.getLayers()).toHaveLength(ELEMENT_OWN_LAYER_COUNT + 0);

            await reportLoadComplete(container);

            expect(graph.runAlgorithm.mock.calls.map((call) => call[1])).toEqual([DEGREE_TYPE]);
            expect(graph.styleManager.getLayers()).toHaveLength(ELEMENT_OWN_LAYER_COUNT + 1);
        });

        it("crosses the dataset boundary on a sample load, so a second sample replaces the first", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);

            const graph = installNovicePathGraph(container);

            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);

            expect(graph.styleManager.getLayers()).toHaveLength(ELEMENT_OWN_LAYER_COUNT + 1);

            /* From the Data panel's Sample datasets section, which is the only place a
               sample row still exists once the canvas has left the Empty state -- and so
               the surface the defect was reported from. */
            fireEvent.click(screen.getByRole("button", { name: "Data" }));
            fireEvent.click(within(screen.getByRole("region", { name: "Data" })).getByText("College football"));
            await flushMicrotasks();

            /* A sample load is a REPLACING load, so it takes 6.12's boundary by
               `handleLoad`'s own route: the records go, and the layers that encoded them
               go with them. Before this the shell renamed the dataset in the top bar
               while the old graph stayed on the canvas -- asserting a dataset that was
               never loaded -- and stacked a second set of 7.2 layers on the first. */
            /* Twice, not once: the load from Welcome took the same route, over a graph
               that held nothing -- one rule for every replacing load (6.12), and a clear
               of an empty graph costs nothing. */
            expect(graph.dataManager.clear).toHaveBeenCalledTimes(2);
            expect(graph.styleManager.getLayers()).toHaveLength(ELEMENT_OWN_LAYER_COUNT + 0);
            expect(screen.getByText("football.gml")).toBeInTheDocument();

            /* And the element's OWN layers are still there. The boundary removes what the
               shell tagged and nothing else: an earlier version walked the stack by index,
               which took the `default` layer -- and with it every node's shape type -- so
               the next load died in mesh building and drew nothing at all. */
            expect(graph.styleManager.getLayers().map((layer) => layer.metadata?.name)).toEqual([
                "default",
                "selection",
            ]);

            await reportLoadComplete(container);

            // And the new dataset gets its OWN defaults: the one-shot went with the
            // boundary, so a second load is not a load with no defaults at all.
            expect(graph.runAlgorithm.mock.calls.map((call) => call[1])).toEqual([DEGREE_TYPE, DEGREE_TYPE]);
            expect(graph.styleManager.getLayers()).toHaveLength(ELEMENT_OWN_LAYER_COUNT + 1);
        });

        it("replaces the community layers on a re-run rather than stacking a second set", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);

            const graph = installNovicePathGraph(container);

            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);

            for (const run of [1, 2]) {
                const strip = container.querySelector('[data-canvas-overlay="insights"]') as HTMLElement;

                expect(strip).not.toBeNull();
                fireEvent.click(within(strip).getByText("Find groups"));
                await flushMicrotasks();

                /* One result owns one set of layers, whichever run produced it: the four
                   group colours are replaced, not appended, so the graph never carries
                   two full stacks of community colours for one reading. */
                expect(
                    graph.styleManager
                        .getLayers()
                        .filter((layer) => layer.metadata?.algorithmSource === "graphty:louvain"),
                ).toHaveLength(4);
                expect(graph.styleManager.getLayers()).toHaveLength(ELEMENT_OWN_LAYER_COUNT + 5);
                expect(run).toBeGreaterThan(0);
            }
        });

        it("counts every ranked node in See all N ranked, not the five rows above it", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container);
            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);
            fireEvent.click(screen.getByRole("button", { name: "Toggle inspector" }));

            /* The degree pass ranked all 20 nodes and Most connected draws the top five.
               The link opens the table on the ranked LIST, so it says how long that list
               is; "See all 5 ranked" would be the five rows already on screen. */
            const inspector = screen.getByTestId("inspector");

            expect(within(inspector).getByText("See all 20 ranked")).toBeInTheDocument();
        });

        it("draws the degree histogram from the pass, over the axis the degrees span", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container);
            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);
            fireEvent.click(screen.getByRole("button", { name: "Toggle inspector" }));

            const inspector = screen.getByTestId("inspector");
            const values = within(inspector).getByTestId("histogram-values");

            /* The fixture's own distribution: 5 nodes of degree 2, 12 of degree 3 and 3
               of degree 4. The row is drawn either way -- `GraphSummary` renders it
               inside Most connected -- so an empty bin list is not an absent histogram
               but a 0-to-0 axis with no bar, which claims a distribution of nothing. */
            expect(inspector.querySelectorAll('[data-testid="histogram-bar"]')).toHaveLength(3);
            expect(within(values).getByText("2 links: 5 nodes")).toBeInTheDocument();
            expect(within(values).getByText("3 links: 12 nodes")).toBeInTheDocument();
            expect(within(values).getByText("4 links: 3 nodes")).toBeInTheDocument();

            const axis = within(inspector).getByTestId("chart-axis");

            expect(axis).toHaveTextContent("2");
            expect(axis).toHaveTextContent("4");
        });

        it("says only what it measured in the Counts Type row", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container);
            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);
            fireEvent.click(screen.getByRole("button", { name: "Toggle inspector" }));

            /* No edge record in the JSON fixture carries a `directed` key, so the O(n+m)
               pass read no direction and the row says so. `graphInfo.graphType.directed`
               defaults to TRUE and measures nothing, and the row used to print it. */
            const inspector = screen.getByTestId("inspector");

            expect(within(inspector).getByText("Not stated in the file")).toBeInTheDocument();
            expect(within(inspector).queryByText("Directed (from file)")).toBeNull();
        });

        it("retires the suggested card once the sample's hint has run it", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container);
            fireEvent.click(container.querySelector('[data-sample-hint="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);

            /* Spec 5643-5648: the hint's click ends "one undoable history entry, that
               card retired". The reader has been taken where the card would have taken
               them, so the card has done its job -- and Search, which nothing ran, is
               still offered. */
            const strip = container.querySelector('[data-canvas-overlay="insights"]') as HTMLElement;

            expect(strip).not.toBeNull();
            expect(within(strip).queryByText("Find groups")).toBeNull();
            expect(within(strip).getByText("Search for something you know")).toBeInTheDocument();
        });

        it("draws the same size string in the Data panel's sample rows as on the canvas", async () => {
            await renderMeasuredShell();

            fireEvent.click(screen.getByRole("button", { name: "Data" }));

            const panel = screen.getByRole("region", { name: "Data" });

            /* Spec 5648: "The same size string ("20 nodes, 29 edges") appears in the
               panel and the canvas." One manifest, one formatter, both surfaces. */
            for (const record of SAMPLE_MANIFEST) {
                expect(within(panel).getByText(expectedPanelSampleValue(record))).toBeInTheDocument();
            }

            expect(within(panel).getByText("20 nodes, 29 edges. Weighted")).toBeInTheDocument();
        });

        /* The Style panel's layer list has carried `onLayerSelect` and a selected-row
           highlight since the shell was built, and `InspectorBody` has drawn the
           style-layer kind for just as long -- but nothing ever CONSTRUCTED that kind, so
           picking a layer highlighted a row and opened nothing. The layer's own properties
           were unreachable: the panel could reorder and rename and no more. */
        it("opens the style-layer surface when a layer is picked in the Style panel", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container);
            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);

            /* The element emits `style-changed` when a layer is added, and the shell
               re-reads its list from it; the stub adds layers without emitting, so the
               board says so itself rather than asserting against a stale list. */
            act(() => {
                container.querySelector("graphty-element")?.dispatchEvent(new CustomEvent("style-changed"));
            });

            fireEvent.click(screen.getByRole("button", { name: "Style" }));

            const panel = screen.getByRole("region", { name: "Style" });

            fireEvent.click(within(panel).getByText("Top degree labels"));
            fireEvent.click(screen.getByRole("button", { name: "Toggle inspector" }));

            const inspector = screen.getByTestId("inspector");

            // The header names the surface...
            expect(within(inspector).getByText("Style layer")).toBeInTheDocument();

            /* ...and the BODY draws it. Asserting only the header passed while the two
               disagreed: `selectionKind` feeds the title and `inspectorSelection` feeds the
               body, and the memo was missing `selectedLayerId` from its deps, so the title
               read "Style layer" over the graph summary's own rows. The graph summary's
               opening sentence is the sharpest witness that the wrong body is drawn. */
            expect(within(inspector).queryByText(/connected by 29 relationships/)).toBeNull();
            expect(within(inspector).queryByText("Most connected")).toBeNull();
        });

        it("retires a card from Delete on it, without touching the strip", async () => {
            const { container } = await renderMeasuredShell();

            captureLoads(container);
            installNovicePathGraph(container);
            fireEvent.click(container.querySelector('[data-sample-row="cat-social-network"]') as HTMLElement);
            await reportLoadComplete(container);

            const strip = container.querySelector('[data-canvas-overlay="insights"]') as HTMLElement;

            within(strip).getByText("Find groups").closest("button")?.focus();
            fireEvent.keyDown(strip, { key: "Delete" });

            const after = container.querySelector('[data-canvas-overlay="insights"]') as HTMLElement;

            expect(after).not.toBeNull();
            expect(within(after).queryByText("Find groups")).toBeNull();
            expect(within(after).getByText("Search for something you know")).toBeInTheDocument();
        });
    });
});
