import { PopoutManager } from "@graphty/compact-mantine";
import React, { useRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen, within } from "../../../../test/test-utils";
import { HistoryPopover, type HistoryPopoverProps } from "../HistoryPopover";
import { XR_VOICE_PROVENANCE } from "../topBarStrings";
import { type HistoryEntry, historyRows,type UndoStoreState } from "../undoStore";

const at = (hours: number, minutes: number): number => new Date(2026, 8, 4, hours, minutes).getTime();

const makeEntry = (id: string, overrides: Partial<HistoryEntry> = {}): HistoryEntry => ({
    id,
    category: "algorithmResult",
    title: `Step ${id}`,
    activity: "analyze",
    activityLabel: "Analyze",
    at: at(14, 15),
    ...overrides,
});

const STATE: UndoStoreState = {
    entries: [
        makeEntry("import", {
            category: "import",
            title: "Import fraud-ring-synthetic.csv",
            activity: "data",
            activityLabel: "Data",
            destinationTitle: "Open in Data",
            at: at(14, 2),
        }),
        makeEntry("bridges", {
            title: "Ran Bridges (betweenness)",
            destinationTitle: "Ran Bridges (betweenness). Opens Analyze at its card",
            at: at(14, 15),
        }),
        makeEntry("hubs", {
            category: "styleLayerOrEncoding",
            title: 'Style layer "Hubs" edited',
            activity: "style",
            activityLabel: "Style",
            destinationTitle: "Style layer Hubs edited. Opens Style with the Hubs layer selected",
            at: at(14, 18),
        }),
    ],
    currentIndex: 1,
};

type HarnessProps = Omit<HistoryPopoverProps, "anchorRef" | "barRef">;

function Harness(props: HarnessProps): React.JSX.Element {
    const barRef = useRef<HTMLElement>(null);
    const anchorRef = useRef<HTMLDivElement>(null);

    return (
        <PopoutManager>
            <header ref={barRef} style={{ height: 40 }}>
                <div ref={anchorRef} style={{ width: 44, height: 24 }} />
            </header>
            <HistoryPopover {...props} anchorRef={anchorRef} barRef={barRef} />
        </PopoutManager>
    );
}

const renderPopover = (overrides: Partial<HarnessProps> = {}) => {
    const props: HarnessProps = {
        opened: true,
        rows: historyRows(STATE),
        entryCount: STATE.entries.length,
        undoneCount: 1,
        onOpenChange: vi.fn(),
        onRestore: vi.fn(),
        onOpenOwningPanel: vi.fn(),
        ...overrides,
    };

    render(<Harness {...props} />);

    return props;
};

