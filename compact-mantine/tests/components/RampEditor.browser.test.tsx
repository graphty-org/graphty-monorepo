/**
 * RampEditor in a real browser: a handle dragged with a real pointer, stepped with real keys, and
 * a domain end typed into its field.
 */
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import React, { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { commands, userEvent } from "vitest/browser";

import { compactTheme, RampEditor, type RampEditorBin, type RampEditorHandle } from "../../src";
import { renderThemed, resetHarness } from "../harness/measure";

afterEach(async () => {
    await commands.mouseAway();
});

/** Ten bins over 0..100, each holding a different count. */
const BINS: RampEditorBin[] = Array.from({ length: 10 }, (_, i) => ({
    from: i * 10,
    to: (i + 1) * 10,
    count: i + 1,
    paint: `hsl(${String(i * 20)} 70% 50%)`,
    label: `${String(i * 10)} to ${String((i + 1) * 10)}: ${String(i + 1)}`,
}));

/**
 * The caller's words for a handle's value.
 * @param handle - which handle
 * @param value - its value
 * @returns the words
 */
const describeHandle = (handle: RampEditorHandle, value: number): string => `${handle} at degree ${String(value)}`;

/**
 * The editor with its domain held in state, as a caller holds it.
 * @param props - Component props
 * @param props.onDomainChange - spy for each reported domain
 * @returns the harness
 */
function Harness({ onDomainChange }: { onDomainChange: (domain: [number, number]) => void }): React.JSX.Element {
    const [domain, setDomain] = useState<[number, number]>([20, 80]);
    return (
        <MantineProvider theme={compactTheme}>
            <div style={{ width: 240 }}>
                <RampEditor
                    label="Node color by degree"
                    bins={BINS}
                    domain={domain}
                    onDomainChange={(next) => {
                        onDomainChange(next);
                        setDomain(next);
                    }}
                    clamp={{ low: 10, high: 90, below: 14, above: 3 }}
                    describe={describeHandle}
                />
            </div>
        </MantineProvider>
    );
}

describe("RampEditor", () => {
    it("reports a dragged lower domain handle in the data's units", async () => {
        const onDomainChange = vi.fn();
        render(<Harness onDomainChange={onDomainChange} />);
        const handle = screen.getByRole("slider", { name: "Ramp start" });
        const track = screen.getByTestId("ramp-editor-track");
        const { width } = track.getBoundingClientRect();

        await userEvent.hover(handle);
        await commands.mouseDown();
        await userEvent.hover(track, { position: { x: width * 0.5, y: 8 } });
        await commands.mouseUp();

        expect(onDomainChange).toHaveBeenLastCalledWith([50, 80]);
        expect(handle.getAttribute("aria-valuenow")).toBe("50");
    });

    it("moves a handle one bin per arrow key and reaches the data's ends with Home and End", async () => {
        const onDomainChange = vi.fn();
        render(<Harness onDomainChange={onDomainChange} />);
        const handle = screen.getByRole("slider", { name: "Ramp start" });

        await userEvent.click(handle);
        await userEvent.keyboard("{ArrowRight}");
        expect(onDomainChange).toHaveBeenLastCalledWith([30, 80]);
        await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
        expect(onDomainChange).toHaveBeenLastCalledWith([10, 80]);
        await userEvent.keyboard("{Home}");
        expect(onDomainChange).toHaveBeenLastCalledWith([0, 80]);

        await userEvent.click(screen.getByRole("slider", { name: "Ramp end" }));
        await userEvent.keyboard("{End}");
        expect(onDomainChange).toHaveBeenLastCalledWith([0, 100]);
    });

    it("takes End on the start handle and Home on the end handle to the nearest end each can reach", async () => {
        const onDomainChange = vi.fn();
        render(<Harness onDomainChange={onDomainChange} />);
        const start = screen.getByRole("slider", { name: "Ramp start" });
        const end = screen.getByRole("slider", { name: "Ramp end" });
        expect(start).toHaveAttribute("aria-valuemax", "70");
        expect(end).toHaveAttribute("aria-valuemin", "30");

        await userEvent.click(start);
        await userEvent.keyboard("{End}");
        expect(onDomainChange).toHaveBeenLastCalledWith([70, 80]);
        expect(start).toHaveAttribute("aria-valuenow", "70");

        await userEvent.click(end);
        await userEvent.keyboard("{Home}");
        expect(onDomainChange).toHaveBeenLastCalledWith([70, 80]);
        await userEvent.keyboard("{End}");
        expect(onDomainChange).toHaveBeenLastCalledWith([70, 100]);
        await userEvent.keyboard("{Home}");
        expect(onDomainChange).toHaveBeenLastCalledWith([70, 80]);
        expect(end).toHaveAttribute("aria-valuenow", "80");
    });

    it("speaks each handle's value in the caller's words", () => {
        render(<Harness onDomainChange={vi.fn()} />);
        expect(screen.getByRole("slider", { name: "Ramp start" }).getAttribute("aria-valuetext")).toBe(
            "domainLow at degree 20",
        );
        expect(screen.getByRole("slider", { name: "Upper clamp" }).getAttribute("aria-valuetext")).toBe(
            "clampHigh at degree 90",
        );
    });

    it("shows the clamp tails' counts it is given", () => {
        render(<Harness onDomainChange={vi.fn()} />);
        expect(screen.getByTestId("ramp-editor-outside-low").textContent).toBe("14 outside");
        expect(screen.getByTestId("ramp-editor-outside-high").textContent).toBe("3 outside");
    });

    it("reports a domain end typed into its field on Enter", async () => {
        const onDomainChange = vi.fn();
        render(<Harness onDomainChange={onDomainChange} />);
        const field = screen.getByRole("textbox", { name: "Ends at" });

        await userEvent.click(field);
        await userEvent.keyboard("{Control>}a{/Control}65{Enter}");

        expect(onDomainChange).toHaveBeenLastCalledWith([20, 65]);
    });

    it("paints each bar in the color its bin is given", () => {
        render(<Harness onDomainChange={vi.fn()} />);
        const bars = screen.getAllByTestId("histogram-bar");
        expect(bars).toHaveLength(BINS.length);
        bars.forEach((bar, i) => {
            expect(getComputedStyle(bar).backgroundColor).toBe(resolved(BINS[i].paint ?? ""));
        });
    });

    it("draws each typed field's own name above it, each name different", () => {
        render(<Harness onDomainChange={vi.fn()} />);
        const from = screen.getByRole("textbox", { name: "Starts at" });
        const to = screen.getByRole("textbox", { name: "Ends at" });
        for (const [field, name] of [
            [from, "Starts at"],
            [to, "Ends at"],
        ] as const) {
            const label = field.closest("label")?.querySelector(".cm-field-label");
            expect(label?.textContent).toBe(name);
            expect(label?.getBoundingClientRect().height).toBeGreaterThan(0);
        }
    });

    it("steps whole-number data by whole numbers, and Page Up / Page Down by a larger step", async () => {
        const onDomainChange = vi.fn();
        // Bins 3.6 wide over 0..36, as a rank's bins fall.
        const bins = Array.from({ length: 10 }, (_, i) => ({
            from: i * 3.6,
            to: (i + 1) * 3.6,
            count: 1,
            label: String(i),
        }));
        render(
            <MantineProvider theme={compactTheme}>
                <div style={{ width: 240 }}>
                    <RampEditor
                        label="Size by rank"
                        bins={bins}
                        domain={[4, 30]}
                        step={1}
                        onDomainChange={onDomainChange}
                        describe={describeHandle}
                    />
                </div>
            </MantineProvider>,
        );
        // The domain is held fixed at 4 to 30, so each key moves from 4.
        await userEvent.click(screen.getByRole("slider", { name: "Ramp start" }));
        await userEvent.keyboard("{ArrowUp}");
        expect(onDomainChange).toHaveBeenLastCalledWith([5, 30]);
        await userEvent.keyboard("{PageUp}");
        expect(onDomainChange).toHaveBeenLastCalledWith([8, 30]);
        await userEvent.keyboard("{PageDown}");
        expect(onDomainChange).toHaveBeenLastCalledWith([0, 30]);
    });

    it("moves more than one bin edge on Page Up when there is no step", async () => {
        const onDomainChange = vi.fn();
        render(<Harness onDomainChange={onDomainChange} />);
        await userEvent.click(screen.getByRole("slider", { name: "Ramp start" }));
        await userEvent.keyboard("{PageUp}");
        expect(onDomainChange).toHaveBeenLastCalledWith([40, 80]);
    });
});

describe("RampEditor in the dark scheme", () => {
    afterEach(resetHarness);

    it("draws no ring round a painted bar by default (Figma)", async () => {
        await renderThemed(
            <div style={{ width: 240 }}>
                <RampEditor label="Node color by degree" bins={BINS} domain={[20, 80]} describe={describeHandle} />
            </div>,
            { scheme: "dark" },
        );
        const ring = /rgba?\([^)]*\)/.exec(getComputedStyle(screen.getAllByTestId("histogram-bar")[0]).boxShadow)?.[0];
        expect(ring === undefined || rgba(ring)[3] === 0).toBe(true);
    });

    it("AA option: rings the darkest painted bar at 3:1 or more against the panel", async () => {
        const dark = BINS.map((bin, i) => ({ ...bin, paint: i === 0 ? "#000000" : bin.paint }));
        await renderThemed(
            <div style={{ width: 240, background: "var(--cm-bg)" }} data-testid="panel">
                <RampEditor label="Node color by degree" bins={dark} domain={[20, 80]} describe={describeHandle} />
            </div>,
            { scheme: "dark", highContrast: true },
        );
        const bar = screen.getAllByTestId("histogram-bar")[0];
        const ring = /rgba?\([^)]*\)/.exec(getComputedStyle(bar).boxShadow)?.[0];
        expect(ring).toBeDefined();
        const panel = rgba(getComputedStyle(screen.getByTestId("panel")).backgroundColor);
        expect(contrast(over(rgba(ring ?? ""), panel), panel)).toBeGreaterThanOrEqual(3);
    });
});

