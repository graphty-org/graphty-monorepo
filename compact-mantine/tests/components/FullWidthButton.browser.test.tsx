/**
 * A full-width button measured in a real browser: a label longer than the button ends in an
 * ellipsis inside it instead of spilling past its edges, and `justify` still places a short one.
 */
import { Button, MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { compactTheme } from "../../src";

describe("a full-width button", () => {
    it("keeps a long label inside its width, cut with an ellipsis", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <div style={{ width: 88 }}>
                    <Button size="compact-xs" variant="subtle" fullWidth justify="flex-start">
                        results.degree.value of a long path
                    </Button>
                </div>
            </MantineProvider>,
        );
        const button = screen.getByRole("button").getBoundingClientRect();
        const label = screen.getByText("results.degree.value of a long path");
        const box = label.getBoundingClientRect();
        expect(button.width).toBe(88);
        expect(box.right).toBeLessThanOrEqual(button.right);
        expect(box.left).toBeGreaterThanOrEqual(button.left);
        expect(getComputedStyle(label).textOverflow).toBe("ellipsis");
        expect(label.scrollWidth).toBeGreaterThan(label.clientWidth);
    });

    it("puts a short label where justify says", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <div style={{ width: 160 }}>
                    <Button size="compact-xs" variant="subtle" fullWidth justify="flex-start">
                        id
                    </Button>
                </div>
            </MantineProvider>,
        );
        const button = screen.getByRole("button").getBoundingClientRect();
        const box = screen.getByText("id").getBoundingClientRect();
        expect(box.left - button.left).toBeLessThan(16);
        // Centered across its height.
        expect(Math.abs(box.top - button.top - (button.bottom - box.bottom))).toBeLessThanOrEqual(1);
    });
});