describe("HistoryPopover", () => {
    describe("the surface", () => {
        it("draws nothing while it is closed", () => {
            renderPopover({ opened: false });

            expect(screen.queryByRole("dialog", { name: "History" })).not.toBeInTheDocument();
        });

        it("opens as a pop-out named History", () => {
            renderPopover();

            const dialog = screen.getByRole("dialog", { name: "History" });

            expect(dialog).toBeInTheDocument();
            expect(dialog).toHaveAttribute("aria-modal", "false");
        });

        it("prints the state line beside its name", () => {
            renderPopover({ entryCount: 12, undoneCount: 6 });

            expect(screen.getByText("12 entries, 6 undone")).toBeInTheDocument();
        });

        it("carries the register's close X", () => {
            const props = renderPopover();

            fireEvent.click(screen.getByRole("button", { name: "Close (Esc)" }));

            expect(props.onOpenChange).toHaveBeenCalledWith(false);
        });

        it("does not repeat Undo and Redo, which sit in the bar above it", () => {
            renderPopover();

            const dialog = screen.getByRole("dialog", { name: "History" });

            expect(within(dialog).queryByRole("button", { name: /^Undo/ })).not.toBeInTheDocument();
            expect(within(dialog).queryByRole("button", { name: /^Redo/ })).not.toBeInTheDocument();
        });
    });

    describe("the rows", () => {
        it("runs newest first", () => {
            renderPopover();

            const dialog = screen.getByRole("dialog", { name: "History" });
            const items = within(dialog).getAllByRole("listitem");

            expect(items).toHaveLength(3);
            expect(items[0]).toHaveTextContent('Style layer "Hubs" edited');
            expect(items[1]).toHaveTextContent("Ran Bridges (betweenness)");
            expect(items[2]).toHaveTextContent("Import fraud-ring-synthetic.csv");
        });

        it("marks the current position", () => {
            renderPopover();

            const items = within(screen.getByRole("dialog", { name: "History" })).getAllByRole(
                "listitem",
            );

            expect(items[1]).toHaveAttribute("aria-current", "true");
            expect(within(items[1]).getByText("Current")).toBeInTheDocument();
            expect(items[0]).not.toHaveAttribute("aria-current");
        });

        it("strikes an undone row through rather than dimming it", () => {
            renderPopover();

            const undoneTitle = screen.getByRole("button", {
                name: "Style layer Hubs edited. Opens Style with the Hubs layer selected",
            });

            expect(getComputedStyle(undoneTitle).textDecorationLine).toContain("line-through");
        });

        it("names the owning activity and the time in their own columns", () => {
            renderPopover();

            const items = within(screen.getByRole("dialog", { name: "History" })).getAllByRole(
                "listitem",
            );

            expect(within(items[2]).getByText("Data")).toBeInTheDocument();
            expect(within(items[2]).getByText("14:02")).toBeInTheDocument();
        });

        it("restores that point when the row is clicked", () => {
            const props = renderPopover();

            fireEvent.click(screen.getByRole("button", { name: "Import fraud-ring-synthetic.csv" }));

            expect(props.onRestore).toHaveBeenCalledTimes(1);
            expect(props.onOpenOwningPanel).not.toHaveBeenCalled();
        });

        it("opens the panel that owns the step when its title is clicked", () => {
            const props = renderPopover();

            fireEvent.click(screen.getByRole("button", { name: "Open in Data" }));

            expect(props.onOpenOwningPanel).toHaveBeenCalledTimes(1);
            expect(props.onRestore).not.toHaveBeenCalled();
        });

        it("previews that point while a row is hovered", () => {
            const onPreview = vi.fn();

            renderPopover({ onPreview });

            const items = within(screen.getByRole("dialog", { name: "History" })).getAllByRole(
                "listitem",
            );

            fireEvent.mouseEnter(items[0]);

            expect(onPreview).toHaveBeenLastCalledWith(
                expect.objectContaining({ id: "hubs" }),
            );

            fireEvent.mouseLeave(items[0]);

            expect(onPreview).toHaveBeenLastCalledWith(null);
        });
    });

    describe("an XR session", () => {
        const xrState: UndoStoreState = {
            entries: [
                makeEntry("flag", {
                    title: "Flagged merch-88",
                    activity: "explore",
                    activityLabel: "Explore",
                    destinationTitle: "Open in Explore",
                    xrSessionId: "vr",
                    xrSessionLabel: "VR session 14:21 - 14:39",
                    at: at(14, 26),
                }),
                makeEntry("note", {
                    title: "Note on acct-4471",
                    activity: "explore",
                    activityLabel: "Explore",
                    destinationTitle: "Open in Explore",
                    provenance: XR_VOICE_PROVENANCE,
                    xrSessionId: "vr",
                    xrSessionLabel: "VR session 14:21 - 14:39",
                    at: at(14, 32),
                }),
            ],
            currentIndex: 1,
        };

        it("collapses the session into one group carrying its step count", () => {
            renderPopover({ rows: historyRows(xrState), entryCount: 2, undoneCount: 0 });

            const group = screen.getByRole("button", { expanded: true });

            expect(group).toHaveTextContent("VR session 14:21 - 14:39");
            expect(group).toHaveTextContent("2 steps");
        });

        it("carries a voice-taken step's provenance on a second line", () => {
            renderPopover({ rows: historyRows(xrState), entryCount: 2, undoneCount: 0 });

            expect(screen.getByText("by voice, in VR")).toBeInTheDocument();
        });

        it("hides its steps when the group is collapsed", () => {
            renderPopover({ rows: historyRows(xrState), entryCount: 2, undoneCount: 0 });

            fireEvent.click(screen.getByRole("button", { expanded: true }));

            expect(screen.queryByText("Note on acct-4471")).not.toBeInTheDocument();
        });
    });
});
