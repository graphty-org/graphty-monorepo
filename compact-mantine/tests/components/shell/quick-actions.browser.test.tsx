/**
 * QuickActions in a real browser: a middle cut keeps the name's end on screen, a second line
 * sits under the name, and with `tabTakes` Tab runs the row the typed letters highlight.
 */
import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

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
        const option = screen.getByRole("option", { name: /^community/ });
        const name = option.querySelector(".cm-qa-row-label")!.getBoundingClientRect();
        const second = screen.getByText("Holds groups, not amounts").getBoundingClientRect();
        expect(second.top).toBeGreaterThanOrEqual(name.bottom - 0.5);
        expect(second.bottom).toBeLessThanOrEqual(option.getBoundingClientRect().bottom);
        expect(option.getBoundingClientRect().height).toBeCloseTo(44, 0);
    });

    it("puts why a row cannot run under its name, whole, even where descriptions end the line", async () => {
        const reason = "Holds groups, not amounts: pick a value that holds numbers to size by it";
        await renderThemed(
            <QuickActions
                actions={[
                    { value: "d", label: "degree", description: "1 to 36" },
                    { value: "c", label: "community", disabled: true, description: reason },
                ]}
                onRun={vi.fn()}
                descriptions="end"
                width={240}
            />,
        );
        const option = screen.getByRole("option", { name: /^community/ });
        const name = option.querySelector(".cm-qa-row-label")!.getBoundingClientRect();
        const why = screen.getByText(reason);
        expect(why.getBoundingClientRect().top).toBeGreaterThanOrEqual(name.bottom - 0.5);
        expect(why.scrollWidth).toBeLessThanOrEqual(why.clientWidth);
        expect(why.getBoundingClientRect().bottom).toBeLessThanOrEqual(option.getBoundingClientRect().bottom + 0.5);
        // A fact that is not a reason still ends its name's line.
        const fact = screen.getByText("1 to 36").getBoundingClientRect();
        const degree = screen.getByRole("option", { name: /^degree/ }).querySelector(".cm-qa-row-label")!;
        expect(fact.top).toBeLessThan(degree.getBoundingClientRect().bottom);
    });
});

describe("QuickActions Tab", () => {
    const actions = [
        { value: "hours", label: "hours" },
        { value: "house", label: "house" },
    ];

    it("with tabTakes and letters typed, Tab runs the highlighted row", async () => {
        const onRun = vi.fn();
        await renderThemed(<QuickActions actions={actions} onRun={onRun} activeOnOpen="none" tabTakes />);
        await userEvent.keyboard("ho{Tab}");
        expect(onRun).toHaveBeenCalledWith("hours");
    });

    it("with nothing typed, or without tabTakes, Tab runs nothing", async () => {
        const onRun = vi.fn();
        const { unmount } = await renderThemed(
            <QuickActions actions={actions} onRun={onRun} activeOnOpen="none" tabTakes />,
        );
        await userEvent.keyboard("{Tab}");
        unmount();
        await renderThemed(<QuickActions actions={actions} onRun={onRun} />);
        await userEvent.keyboard("ho{Tab}");
        expect(onRun).not.toHaveBeenCalled();
    });
});
