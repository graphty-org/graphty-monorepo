import { PopoutManager } from "@graphty/compact-mantine";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "../../../../test/test-utils";
import { ShellProvider } from "../../ShellContext";
import { NodeInspector, type NodeInspectorProps } from "../NodeInspector";

function Harness({ children }: { children: React.ReactNode }) {
    return (
        <PopoutManager>
            <ShellProvider initialShellWidth={1440} measureViewport={false} persist={false}>
                {children}
            </ShellProvider>
        </PopoutManager>
    );
}

const defaultProps: NodeInspectorProps = {
    nodeId: "acct-4412",
    label: "Mr_Whiskers",
    attributes: { name: "Mr_Whiskers", age: 4 },
    attributeCount: 2,
    metrics: [
        {
            metricId: "betweenness",
            name: "Bridges (betweenness)",
            value: 4212,
            display: "4,212, top 0.4%",
            percentile: 99.6,
            rank: "#6",
        },
    ],
    notes: [
        {
            id: "n1",
            author: "Adam",
            relativeTime: "2 days ago",
            timestamp: "2026-09-02 10:14",
            text: "Seen at the vet twice",
            done: false,
        },
        {
            id: "n2",
            author: "Adam",
            relativeTime: "a week ago",
            timestamp: "2026-08-28 09:02",
            text: "Checked",
            done: true,
        },
    ],
    neighborCount: 37,
    neighborBreakdown: [
        { edgeType: "play", count: "20" },
        { edgeType: "social", count: "17" },
    ],
    neighbors: [{ id: "2", label: "The_Vet", edgeType: "medical", value: "4" }],
    onCopyId: vi.fn(),
    onLocate: vi.fn(),
    onShowAllAttributes: vi.fn(),
    onAddNote: vi.fn(),
    onToggleNoteDone: vi.fn(),
    onDeleteNote: vi.fn(),
    onSelectNeighbor: vi.fn(),
    onNoteRelationship: vi.fn(),
    onShowNeighborsInTable: vi.fn(),
    onSelectNeighbors: vi.fn(),
    onSeeAllNeighbors: vi.fn(),
    onAction: vi.fn(),
};

function renderNode(overrides: Partial<NodeInspectorProps> = {}) {
    return render(
        <Harness>
            <NodeInspector {...defaultProps} {...overrides} />
        </Harness>,
    );
}

