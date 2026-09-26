/**
 * The chrome package against Figma (design/figma-spec.md section 9): section headers, legends,
 * captions, sub-groups, property rows, chart and prose rows, dividers and the resize handle, in
 * the light and the dark theme, and the AA option where these read an AA token.
 *
 * Expected values are read from the Figma captures wherever a capture has the element
 * (figmaElement / figmaSpec); the few that are not in a styles.json (the resize handle's
 * focus pill, which is a pseudo element) cite the pseudo capture they come from.
 *
 * Every row is rendered inside a 240px panel, the way the app lays it out, and positions are
 * measured from the panel's top-left corner, the way the captures are.
 */
import { ActionIcon, Divider } from "@mantine/core";
import { commands, userEvent } from "@vitest/browser/context";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";

import { ResizeHandle } from "../../src/components/chrome/ResizeHandle";
import { ControlGroup } from "../../src/components/ControlGroup";
import { ControlSection } from "../../src/components/ControlSection";
import { ControlSubGroup } from "../../src/components/ControlSubGroup";
import { ActionRow } from "../../src/components/rows/ActionRow";
import { HistogramRow, MetricRow, SparklineRow } from "../../src/components/rows/ChartRow";
import { CompoundRow } from "../../src/components/rows/CompoundRow";
import { FieldRow } from "../../src/components/rows/FieldRow";
import { ProseBlock } from "../../src/components/rows/ProseBlock";
import { RampRow } from "../../src/components/rows/RampRow";
import { AdvancedButton } from "../../src/components/rows/TrailingSlot";
import { PANEL_GRID } from "../../src/constants/panel";
import { PanelLabelsProvider } from "../../src/context/PanelLabelsContext";
import { UiGlyph } from "../../src/icons";
import {
    drive,
    expectMeasured,
    figmaAvailable,
    figmaElement,
    figmaSpec,
    type MeasureSpec,
    part,
    renderFigma,
    resetHarness,
} from "./harness";

const SCHEMES = ["light", "dark"] as const;
type Scheme = (typeof SCHEMES)[number];

/** The type properties every text comparison reads. */
const TYPE = ["color", "fontSize", "lineHeight", "fontWeight", "letterSpacing"];

/** The token values this file checks where no capture holds the element. */
const INK = {
    light: {
        text: "#000000e5",
        secondary: "#00000080",
        iconSecondary: "#00000080",
        border: "#e6e6e6",
        bg: "#ffffff",
        field: "#f5f5f5",
        brand: "#0d99ff",
        iconBrand: "#007be5",
    },
    dark: {
        text: "#ffffff",
        secondary: "#ffffffb2",
        iconSecondary: "#ffffffb2",
        border: "#444444",
        bg: "#2c2c2c",
        field: "#383838",
        brand: "#0c8ce9",
        iconBrand: "#7cc4f8",
    },
} as const;

/**
 * Render UI inside a 240px panel painted with the panel ground.
 * @param ui - the rows
 * @param scheme - the color scheme
 * @param highContrast - the AA token set
 * @returns the panel element
 */
async function inPanel(ui: React.ReactElement, scheme: Scheme, highContrast = false): Promise<HTMLElement> {
    const { container } = await renderFigma(
        <div data-testid="panel" style={{ width: PANEL_GRID.WIDTH, background: "var(--cm-bg)", position: "relative" }}>
            {ui}
        </div>,
        { scheme, highContrast },
    );
    return part(container, '[data-testid="panel"]');
}

/** Let a 100ms color transition finish. */
async function settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 150));
}

/**
 * An element's box relative to the panel.
 * @param el - the element
 * @param panel - the panel
 * @returns x, y, width, height
 */
function boxIn(el: Element, panel: Element): { x: number; y: number; width: number; height: number } {
    const r = el.getBoundingClientRect();
    const p = panel.getBoundingClientRect();
    return { x: r.left - p.left, y: r.top - p.top, width: r.width, height: r.height };
}

/**
 * Assert a box within the harness's 0.5px tolerance.
 * @param actual - the measured box
 * @param expected - the wanted members
 */
function expectBoxNear(
    actual: { x: number; y: number; width: number; height: number },
    expected: Partial<{ x: number; y: number; width: number; height: number }>,
): void {
    for (const [key, want] of Object.entries(expected)) {
        expect(Math.abs(actual[key as keyof typeof actual] - want), `${key}: ${String(actual[key as keyof typeof actual])}`).toBeLessThanOrEqual(0.5);
    }
}

