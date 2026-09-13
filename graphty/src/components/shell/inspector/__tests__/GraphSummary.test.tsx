import { PopoutManager } from "@graphty/compact-mantine";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "../../../../test/test-utils";
import { keyChipFor } from "../../bindings";
import { ShellProvider } from "../../ShellContext";
import { GraphSummary, type GraphSummaryCounts, type GraphSummaryProps } from "../GraphSummary";

function Harness({ children }: { children: React.ReactNode }) {
    return (
        <PopoutManager>
            <ShellProvider initialShellWidth={1440} measureViewport={false} persist={false}>
                {children}
            </ShellProvider>
        </PopoutManager>
    );
}

// The artboard's own dataset (design/ui/mockups/artboards/Main.dc.html), so every
// string this file asserts is the string the board draws.
const READING =
    "17 cats, 1 dog and 2 humans, connected by 29 relationships. " +
    "Everyone is connected to everyone else through at most 5 steps.";

const counts: GraphSummaryCounts = {
    nodes: "20",
    edges: "29",
    types: "Undirected, weighted (value)",
    density: "0.153",
    densityTitle: "1.53e-1",
    averageDegree: "2.9",
    connectedParts: "1",
};

const defaultProps: GraphSummaryProps = {
    reading: READING,
    counts,
    mostConnected: [
        { id: "1", label: "Mr_Whiskers", value: "4" },
        { id: "2", label: "The_Vet", value: "4" },
        { id: "3", label: "Mrs_Henderson", value: "4" },
        { id: "4", label: "Princess_Fluffington", value: "3" },
        { id: "5", label: "Garbage_Bandit", value: "3" },
        { id: "6", label: "Overflow_Cat", value: "2" },
    ],
    rankedCount: 20,
    degreeBins: [
        { label: "2 links: 5 nodes", count: 5 },
        { label: "3 links: 12 nodes", count: 12 },
        { label: "4 links: 3 nodes", count: 3 },
    ],
    degreeAxisMin: "2",
    degreeAxisMax: "4",
    schema: {
        ready: true,
        summary: "3 node types, 7 edge types",
        nodeTypes: [
            { name: "cat", count: "17" },
            { name: "human", count: "2" },
            { name: "dog", count: "1" },
        ],
        edgeTypes: [
            { name: "social", count: "8" },
            { name: "play", count: "5" },
            { name: "territorial", count: "4" },
            { name: "medical", count: "4" },
            { name: "feeding", count: "4" },
            { name: "romantic", count: "2" },
            { name: "hunting", count: "2" },
        ],
    },
    attributes: {
        nodes: [
            { name: "name", type: "text", distinct: "20 values", unique: true },
            { name: "age", type: "number", distinct: "12 values" },
        ],
        edges: [{ name: "value", type: "number", distinct: "7 values" }],
    },
    caseNoteCount: 0,
    onShowInTable: vi.fn(),
    onExportTop: vi.fn(),
    onExportRanked: vi.fn(),
    onSeeAllRanked: vi.fn(),
    onExportSchemaJson: vi.fn(),
    onFilterToType: vi.fn(),
    onSelectAllOfType: vi.fn(),
    onOpenCaseNotes: vi.fn(),
    onMoreInAnalyze: vi.fn(),
};

function renderSummary(overrides: Partial<GraphSummaryProps> = {}) {
    return render(
        <Harness>
            <GraphSummary {...defaultProps} {...overrides} />
        </Harness>,
    );
}

function countsRowNames(): (string | null)[] {
    const section = screen.getAllByTestId("control-section-content")[0];

    return Array.from(section.querySelectorAll("[data-testid='data-row-name']")).map((cell) => cell.textContent);
}