describe("NodeInspector", () => {
    describe("the header block", () => {
        it("draws the node's own label", () => {
            renderNode();

            expect(screen.getByTestId("node-label")).toHaveTextContent("Mr_Whiskers");
        });

        it("draws the id beside the label when the two differ", () => {
            renderNode();

            expect(screen.getByTestId("node-id")).toHaveTextContent("acct-4412");
        });

        it("drops the id row when the label is the id", () => {
            renderNode({ label: "acct-4412" });

            expect(screen.queryByTestId("node-id")).not.toBeInTheDocument();
        });

        it("offers a copy-id control and a Locate control", () => {
            renderNode();

            expect(screen.getByRole("button", { name: "Copy id" })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Locate" })).toBeInTheDocument();
        });

        it("draws no subtitle while nothing is filtering the graph", () => {
            renderNode();

            expect(screen.queryByTestId("node-subtitle")).not.toBeInTheDocument();
        });

        it("draws the subtitle while a filter, window or subset is active", () => {
            renderNode({ subtitle: "Selected 1 of 120,000 visible (1,000,000 total)" });

            expect(screen.getByTestId("node-subtitle")).toHaveTextContent(
                "Selected 1 of 120,000 visible (1,000,000 total)",
            );
        });

        it("offers Unpin only once the node has been dragged", () => {
            renderNode({ pinnedToCanvas: true, onUnpinFromCanvas: vi.fn() });

            expect(screen.getByTestId("node-pinned-badge")).toHaveTextContent("Pinned");
            expect(screen.getByTestId("node-unpin")).toHaveAccessibleName("Unpin");
        });
    });

    describe("computed metrics", () => {
        it("draws one row with its rank chip and its percentile bar", () => {
            renderNode();

            expect(screen.getByText("Bridges (betweenness)")).toBeInTheDocument();
            expect(screen.getByTestId("rank-chip")).toHaveTextContent("#6");
        });

        it("draws no section when nothing includes this node", () => {
            renderNode({ metrics: [] });

            expect(screen.queryByText("Bridges (betweenness)")).not.toBeInTheDocument();
        });
    });

    describe("notes", () => {
        it("names the note input and carries its binding in the name only when it shipped", () => {
            renderNode();

            const input = screen.getByTestId("node-note-input");

            expect(input.getAttribute("aria-label")).toMatch(/^Add a note/);
        });

        it("saves on the platform key plus Enter", () => {
            const onAddNote = vi.fn();
            renderNode({ onAddNote });

            const input = screen.getByTestId("node-note-input");
            fireEvent.change(input, { target: { value: "Worth a look" } });
            fireEvent.keyDown(input, { key: "Enter", metaKey: true });

            expect(onAddNote).toHaveBeenCalledWith("Worth a look");
        });

        it("collapses done notes under their count", () => {
            renderNode();

            expect(screen.getByTestId("node-done-notes")).toHaveTextContent("1 done");
        });
    });

    describe("neighbors", () => {
        it("draws the breakdown by edge type", () => {
            renderNode();

            expect(screen.getByTestId("neighbor-summary")).toHaveTextContent("37: 20 play, 17 social");
        });

        it("adds the per-group breakdown as one row rather than two", () => {
            renderNode({ groupSummary: "in 4 groups: group 3 holds 71%" });

            expect(screen.getByTestId("neighbor-summary")).toHaveTextContent(
                "37: 20 play, 17 social; in 4 groups: group 3 holds 71%",
            );
        });

        it("caps the breakdown at the top five types and says how many it stood down", () => {
            renderNode({
                neighborBreakdown: [
                    { edgeType: "logon", count: "9,100" },
                    { edgeType: "process", count: "3,380" },
                    { edgeType: "file", count: "12" },
                    { edgeType: "dns", count: "8" },
                    { edgeType: "http", count: "4" },
                    { edgeType: "smb", count: "2" },
                ],
            });

            expect(screen.getByTestId("neighbor-summary")).toHaveTextContent("1 more types");
            expect(screen.getByTestId("neighbor-summary")).not.toHaveTextContent("smb");
        });

        it("draws the In, Out and All tabs with their own counts on a directed graph", () => {
            renderNode({ directed: true, neighborTabCounts: { in: "17", out: "20", all: "37" } });

            expect(screen.getByRole("tab", { name: "In 17" })).toBeInTheDocument();
            expect(screen.getByRole("tab", { name: "Out 20" })).toBeInTheDocument();
            expect(screen.getByRole("tab", { name: "All 37" })).toBeInTheDocument();
        });

        it("offers See all N and the two list verbs", () => {
            renderNode();

            expect(screen.getByRole("button", { name: "See all 37" })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Show all in data table" })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Select these" })).toBeInTheDocument();
        });
    });

    describe("the actions block", () => {
        it("states what Expand neighbors will do and what it will cost", () => {
            renderNode();

            expect(screen.getByRole("button", { name: "Expand 37 neighbors" })).toBeInTheDocument();
            expect(screen.getAllByTestId("inspector-action-cost")[0]).toHaveTextContent("Adds 37 nodes");
        });

        it("switches to the choose-which form above the threshold", () => {
            renderNode({ neighborCount: 12412 });

            expect(
                screen.getByRole("button", { name: "Expand top 50 of 12,412 by weight (Choose which)" }),
            ).toBeInTheDocument();
        });

        it("keeps the expand-all warning beside the expand-all verb", () => {
            renderNode({ neighborCount: 12412 });

            expect(screen.getByRole("button", { name: "Expand all anyway" })).toBeInTheDocument();
            expect(screen.getByText("All 12,412 may slow the canvas down")).toBeInTheDocument();
        });

        it("caps the drawn rows at four and keeps every other verb in More", () => {
            renderNode();

            // DECISIONS-1.8 D4. The block is pinned outside the scroll region, so a
            // row it draws is a row the content above it does not get; sixteen of
            // them left the neighbours list a sliver.
            const drawn = screen.getAllByTestId("inspector-action");
            expect(drawn.map((row) => row.textContent)).toEqual([
                "Expand 37 neighbors",
                "Frame this node",
                "Select neighbors",
                "Find path from here",
            ]);

            expect(screen.getByTestId("inspector-actions-more")).toBeInTheDocument();
        });

        it("draws no Coming tag resident, because no verb it draws is unshipped", () => {
            renderNode();

            expect(screen.queryByTestId("unshipped-group-mark")).not.toBeInTheDocument();
            expect(screen.queryByTestId("coming-tag")).not.toBeInTheDocument();
        });

        it("disables every unshipped verb instead of wiring it to nothing", async () => {
            renderNode();

            fireEvent.click(screen.getByTestId("inspector-actions-more"));

            expect(await screen.findByRole("menuitem", { name: "Ego network" })).toHaveAttribute("data-disabled");
            expect(screen.getByRole("menuitem", { name: "Merge with..." })).toHaveAttribute("data-disabled");
            expect(screen.getByRole("button", { name: "Frame this node" })).toBeEnabled();
        });

        it("keeps every verb reachable, in full text, under More", async () => {
            renderNode();

            fireEvent.click(screen.getByTestId("inspector-actions-more"));
            await screen.findByRole("menuitem", { name: "Ego network" });

            const held = screen.getAllByRole("menuitem").map((row) => row.textContent);
            expect(held).toEqual([
                "Ego network",
                "Radial layout around this node",
                "Use as root or focus",
                "Pin",
                "Distance from here",
                "Likely missing links from here",
                "Simulate removing",
                "Merge with...",
                "Tag...",
                "Bookmark this node",
                "Show in table",
                "Copy as JSON",
                "Copy neighbor ids",
            ]);
        });

        it("runs a shipped verb", () => {
            const onAction = vi.fn();
            renderNode({ onAction });

            fireEvent.click(screen.getByRole("button", { name: "Frame this node" }));

            expect(onAction).toHaveBeenCalledWith("frameNode");
        });

        it("renames the pin verb to Unpin while the node is pinned", async () => {
            renderNode({ pinnedToCanvas: true, onUnpinFromCanvas: vi.fn() });

            // The header keeps its own resident Unpin; the action itself is in More.
            expect(screen.getAllByRole("button", { name: "Unpin" })).toHaveLength(1);

            fireEvent.click(screen.getByTestId("inspector-actions-more"));

            expect(await screen.findByRole("menuitem", { name: "Unpin" })).toBeInTheDocument();
        });
    });
});
