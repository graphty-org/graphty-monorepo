import { PopoutManager } from "@graphty/compact-mantine";
import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "../../../../test/test-utils";
import { keyChipFor } from "../../bindings";
import { TopBar, type TopBarOwnProps } from "../TopBar";
import { historyRows, type UndoStoreState } from "../undoStore";

const baseProps: TopBarOwnProps = {
    datasetName: "cat-social-network.json",
    dataLoaded: true,
    canUndo: true,
    canRedo: false,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onOpenHistory: vi.fn(),
    onOpenCommandPalette: vi.fn(),
    onExport: vi.fn(),
    onShare: vi.fn(),
    compareActive: false,
    onToggleCompare: vi.fn(),
    sidebarsShown: true,
    onToggleSidebars: vi.fn(),
};

const renderTopBar = (overrides: Partial<TopBarOwnProps> = {}): TopBarOwnProps => {
    const props: TopBarOwnProps = {
        ...baseProps,
        onUndo: vi.fn(),
        onRedo: vi.fn(),
        onOpenHistory: vi.fn(),
        onOpenCommandPalette: vi.fn(),
        onExport: vi.fn(),
        onShare: vi.fn(),
        onToggleCompare: vi.fn(),
        onToggleSidebars: vi.fn(),
        ...overrides,
    };

    render(
        <PopoutManager>
            <TopBar {...props} />
        </PopoutManager>,
    );

    return props;
};

