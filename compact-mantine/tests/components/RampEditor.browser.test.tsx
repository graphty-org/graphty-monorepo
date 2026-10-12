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
        const field = screen.getByRole("textbox", { name: "To" });

        await userEvent.click(field);
        await userEvent.keyboard("{Control>}a{/Control}65{Enter}");

        expect(onDomainChange).toHaveBeenLastCalledWith([20, 65]);
    });
});
