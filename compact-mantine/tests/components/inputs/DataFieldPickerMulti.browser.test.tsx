/**
 * DataFieldPicker's multi mode in a real browser: a click toggles a row, Done and a click outside keep the draft,
 * Escape drops it, the "All starting with" rows appear only while a search is typed, an action that keeps the list
 * open does, disabled rows do not toggle, and a list field draws its glyph.
 */
import { screen, within } from "@testing-library/react";
import React, { useState } from "react";
import { afterEach, assert, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { PopoutManager } from "../../../src";
import { type DataField, DataFieldPicker } from "../../../src/components/inputs/DataFieldPicker";
import { renderThemed, resetHarness } from "../../harness/measure";

afterEach(resetHarness);

const FIELDS: DataField[] = [
    { id: "expr_1", name: "expr_1", type: "number", group: "Data" },
    { id: "expr_2", name: "expr_2", type: "number", group: "Data" },
    { id: "animals", name: "animals", type: "list", group: "Data" },
    { id: "word", name: "word", type: "string", group: "Data", disabledReason: "Holds words, not amounts" },
];

/** What the host saw. */
interface Seen {
    changes: (readonly string[])[];
    done: number;
    cancel: number;
    matched: [string, boolean][];
    actions: string[];
}

/**
 * Render a multi picker holding its own draft, as a host does.
 * @returns the trigger and what the host saw
 */
async function renderMulti(): Promise<{ trigger: HTMLElement; seen: Seen }> {
    const seen: Seen = { changes: [], done: 0, cancel: 0, matched: [], actions: [] };
    /**
     * The host.
     * @returns the picker
     */
    function Host(): React.JSX.Element {
        const [values, setValues] = useState<readonly string[]>([]);
        return (
            <PopoutManager>
                <div style={{ width: 184 }}>
                    <DataFieldPicker
                        multiple
                        label="Pie data"
                        fields={FIELDS}
                        values={values}
                        onChange={(next) => {
                            seen.changes.push(next);
                            setValues(next);
                        }}
                        onDone={() => {
                            seen.done++;
                        }}
                        onCancel={() => {
                            seen.cancel++;
                        }}
                        onMatch={(query, except) => {
                            seen.matched.push([query, except]);
                        }}
                        actions={[{ id: "text", label: "Text", keepsOpen: true }]}
                        onAction={(id) => {
                            seen.actions.push(id);
                        }}
                        shown="Fixed"
                    />
                </div>
                <button type="button">Outside</button>
            </PopoutManager>
        );
    }
    await renderThemed(<Host />);
    return { trigger: screen.getByRole("combobox", { name: "Pie data" }), seen };
}

/**
 * Open the pop-out and wait for its search box to take focus.
 * @param trigger - the trigger
 * @returns the list
 */
async function open(trigger: HTMLElement): Promise<HTMLElement> {
    await userEvent.click(trigger);
    const search = await screen.findByRole("combobox", { name: "Find field" });
    await expect.poll(() => document.activeElement).toBe(search);
    return screen.getByRole("listbox", { name: "Pie data" });
}

describe("DataFieldPicker, multi mode", () => {
    it("toggles a row per click, checks it, and keeps the list open", async () => {
        const { trigger, seen } = await renderMulti();
        const list = await open(trigger);
        assert.strictEqual(list.getAttribute("aria-multiselectable"), "true");
        await userEvent.click(within(list).getByRole("option", { name: /^expr_1/ }));
        await userEvent.click(within(list).getByRole("option", { name: /^animals/ }));
        assert.deepEqual(seen.changes.at(-1), ["expr_1", "animals"]);
        assert.strictEqual(
            within(list)
                .getByRole("option", { name: /^expr_1/ })
                .getAttribute("aria-selected"),
            "true",
        );
        await userEvent.click(within(list).getByRole("option", { name: /^expr_1/ }));
        assert.deepEqual(seen.changes.at(-1), ["animals"]);
        assert.isNotNull(screen.queryByRole("listbox", { name: "Pie data" }));
    });

    it("does not toggle a disabled row, and names its reason", async () => {
        const { trigger, seen } = await renderMulti();
        const list = await open(trigger);
        const word = within(list).getByRole("option", { name: /^word/ });
        assert.include(word.getAttribute("aria-label") ?? "", "Holds words, not amounts");
        await userEvent.click(word);
        assert.lengthOf(seen.changes, 0);
    });

    it("keeps the draft on Done and on a click outside, and drops it on Escape", async () => {
        const { trigger, seen } = await renderMulti();
        await open(trigger);
        await userEvent.click(screen.getByRole("button", { name: "Done" }));
        assert.strictEqual(seen.done, 1);
        await expect.poll(() => screen.queryByRole("listbox", { name: "Pie data" })).toBeNull();

        await open(trigger);
        await userEvent.click(screen.getByRole("button", { name: "Outside" }));
        await expect.poll(() => seen.done).toBe(2);

        await open(trigger);
        await userEvent.keyboard("{Escape}");
        assert.strictEqual(seen.cancel, 1);
        assert.strictEqual(seen.done, 2);
        await expect.poll(() => screen.queryByRole("listbox", { name: "Pie data" })).toBeNull();
    });

    it("offers the starting-with rows only while a search is typed", async () => {
        const { trigger, seen } = await renderMulti();
        const list = await open(trigger);
        assert.isNull(within(list).queryByRole("option", { name: /All starting with/ }));
        await userEvent.keyboard("expr_");
        assert.isNotNull(screen.queryByRole("button", { name: "Done" }), "Done stays while a search is typed");
        assert.isNull(screen.queryByRole("button", { name: "Clear search" }));
        await userEvent.click(within(list).getByRole("option", { name: 'All starting with "expr_"' }));
        await userEvent.click(within(list).getByRole("option", { name: 'All except starting with "expr_"' }));
        assert.deepEqual(seen.matched, [
            ["expr_", false],
            ["expr_", true],
        ]);
    });

    it("runs an action that keeps the list open, and draws a list field's glyph", async () => {
        const { trigger, seen } = await renderMulti();
        const list = await open(trigger);
        assert.isNotNull(list.querySelector('[data-field-type="list"]'));
        await userEvent.click(within(list).getByRole("option", { name: "Text" }));
        assert.deepEqual(seen.actions, ["text"]);
        assert.isNotNull(screen.queryByRole("listbox", { name: "Pie data" }));
    });

    it("draws the first picked value's glyph on the trigger, in the order picked", async () => {
        const { trigger } = await renderMulti();
        const list = await open(trigger);
        await userEvent.click(within(list).getByRole("option", { name: /^animals/ }));
        await userEvent.click(within(list).getByRole("option", { name: /^expr_1/ }));
        const outside = [...document.querySelectorAll("[data-field-type]")].filter((glyph) => !list.contains(glyph));
        assert.deepEqual(
            outside.map((glyph) => glyph.getAttribute("data-field-type")),
            ["list"],
        );
    });
});
