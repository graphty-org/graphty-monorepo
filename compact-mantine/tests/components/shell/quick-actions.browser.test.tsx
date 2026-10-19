/**
 * QuickActions layout in a real browser: a middle cut keeps the name's end on screen, and a
 * second line sits under the name.
 */
import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { QuickActions } from "../../../src";
import { renderThemed, resetHarness } from "../../harness/measure";

afterEach(resetHarness);

describe("QuickActions layout", () => {
    it("cuts a long name in the middle, keeping its end visible", async () => {
        const label = "shared_chapters_with_valjean_and_javert_over_the_whole_novel";
        await renderThemed(
            <QuickActions actions={[{ value: "a", label }]} onRun={vi.fn()} truncate="middle" width={160} />,
        );
        const option = screen.getByRole("option", { name: label });
        const head = option.querySelector<HTMLElement>(".cm-qa-row-head")!;
        const tail = option.querySelector<HTMLElement>(".cm-qa-row-tail")!;
        const row = option.getBoundingClientRect();
        expect(head.scrollWidth).toBeGreaterThan(head.clientWidth);
        expect(getComputedStyle(head).textOverflow).toBe("ellipsis");
        expect(tail.getBoundingClientRect().right).toBeLessThanOrEqual(row.right);
        expect(tail.getBoundingClientRect().left).toBeGreaterThanOrEqual(head.getBoundingClientRect().right - 0.5);
    });

    it("draws the second line under the name, inside a taller row", async () => {
        await renderThemed(
            <QuickActions
                actions={[{ value: "c", label: "community", disabled: true, description: "Holds groups, not amounts" }]}
                onRun={vi.fn()}
            />,
        );
        const option = screen.getByRole("option", { name: "community" });
        const name = option.querySelector(".cm-qa-row-label")!.getBoundingClientRect();
        const second = screen.getByText("Holds groups, not amounts").getBoundingClientRect();
        expect(second.top).toBeGreaterThanOrEqual(name.bottom - 0.5);
        expect(second.bottom).toBeLessThanOrEqual(option.getBoundingClientRect().bottom);
        expect(option.getBoundingClientRect().height).toBeCloseTo(44, 0);
    });
});
