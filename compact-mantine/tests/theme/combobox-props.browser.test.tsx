/**
 * A caller's `comboboxProps` are merged over the theme's list defaults rather than replacing them:
 * passing one option (here `withinPortal: false`, which every in-popover list in the graphty app
 * passes) keeps the list where the theme puts it.
 */
import { MantineProvider, MultiSelect, Select } from "@mantine/core";
import { render } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { compactTheme } from "../../src";

/**
 * Render with the compact theme.
 * @param ui - the element
 * @returns the render result
 */
function renderWithTheme(ui: React.ReactElement): ReturnType<typeof render> {
    return render(
        <MantineProvider theme={compactTheme} forceColorScheme="light">
            <div style={{ padding: "200px 100px" }}>{ui}</div>
        </MantineProvider>,
    );
}

/**
 * Open a field's list and wait until floating-ui has placed it.
 * @param container - the render container
 * @returns the field's box and the open list
 */
async function open(container: HTMLElement): Promise<{ field: DOMRect; list: HTMLElement }> {
    // The field's input box: clicked at its center, which on a pill field is past the pill.
    const input = container.querySelector<HTMLElement>(".cm-input");
    const wrapper = container.querySelector<HTMLElement>(".cm-input-wrapper");
    if (!input || !wrapper) {
        throw new Error("no field rendered");
    }
    await userEvent.click(input);
    let list: HTMLElement | undefined;
    await vi.waitFor(() => {
        list = [...container.querySelectorAll<HTMLElement>(".cm-listbox")].find((el) => el.checkVisibility());
        expect(list).toBeDefined();
    });
    for (let i = 0; i < 3; i++) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    return { field: wrapper.getBoundingClientRect(), list: list as HTMLElement };
}

describe("comboboxProps merge over the theme's list defaults", () => {
    it("Select with withinPortal false still opens over its trigger, the selected option on it", async () => {
        const { container } = renderWithTheme(
            <Select
                aria-label="Stroke align"
                data={["Inside", "Center", "Outside"]}
                defaultValue="Center"
                comboboxProps={{ withinPortal: false }}
                style={{ width: 76 }}
            />,
        );
        const { field, list } = await open(container);
        const selected = list.querySelector<HTMLElement>("[data-checked]");
        expect(selected).not.toBeNull();
        const s = (selected as HTMLElement).getBoundingClientRect();
        expect(Math.abs(s.top - field.top)).toBeLessThanOrEqual(1);
        expect(Math.abs(list.getBoundingClientRect().left - (field.left - 8))).toBeLessThanOrEqual(1);
        expect(getComputedStyle(list).zIndex).toBe("1100");
    });

    it("MultiSelect with withinPortal false still opens 4px below its field", async () => {
        const { container } = renderWithTheme(
            <MultiSelect
                aria-label="Tags"
                data={["Alpha", "Beta"]}
                defaultValue={["Alpha"]}
                comboboxProps={{ withinPortal: false }}
                style={{ width: 160 }}
            />,
        );
        const { field, list } = await open(container);
        expect(list.getBoundingClientRect().top - field.bottom).toBeCloseTo(4, 0);
        expect(Math.abs(list.getBoundingClientRect().left - field.left)).toBeLessThanOrEqual(1);
    });

    it("a caller's own key still wins over the theme's", async () => {
        const { container } = renderWithTheme(
            <Select
                aria-label="Stroke align"
                data={["Inside", "Center", "Outside"]}
                defaultValue="Center"
                comboboxProps={{ withinPortal: false, zIndex: 4321 }}
                style={{ width: 76 }}
            />,
        );
        const { list } = await open(container);
        expect(getComputedStyle(list).zIndex).toBe("4321");
    });
});
