import { DirectionProvider, MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { AdvancedButton, compactTheme, HistogramRow, MetricRow, SparklineRow } from "../../../src";
import { PANEL_INK } from "../../../src/constants/panel";
import { LabelsProvider } from "../../../src/i18n";

// LabelsProvider is imported from src/i18n rather than from src: the public
// entry point does not re-export the i18n layer yet, and src/index.ts belongs to
// the integration pass.

/**
 * Render inside the compact theme, the way the package is consumed.
 * @param ui - The element under test
 * @returns The testing-library render result
 */
function renderChart(ui: React.ReactElement): ReturnType<typeof render> {
    return render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
}

/**
 * Render with the text direction reversed, so a drawing laid out along the
 * inline axis can be checked against the labels beside it.
 * @param ui - The element under test
 * @returns The testing-library render result
 */
function renderRtl(ui: React.ReactElement): ReturnType<typeof render> {
    return render(
        <DirectionProvider initialDirection="rtl" detectDirection={false}>
            <MantineProvider theme={compactTheme}>{ui}</MantineProvider>
        </DirectionProvider>,
    );
}

/**
 * Render with a locale and a replacement set of strings, the way a consumer
 * translates the library.
 * @param ui - The element under test
 * @param locale - The BCP 47 language tag to format numbers and ordinals in
 * @param labels - The strings to replace
 * @returns The testing-library render result
 */
function renderLocalized(
    ui: React.ReactElement,
    locale: string,
    labels?: Parameters<typeof LabelsProvider>[0]["labels"],
): ReturnType<typeof render> {
    return render(
        <LabelsProvider locale={locale} labels={labels}>
            <MantineProvider theme={compactTheme}>{ui}</MantineProvider>
        </LabelsProvider>,
    );
}

/** A degree distribution: five nodes with two links, twelve with three, three with four. */
const DEGREES = [
    { label: "2 links: 5 nodes", count: 5 },
    { label: "3 links: 12 nodes", count: 12, highlighted: true },
    { label: "4 links: 3 nodes", count: 3 },
];

describe("HistogramRow", () => {
    describe("shape", () => {
        it("is exactly two row pitches tall, and never any other height", () => {
            renderChart(<HistogramRow bins={DEGREES} minLabel="2" maxLabel="4" />);

            expect(screen.getByTestId("histogram-row")).toHaveStyle({ height: "64px" });
        });

        it("draws one bar per bin", () => {
            renderChart(<HistogramRow bins={DEGREES} minLabel="2" maxLabel="4" />);

            expect(screen.getAllByTestId("histogram-bar")).toHaveLength(3);
        });

        it("scales every bar against the tallest bin", () => {
            renderChart(<HistogramRow bins={DEGREES} minLabel="2" maxLabel="4" />);

            const [two, three, four] = screen.getAllByTestId("histogram-bar");
            // 5 of 12, 12 of 12, 3 of 12.
            expect(two).toHaveStyle({ height: `${(5 / 12) * 100}%` });
            expect(three).toHaveStyle({ height: "100%" });
            expect(four).toHaveStyle({ height: `${(3 / 12) * 100}%` });
        });

        it("draws the highlighted bin at the accent and the rest at the chart ink", () => {
            renderChart(<HistogramRow bins={DEGREES} minLabel="2" maxLabel="4" />);

            const [two, three] = screen.getAllByTestId("histogram-bar");
            expect(three).toHaveAttribute("data-highlighted", "true");
            expect(three.style.background).toContain("primary-color-filled");
            expect(two).toHaveAttribute("data-highlighted", "false");
            expect(two.style.background).toBe(PANEL_INK.BORDER);
        });

        it("keeps a non-zero count visible however small it is beside the tallest bin", () => {
            renderChart(
                <HistogramRow
                    bins={[
                        { label: "0.00 to 0.05: 400 nodes", count: 400 },
                        { label: "0.30 to 0.35: 1 node", count: 1 },
                    ]}
                    minLabel="0.00"
                    maxLabel="0.35"
                />,
            );

            const [, tail] = screen.getAllByTestId("histogram-bar");
            expect(tail).toHaveStyle({ minHeight: "1px" });
        });

        it("draws an empty bin as nothing at all", () => {
            renderChart(
                <HistogramRow
                    bins={[
                        { label: "5 links: 2 nodes", count: 2 },
                        { label: "6 links: 0 nodes", count: 0 },
                    ]}
                    minLabel="5"
                    maxLabel="6"
                />,
            );

            const [, empty] = screen.getAllByTestId("histogram-bar");
            expect(empty).toHaveStyle({ height: "0%" });
            expect(empty.style.minHeight).not.toBe("1px");
        });

        it("draws a distribution that is entirely empty as a flat row rather than dividing by nothing", () => {
            renderChart(
                <HistogramRow
                    bins={[
                        { label: "2 links: 0 nodes", count: 0 },
                        { label: "3 links: 0 nodes", count: 0 },
                    ]}
                    minLabel="2"
                    maxLabel="3"
                />,
            );

            for (const bar of screen.getAllByTestId("histogram-bar")) {
                expect(bar).toHaveStyle({ height: "0%" });
            }
        });

        it("clamps a negative count rather than drawing it upside down", () => {
            renderChart(
                <HistogramRow
                    bins={[
                        { label: "2 links: 5 nodes", count: 5 },
                        { label: "3 links: nonsense", count: -4 },
                    ]}
                    minLabel="2"
                    maxLabel="3"
                />,
            );

            const [, nonsense] = screen.getAllByTestId("histogram-bar");
            expect(nonsense).toHaveStyle({ height: "0%" });
        });

        it("always draws the two axis-end values, at 11px secondary text", () => {
            renderChart(<HistogramRow bins={DEGREES} minLabel="2" maxLabel="4" />);

            const min = screen.getByTestId("chart-axis-min");
            const max = screen.getByTestId("chart-axis-max");
            expect(min).toHaveTextContent("2");
            expect(max).toHaveTextContent("4");
            expect(min.style.color).toBe(PANEL_INK.CHROME);
            expect(max.style.color).toBe(PANEL_INK.CHROME);
            expect(min.style.fontSize).toContain("font-size-sm");
        });

        it("stands on a 1px baseline", () => {
            renderChart(<HistogramRow bins={DEGREES} minLabel="2" maxLabel="4" />);

            const baseline = screen.getByTestId("chart-baseline");
            expect(baseline).toHaveStyle({ height: "1px" });
            expect(baseline.style.background).toBe(PANEL_INK.BORDER);
        });

        it("draws no legend, no title and no summary line", () => {
            renderChart(<HistogramRow label="Links per node" bins={DEGREES} minLabel="2" maxLabel="4" />);

            // The visible chart carries the two axis ends and nothing else; the
            // chart's own name lives in its accessible name and in the caption
            // of the hidden table, never as drawn text.
            expect(screen.getByTestId("histogram-chart")).toHaveTextContent(/^24$/);
        });

        it("keeps its pitch, its baseline and its axis ends when there are no bins yet", () => {
            renderChart(<HistogramRow bins={[]} minLabel="0" maxLabel="0" />);

            expect(screen.queryAllByTestId("histogram-bar")).toHaveLength(0);
            expect(screen.getByTestId("histogram-row")).toHaveStyle({ height: "64px" });
            expect(screen.getByTestId("chart-baseline")).toBeInTheDocument();
            expect(screen.getByTestId("chart-axis-min")).toBeInTheDocument();
            expect(screen.getByTestId("chart-axis-max")).toBeInTheDocument();
        });
    });

    describe("accessibility", () => {
        it("is one named image rather than a run of anonymous bars", () => {
            renderChart(<HistogramRow label="Links per node" bins={DEGREES} minLabel="2" maxLabel="4" />);

            const images = screen.getAllByRole("img");
            expect(images).toHaveLength(1);
            expect(images[0]).toBe(screen.getByTestId("histogram-drawing"));
            expect(images[0]).toHaveAccessibleName("Links per node");
        });

        it("describes the image with the range it spans, without drawing that text twice", () => {
            renderChart(<HistogramRow label="Links per node" bins={DEGREES} minLabel="2" maxLabel="4" />);

            expect(screen.getByRole("img")).toHaveAccessibleDescription("2 4");
        });

        it("hides every individual bar from assistive technology while keeping its hover tooltip", () => {
            renderChart(<HistogramRow label="Links per node" bins={DEGREES} minLabel="2" maxLabel="4" />);

            const bars = screen.getAllByTestId("histogram-bar");
            expect(bars).toHaveLength(DEGREES.length);
            bars.forEach((bar, index) => {
                expect(bar).toHaveAttribute("aria-hidden", "true");
                expect(bar).toHaveAttribute("title", DEGREES[index].label);
            });
        });

        it("carries a visually hidden table of every bin and its count", () => {
            renderChart(<HistogramRow label="Links per node" bins={DEGREES} minLabel="2" maxLabel="4" />);

            const table = screen.getByTestId("histogram-values");
            expect(table.tagName).toBe("TABLE");
            expect(within(table).getByText("Links per node").tagName).toBe("CAPTION");

            const rows = within(table).getAllByRole("row");
            expect(rows).toHaveLength(DEGREES.length);
            DEGREES.forEach((bin, index) => {
                expect(within(rows[index]).getByRole("rowheader")).toHaveTextContent(bin.label);
                expect(within(rows[index]).getByRole("cell")).toHaveTextContent(String(bin.count));
            });
        });

        it("records the count that was measured, not the one the bar drew", () => {
            renderChart(
                <HistogramRow
                    label="Links per node"
                    bins={[{ label: "3 links: nonsense", count: -4 }]}
                    minLabel="2"
                    maxLabel="3"
                />,
            );

            // The bar clamps to nothing; rewriting the table to match would hide
            // the defect that produced a negative count.
            expect(screen.getByTestId("histogram-bar")).toHaveStyle({ height: "0%" });
            expect(within(screen.getByTestId("histogram-values")).getByRole("cell")).toHaveTextContent("-4");
        });

        it("steps the unnamed drawing out of the accessibility tree, leaving the table to carry the chart", () => {
            renderChart(<HistogramRow bins={DEGREES} minLabel="2" maxLabel="4" />);

            expect(screen.queryByRole("img")).toBeNull();
            expect(screen.getByTestId("histogram-drawing")).toHaveAttribute("aria-hidden", "true");
            expect(within(screen.getByTestId("histogram-values")).getAllByRole("row")).toHaveLength(DEGREES.length);
        });

        it("says nothing about a chart the caller did not say was computed", () => {
            renderChart(<HistogramRow label="Links per node" bins={DEGREES} minLabel="2" maxLabel="4" />);

            // Supplying `busy` at all is what says the values arrive late, and
            // that is what creates the live region -- the same rule every
            // announcing component in this library follows.
            expect(screen.getByTestId("histogram-chart")).not.toHaveAttribute("aria-live");
        });

        it("announces the drawing and its axis ends when a background run fills them in", () => {
            renderChart(
                <HistogramRow label="Links per node" busy={false} bins={DEGREES} minLabel="2" maxLabel="4" />,
            );

            const live = screen.getByTestId("histogram-chart");
            expect(live).toHaveAttribute("aria-live", "polite");
            expect(live).toHaveAttribute("aria-atomic", "true");
            // Forty rows of numbers read out politely would be worse than
            // nothing, so the table sits outside the live region.
            expect(live).not.toContainElement(screen.getByTestId("histogram-values"));
        });

        it("marks itself busy while the computation behind it is still running", () => {
            const { rerender } = renderChart(
                <HistogramRow label="Links per node" busy bins={[]} minLabel="0" maxLabel="0" />,
            );

            expect(screen.getByTestId("histogram-row")).toHaveAttribute("aria-busy", "true");
            expect(screen.getByTestId("histogram-chart")).toHaveAttribute("aria-busy", "true");

            rerender(
                <MantineProvider theme={compactTheme}>
                    <HistogramRow label="Links per node" busy={false} bins={DEGREES} minLabel="2" maxLabel="4" />
                </MantineProvider>,
            );

            expect(screen.getByTestId("histogram-chart")).toHaveAttribute("aria-busy", "false");
        });
    });

    describe("internationalization", () => {
        it("formats every count in the table for the active locale", () => {
            renderLocalized(
                <HistogramRow
                    label="Links per node"
                    bins={[{ label: "2 links", count: 1234 }]}
                    minLabel="2"
                    maxLabel="4"
                />,
                "de-DE",
            );

            expect(within(screen.getByTestId("histogram-values")).getByRole("cell")).toHaveTextContent("1.234");
        });

        it("puts the start of the axis at the inline start, whichever way text runs", () => {
            renderRtl(<HistogramRow label="Links per node" bins={DEGREES} minLabel="2" maxLabel="4" />);

            const axis = screen.getByTestId("chart-axis");
            // The axis is a flex row, which follows the text direction, so the
            // start value is the first child in both directions and no physical
            // side is written down anywhere.
            expect(axis.firstElementChild).toBe(screen.getByTestId("chart-axis-min"));
            expect(axis.style.left).toBe("");
            expect(axis.style.justifyContent).toBe("space-between");
        });
    });

    describe("trailing slot", () => {
        it("renders no trailing slot when the row has nothing to put there", () => {
            renderChart(<HistogramRow bins={DEGREES} minLabel="2" maxLabel="4" />);

            expect(screen.queryByTestId("trailing-slot")).toBeNull();
        });

        it("renders no trailing slot for a conditional control that did not render", () => {
            const showSettings = false;

            renderChart(
                <HistogramRow
                    bins={DEGREES}
                    minLabel="2"
                    maxLabel="4"
                    trailing={showSettings && <AdvancedButton label="Degree distribution options" onClick={vi.fn()} />}
                />,
            );

            expect(screen.queryByTestId("trailing-slot")).toBeNull();
        });

        it("renders the 24px trailing slot when the row has a control", () => {
            renderChart(
                <HistogramRow
                    bins={DEGREES}
                    minLabel="2"
                    maxLabel="4"
                    trailing={<AdvancedButton label="Degree distribution options" onClick={vi.fn()} />}
                />,
            );

            expect(screen.getByTestId("trailing-slot")).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Degree distribution options" })).toBeInTheDocument();
        });
    });
});

describe("SparklineRow", () => {
    /** A force-directed layout settling over twenty ticks. */
    const SETTLING = [92, 71, 55, 44, 36, 29, 24, 20, 16, 13, 11, 9, 7, 6, 5, 4, 4, 3, 3, 2];

    describe("shape", () => {
        it("is exactly one row pitch tall, and never any other height", () => {
            renderChart(<SparklineRow values={SETTLING} minLabel="Tick 1" maxLabel="Tick 20" />);

            expect(screen.getByTestId("sparkline-row")).toHaveStyle({ height: "32px" });
        });

        it("normalises the series over its own extremes", () => {
            renderChart(<SparklineRow values={[0, 5, 10]} minLabel="Tick 1" maxLabel="Tick 3" />);

            const polyline = screen.getByTestId("sparkline-plot").querySelector("polyline");
            // The lowest value sits at the bottom, the highest at the top.
            expect(polyline).toHaveAttribute("points", "0,100 50,50 100,0");
        });

        it("draws a series with no range down the middle rather than at an edge", () => {
            renderChart(<SparklineRow values={[2, 2, 2, 2]} minLabel="Tick 33" maxLabel="Tick 40" />);

            const polyline = screen.getByTestId("sparkline-plot").querySelector("polyline");
            expect(polyline).toHaveAttribute("points", "0,50 33.33333333333333,50 66.66666666666666,50 100,50");
        });

        it("draws a lone value as a flat line across the row rather than as an invisible point", () => {
            renderChart(<SparklineRow values={[7]} minLabel="Tick 1" maxLabel="Tick 1" />);

            const polyline = screen.getByTestId("sparkline-plot").querySelector("polyline");
            expect(polyline).toHaveAttribute("points", "0,50 100,50");
        });

        it("draws no line at all when nothing has been measured yet", () => {
            renderChart(<SparklineRow values={[]} minLabel="Tick 1" maxLabel="Tick 40" />);

            expect(screen.getByTestId("sparkline-plot").querySelector("polyline")).toBeNull();
            expect(screen.getByTestId("chart-baseline")).toBeInTheDocument();
        });

        it("always draws the two axis-end values, at 11px secondary text", () => {
            renderChart(<SparklineRow values={SETTLING} minLabel="Tick 1" maxLabel="Tick 20" />);

            const min = screen.getByTestId("chart-axis-min");
            const max = screen.getByTestId("chart-axis-max");
            expect(min).toHaveTextContent("Tick 1");
            expect(max).toHaveTextContent("Tick 20");
            expect(min.style.color).toBe(PANEL_INK.CHROME);
            expect(max.style.color).toBe(PANEL_INK.CHROME);
        });

        it("stands on the same 1px baseline the histogram does", () => {
            renderChart(<SparklineRow values={SETTLING} minLabel="Tick 1" maxLabel="Tick 20" />);

            expect(screen.getByTestId("chart-baseline")).toHaveStyle({ height: "1px" });
        });

        it("draws the line at 24px, the control height, inside its 32px pitch", () => {
            renderChart(<SparklineRow values={SETTLING} minLabel="Tick 1" maxLabel="Tick 20" />);

            expect(screen.getByTestId("sparkline-plot")).toHaveAttribute("height", "24");
        });
    });

    describe("accessibility", () => {
        it("is one named image rather than nothing at all", () => {
            renderChart(<SparklineRow label="Layout settling" values={SETTLING} minLabel="Tick 1" maxLabel="Tick 20" />);

            const images = screen.getAllByRole("img");
            expect(images).toHaveLength(1);
            expect(images[0]).toBe(screen.getByTestId("sparkline-drawing"));
            expect(images[0]).toHaveAccessibleName("Layout settling");
            expect(images[0]).toHaveAccessibleDescription("Tick 1 Tick 20");
        });

        it("hides the marks themselves, which are a drawing and not a picture of their own", () => {
            renderChart(<SparklineRow label="Layout settling" values={SETTLING} minLabel="Tick 1" maxLabel="Tick 20" />);

            const plot = screen.getByTestId("sparkline-plot");
            expect(plot).toHaveAttribute("aria-hidden", "true");
            expect(plot).toHaveAttribute("focusable", "false");
        });

        it("carries a visually hidden table of every value in the series", () => {
            renderChart(<SparklineRow label="Layout settling" values={[92, 71, 55]} minLabel="Tick 1" maxLabel="Tick 3" />);

            const table = screen.getByTestId("sparkline-values");
            expect(table.tagName).toBe("TABLE");
            expect(within(table).getByText("Layout settling").tagName).toBe("CAPTION");

            const rows = within(table).getAllByRole("row");
            expect(rows).toHaveLength(3);
            // Positions count from one, the way a reader counts them.
            expect(within(rows[0]).getByRole("rowheader")).toHaveTextContent("1");
            expect(within(rows[0]).getByRole("cell")).toHaveTextContent("92");
            expect(within(rows[2]).getByRole("rowheader")).toHaveTextContent("3");
            expect(within(rows[2]).getByRole("cell")).toHaveTextContent("55");
        });

        it("steps the unnamed drawing out of the accessibility tree, leaving the table to carry the chart", () => {
            renderChart(<SparklineRow values={[92, 71]} minLabel="Tick 1" maxLabel="Tick 2" />);

            expect(screen.queryByRole("img")).toBeNull();
            expect(screen.getByTestId("sparkline-drawing")).toHaveAttribute("aria-hidden", "true");
            expect(within(screen.getByTestId("sparkline-values")).getAllByRole("row")).toHaveLength(2);
        });

        it("announces the drawing and its axis ends when a background run fills them in", () => {
            renderChart(
                <SparklineRow
                    label="Layout settling"
                    busy={false}
                    values={SETTLING}
                    minLabel="Tick 1"
                    maxLabel="Tick 20"
                />,
            );

            const live = screen.getByTestId("sparkline-chart");
            expect(live).toHaveAttribute("aria-live", "polite");
            expect(live).toHaveAttribute("aria-atomic", "true");
            expect(live).not.toContainElement(screen.getByTestId("sparkline-values"));
        });

        it("marks itself busy while the computation behind it is still running", () => {
            renderChart(<SparklineRow label="Layout settling" busy values={[]} minLabel="Tick 1" maxLabel="Tick 40" />);

            expect(screen.getByTestId("sparkline-row")).toHaveAttribute("aria-busy", "true");
            expect(screen.getByTestId("sparkline-chart")).toHaveAttribute("aria-busy", "true");
        });
    });

    describe("internationalization", () => {
        it("plots the first value at the inline start, so the line reads the same way as the labels", () => {
            renderRtl(<SparklineRow label="Layout settling" values={[0, 5, 10]} minLabel="Tick 1" maxLabel="Tick 3" />);

            const polyline = screen.getByTestId("sparkline-plot").querySelector("polyline");
            // Left to right this is "0,100 50,50 100,0". Under reversed labels
            // the first value belongs at the right-hand edge, so the x
            // coordinates run the other way while the y coordinates do not.
            expect(polyline).toHaveAttribute("points", "100,100 50,50 0,0");
        });

        it("keeps the series the right way round when text runs left to right", () => {
            renderChart(<SparklineRow label="Layout settling" values={[0, 5, 10]} minLabel="Tick 1" maxLabel="Tick 3" />);

            const polyline = screen.getByTestId("sparkline-plot").querySelector("polyline");
            expect(polyline).toHaveAttribute("points", "0,100 50,50 100,0");
        });

        it("formats every value in the table for the active locale", () => {
            renderLocalized(
                <SparklineRow label="Layout settling" values={[1234.5]} minLabel="Tick 1" maxLabel="Tick 1" />,
                "de-DE",
            );

            expect(within(screen.getByTestId("sparkline-values")).getByRole("cell")).toHaveTextContent("1.234,5");
        });
    });

    describe("trailing slot", () => {
        it("renders no trailing slot when the row has nothing to put there", () => {
            renderChart(<SparklineRow values={SETTLING} minLabel="Tick 1" maxLabel="Tick 20" />);

            expect(screen.queryByTestId("trailing-slot")).toBeNull();
        });

        it("renders no trailing slot for a conditional control that did not render", () => {
            const showSettings = false;

            renderChart(
                <SparklineRow
                    values={SETTLING}
                    minLabel="Tick 1"
                    maxLabel="Tick 20"
                    trailing={showSettings && <AdvancedButton label="Layout settling options" onClick={vi.fn()} />}
                />,
            );

            expect(screen.queryByTestId("trailing-slot")).toBeNull();
        });

        it("renders the 24px trailing slot when the row has a control", () => {
            renderChart(
                <SparklineRow
                    values={SETTLING}
                    minLabel="Tick 1"
                    maxLabel="Tick 20"
                    trailing={<AdvancedButton label="Layout settling options" onClick={vi.fn()} />}
                />,
            );

            expect(screen.getByTestId("trailing-slot")).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Layout settling options" })).toBeInTheDocument();
        });
    });
});

describe("MetricRow", () => {
    describe("shape", () => {
        it("is exactly one row pitch tall", () => {
            renderChart(<MetricRow name="Bridges" percentile={98} value="0.31" />);

            expect(screen.getByTestId("metric-row")).toHaveStyle({ height: "32px" });
        });

        it("draws the name, the bar, the value and the chip", () => {
            renderChart(<MetricRow name="Bridges" percentile={98} value="0.31" rank="#6" />);

            expect(screen.getByTestId("metric-row-name")).toHaveTextContent("Bridges");
            expect(screen.getByTestId("metric-row-value")).toHaveTextContent("0.31");
            expect(screen.getByTestId("rank-chip")).toHaveTextContent("#6");
        });

        it("omits the chip when there is no rank", () => {
            renderChart(<MetricRow name="Age" percentile={62} value="7" />);

            expect(screen.queryByTestId("rank-chip")).toBeNull();
        });
    });

    describe("built on Mantine's Progress", () => {
        it("draws the bar as a Mantine progress track and section rather than two bare boxes", () => {
            renderChart(<MetricRow name="Bridges" percentile={98} value="0.31" />);

            const track = screen.getByTestId("metric-row-bar");
            const fill = screen.getByTestId("metric-row-fill");
            expect(track).toHaveClass("mantine-Progress-root");
            expect(fill).toHaveClass("mantine-Progress-section");
            expect(fill.parentElement).toBe(track);
        });

        it("is 64px wide and 4px tall, the height the compact theme gives a progress bar", () => {
            renderChart(<MetricRow name="Bridges" percentile={98} value="0.31" />);

            const track = screen.getByTestId("metric-row-bar");
            expect(track).toHaveStyle({ flex: "0 0 64px" });
            expect(track.style.getPropertyValue("--progress-size")).toBe("4px");
        });

        it("is fully round at both ends, without leaving a stray attribute on the element", () => {
            renderChart(<MetricRow name="Bridges" percentile={98} value="0.31" />);

            const track = screen.getByTestId("metric-row-bar");
            expect(track).toHaveStyle({ borderRadius: "2px" });
            expect(screen.getByTestId("metric-row-fill")).toHaveStyle({ borderRadius: "2px" });
            // Mantine 8.3.10 spreads Progress.Root's own `radius` prop onto the
            // div, so the radius is written as a style instead.
            expect(track).not.toHaveAttribute("radius");
        });

        it("draws the fill at the accent on the field surface", () => {
            renderChart(<MetricRow name="Bridges" percentile={98} value="0.31" />);

            const track = screen.getByTestId("metric-row-bar");
            const fill = screen.getByTestId("metric-row-fill");
            expect(track.style.background).toBe(PANEL_INK.SURFACE);
            expect(fill.style.getPropertyValue("--progress-section-color")).toContain("primary-color-filled");
        });

        it("fills the track to the percentile", () => {
            renderChart(<MetricRow name="Bridges" percentile={98} value="0.31" />);

            expect(screen.getByTestId("metric-row-fill").style.getPropertyValue("--progress-section-size")).toBe("98%");
        });

        it("clamps a percentile above 100 rather than drawing past the track", () => {
            renderChart(<MetricRow name="Bridges" percentile={140} value="0.31" />);

            expect(screen.getByTestId("metric-row-fill").style.getPropertyValue("--progress-section-size")).toBe("100%");
            expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
        });

        it("clamps a negative percentile rather than losing the bar", () => {
            renderChart(<MetricRow name="Bridges" percentile={-20} value="0.00" />);

            expect(screen.getByTestId("metric-row-fill").style.getPropertyValue("--progress-section-size")).toBe("0%");
            expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
        });
    });

    describe("accessibility", () => {
        it("exposes the bar as a progress bar named by the metric", () => {
            renderChart(<MetricRow name="Bridges" percentile={98} value="0.31" />);

            const bar = screen.getByRole("progressbar");
            expect(bar).toBe(screen.getByTestId("metric-row-bar"));
            expect(bar).toHaveAccessibleName("Bridges");
            expect(bar).toHaveAttribute("aria-valuemin", "0");
            expect(bar).toHaveAttribute("aria-valuemax", "100");
            expect(bar).toHaveAttribute("aria-valuenow", "98");
        });

        it("reads the value out as a percentile rather than as Mantine's fixed percentage", () => {
            renderChart(<MetricRow name="Bridges" percentile={98} value="0.31" />);

            const bar = screen.getByRole("progressbar");
            expect(bar).toHaveAttribute("aria-valuetext", "98th percentile");
            expect(bar).toHaveAttribute("title", "98th percentile");
            // Mantine's own aria would have said "98%", which is a different
            // claim about a different quantity.
            expect(screen.getByTestId("metric-row-fill")).not.toHaveAttribute("aria-valuetext");
            expect(screen.getByTestId("metric-row-fill")).not.toHaveAttribute("role");
        });

        it("leaves the whole name reachable when the row is too narrow to draw it", () => {
            const long = "Betweenness centrality, normalised over the largest component";
            renderChart(<MetricRow name={long} percentile={41} value="0.04" />);

            const name = screen.getByTestId("metric-row-name");
            // The ellipsis is a drawing: the text itself is never truncated, so
            // a screen reader reads it in full, and the title carries it to the
            // sighted reader the ellipsis hides it from.
            expect(name).toHaveTextContent(long);
            expect(name).toHaveAttribute("title", long);
            expect(name.style.textOverflow).toBe("ellipsis");
        });

        it("announces the reading, its bar and its rank together when a run finishes", () => {
            renderChart(<MetricRow name="Bridges" busy={false} percentile={98} value="0.31" rank="#6" />);

            const row = screen.getByTestId("metric-row");
            expect(row).toHaveAttribute("aria-live", "polite");
            expect(row).toHaveAttribute("aria-atomic", "true");
        });

        it("says nothing about a reading the caller did not say was computed", () => {
            renderChart(<MetricRow name="Bridges" percentile={98} value="0.31" rank="#6" />);

            expect(screen.getByTestId("metric-row")).not.toHaveAttribute("aria-live");
        });

        it("lets the caller raise the announcement to assertive", () => {
            renderChart(<MetricRow name="Bridges" busy={false} live="assertive" percentile={98} value="0.31" />);

            expect(screen.getByTestId("metric-row")).toHaveAttribute("aria-live", "assertive");
        });

        it("lets the caller mark a row busy without announcing it", () => {
            renderChart(<MetricRow name="Bridges" busy live="off" percentile={0} value="--" />);

            const row = screen.getByTestId("metric-row");
            expect(row).toHaveAttribute("aria-busy", "true");
            expect(row).not.toHaveAttribute("aria-live");
        });

        it("marks itself busy while the computation behind it is still running", () => {
            renderChart(<MetricRow name="Bridges" busy percentile={0} value="--" />);

            expect(screen.getByTestId("metric-row")).toHaveAttribute("aria-busy", "true");
        });

        it("is not a button when there is nothing to activate", () => {
            renderChart(<MetricRow name="Age" percentile={62} value="7" />);

            expect(screen.queryByRole("button")).toBeNull();
            expect(screen.getByTestId("metric-row")).not.toHaveAttribute("tabindex");
        });

        it("becomes a real button when it has somewhere to go", () => {
            renderChart(<MetricRow name="Betweenness" percentile={41} value="0.04" onClick={vi.fn()} />);

            const row = screen.getByRole("button", { name: /Betweenness/ });
            expect(row).toHaveAttribute("tabindex", "0");
            expect(row).toHaveStyle({ cursor: "pointer" });
        });
    });

    describe("events", () => {
        it("hands the pointer event and a pointer source to onClick", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderChart(<MetricRow name="Betweenness" percentile={41} value="0.04" onClick={onClick} />);

            await user.click(screen.getByRole("button", { name: /Betweenness/ }));

            expect(onClick).toHaveBeenCalledTimes(1);
            const [event, meta] = onClick.mock.calls[0];
            expect(meta).toEqual({ source: "pointer" });
            expect(typeof event.preventDefault).toBe("function");
        });

        it("carries the modifier keys a multiple selection needs", () => {
            const onClick = vi.fn();
            renderChart(<MetricRow name="Betweenness" percentile={41} value="0.04" onClick={onClick} />);

            fireEvent.click(screen.getByRole("button", { name: /Betweenness/ }), { detail: 1, shiftKey: true });

            const [event, meta] = onClick.mock.calls[0];
            expect(event.shiftKey).toBe(true);
            expect(meta.source).toBe("pointer");
        });

        it("opens from the keyboard on Enter, and says the activation was a keyboard one", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderChart(<MetricRow name="Betweenness" percentile={41} value="0.04" onClick={onClick} />);

            await user.tab();
            expect(screen.getByRole("button", { name: /Betweenness/ })).toHaveFocus();
            await user.keyboard("{Enter}");

            expect(onClick).toHaveBeenCalledTimes(1);
            expect(onClick.mock.calls[0][1]).toEqual({ source: "keyboard" });
        });

        it("opens from the keyboard on Space", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderChart(<MetricRow name="Betweenness" percentile={41} value="0.04" onClick={onClick} />);

            await user.tab();
            await user.keyboard("{ }");

            expect(onClick).toHaveBeenCalledTimes(1);
            expect(onClick.mock.calls[0][1]).toEqual({ source: "keyboard" });
        });

        it("ignores keys that are not Enter or Space", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderChart(<MetricRow name="Betweenness" percentile={41} value="0.04" onClick={onClick} />);

            await user.tab();
            await user.keyboard("{Escape}{ArrowRight}a");

            expect(onClick).not.toHaveBeenCalled();
        });

        it("reports a double click separately, for opening rather than selecting", async () => {
            const onDoubleClick = vi.fn();
            const user = userEvent.setup();
            renderChart(<MetricRow name="Betweenness" percentile={41} value="0.04" onDoubleClick={onDoubleClick} />);

            await user.dblClick(screen.getByTestId("metric-row"));

            expect(onDoubleClick).toHaveBeenCalledTimes(1);
        });

        it("reports a right click, so a consumer can put its own menu there", () => {
            const onContextMenu = vi.fn();
            renderChart(<MetricRow name="Betweenness" percentile={41} value="0.04" onContextMenu={onContextMenu} />);

            fireEvent.contextMenu(screen.getByTestId("metric-row"));

            expect(onContextMenu).toHaveBeenCalledTimes(1);
        });

        it("forwards focus and blur untouched", async () => {
            const onFocus = vi.fn();
            const onBlur = vi.fn();
            const user = userEvent.setup();
            renderChart(
                <MetricRow
                    name="Betweenness"
                    percentile={41}
                    value="0.04"
                    onClick={vi.fn()}
                    onFocus={onFocus}
                    onBlur={onBlur}
                />,
            );

            await user.tab();
            expect(onFocus).toHaveBeenCalledTimes(1);
            await user.tab();
            expect(onBlur).toHaveBeenCalledTimes(1);
        });

        it("does nothing on a click or a key when there is no handler", async () => {
            const user = userEvent.setup();
            renderChart(<MetricRow name="Age" percentile={62} value="7" />);

            const row = screen.getByTestId("metric-row");
            await user.click(row);
            // The row is not focusable without a handler, so the key is
            // delivered straight to it: the guard, and not the missing tab stop,
            // is what has to hold.
            fireEvent.keyDown(row, { key: "Enter" });

            expect(row).toBeInTheDocument();
            expect(row).toHaveStyle({ cursor: "default" });
        });
    });

    describe("internationalization", () => {
        it.each([
            [1, "1st percentile"],
            [2, "2nd percentile"],
            [3, "3rd percentile"],
            [4, "4th percentile"],
            [11, "11th percentile"],
            [12, "12th percentile"],
            [13, "13th percentile"],
            [21, "21st percentile"],
            [22, "22nd percentile"],
            [23, "23rd percentile"],
        ])("spells %i as %s in English", (percentile, expected) => {
            renderChart(<MetricRow name="Betweenness" percentile={percentile} value="0.04" />);

            expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", expected);
        });

        it("rounds a fractional percentile in the reading while drawing it exactly", () => {
            renderChart(<MetricRow name="Betweenness" percentile={41.4} value="0.04" />);

            expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "41st percentile");
            expect(screen.getByTestId("metric-row-fill").style.getPropertyValue("--progress-section-size")).toBe(
                "41.4%",
            );
        });

        it("takes its ordinal spelling and its sentence from the labels, not from English grammar", () => {
            renderLocalized(<MetricRow name="Ponts" percentile={98} value="0,31" />, "fr-FR", {
                ordinal: (value, rule) => (rule === "one" ? `${value}er` : `${value}e`),
                percentile: (ordinal) => `${ordinal} centile`,
            });

            expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "98e centile");
        });

        it("uses the locale's own plural categories to pick the spelling", () => {
            renderLocalized(<MetricRow name="Ponts" percentile={1} value="0,01" />, "fr-FR", {
                ordinal: (value, rule) => (rule === "one" ? `${value}er` : `${value}e`),
                percentile: (ordinal) => `${ordinal} centile`,
            });

            // French marks only the first ordinal; English would have said
            // "1st" here and every other library hardcodes exactly that.
            expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "1er centile");
        });

        it("fills the bar from the inline start, so a percentile does not fill from the wrong end", () => {
            renderRtl(<MetricRow name="Bridges" percentile={98} value="0.31" />);

            const track = screen.getByTestId("metric-row-bar");
            const fill = screen.getByTestId("metric-row-fill");
            // The fill is a flex child of the track, which follows the text
            // direction. Nothing anchors it to a physical edge, which is what an
            // `insetInlineStart` or a `left` here would do.
            expect(fill.parentElement).toBe(track);
            expect(fill.style.left).toBe("");
            expect(fill.style.insetInlineStart).toBe("");
            expect(fill.style.position).toBe("");
            expect(fill.style.getPropertyValue("--progress-section-size")).toBe("98%");
        });
    });
});