describe("GraphSummary", () => {
    describe("the reading", () => {
        it("draws the reading in full", () => {
            renderSummary();

            expect(screen.getByTestId("graph-summary-reading")).toHaveTextContent(READING);
        });

        it("puts nothing above the reading, because the status bar owns the totals", () => {
            renderSummary();

            // Mantine injects its own <style> elements into the tree; they draw nothing.
            const drawn = [];
            let sibling = screen.getByTestId("graph-summary-reading").previousElementSibling;

            while (sibling !== null) {
                if (sibling.tagName !== "STYLE") {
                    drawn.push(sibling.tagName);
                }

                sibling = sibling.previousElementSibling;
            }

            expect(drawn).toEqual([]);
        });

        it("never puts the reading behind an info circle", () => {
            renderSummary();

            expect(screen.getByTestId("graph-summary-reading").querySelector("[data-testid='info-circle']")).toBeNull();
        });
    });

    describe("Counts", () => {
        it("is collapsed by default", () => {
            renderSummary();

            expect(screen.getByRole("button", { name: "Expand Counts" })).toBeInTheDocument();
        });

        it("holds its rows in the order the spec fixes", () => {
            renderSummary();

            expect(countsRowNames()).toEqual([
                "Nodes",
                "Edges",
                "Type",
                "How tightly linked (density)",
                "Average links per node (mean degree)",
                "Connected parts (components)",
            ]);
        });

        it("carries density in plain form with its scientific spelling on hover", () => {
            renderSummary();

            expect(screen.getByTitle("1.53e-1")).toHaveTextContent("0.153");
        });

        it("draws no self-loop or parallel-edge row while both are zero", () => {
            renderSummary();

            expect(countsRowNames()).not.toContain("Self-loops");
            expect(countsRowNames()).not.toContain("Parallel edges");
        });

        it("draws self-loops and parallel edges when they are non-zero", () => {
            renderSummary({ counts: { ...counts, selfLoops: "3", parallelEdges: "7" } });

            expect(countsRowNames()).toContain("Self-loops");
            expect(countsRowNames()).toContain("Parallel edges");
        });

        it("reads Computing... until the background pass finishes", () => {
            renderSummary({ counts: null });

            expect(screen.getAllByText("Computing...").length).toBeGreaterThan(0);
        });
    });

    describe("Most connected", () => {
        it("renders the 6.3 pair on its first mention in this surface", () => {
            renderSummary();

            expect(
                screen.getByRole("button", { name: "Collapse Most connected (Degree centrality)" }),
            ).toBeInTheDocument();
        });

        it("caps the table at the top five", () => {
            renderSummary();

            expect(screen.getByText("Mr_Whiskers")).toBeInTheDocument();
            expect(screen.getByText("Garbage_Bandit")).toBeInTheDocument();
            expect(screen.queryByText("Overflow_Cat")).not.toBeInTheDocument();
        });

        it("puts the unit word on the column caption once and on no row", () => {
            renderSummary();

            const units = screen.getAllByTestId("data-row-header-unit").map((cell) => cell.textContent);

            expect(units).toEqual(["links", "Nodes", "Edges"]);
        });

        it("draws each histogram bar with its own count in its title", () => {
            renderSummary();

            expect(screen.getByTitle("2 links: 5 nodes")).toBeInTheDocument();
            expect(screen.getByTitle("3 links: 12 nodes")).toBeInTheDocument();
            expect(screen.getByTitle("4 links: 3 nodes")).toBeInTheDocument();
        });

        it("labels the two axis ends and nothing else", () => {
            renderSummary();

            const axis = screen.getByTestId("chart-axis");

            expect(axis).toHaveTextContent("2");
            expect(axis).toHaveTextContent("4");
        });

        it("offers See all N ranked", () => {
            const onSeeAllRanked = vi.fn();
            renderSummary({ onSeeAllRanked });

            fireEvent.click(screen.getByRole("button", { name: "See all 20 ranked" }));

            expect(onSeeAllRanked).toHaveBeenCalledTimes(1);
        });

        it("keeps Show in table and the two export rows reachable", async () => {
            const onExportTop = vi.fn();
            renderSummary({ onExportTop });

            expect(screen.getByRole("button", { name: "Show in table" })).toBeInTheDocument();

            fireEvent.click(screen.getByRole("button", { name: "Export" }));
            fireEvent.click(await screen.findByRole("menuitem", { name: "Export top 20 (CSV)" }));

            expect(onExportTop).toHaveBeenCalledTimes(1);
        });
    });

    describe("Schema", () => {
        it("expands in place rather than living behind a door", () => {
            renderSummary();

            expect(screen.getByRole("button", { name: "Collapse Schema" })).toBeInTheDocument();
        });

        it("draws both two-column captions", () => {
            renderSummary();

            const labels = screen.getAllByTestId("data-row-header-label").map((cell) => cell.textContent);

            expect(labels).toContain("Node type");
            expect(labels).toContain("Edge type");
        });

        it("caps each table at five rows and names the remainder", () => {
            renderSummary();

            expect(screen.getByText("social")).toBeInTheDocument();
            expect(screen.getByText("feeding")).toBeInTheDocument();
            expect(screen.queryByText("romantic")).not.toBeInTheDocument();
            expect(screen.getByText("2 more")).toBeInTheDocument();
            expect(screen.getByTitle("romantic 2, hunting 2")).toBeInTheDocument();
        });

        it("draws the RT-7 verb row beneath the tables", () => {
            renderSummary();

            expect(screen.getByRole("button", { name: "Filter to type" })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Select all of type" })).toBeInTheDocument();
        });

        it("keeps Export schema JSON in the open header", () => {
            renderSummary();

            expect(screen.getByRole("button", { name: "Export schema JSON" })).toBeInTheDocument();
        });

        it("names the gear that opens the 480 report", () => {
            renderSummary({
                schema: { ...defaultProps.schema, completeness: [{ name: "cat", count: "100%" }] },
            });

            expect(
                screen.getByRole("button", {
                    name: "Schema detail. Per-type completeness, edges by type pair",
                }),
            ).toBeInTheDocument();
        });

        it("disables the gear with its reason while there is nothing behind it", () => {
            renderSummary();

            expect(
                screen.getByRole("button", {
                    name:
                        "Schema detail. Per-type completeness, edges by type pair. " +
                        "Available once the schema has been measured",
                }),
            ).toBeDisabled();
        });

        it("keeps its summary as its state mark once it is closed", () => {
            renderSummary();

            fireEvent.click(screen.getByRole("button", { name: "Collapse Schema" }));

            expect(screen.getByTestId("schema-summary-mark")).toHaveTextContent("3 node types, 7 edge types");
        });

        it("reads measuring... until the schema has been extracted", () => {
            renderSummary({ schema: { ...defaultProps.schema, ready: false } });

            fireEvent.click(screen.getByRole("button", { name: "Collapse Schema" }));

            expect(screen.getByTestId("schema-summary-mark")).toHaveTextContent("measuring...");
        });
    });

    describe("Attributes", () => {
        it("is collapsed by default", () => {
            renderSummary();

            expect(screen.getByRole("button", { name: "Expand Attributes" })).toBeInTheDocument();
        });

        it("opens onto Nodes and Edges tabs", async () => {
            renderSummary();

            fireEvent.click(screen.getByRole("button", { name: "Expand Attributes" }));

            expect(await screen.findByRole("tab", { name: "Nodes 2" })).toBeInTheDocument();
            expect(await screen.findByRole("tab", { name: "Edges 1" })).toBeInTheDocument();
        });

        it("marks an id-like attribute unique instead of counting it", () => {
            renderSummary();

            expect(screen.getByText("text, unique")).toBeInTheDocument();
        });

        it("states the sampling caveat once inside the section", () => {
            renderSummary({
                attributes: {
                    ...defaultProps.attributes,
                    samplingCaveat: "Approximate: counted from a sample of 50,000 rows.",
                },
            });

            expect(screen.getAllByText("Approximate: counted from a sample of 50,000 rows.")).toHaveLength(1);
        });
    });

    describe("case notes", () => {
        it("reads Add a case note at zero, with the binding in its title only while it has shipped", () => {
            renderSummary();

            // Spec 04 section 10.3: "an unshipped row carries no key chip anywhere", so
            // the chip is asked of the one binding table rather than typed here -- the
            // row reads the same words either way.
            const chip = keyChipFor("addNote");
            const title = chip === null ? "Add a case note" : `Add a case note (${chip})`;
            // With no chip the drawn words and the row's own tooltip are the same string,
            // so both elements carry it; the words are the first of them.
            const [words] = screen.getAllByTitle(title);

            expect(words).toHaveTextContent("Add a case note");
        });

        it("keeps the key chip out of the accessible name", () => {
            renderSummary();

            expect(screen.getByRole("button", { name: "Add a case note" })).toBeInTheDocument();
        });

        it("reads N case notes above zero", () => {
            renderSummary({ caseNoteCount: 3 });

            expect(screen.getByRole("button", { name: "3 case notes" })).toBeInTheDocument();
        });

        it("opens the graph-level annotation", () => {
            const onOpenCaseNotes = vi.fn();
            renderSummary({ onOpenCaseNotes });

            fireEvent.click(screen.getByRole("button", { name: "Add a case note" }));

            expect(onOpenCaseNotes).toHaveBeenCalledTimes(1);
        });
    });

    describe("More in Analyze", () => {
        it("is the single link into that panel", () => {
            const onMoreInAnalyze = vi.fn();
            renderSummary({ onMoreInAnalyze });

            fireEvent.click(screen.getByRole("button", { name: "More in Analyze" }));

            expect(onMoreInAnalyze).toHaveBeenCalledTimes(1);
        });
    });
});
