import { Stack } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import React, { useState } from "react";

import { ResultRow, SearchInput, UiGlyph } from "../../../src";
import { BOTH_SCHEMES } from "../../helpers/schemes";
import { Panel } from "./fixtures";

/**
 * One find result: a name with the matched text in bold, and the path to where it lives.
 *
 * ## When to use it
 *
 * Reach for `ResultRow` for the results of a search the reader is typing, where focus stays in
 * the search field and the arrows move through the results. Reach for `Tree` when the rows are
 * the objects themselves (select, rename, move), and for `DataRow` when the row is a reading.
 *
 * ## Usage
 *
 * ```tsx
 * import { ResultRow, SearchInput } from "@graphty/compact-mantine";
 *
 * <SearchInput
 *     aria-label="Find"
 *     aria-controls="results"
 *     aria-activedescendant={`result-${current}`}
 *     onKeyDown={moveCurrentWithArrows}
 * />
 * <div role="listbox" id="results" aria-label="Results">
 *     {results.map((r) => (
 *         <ResultRow key={r.id} id={`result-${r.id}`} name={r.name} match={query} path={r.path} current={r.id === current} />
 *     ))}
 * </div>
 * ```
 *
 * ## Keyboard and accessibility
 *
 * - Each row is an `option`: put the rows in a `role="listbox"` and drive them from the search
 *   field with `aria-activedescendant` (give each row an `id`). The current row carries
 *   `aria-selected`.
 * - A row is never a Tab stop, and pressing one does not take focus from the field.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Row | 240 x 52 with a path line, 34 without; padding 8 8 8 16 |
 * | Icon | 16px |
 * | Name | 11px on a 16px line, 400; the match at 600 |
 * | Path | 10px on a 16px line, secondary color |
 * | Current | blue fill with a 1px border in the same color |
 */
const meta: Meta<typeof ResultRow> = {
    title: "Components/Lists and trees/ResultRow",
    component: ResultRow,
    tags: ["autodocs"],
    parameters: { layout: "padded" },
    argTypes: {
        icon: { control: false },
        path: { control: "text" },
    },
};

export default meta;
type Story = StoryObj<typeof ResultRow>;

const rect = <UiGlyph name="rectangle" size={10} />;

/** One result with a match and a path. Every prop is in the Controls table. */
export const Default: Story = {
    args: {
        name: "Deepest rect",
        match: "rect",
        path: "left-sidebar",
        icon: rect,
        current: false,
        tone: "default",
    },
    render: (args) => (
        <Panel>
            <div role="listbox" aria-label="Results">
                <ResultRow {...args} />
            </div>
        </Panel>
    ),
};

/** Current, rest, hover, a component, and a one-line result, light and dark side by side. */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Panel label="current, rest, hover, component, one line">
            <div role="listbox" aria-label="Results">
                <ResultRow name="Deepest rect" match="rect" path="left-sidebar" icon={rect} current />
                <ResultRow name="Rectangle" match="rect" path="left-sidebar" icon={rect} />
                <ResultRow name="bt-rect" match="rect" path="bottom-toolbar" icon={rect} data-state="hover" />
                <ResultRow
                    name="Rectangle 3"
                    match="rect"
                    path="buttons-and-controls"
                    tone="component"
                    icon={<UiGlyph name="component" size={16} />}
                />
                <ResultRow name="Only a name" icon={rect} />
            </div>
        </Panel>
    ),
};

const LAYER_NAMES = [
    { id: "a", name: "Deepest rect", path: "left-sidebar" },
    { id: "b", name: "Rectangle", path: "left-sidebar" },
    { id: "c", name: "bt-rect", path: "bottom-toolbar" },
    { id: "d", name: "Title", path: "card" },
    { id: "e", name: "Price", path: "card" },
];

/**
 * The whole pattern: a SearchInput drives the results through `aria-activedescendant`. Type to
 * filter; ArrowUp / ArrowDown move the current result while focus stays in the field.
 */
export const DrivenFromASearchField: Story = {
    render: function Render() {
        const [query, setQuery] = useState("rect");
        const [index, setIndex] = useState(0);
        const results = LAYER_NAMES.filter((r) => r.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
        const current = results[Math.min(index, results.length - 1)];
        return (
            <Panel>
                <Stack gap={0}>
                    <div style={{ padding: "8px 16px 8px 16px" }}>
                        <SearchInput
                            aria-label="Find layers"
                            aria-controls="find-results"
                            aria-activedescendant={current ? `find-result-${current.id}` : undefined}
                            value={query}
                            onChange={(value) => {
                                setQuery(value);
                                setIndex(0);
                            }}
                            onKeyDown={(event: React.KeyboardEvent) => {
                                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                                    event.preventDefault();
                                    const step = event.key === "ArrowDown" ? 1 : -1;
                                    setIndex((i) => Math.max(0, Math.min(results.length - 1, i + step)));
                                }
                            }}
                        />
                    </div>
                    <div role="listbox" id="find-results" aria-label="Results">
                        {results.map((r) => (
                            <ResultRow
                                key={r.id}
                                id={`find-result-${r.id}`}
                                name={r.name}
                                match={query}
                                path={r.path}
                                icon={rect}
                                current={r.id === current?.id}
                                onClick={() => setIndex(results.indexOf(r))}
                            />
                        ))}
                    </div>
                </Stack>
            </Panel>
        );
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const field = canvas.getByRole("searchbox", { name: "Find layers" });
        field.focus();
        await expect(canvas.getAllByRole("option")).toHaveLength(3);
        await userEvent.keyboard("{ArrowDown}");
        await expect(field).toHaveFocus();
        await expect(field).toHaveAttribute("aria-activedescendant", "find-result-b");
        await expect(canvas.getByRole("option", { name: /Rectangle/ })).toHaveAttribute("aria-selected", "true");
    },
};
