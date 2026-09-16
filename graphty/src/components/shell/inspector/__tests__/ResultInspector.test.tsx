import { PopoutManager } from "@graphty/compact-mantine";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { render, screen, within } from "../../../../test/test-utils";
import { ShellProvider } from "../../ShellContext";
import { ResultInspector, type ResultInspectorProps } from "../ResultInspector";

/**
 * The surface inside the two providers it needs: the section store it remembers its
 * open state in, and the pop-out manager the actions block's overflow hangs off.
 * @param props - the children to draw.
 * @param props.children - the surface.
 * @returns the harness.
 */
function Harness({ children }: { children: React.ReactNode }) {
    return (
        <PopoutManager>
            <ShellProvider initialShellWidth={1440} measureViewport={false} persist={false}>
                {children}
            </ShellProvider>
        </PopoutManager>
    );
}

const BASE: ResultInspectorProps = {
    reading: "Chonky_Boy has the most links, 4, about 1.3 times the median of 3.",
    runRecord: "Degree centrality, 20 nodes",
    body: [],
    onChangeEncoding: vi.fn(),
    onDeleteLayer: vi.fn(),
    onRemoveResult: vi.fn(),
};

/**
 * Draws the surface with the base result and whatever this board overrides.
 * @param props - the overrides.
 * @returns the render result.
 */
function renderResult(props: Partial<ResultInspectorProps> = {}) {
    return render(
        <Harness>
            <ResultInspector {...BASE} {...props} />
        </Harness>,
    );
}

/** A distribution whose two axis ends are the only figures it prints. */
const DISTRIBUTION = {
    caption: "Links per node",
    bins: [
        { label: "2 links: 5 nodes", count: 5 },
        { label: "3 links: 12 nodes", count: 12 },
        { label: "4 links: 3 nodes", count: 3 },
    ],
    axisMin: "2",
    axisMax: "4",
};