describe("TopBar", () => {
    describe("the left slot", () => {
        it("owns the dataset name", () => {
            renderTopBar();

            expect(screen.getByText("cat-social-network.json")).toBeInTheDocument();
        });

        it("draws no name in the Empty state", () => {
            renderTopBar({ datasetName: null, dataLoaded: false });

            expect(screen.queryByText("cat-social-network.json")).not.toBeInTheDocument();
        });
    });

    describe("the bar's inventory", () => {
        it("draws eight controls and nothing else", () => {
            renderTopBar();

            /* Eight until 2026-09-12, when the panel's own switch joined the inspector's;
               nine until 2026-09-14, when both were replaced by ONE sidebars switch at the
               product owner's direction ("there is one button to hide / show both at the
               same time and not individual buttons"). */
            expect(screen.getAllByRole("button")).toHaveLength(8);
        });

        it("draws no saved or unsaved indicator", () => {
            renderTopBar();

            expect(screen.getByRole("banner").textContent ?? "").not.toMatch(/saved/i);
        });

        it("draws no hamburger", () => {
            renderTopBar();

            expect(screen.queryByRole("button", { name: /menu/i })).not.toBeInTheDocument();
        });
    });

    describe("the centre slot", () => {
        it("draws undo, its History caret, redo and the palette pill", () => {
            renderTopBar();

            expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "History" })).toBeInTheDocument();
            expect(
                screen.getByRole("button", { name: "Redo. Nothing to redo yet" }),
            ).toBeInTheDocument();
            expect(screen.getByText("Search commands, nodes and edges")).toBeInTheDocument();
        });

        it("prints the palette pill's chip from the one binding table", () => {
            renderTopBar();

            const chord = keyChipFor("commandPalette");

            expect(chord).not.toBeNull();
            expect(screen.getByText(chord ?? "")).toBeInTheDocument();
        });

        it("opens the command palette from the pill", () => {
            const props = renderTopBar();

            fireEvent.click(screen.getByText("Search commands, nodes and edges"));

            expect(props.onOpenCommandPalette).toHaveBeenCalledTimes(1);
        });

        it("undoes and redoes through its own callbacks", () => {
            const props = renderTopBar({ canRedo: true });

            fireEvent.click(screen.getByRole("button", { name: "Undo" }));
            fireEvent.click(screen.getByRole("button", { name: "Redo" }));

            expect(props.onUndo).toHaveBeenCalledTimes(1);
            expect(props.onRedo).toHaveBeenCalledTimes(1);
        });
    });

    describe("the right slot", () => {
        it("draws Export, Share, Compare and the one sidebars switch in that order", () => {
            renderTopBar();

            const names = screen.getAllByRole("button").map((button) => button.getAttribute("aria-label"));

            expect(names.slice(4)).toEqual(["Export", "Share this view", "Compare two views", "Toggle sidebars"]);
        });

        it("opens Export onto exactly two rows", async () => {
            const props = renderTopBar();

            fireEvent.click(screen.getByRole("button", { name: "Export" }));

            const rows = await screen.findAllByRole("menuitem");

            expect(rows.map((row) => row.textContent)).toEqual(["Image", "Data"]);

            fireEvent.click(rows[0]);

            expect(props.onExport).toHaveBeenCalledWith("image");
        });

        it("never draws Share without its menu", async () => {
            const props = renderTopBar();

            fireEvent.click(screen.getByRole("button", { name: "Share this view" }));

            const rows = await screen.findAllByRole("menuitem");

            expect(rows.map((row) => row.textContent)).toEqual(["Export data", "Copy image"]);

            fireEvent.click(rows[1]);

            expect(props.onShare).toHaveBeenCalledWith("copy-image");
        });

        it("expresses Compare and the sidebars as toggles that never rename themselves", () => {
            renderTopBar({ compareActive: true, sidebarsShown: false });

            expect(screen.getByRole("button", { name: "Compare two views" })).toHaveAttribute("aria-pressed", "true");
            expect(screen.getByRole("button", { name: "Toggle sidebars" })).toHaveAttribute("aria-pressed", "false");
        });

        it("lights the one switch while the sidebars are on screen", () => {
            renderTopBar({ sidebarsShown: true });

            expect(screen.getByRole("button", { name: "Toggle sidebars" })).toHaveAttribute("aria-pressed", "true");
        });

        it("draws no per-region switch of its own", () => {
            renderTopBar();

            expect(screen.queryByRole("button", { name: "Toggle panel" })).toBeNull();
            expect(screen.queryByRole("button", { name: "Toggle inspector" })).toBeNull();
        });

        it("reports the sidebars switch through its own callback", () => {
            const props = renderTopBar();

            fireEvent.click(screen.getByRole("button", { name: "Toggle sidebars" }));

            expect(props.onToggleSidebars).toHaveBeenCalledTimes(1);
        });

        it("carries the sidebars binding in the title and not in the name", () => {
            renderTopBar();

            const toggle = screen.getByRole("button", { name: "Toggle sidebars" });

            expect(toggle).toHaveAccessibleName("Toggle sidebars");
            expect(keyChipFor("toggleSidebars")).toBe("Ctrl+B");
        });
    });

    describe("the Empty state", () => {
        it("states the reason on Export, Share and Compare", () => {
            renderTopBar({ datasetName: null, dataLoaded: false });

            expect(
                screen.getByRole("button", { name: "Export. Load data first" }),
            ).toHaveAttribute("aria-disabled", "true");
            expect(
                screen.getByRole("button", { name: "Share this view. Load data first" }),
            ).toHaveAttribute("aria-disabled", "true");
            expect(
                screen.getByRole("button", { name: "Compare two views. Load data first" }),
            ).toHaveAttribute("aria-disabled", "true");
        });

        it("opens no menu from a disabled Export or Share", () => {
            renderTopBar({ datasetName: null, dataLoaded: false });

            fireEvent.click(screen.getByRole("button", { name: "Export. Load data first" }));
            fireEvent.click(screen.getByRole("button", { name: "Share this view. Load data first" }));

            expect(screen.queryAllByRole("menuitem")).toHaveLength(0);
        });

        it("leaves the sidebars toggle enabled", () => {
            renderTopBar({ datasetName: null, dataLoaded: false });

            expect(screen.getByRole("button", { name: "Toggle sidebars" })).not.toHaveAttribute("aria-disabled");
        });
    });

    describe("the History pop-out", () => {
        const state: UndoStoreState = {
            entries: [
                {
                    id: "import",
                    category: "import",
                    title: "Import fraud-ring-synthetic.csv",
                    activity: "data",
                    activityLabel: "Data",
                    at: new Date(2026, 8, 4, 14, 2).getTime(),
                    destinationTitle: "Open in Data",
                },
            ],
            currentIndex: 0,
        };

        it("stays closed until a route opens it", () => {
            renderTopBar();

            expect(screen.queryByRole("dialog", { name: "History" })).not.toBeInTheDocument();
        });

        it("opens from the caret half and reports it", () => {
            const props = renderTopBar({
                history: {
                    rows: historyRows(state),
                    entryCount: 1,
                    undoneCount: 0,
                    onRestore: vi.fn(),
                    onOpenOwningPanel: vi.fn(),
                },
            });

            fireEvent.click(screen.getByRole("button", { name: "History" }));

            expect(props.onOpenHistory).toHaveBeenCalledTimes(1);
            expect(screen.getByRole("dialog", { name: "History" })).toBeInTheDocument();
            expect(screen.getByText("1 entry, 0 undone")).toBeInTheDocument();
        });

        it("reads zero entries honestly when no store is supplied", () => {
            renderTopBar();

            fireEvent.click(screen.getByRole("button", { name: "History" }));

            expect(screen.getByText("0 entries, 0 undone")).toBeInTheDocument();
        });
    });
});
