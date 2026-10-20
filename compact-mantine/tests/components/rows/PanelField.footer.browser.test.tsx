/**
 * A drop-down's trailing action (PanelField `footerAction`), driven by the real keyboard: End and
 * ArrowDown from the last choice reach it, Enter takes it, and taking it runs the action and
 * leaves the field's value as it was.
 */
import { screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { PanelField } from "../../../src";
import { renderThemed, resetHarness } from "../../harness/measure";

afterEach(resetHarness);

const SHAPES = ["Box", "Sphere", "Cylinder", "Cone"].map((name) => ({ value: name.toLowerCase(), label: name }));

const DOT = (
    <svg viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="5" fill="currentColor" />
    </svg>
);

/**
 * The option a screen reader is told is highlighted.
 * @returns its name, or "" for none
 */
function announced(): string {
    const id = screen.getByRole("combobox", { name: /^Shape/ }).getAttribute("aria-activedescendant");
    return id === null ? "" : (document.getElementById(id)?.textContent ?? "");
}

/**
 * Draws the Shape field with a Model... action, focused and with its list open.
 * @param onSelect - the action
 * @param onChange - where a chosen value goes
 */
async function openShapes(onSelect: () => void, onChange: (value: string | number) => void): Promise<void> {
    await renderThemed(
        <PanelField
            label="Shape"
            value="sphere"
            onChange={onChange}
            data={SHAPES}
            optionGlyphs={Object.fromEntries(SHAPES.map((s) => [s.value, DOT]))}
            footerAction={{ label: "Model...", glyph: DOT, onSelect }}
        />,
    );
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    await screen.findByRole("listbox");
}

describe("PanelField footerAction", () => {
    it("is the last entry of the list, under a line", async () => {
        await openShapes(
            () => undefined,
            () => undefined,
        );
        const options = screen.getAllByRole("option");
        expect(options.map((o) => o.textContent)).toEqual(["Box", "Sphere", "Cylinder", "Cone", "Model..."]);
        const footer = options[options.length - 1];
        expect(getComputedStyle(footer).borderTopStyle).toBe("solid");
    });

    it("End reaches it and Enter takes it, leaving the value as it was", async () => {
        const onSelect = vi.fn();
        const onChange = vi.fn();
        await openShapes(onSelect, onChange);
        await userEvent.keyboard("{End}");
        await waitFor(() => {
            expect(announced()).toBe("Model...");
        });
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            expect(onSelect).toHaveBeenCalledTimes(1);
        });
        expect(onChange).not.toHaveBeenCalled();
        expect(screen.queryByRole("listbox")).toBeNull();
        expect(screen.getByRole("combobox", { name: /^Shape/ })).toHaveValue("Sphere");
    });

    it("ArrowDown from the last choice reaches it", async () => {
        const onSelect = vi.fn();
        await openShapes(onSelect, () => undefined);
        await userEvent.keyboard("{ArrowDown}{ArrowDown}");
        await waitFor(() => {
            expect(announced()).toBe("Cone");
        });
        await userEvent.keyboard("{ArrowDown}");
        await waitFor(() => {
            expect(announced()).toBe("Model...");
        });
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            expect(onSelect).toHaveBeenCalledTimes(1);
        });
    });
});
