import { afterEach, describe, expect, it, vi } from "vitest";

import { act, fireEvent, render, screen, within } from "../../../test/test-utils";
import { AppShell } from "../AppShell";
import { ACTIVITY_RAIL_WIDTH, NARROW_BREAKPOINT, STATUS_BAR_HEIGHT, TOP_BAR_HEIGHT } from "../constants";
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
    node?: { selector: string; style: Record<string, unknown> };
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

    const manager: FakeStyleManager = {
        getLayers: () => layers,
        updateLayerByIndex: vi.fn(() => true),
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
});
