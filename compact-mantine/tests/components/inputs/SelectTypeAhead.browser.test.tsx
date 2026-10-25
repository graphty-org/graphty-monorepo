/**
 * Letters typed on a closed select open its list and type ahead in it, and an Enter right after
 * them takes the option they name, in a real browser -- also on a busy page, where the browser
 * handles each key late and handles keys before timers (issue #3328: a Style tab line's Shape
 * field typed "Box" and Enter, and nothing was written).
 */
import { Select } from "@mantine/core";
import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { renderThemed, resetHarness } from "../../harness/measure";

afterEach(async () => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    await resetHarness();
});

const SHAPES = ["Box", "Sphere", "Octahedron", "Cylinder"];

/**
 * A select set nowhere, with focus on its closed trigger.
 * @returns the change handler
 */
async function focusedSelect(): Promise<ReturnType<typeof vi.fn>> {
    const onChange = vi.fn();
    await renderThemed(<Select label="Shape" data={SHAPES} onChange={onChange} />);
    await userEvent.tab();
    expect(screen.getByRole("combobox", { name: "Shape" })).toHaveFocus();
    return onChange;
}

describe("type-ahead on a closed select", () => {
    it.each(["b{Enter}", "Box{Enter}", "Oct{Enter}"])("%s takes the option the letters name", async (keys) => {
        const onChange = await focusedSelect();
        await userEvent.keyboard(keys);
        await waitFor(() => {
            expect(onChange).toHaveBeenCalledWith(keys.startsWith("O") ? "Octahedron" : "Box", expect.anything());
        });
    });

    it("letters the page took late are still one run", async () => {
        const onChange = await focusedSelect();
        // The first letter was typed 600ms before the page took it, as on a page busy redrawing:
        // the next letter, typed right after, belongs to the same run.
        const timeStamp = Object.getOwnPropertyDescriptor(Event.prototype, "timeStamp")?.get;
        vi.spyOn(Event.prototype, "timeStamp", "get").mockImplementation(function (this: Event) {
            const real = timeStamp?.call(this) as number;
            return this instanceof KeyboardEvent && this.key === "B" ? real - 600 : real;
        });
        await userEvent.keyboard("Box{Enter}");
        await waitFor(() => {
            expect(onChange).toHaveBeenCalledWith("Box", expect.anything());
        });
    });

    it("an Enter handled before the page's timers takes the option, and the list stays shut", async () => {
        const onChange = await focusedSelect();
        // A busy page handles input before timers: hold the timers until the keys are in, then
        // let them run.
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        await userEvent.keyboard("Oct{Enter}");
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        await waitFor(() => {
            expect(onChange).toHaveBeenCalledWith("Octahedron", expect.anything());
        });
        expect(screen.getByRole("combobox", { name: "Shape" })).toHaveAttribute("aria-expanded", "false");
    });
});
