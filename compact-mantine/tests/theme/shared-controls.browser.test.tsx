/**
 * Shared controls drawn by the theme's stylesheet: a content-sized segmented control never clips
 * an option's label, and a bound number field shows one focus ring, not a ring inside a ring.
 */
import { Group, MantineProvider, Text } from "@mantine/core";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { compactTheme, SegmentedControl, VariablePill } from "../../src";

function renderWithTheme(ui: React.ReactElement): ReturnType<typeof render> {
    return render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
}

describe("SegmentedControl sized by its content", () => {
    it("gives every option its whole label and its padding, the widest included", () => {
        const { container } = renderWithTheme(
            <div style={{ width: 600 }}>
                <Group gap="xs">
                    <Text size="xs">1 edge row names a node missing from the node rows.</Text>
                    <SegmentedControl
                        size="xs"
                        aria-label="Unmatched ends"
                        defaultValue="leave-out"
                        data={[
                            { value: "add", label: "Add" },
                            { value: "leave-out", label: "Leave out" },
                        ]}
                    />
                </Group>
            </div>,
        );
        const labels = [...container.querySelectorAll<HTMLElement>(".cm-sc-label")];
        expect(labels).toHaveLength(2);
        for (const label of labels) {
            const padding = parseFloat(getComputedStyle(label).paddingLeft);
            const text = label.querySelector<HTMLElement>("span") ?? label;
            expect(padding).toBeGreaterThan(0);
            expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth);
            // the text sits inside the padding on both sides
            const box = label.getBoundingClientRect();
            const ink = text.getBoundingClientRect();
            expect(ink.left - box.left).toBeGreaterThanOrEqual(padding - 0.5);
            expect(box.right - ink.right).toBeGreaterThanOrEqual(padding - 0.5);
        }
    });
});

describe("VariablePill bound number field", () => {
    it("draws one focus ring when the pill has keyboard focus", async () => {
        const { container } = renderWithTheme(
            <VariablePill
                name="PageRank"
                value="1 to 3"
                width={88}
                onDetach={() => undefined}
                onClick={() => undefined}
            />,
        );
        const field = container.querySelector<HTMLElement>(".cm-var-field");
        const pill = container.querySelector<HTMLElement>(".cm-var-pill");
        expect(field).not.toBeNull();
        expect(pill).not.toBeNull();
        await userEvent.tab();
        expect(document.activeElement).toBe(pill);
        const ring = (el: HTMLElement): boolean => {
            const style = getComputedStyle(el);
            return style.outlineStyle !== "none" && style.outlineColor !== "rgba(0, 0, 0, 0)";
        };
        expect(ring(pill as HTMLElement)).toBe(true);
        expect(ring(field as HTMLElement)).toBe(false);
    });
});