describe("ResultInspector", () => {
    describe("the three floor items", () => {
        /* A door may not separate a floor item from the thing it qualifies, which is why
           all three are drawn in the header block ABOVE the Result section rather than
           inside the section the chevron collapses. */
        it("draws the reading, the caveats and the run record above the Result section", () => {
            renderResult({ caveats: "Did not converge in 100 iterations." });

            const header = screen.getByTestId("result-header-block");

            expect(within(header).getByText(BASE.reading)).toBeInTheDocument();
            expect(within(header).getByText("Did not converge in 100 iterations.")).toBeInTheDocument();
            expect(within(header).getByText(BASE.runRecord)).toBeInTheDocument();
            expect(header).not.toContainElement(screen.getByTestId("control-section"));
        });

        /* The ABSENCE is the feature. A caveats line drawn on every result is a line
           nobody reads, and that is what would make "Approximate (sample of 200)"
           invisible on the one result where it matters. */
        it("draws no caveats block for an exact, complete, converged run", () => {
            renderResult();

            expect(screen.queryByText(/Did not converge/)).toBeNull();
            expect(screen.getByText(BASE.reading)).toBeInTheDocument();
        });
    });

    describe("the body's rows", () => {
        it("draws a ranked row's rank as a RankChip, and gives an unranked row none", () => {
            renderResult({
                body: [
                    { name: "Chonky_Boy", value: "4", rank: 1 },
                    { name: "Zero or near-zero", value: "12 nodes (60%)" },
                ],
            });

            expect(screen.getByText("#1")).toBeInTheDocument();
            /* The aggregate tie row carries no rank, so it gets NO chip rather than a
               defaulted one: there is no rank to report and inventing one would be a
               figure the run never produced. */
            expect(screen.queryByText("#2")).toBeNull();
            expect(screen.getAllByText(/^#\d+$/)).toHaveLength(1);
        });

        it("makes a row with onSelect a real control, and leaves one without it inert", () => {
            const onSelect = vi.fn();

            renderResult({
                body: [
                    { name: "Chonky_Boy", value: "4", rank: 1, onSelect },
                    { name: "Zero or near-zero", value: "12 nodes (60%)" },
                ],
            });

            const row = screen.getByRole("button", { name: /Chonky_Boy/ });

            expect(row).toBeInTheDocument();
            row.click();
            expect(onSelect).toHaveBeenCalledTimes(1);

            // RT-6: a row that selects nothing is text, and takes no focus.
            expect(screen.queryByRole("button", { name: /Zero or near-zero/ })).toBeNull();
        });
    });

    describe("the RT-9 chart row", () => {
        /* Spec 4902 and 3438-3442: the two axis ends are the only text on a chart row.
           The five printed statistics spec 2307 also mentions are exactly the table a
           chart row exists to replace. */
        it("draws the distribution as one named chart with its two axis ends", () => {
            renderResult({ distribution: DISTRIBUTION });

            expect(screen.getByRole("img", { name: "Links per node" })).toBeInTheDocument();

            const axis = screen.getByTestId("chart-axis");

            expect(axis).toHaveTextContent("2");
            expect(axis).toHaveTextContent("4");
        });

        it("draws no chart at all when the run reported no distribution", () => {
            renderResult({ body: [{ name: "Chonky_Boy", value: "4", rank: 1 }] });

            expect(screen.queryByTestId("chart-axis")).toBeNull();
        });

        /* A 0-to-0 axis under an empty section would claim a distribution that was never
           measured, so the section renders for EITHER half: rows, or a chart, or both. */
        it("renders the Result section for a distribution with no rows above it", () => {
            renderResult({ body: [], distribution: DISTRIBUTION });

            const section = screen.getByTestId("control-section");

            expect(section).not.toHaveAttribute("data-empty", "true");
            expect(screen.getByRole("img", { name: "Links per node" })).toBeInTheDocument();
        });

        it("draws the empty form when there is neither a row nor a distribution", () => {
            renderResult();

            expect(screen.getByTestId("control-section")).toHaveAttribute("data-empty", "true");
        });
    });

    describe("the action row", () => {
        /* Floor item 4 and spec 2241-2249: what the verb will act on is named before the
           act, in the verb's own line rather than behind a tooltip. The sentence says what
           Remove result DOES -- "deletes the run and every layer that reads it" (spec
           2243) -- where it used to say the opposite, "Keeps 1 style layer painted", for a
           pair of verbs whose effects were swapped. */
        it("names what Remove result will take, resident under the verb", () => {
            renderResult({
                layerName: "Most connected (Degree centrality)",
                stateSwatch: "#fde724",
                removeResultCost: "Removes 1 style layer.",
            });

            expect(screen.getByText("Removes 1 style layer.")).toBeInTheDocument();
        });

        /* Spec 2233-2236: the APPLIED form is the swatch, the layer name and Change
           encoding. All three verbs are drawn only there. */
        it("draws all three verbs on a result that painted", () => {
            renderResult({ layerName: "Most connected (Degree centrality)", stateSwatch: "#fde724" });

            expect(screen.getByRole("button", { name: "Change encoding" })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Delete layer" })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Remove result" })).toBeInTheDocument();
        });

        /* And the un-applied form draws neither layer verb, because there is no layer for
           either to act on. Drawn anyway, they were not merely inert: Change encoding
           opened Style for an encoding that does not exist, and Delete layer fell through
           to whichever tag the shell had last recorded and deleted another result's
           layers. Spec 2234's "Encode as style" belongs here and is not built, so this row
           draws no encoding verb rather than one that does nothing. */
        it("draws neither layer verb on a result that painted nothing", () => {
            renderResult();

            expect(screen.queryByRole("button", { name: "Change encoding" })).toBeNull();
            expect(screen.queryByRole("button", { name: "Delete layer" })).toBeNull();
            expect(screen.getByRole("button", { name: "Remove result" })).toBeInTheDocument();
            expect(screen.queryByTestId("result-layer")).toBeNull();
        });

        /* The reading, the caveats and the run record are floor items 1, 2 and 3 and are
           not the picture's to take: an un-applied card is still a whole result. */
        it("keeps the reading and the run record in the un-applied form", () => {
            renderResult({ caveats: "Approximate (sample of 200)." });

            expect(screen.getByText(BASE.reading)).toBeInTheDocument();
            expect(screen.getByText("Approximate (sample of 200).")).toBeInTheDocument();
            expect(screen.getByText(BASE.runRecord)).toBeInTheDocument();
        });
    });
});
