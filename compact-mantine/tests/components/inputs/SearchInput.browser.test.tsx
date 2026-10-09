import { MantineProvider } from "@mantine/core";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { compactTheme } from "../../../src";
import { SearchInput } from "../../../src/components/inputs/SearchInput";

/**
 * The vertical center of an element.
 * @param element - the element.
 * @returns its center, in CSS pixels from the top of the page.
 */
function middle(element: Element | null): number {
    const rect = element?.getBoundingClientRect();
    return rect === undefined ? Number.NaN : rect.top + rect.height / 2;
}

describe("SearchInput, laid out", () => {
    it("keeps a joined trailing control on the field's line under a label and over an error", () => {
        const { container } = render(
            <MantineProvider theme={compactTheme}>
                <div style={{ width: 240 }}>
                    <SearchInput label="From" error="No node named Ava" rightSection={<span>F</span>} />
                </div>
            </MantineProvider>,
        );
        const input = container.querySelector("input");
        const end = container.querySelector(".cm-search-joined-end");
        expect(Math.abs(middle(end) - middle(input))).toBeLessThan(1);
        // The label stays above the joined row, not beside it.
        expect(middle(container.querySelector("label"))).toBeLessThan(middle(input) - 8);
    });
});