/**
 * A CSS color as the browser computes it.
 * @param color - any CSS color
 * @returns its computed rgb() form
 */
function resolved(color: string): string {
    const probe = document.createElement("span");
    probe.style.color = color;
    document.body.append(probe);
    const out = getComputedStyle(probe).color;
    probe.remove();
    return out;
}

/**
 * The channels of a computed rgb() or rgba() color.
 * @param color - the computed color
 * @returns red, green, blue (0-255) and alpha (0-1)
 */
function rgba(color: string): [number, number, number, number] {
    const [r, g, b, a = 1] = (/rgba?\(([^)]*)\)/.exec(color)?.[1] ?? "").split(/[\s,/]+/).map(Number);
    return [r, g, b, a];
}

/**
 * A translucent color laid over an opaque one.
 * @param top - the translucent color
 * @param ground - the opaque color under it
 * @returns the result, opaque
 */
function over(
    top: [number, number, number, number],
    ground: [number, number, number, number],
): [number, number, number, number] {
    const a = top[3];
    return [0, 1, 2].map((i) => top[i] * a + ground[i] * (1 - a)).concat(1) as [number, number, number, number];
}

/**
 * The WCAG contrast ratio of two opaque colors.
 * @param x - one color
 * @param y - the other
 * @returns the ratio, 1 to 21
 */
function contrast(x: [number, number, number, number], y: [number, number, number, number]): number {
    const lum = (c: [number, number, number, number]): number => {
        const [r, g, b] = c.slice(0, 3).map((v) => {
            const s = v / 255;
            return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const [hi, lo] = [lum(x), lum(y)].sort((p, q) => q - p);
    return (hi + 0.05) / (lo + 0.05);
}