/** Two 24px header actions, as Figma's Fill section carries. */
const TWO_ACTIONS = (
    <>
        <ActionIcon aria-label="Apply styles">
            <UiGlyph name="settings" />
        </ActionIcon>
        <ActionIcon aria-label="Add fill">
            <UiGlyph name="plus" />
        </ActionIcon>
    </>
);

afterEach(resetHarness);

describe.skipIf(!(await figmaAvailable()))("chrome against Figma", () => {
    describe.each(SCHEMES)("section header (spec 9.2), %s", (scheme) => {
        it("draws a 40px header, a 164x32-style title target at y 4, and the rule below", async () => {
            const panel = await inPanel(
                <ControlSection label="Fill" actions={TWO_ACTIONS}>
                    <div style={{ height: 32 }} />
                </ControlSection>,
                scheme,
            );
            const section = part(panel, '[data-testid="control-section"]');
            const header = part(panel, '[data-testid="control-section-header"]');
            const title = part(panel, '[data-testid="control-section-name"]');
            const chevron = part(panel, '[data-testid="control-section-chevron-slot"]');

            // rs/s-al-full-sec-fill #22 (section), #27 (chevron), #29 (h2), #32 / #39 (actions);
            // dt/dark-panel-rect #121 (dark rule).
            expectBoxNear(boxIn(header, panel), { x: 0, y: 0, width: 240, height: 40 });
            expectBoxNear(boxIn(title, panel), { x: 16, y: 4, height: 32 });
            expectBoxNear(boxIn(chevron, panel), { x: 0, y: 12, width: 16, height: 16 });
            const actions = panel.querySelectorAll('[data-testid="control-section-actions"] button');
            expectBoxNear(boxIn(actions[0], panel), { x: 180, y: 8, width: 24, height: 24 });
            expectBoxNear(boxIn(actions[1], panel), { x: 208, y: 8, width: 24, height: 24 });

            if (scheme === "light") {
                const figmaTitle = await figmaElement("rs/s-al-full-sec-fill", { index: 29 });
                expectMeasured(title, figmaSpec(figmaTitle, TYPE));
                const figmaChevron = await figmaElement("rs/s-al-full-sec-fill", { index: 27 });
                expectMeasured(chevron, figmaSpec(figmaChevron, ["color"]));
                const rule = await figmaElement("bc/panel-title-collapsible-stroke--default", { index: 32 });
                expectMeasured(section, figmaSpec(rule, ["borderBottomWidth", "borderBottomColor"]));
            } else {
                const rule = await figmaElement("dt/dark-panel-rect", { index: 121 });
                expectMeasured(section, figmaSpec(rule, ["borderBottomWidth", "borderBottomColor"]));
                expectMeasured(title, { color: INK.dark.text, fontSize: "11px", lineHeight: "32px", fontWeight: "550", letterSpacing: "normal" });
            }
        });

        it("pads 12 below the rows: Figma's Position section is 197 tall", async () => {
            const row = (label: string): React.ReactElement => (
                <ControlGroup label={label}>
                    <FieldRow>
                        <div style={{ height: 24, width: "100%" }} />
                    </FieldRow>
                </ControlGroup>
            );
            const panel = await inPanel(
                <ControlSection label="Position" collapsible={false}>
                    {row("Alignment")}
                    {row("Position")}
                    {row("Rotation")}
                </ControlSection>,
                scheme,
            );
            // rs/s-al-full-panel / dt/dark-panel-rect #121: 240 x 197 with padding-bottom 12.
            const figma = await figmaElement(scheme === "light" ? "dt/light-panel-rect" : "dt/dark-panel-rect", {
                index: 121,
            });
            expectBoxNear(boxIn(part(panel, '[data-testid="control-section"]'), panel), {
                width: figma.box[2],
                height: figma.box[3],
            });
        });

        it("dims an empty section's title, chevron and + and brings them up on hover over 100ms", async () => {
            const panel = await inPanel(<ControlSection label="Stroke" empty onAdd={() => undefined} />, scheme);
            const title = part(panel, '[data-testid="control-section-name"]');
            const header = part(panel, '[data-testid="control-section-header"]');

            // bc/panel-title-collapsible-stroke--default|hover #40 (light).
            if (scheme === "light") {
                const rest = await figmaElement("bc/panel-title-collapsible-stroke--default", { index: 40 });
                expectMeasured(title, figmaSpec(rest, TYPE));
                expectMeasured(header, { transition: "color 0.1s ease-out" });
            } else {
                expectMeasured(title, { color: INK.dark.secondary });
            }
            // An empty section is just its header and the rule: 41.
            expectBoxNear(boxIn(part(panel, '[data-testid="control-section"]'), panel), { height: 41 });

            await drive(header, "hover");
            await settle();
            if (scheme === "light") {
                const hover = await figmaElement("bc/panel-title-collapsible-stroke--hover", { index: 40 });
                expectMeasured(title, figmaSpec(hover, ["color"]));
            } else {
                expectMeasured(title, { color: INK.dark.text });
            }
        });

        it("rings the toggle 1px inside on keyboard focus", async () => {
            const panel = await inPanel(
                <ControlSection label="Export">
                    <div style={{ height: 32 }} />
                </ControlSection>,
                scheme,
            );
            const toggle = part(panel, '[data-testid="control-section-toggle"]');
            await drive(toggle, "focus");
            expectMeasured(toggle, {
                outlineColor: INK[scheme].brand,
                outlineWidth: "1px",
                outlineStyle: "solid",
                outlineOffset: "-1px",
            });
        });
    });

    describe.each(SCHEMES)("legend and captions (spec 9.3), %s", (scheme) => {
        it("draws the legend as a 16 band with Figma's 9/14 500 caption, and a field row under it at 48", async () => {
            const panel = await inPanel(
                <div style={{ paddingInline: "16px 8px" }}>
                    <ControlGroup label="Position">
                        <FieldRow>
                            <div data-testid="c" style={{ height: 24, width: "100%" }} />
                        </FieldRow>
                    </ControlGroup>
                </div>,
                scheme,
            );
            // rs/s-al-full-panel #113 (fieldset 240x48), #115 (caption span); dt/dark-panel-rect #129.
            const figmaText =
                scheme === "light"
                    ? await figmaElement("rs/s-al-full-panel", { index: 115 })
                    : await figmaElement("dt/dark-panel-rect", { index: 129 });
            const text = part(panel, '[data-testid="control-group-label"]');
            expectMeasured(text, figmaSpec(figmaText, TYPE));
            expectBoxNear(boxIn(part(panel, '[data-testid="control-group"]'), panel), { x: 16, y: 0, height: 48 });
            // The text's vertical center: Figma's span sits at y 3, 11 tall.
            const t = boxIn(text, panel);
            expect(Math.abs(t.y + t.height / 2 - (3 + 11 / 2))).toBeLessThanOrEqual(0.5);
            // The control at y 20, as Figma's (#117 at 190 - 170).
            expectBoxNear(boxIn(part(panel, '[data-testid="c"]'), panel), { x: 16, y: 20, height: 24 });
        });

        it("draws Figma's labeled two-column row: captions above, 50 tall", async () => {
            const Control = ({ label }: { label: string }): React.JSX.Element => (
                <div aria-label={label} data-testid="ctl" style={{ height: 24, width: "100%" }} />
            );
            const panel = await inPanel(
                <div style={{ paddingInline: "16px 8px" }}>
                    <PanelLabelsProvider showLabels>
                        <FieldRow>
                            <Control label="Opacity" />
                            <Control label="Corner radius" />
                        </FieldRow>
                    </PanelLabelsProvider>
                </div>,
                scheme,
            );
            // rs/s-al-full-panel #456 (fieldset 240x50), #457 (caption); dt/dark-panel-autolayout #203 / #204.
            const [figmaCaption, figmaSecond] =
                scheme === "light"
                    ? [await figmaElement("rs/s-al-full-panel", { index: 457 }), undefined]
                    : [
                          await figmaElement("dt/dark-panel-autolayout", { index: 203 }),
                          await figmaElement("dt/dark-panel-autolayout", { index: 204 }),
                      ];
            const captions = panel.querySelectorAll<HTMLElement>('[data-testid="field-row-caption"]');
            expectMeasured(captions[0], figmaSpec(figmaCaption, TYPE));
            expectBoxNear(boxIn(captions[0], panel), { x: 16, y: 4, width: 88, height: 14 });
            expectBoxNear(boxIn(captions[1], panel), { x: 112, y: 4, width: 88, height: 14 });
            if (figmaSecond) {
                expect(figmaSecond.box[0] - 1360).toBe(112);
            }
            expectBoxNear(boxIn(part(panel, '[data-testid="field-row"]'), panel), { height: 50 });
            expectBoxNear(boxIn(panel.querySelectorAll('[data-testid="ctl"]')[0], panel), { y: 22, height: 24 });
        });
    });

    describe.each(SCHEMES)("sub-group (spec 9.4), %s", (scheme) => {
        it("is a 32 row, secondary label turning primary on hover", async () => {
            const panel = await inPanel(
                <div style={{ paddingInline: "16px 8px" }}>
                    <ControlSubGroup label="Advanced settings">
                        <div />
                    </ControlSubGroup>
                </div>,
                scheme,
            );
            const control = part(panel, '[data-testid="control-sub-group-control"]');
            expectBoxNear(boxIn(control, panel), { x: 0, height: 32 });
            expectMeasured(control, {
                color: INK[scheme].secondary,
                fontSize: "11px",
                lineHeight: "16px",
                fontWeight: "450",
                letterSpacing: "0.055px",
                transition: "color 0.1s ease-out",
            });
            await drive(control, "hover");
            await settle();
            expectMeasured(control, { color: INK[scheme].text });
        });
    });

    describe.each(SCHEMES)("trailing slot and AdvancedButton (spec 9.5), %s", (scheme) => {
        it("sits 24x24 at x 208, radius 5; a changed setting draws the brand glyph", async () => {
            const panel = await inPanel(
                <div style={{ paddingInline: "16px 8px" }}>
                    <FieldRow trailing={<AdvancedButton label="Individual corners" changed />}>
                        <div style={{ height: 24, width: "100%" }} />
                    </FieldRow>
                </div>,
                scheme,
            );
            const button = part(panel, '[data-testid="advanced-button"]');
            // rs/s-al-full-sec-appearance #67 ("Individual corners") at 1568 - 1360 = 208.
            const figma = await figmaElement("rs/s-al-full-sec-appearance", { index: 67 });
            expectBoxNear(boxIn(button, panel), { x: figma.box[0] - 1360, width: figma.box[2], height: figma.box[3] });
            expectMeasured(button, figmaSpec(figma, ["borderRadius"]));
            expectMeasured(button, { color: INK[scheme].iconBrand });
        });
    });

    describe.each(SCHEMES)("property rows (spec 9.6), %s", (scheme) => {
        it("ActionRow: a 32 row, the reading 11/16 450 secondary, actions always drawn", async () => {
            const panel = await inPanel(
                <div style={{ paddingInline: "16px 8px" }}>
                    <ActionRow state="20 nodes" actions={<ActionIcon aria-label="Copy">+</ActionIcon>} />
                </div>,
                scheme,
            );
            expectBoxNear(boxIn(part(panel, '[data-testid="action-row"]'), panel), { height: 32 });
            expectMeasured(part(panel, '[data-testid="action-row-state"]'), {
                color: INK[scheme].secondary,
                fontSize: "11px",
                lineHeight: "16px",
                fontWeight: "450",
                letterSpacing: "0.055px",
            });
            expectMeasured(part(panel, '[data-testid="action-row-actions"]'), { opacity: "1" });
        });

        it("CompoundRow: one filled field, 1px panel seams, hover outline, 1px focus ring", async () => {
            const chit = <span style={{ display: "block", width: 14, height: 14, borderRadius: 2, background: "#3380ff" }} />;
            const panel = await inPanel(
                <div style={{ paddingInline: "16px 8px" }}>
                    <CompoundRow
                        label="Fill"
                        segments={[
                            { glyph: chit, value: "3380FF", grow: true },
                            { value: "100", unit: "%" },
                        ]}
                        onClick={() => undefined}
                    />
                </div>,
                scheme,
            );
            const box = part(panel, '[data-testid="compound-row-box"]');
            // rs/s-al-full-sec-fill #55: the paint field, #f5f5f5, radius 5, 24 tall.
            if (scheme === "light") {
                const figma = await figmaElement("rs/s-al-full-sec-fill", { index: 55 });
                expectMeasured(box, figmaSpec(figma, ["backgroundColor", "borderRadius", "height"]));
            } else {
                expectMeasured(box, { backgroundColor: INK.dark.field, borderRadius: "5px", height: 24 });
            }
            expectBoxNear(boxIn(box, panel), { x: 16, width: PANEL_GRID.BODY });
            // The hex text starts at x+24 (#61 at 1400 - 1376), the chit at x+5 (#56).
            const values = panel.querySelectorAll('[data-testid="compound-segment-value"]');
            expectBoxNear(boxIn(values[0], panel), { x: 16 + 24 });
            const seam = part(panel, '[data-testid="compound-row-hairline"]');
            expectMeasured(seam, { backgroundColor: INK[scheme].bg, width: 1, height: 24 });
            // The later segment's text 8px past the seam's start (1px seam + 7px, #64).
            const seamX = boxIn(seam, panel).x;
            expectBoxNear(boxIn(values[1], panel), { x: seamX + 8 });

            await drive(box, "hover");
            expectMeasured(box, { outlineColor: INK[scheme].border, outlineWidth: "1px", outlineOffset: "-1px" });
            await resetHarness();
        });

        it("CompoundRow: focus draws the 1px ring inside", async () => {
            const panel = await inPanel(
                <div style={{ paddingInline: "16px 8px" }}>
                    <CompoundRow
                        label="Fill"
                        segments={[
                            { value: "3380FF", grow: true },
                            { value: "100", unit: "%" },
                        ]}
                        onClick={() => undefined}
                    />
                </div>,
                scheme,
            );
            const box = part(panel, '[data-testid="compound-row-box"]');
            await drive(box, "focus");
            expectMeasured(box, { outlineColor: INK[scheme].brand, outlineWidth: "1px", outlineOffset: "-1px" });
        });
    });

    describe.each(SCHEMES)("dividers (spec 9.7), %s", (scheme) => {
        it("Mantine's Divider draws Figma's border color", async () => {
            const panel = await inPanel(<Divider data-testid="d" />, scheme);
            expectMeasured(part(panel, '[data-testid="d"]'), {
                borderTopColor: INK[scheme].border,
                borderTopWidth: "1px",
            });
        });
    });

    describe.each(SCHEMES)("chart, ramp and prose rows (spec 9.8), %s", (scheme) => {
        const body = (s: Scheme, ink: "text" | "secondary"): MeasureSpec => ({
            color: INK[s][ink],
            fontSize: "11px",
            lineHeight: "16px",
            fontWeight: "450",
            letterSpacing: "0.055px",
        });

        it("HistogramRow: bars in the secondary icon ink, highlight brand, baseline border", async () => {
            const panel = await inPanel(
                <div style={{ paddingInline: "16px 8px" }}>
                    <HistogramRow
                        bins={[
                            { label: "a", count: 2 },
                            { label: "b", count: 5, highlighted: true },
                        ]}
                        minLabel="2"
                        maxLabel="4"
                    />
                </div>,
                scheme,
            );
            const bars = panel.querySelectorAll('[data-testid="histogram-bar"]');
            expectMeasured(bars[0], { backgroundColor: INK[scheme].iconSecondary });
            expectMeasured(bars[1], { backgroundColor: INK[scheme].brand });
            expectMeasured(part(panel, '[data-testid="chart-baseline"]'), { backgroundColor: INK[scheme].border });
            expectMeasured(part(panel, '[data-testid="chart-axis-min"]'), body(scheme, "secondary"));
            expectBoxNear(boxIn(part(panel, '[data-testid="histogram-row"]'), panel), { height: 64 });
        });

        it("SparklineRow, MetricRow and RampRow text is the body role", async () => {
            const panel = await inPanel(
                <div style={{ paddingInline: "16px 8px" }}>
                    <SparklineRow values={[1, 4, 2, 8]} minLabel="1" maxLabel="8" />
                    <MetricRow name="Bridges" percentile={98} value="0.31" />
                    <RampRow min="45" max="68" />
                </div>,
                scheme,
            );
            expectMeasured(part(panel, '[data-testid="sparkline-drawing"]'), { color: INK[scheme].iconSecondary });
            expectMeasured(part(panel, '[data-testid="metric-row-name"]'), body(scheme, "text"));
            expectMeasured(part(panel, '[data-testid="metric-row-value"]'), body(scheme, "text"));
            expectMeasured(part(panel, '[data-testid="ramp-row-min"]'), body(scheme, "secondary"));
            expectMeasured(part(panel, '[data-testid="ramp-row-ramp"]'), {
                backgroundColor: INK[scheme].iconSecondary,
                height: 12,
            });
        });

        it("ProseBlock: 11/16 450, reading and run record secondary, departure primary", async () => {
            const panel = await inPanel(
                <div style={{ paddingInline: "16px 8px" }}>
                    <ProseBlock variant="reading">How often a node sits on shortest paths.</ProseBlock>
                    <ProseBlock variant="departure">Weights ignored.</ProseBlock>
                </div>,
                scheme,
            );
            const blocks = panel.querySelectorAll('[data-testid="prose-block"]');
            expectMeasured(blocks[0], body(scheme, "secondary"));
            expectMeasured(part(blocks[1], '[data-testid="prose-block-text"]'), body(scheme, "text"));
        });
    });

    describe("the AA option", () => {
        it("raises the legend and caption secondary ink to 55% black", async () => {
            const panel = await inPanel(
                <ControlGroup label="Position">
                    <div />
                </ControlGroup>,
                "light",
                true,
            );
            expectMeasured(part(panel, '[data-testid="control-group-label"]'), { color: "#0000008c" });
        });
    });

    describe.each(SCHEMES)("resize handle (spec 9.9), %s", (scheme) => {
        it("is an invisible 8px separator until keyboard focus draws the grip pill", async () => {
            const panel = await inPanel(
                <div data-testid="side" style={{ position: "relative", width: 240, height: 1000 }}>
                    <ResizeHandle edge="end" min={240} max={500} defaultValue={240} />
                </div>,
                scheme,
            );
            const handle = part(panel, '[data-testid="resize-handle"]');
            // left-sidebar/resize-handle-focus #80: 8 x 1000, straddling the edge.
            const figma = await figmaElement("ls/resize-handle-focus", { index: 80 });
            expectBoxNear(boxIn(handle, panel), { x: 236, width: figma.box[2], height: figma.box[3] });
            expect(handle.getAttribute("role")).toBe("separator");
            expect(handle.getAttribute("aria-valuetext")).toBe("240 pixels (min)");
            // At its minimum only growing is possible (resize-handle-focus #80: e-resize).
            expectMeasured(handle, figmaSpec(figma, ["cursor"]));
            expectMeasured(handle, { content: "none" }, { pseudo: "::before" });

            await drive(handle, "focus");
            // left-sidebar/resize-handle-focus.pseudo.json: 4 x 500, 2px in, the focus color,
            // radius 9999.
            expectMeasured(
                handle,
                { width: 8, backgroundColor: INK[scheme].brand, borderTopLeftRadius: "9999px", left: "2px", right: "2px" },
                { pseudo: "::before" },
            );
            const pill = getComputedStyle(handle, "::before");
            expect(pill.height).toBe("500px");
        });

        it("moves 1px per arrow, 10 with Shift, and jumps with Home and End", async () => {
            const panel = await inPanel(
                <div style={{ position: "relative", width: 240, height: 400 }}>
                    <ResizeHandle edge="end" min={240} max={500} defaultValue={240} />
                </div>,
                scheme,
            );
            const handle = part(panel, '[data-testid="resize-handle"]');
            await drive(handle, "focus");
            await userEvent.keyboard("{ArrowRight}");
            expect(handle.getAttribute("aria-valuenow")).toBe("241");
            await userEvent.keyboard("{Shift>}{ArrowRight}{/Shift}");
            expect(handle.getAttribute("aria-valuenow")).toBe("251");
            await userEvent.keyboard("{End}");
            expect(handle.getAttribute("aria-valuetext")).toBe("500 pixels (max)");
            expect(getComputedStyle(handle).cursor).toBe("w-resize");
            await userEvent.keyboard("{Home}");
            expect(handle.getAttribute("aria-valuenow")).toBe("240");
        });

        it("follows a real drag live, clamps at the maximum and settles on release", async () => {
            const changes: number[] = [];
            const ends: number[] = [];
            const panel = await inPanel(
                <div style={{ position: "relative", width: 240, height: 200 }}>
                    <ResizeHandle
                        edge="end"
                        min={240}
                        max={500}
                        defaultValue={240}
                        onChange={(v) => changes.push(v)}
                        onChangeEnd={(v) => ends.push(v)}
                    />
                </div>,
                scheme,
            );
            const handle = part(panel, '[data-testid="resize-handle"]');
            await userEvent.hover(handle, { position: { x: 4, y: 100 } });
            await commands.mouseDown();
            await userEvent.hover(handle, { position: { x: 44, y: 100 } });
            expect(changes.at(-1)).toBe(280);
            expect(ends).toEqual([]);
            await commands.mouseUp();
            expect(ends).toEqual([280]);
        });
    });
});
