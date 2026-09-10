import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import React, { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";

import {
    ActionRow,
    AdvancedButton,
    compactTheme,
    CompoundRow,
    ControlSection,
    FieldRow,
    HistogramRow,
    IconGroupRow,
    MetricRow,
    PanelField,
    ProseBlock,
    RampRow,
    SparklineRow,
    ToggleRow,
    ToggleRowGroup,
    TrailingSlot,
} from "../src";

// These are the set-wide rules, tested once for the whole library rather than
// per component. Every one of them was a real divergence: the seven development
// warnings had two gates and two timings between them, and five components had
// five different ways of saying "this content arrives later". A rule stated in
// one place and asserted in one place is what keeps the next round of parallel
// work from re-inventing five answers.

/**
 * Render a component inside the compact theme.
 * @param ui - What to render
 * @returns The render result
 */
function renderCompact(ui: React.ReactElement): ReturnType<typeof render> {
    return render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
}

/**
 * Render a component inside the compact theme and React's StrictMode.
 *
 * StrictMode renders twice and mounts every effect twice, which is what turned
 * a warning written during render into two identical console lines.
 * @param ui - What to render
 * @returns The render result
 */
function renderStrict(ui: React.ReactElement): ReturnType<typeof render> {
    return render(
        <StrictMode>
            <MantineProvider theme={compactTheme}>{ui}</MantineProvider>
        </StrictMode>,
    );
}

describe("every development warning in the library behaves the same way", () => {
    let warn: MockInstance<(...args: unknown[]) => void>;

    beforeEach(() => {
        warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    });

    afterEach(() => {
        warn.mockRestore();
    });

    // Each entry is a component rendered with the mistake it reports.
    const offenders: [string, React.ReactElement][] = [
        ["ControlSection", <ControlSection key="section" label="Size" />],
        ["ActionRow", <ActionRow key="action" onClick={vi.fn()} />],
        [
            "CompoundRow",
            <CompoundRow key="compound" label="Node opacity" segments={[{ value: "100", grow: true }]} />,
        ],
        ["FieldRow", <FieldRow key="fields">{null}</FieldRow>],
        [
            "IconGroupRow",
            <IconGroupRow key="icons" label="Shape" options={[{ value: "only", icon: <span aria-hidden="true">o</span>, label: "Only" }]} />,
        ],
        [
            "ProseBlock",
            <ProseBlock key="prose" variant="reading">
                {"One. Two. Three. Four sentences is an explanation rather than a reading."}
            </ProseBlock>,
        ],
        [
            "ToggleRowGroup",
            <ToggleRowGroup key="toggles" label="Render options">
                <ToggleRow label="Labels" />
            </ToggleRowGroup>,
        ],
    ];

    it.each(offenders)("%s reports its mistake exactly once", (_name, element) => {
        renderCompact(element);

        expect(warn).toHaveBeenCalledTimes(1);
    });

    it.each(offenders)("%s reports it once under StrictMode, not twice", (_name, element) => {
        // The two components that warned during render logged twice here, while
        // the five that warned from an effect logged once. They all warn from
        // the shared hook now.
        renderStrict(element);

        expect(warn).toHaveBeenCalledTimes(1);
    });

    it.each(offenders)("%s says nothing more when it re-renders unchanged", (_name, element) => {
        const { rerender } = renderCompact(element);

        rerender(<MantineProvider theme={compactTheme}>{element}</MantineProvider>);

        expect(warn).toHaveBeenCalledTimes(1);
    });

    it.each(offenders)("%s writes plain English, with no in-house shorthand", (_name, element) => {
        renderCompact(element);

        // Published warnings are read by people who have never seen this
        // project, so nothing internal may reach them.
        const message = String(warn.mock.calls[0]?.[0]);
        expect(message).not.toMatch(/RT-\d|VOCAB|DECISIONS|COMPACTION|escape hatch|chrome ink|door test|Phase \d/i);
        expect(message).toMatch(/^[A-Z][A-Za-z]+ (was given|"|\w)/);
    });

    it.each(offenders)("%s names itself first, so the offending component is obvious", (name, element) => {
        renderCompact(element);

        expect(String(warn.mock.calls[0]?.[0]).startsWith(name)).toBe(true);
    });
});

describe("every component that can announce follows one live-region rule", () => {
    // Supplying `busy` at all -- true or false -- is what says the content
    // arrives late, and that is what creates the live region. `live` overrides
    // the politeness. Nothing in the library announces without being told to.
    const announcers: [string, string, (props: { busy?: boolean; live?: "off" | "polite" }) => React.ReactElement][] = [
        [
            "HistogramRow",
            "histogram-chart",
            (props) => <HistogramRow label="Links per node" bins={[{ label: "0 links: 4 nodes", count: 4 }]} minLabel="0" maxLabel="4" {...props} />,
        ],
        [
            "SparklineRow",
            "sparkline-chart",
            (props) => <SparklineRow label="Settling" values={[1, 2, 3]} minLabel="1" maxLabel="3" {...props} />,
        ],
        ["MetricRow", "metric-row", (props) => <MetricRow name="Bridges" percentile={98} value="0.31" {...props} />],
        [
            "CompoundRow",
            "compound-row-box",
            (props) => (
                <CompoundRow
                    label="Node colour and opacity"
                    segments={[{ value: "4A7EE8", grow: true }, { value: "100", unit: "%" }]}
                    {...props}
                />
            ),
        ],
        [
            "RampRow",
            "ramp-row-figure",
            (props) => <RampRow label="Node size" min="1" max="4" {...props} />,
        ],
        [
            "ProseBlock",
            "prose-block",
            (props) => (
                <ProseBlock variant="reading" {...props}>
                    Forty-one paths run through this node.
                </ProseBlock>
            ),
        ],
        ["ActionRow", "action-row-state", (props) => <ActionRow state="20 nodes" {...props} />],
    ];

    it.each(announcers)("%s says nothing until it is told the content arrives late", (_name, testId, build) => {
        renderCompact(build({}));

        expect(screen.getByTestId(testId)).not.toHaveAttribute("aria-live");
    });

    it.each(announcers)("%s announces politely once it is given busy", (_name, testId, build) => {
        renderCompact(build({ busy: false }));

        const surface = screen.getByTestId(testId);
        expect(surface).toHaveAttribute("aria-live", "polite");
        expect(surface).toHaveAttribute("aria-atomic", "true");
        expect(surface).toHaveAttribute("aria-busy", "false");
    });

    it.each(announcers)("%s marks itself busy while the work is in flight", (_name, testId, build) => {
        renderCompact(build({ busy: true }));

        expect(screen.getByTestId(testId)).toHaveAttribute("aria-busy", "true");
    });

    it.each(announcers)("%s lets live override the politeness", (_name, testId, build) => {
        renderCompact(build({ busy: true, live: "off" }));

        const surface = screen.getByTestId(testId);
        expect(surface).not.toHaveAttribute("aria-live");
        expect(surface).toHaveAttribute("aria-busy", "true");
    });
});

describe("every component publishes the same kind of test hook", () => {
    // One root data-testid per component, kebab-case, named after the component.
    // Half the library had one and half did not, so a test written against one
    // row could not be written against the next.
    const roots: [string, React.ReactElement][] = [
        ["action-row", <ActionRow key="a" state="20 nodes" />],
        ["advanced-button", <AdvancedButton key="ab" label="Range and scale" />],
        ["compound-row", <CompoundRow key="c" label="Size" segments={[{ value: "1", grow: true }, { value: "4" }]} />],
        ["control-section", <ControlSection key="s" label="Size" empty />],
        ["field-row", <FieldRow key="f"><PanelField label="Size" value="1" /></FieldRow>],
        ["histogram-row", <HistogramRow key="h" label="Degrees" bins={[{ label: "0 links: 1 node", count: 1 }]} minLabel="0" maxLabel="1" />],
        [
            "icon-group-row",
            <IconGroupRow
                key="i"
                label="Shape"
                options={[
                    { value: "circle", icon: <span aria-hidden="true">o</span>, label: "Circle" },
                    { value: "square", icon: <span aria-hidden="true">s</span>, label: "Square" },
                ]}
            />,
        ],
        ["metric-row", <MetricRow key="m" name="Bridges" percentile={98} value="0.31" />],
        ["panel-field", <PanelField key="p" label="Size" value="1" />],
        ["prose-block", <ProseBlock key="pr" variant="reading">A short reading.</ProseBlock>],
        ["ramp-row", <RampRow key="r" label="Size" min="1" max="4" />],
        ["sparkline-row", <SparklineRow key="sp" label="Settling" values={[1, 2]} minLabel="1" maxLabel="2" />],
        ["toggle-row", <ToggleRow key="t" label="Labels" />],
        ["trailing-slot", <TrailingSlot key="ts" />],
    ];

    it.each(roots)("%s is reachable by its own test id", (testId, element) => {
        renderCompact(element);

        expect(screen.getByTestId(testId)).toBeInTheDocument();
    });
});
