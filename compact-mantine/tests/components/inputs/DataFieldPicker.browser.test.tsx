/**
 * DataFieldPicker in a real browser: the trigger opens a searchable list in a pop-out, a pick
 * reaches onChange (or onAction), the pop-out closes and focus goes back to the trigger.
 */
import { composeStories, setProjectAnnotations } from "@storybook/react";
import { screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, assert, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import preview from "../../../.storybook/preview";
import { PopoutManager } from "../../../src";
import {
    type DataField,
    DataFieldPicker,
    type DataFieldPickerProps,
} from "../../../src/components/inputs/DataFieldPicker";
import * as Stories from "../../../stories/components/data/DataFieldPicker.stories";
import { axeFindings } from "../../a11y/axe";
import { renderThemed, resetHarness } from "../../harness/measure";

afterEach(resetHarness);

const FIELDS: DataField[] = [
    { id: "age", name: "Age", type: "number", group: "Data", sample: "1 to 36" },
    { id: "city", name: "City", type: "category", group: "Data", keywords: ["town_name"] },
    { id: "rank", name: "Page rank", type: "number", group: "Results", disabledReason: "Holds amounts" },
    { id: "joined", name: "Joined", type: "date", group: "Data" },
    { id: "nodeId", name: "Node id", type: "id", group: "Structure" },
];

/**
 * Render a picker inside a PopoutManager.
 * @param props - props over the defaults
 * @returns the trigger
 */
async function renderPicker(props: Partial<DataFieldPickerProps> = {}): Promise<HTMLElement> {
    await renderThemed(
        <PopoutManager>
            <div style={{ width: 184 }}>
                <DataFieldPicker label="Size by" fields={FIELDS} value={null} onChange={() => undefined} {...props} />
            </div>
        </PopoutManager>,
    );
    return screen.getByRole("combobox", { name: "Size by" });
}

/**
 * Open the pop-out with a click and wait for its search box to take focus.
 * @param trigger - the trigger
 * @returns the pop-out
 */
async function open(trigger: HTMLElement): Promise<HTMLElement> {
    await userEvent.click(trigger);
    const search = await screen.findByRole("combobox", { name: "Find field" });
    await expect.poll(() => document.activeElement).toBe(search);
    return screen.getByRole("dialog");
}

describe("DataFieldPicker", () => {
    it("picks a field typed toward with Enter and shows it with its type glyph", async () => {
        const onChange = vi.fn();
        function Controlled(): React.JSX.Element {
            const [value, setValue] = React.useState<string | null>(null);
            return (
                <DataFieldPicker
                    label="Size by"
                    fields={FIELDS}
                    value={value}
                    onChange={(next) => {
                        onChange(next);
                        setValue(next);
                    }}
                />
            );
        }
        await renderThemed(
            <PopoutManager>
                <Controlled />
            </PopoutManager>,
        );
        const trigger = screen.getByRole("combobox", { name: "Size by" });
        await open(trigger);
        await userEvent.keyboard("ag");
        await userEvent.keyboard("{Enter}");
        assert.deepEqual(onChange.mock.calls, [["age"]]);
        await expect.poll(() => screen.queryByRole("dialog")).toBeNull();
        await expect.poll(() => document.activeElement).toBe(trigger);
        assert.equal((trigger as HTMLInputElement).value, "Age");
        assert.isNotNull(trigger.closest(".mantine-Input-wrapper")?.querySelector('[data-field-type="number"]'));
    });

    it("opens from the keyboard with ArrowDown and Enter", async () => {
        const trigger = await renderPicker();
        trigger.focus();
        await userEvent.keyboard("{ArrowDown}");
        await screen.findByRole("combobox", { name: "Find field" });
        await userEvent.keyboard("{Escape}");
        await expect.poll(() => screen.queryByRole("dialog")).toBeNull();
        await expect.poll(() => document.activeElement).toBe(trigger);
        await userEvent.keyboard("{Enter}");
        await screen.findByRole("combobox", { name: "Find field" });
    });

    it("lists sections in first-appearance order and names each row with its type", async () => {
        const dialog = await open(await renderPicker());
        const groups = within(dialog)
            .getAllByRole("group")
            .map((g) => g.getAttribute("aria-label"))
            .filter((name) => name !== "Size by");
        assert.deepEqual(groups, ["Data", "Results", "Structure"]);
        assert.isNotNull(within(dialog).getByRole("option", { name: "Age, number, 1 to 36" }));
        assert.isNotNull(within(dialog).getByRole("option", { name: "City, category" }));
    });

    it("never picks a disabled row, by click or by Enter, and shows its reason", async () => {
        const onChange = vi.fn();
        const dialog = await open(await renderPicker({ onChange }));
        const row = within(dialog).getByRole("option", { name: "Page rank, number, Holds amounts" });
        assert.include(row.textContent, "Holds amounts");
        // Forced: Playwright waits for an aria-disabled element to become enabled before it clicks.
        await userEvent.click(row, { force: true });
        await userEvent.keyboard("page");
        await userEvent.keyboard("{ArrowDown}{Enter}");
        assert.equal(onChange.mock.calls.length, 0);
        assert.isNotNull(screen.queryByRole("dialog"));
    });

    it("picks null from None when clearable", async () => {
        const onChange = vi.fn();
        const dialog = await open(await renderPicker({ onChange, clearable: true, value: "age" }));
        await userEvent.click(within(dialog).getByRole("option", { name: "None" }));
        assert.deepEqual(onChange.mock.calls, [[null]]);
    });

    it("runs an action through onAction, not onChange, and shows the action in force", async () => {
        const onChange = vi.fn();
        const onAction = vi.fn();
        const trigger = await renderPicker({
            onChange,
            onAction,
            actions: [{ id: "fixed", label: "Fixed size" }],
            actionValue: "fixed",
        });
        assert.equal((trigger as HTMLInputElement).value, "Fixed size");
        const dialog = await open(trigger);
        const row = within(dialog).getByRole("option", { name: "Fixed size" });
        assert.equal(row.getAttribute("aria-selected"), "true");
        await userEvent.click(row);
        assert.deepEqual(onAction.mock.calls, [["fixed"]]);
        assert.equal(onChange.mock.calls.length, 0);
        await expect.poll(() => document.activeElement).toBe(trigger);
    });

    it("finds a field by a keyword", async () => {
        const onChange = vi.fn();
        await open(await renderPicker({ onChange }));
        await userEvent.keyboard("town");
        await userEvent.keyboard("{Enter}");
        assert.deepEqual(onChange.mock.calls, [["city"]]);
    });

    it("shows the id of a value the fields do not hold, and the empty text with no fields", async () => {
        const trigger = await renderPicker({ value: "gone", fields: [], emptyText: "Load data first" });
        assert.equal((trigger as HTMLInputElement).value, "gone");
        const dialog = await open(trigger);
        assert.include(dialog.textContent, "Load data first");
    });

    describe.each(["figma", "high"] as const)("stories have no axe violations, %s contrast", (contrast) => {
        setProjectAnnotations(preview);
        const stories = composeStories(Stories, { initialGlobals: { contrast, schemes: "single" } });
        it.each(Object.entries(stories))("%s, closed and open", async (_name, Story) => {
            const canvasElement = document.createElement("div");
            document.body.appendChild(canvasElement);
            await Story.run({ canvasElement });
            assert.deepEqual(await axeFindings(contrast), []);
            const trigger = within(canvasElement).getAllByRole("combobox")[0];
            if (!(trigger as HTMLInputElement).disabled) {
                await userEvent.click(trigger);
                await screen.findByRole("combobox", { name: "Find field" });
                assert.deepEqual(await axeFindings(contrast), []);
            }
            document.body.innerHTML = "";
        });
    });
});
