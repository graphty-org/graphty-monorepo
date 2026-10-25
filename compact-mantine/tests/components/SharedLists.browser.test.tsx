/**
 * Shared lists, table and tree, driven by real input in a real browser: a list closes when focus
 * leaves it, its drawn highlight is the option a screen reader is told about, a selected table row
 * says so on every cell, End and Home move along a row, a column's options button is named and is
 * not a second arrow, a disabled control says why on hover, a folder's caret is drawn at rest, and
 * a bound value with no glyph sits flush in its field.
 */
import { ActionIcon, Button, Checkbox, Tooltip } from "@mantine/core";
import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { DataTable, PanelField, Tree, VariablePill } from "../../src";
import { renderThemed, resetHarness } from "../harness/measure";
import { TOOLTIP_WAIT } from "../waits";

const SHAPES = ["Box", "Sphere", "Cylinder", "Cone", "Capsule", "Torus", "Knot", "Tetrahedron"].map((name, i) => ({
    value: `shape-${String(i)}`,
    label: name,
}));

const GLYPHS = Object.fromEntries(
    SHAPES.map(({ value }) => [
        value,
        <svg key={value} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="8" fill="currentColor" />
        </svg>,
    ]),
);

/** The shape drop-down, as a panel draws it. */
const shapeField = <PanelField label="Shape" defaultValue="shape-0" data={SHAPES} optionGlyphs={GLYPHS} />;

/**
 * The options drawn with a fill.
 * @returns their names
 */
function filled(): string[] {
    return screen
        .getAllByRole("option", { hidden: true })
        .filter((option) => {
            const fill = getComputedStyle(option, "::before").backgroundColor;
            return fill !== "rgba(0, 0, 0, 0)" && fill !== "transparent";
        })
        .map((option) => option.textContent ?? "");
}

/**
 * The option a screen reader is told is highlighted.
 * @returns its name, or "" for none
 */
function announced(): string {
    const id = screen.getByRole("combobox", { name: /^Shape/ }).getAttribute("aria-activedescendant");
    return id === null ? "" : (document.getElementById(id)?.textContent ?? "");
}

afterEach(resetHarness);

describe("Tab while a list is open", () => {
    it("does nothing, as in Figma: the list stays open, focus stays, Escape closes it", async () => {
        await renderThemed(
            <div>
                {shapeField}
                <Button>Next</Button>
            </div>,
        );
        const field = screen.getByRole("combobox", { name: /^Shape/ });
        await userEvent.click(field);
        await screen.findByRole("listbox");
        await userEvent.tab();
        await userEvent.tab({ shift: true });
        expect(document.activeElement).toBe(field);
        expect(screen.getByRole("listbox")).toBeVisible();
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            expect(screen.queryByRole("listbox")).toBeNull();
        });
        expect(document.activeElement).toBe(field);
    });

    it("focus moved away by a script still closes the list", async () => {
        await renderThemed(
            <div>
                {shapeField}
                <Button>Next</Button>
            </div>,
        );
        await userEvent.click(screen.getByRole("combobox", { name: /^Shape/ }));
        await screen.findByRole("listbox");
        screen.getByRole("button", { name: "Next" }).focus();
        await waitFor(() => {
            expect(screen.queryByRole("listbox")).toBeNull();
        });
    });
});

describe("one active option", () => {
    it("draws the option it tells a screen reader is highlighted, after leaving and coming back", async () => {
        await renderThemed(
            <div>
                {shapeField}
                <Button>Next</Button>
            </div>,
        );
        await userEvent.tab();
        await userEvent.keyboard("{ArrowDown}");
        await screen.findByRole("listbox");
        await userEvent.keyboard("{ArrowDown}");
        await waitFor(() => {
            expect(announced()).toBe("Sphere");
        });
        expect(filled()).toEqual(["Sphere"]);
        // Tab is held while the list is open (Figma), so Escape closes it before leaving.
        await userEvent.keyboard("{Escape}");
        await userEvent.tab();
        await userEvent.tab({ shift: true });
        await userEvent.keyboard("{ArrowDown}");
        await screen.findByRole("listbox");
        await waitFor(() => {
            expect(announced()).not.toBe("");
        });
        expect(filled()).toEqual([announced()]);
    });
});

interface Row {
    id: string;
    name: string;
    hours: number;
    role: string;
}

const ROWS: Row[] = [
    { id: "v01", name: "Maria", hours: 12, role: "board" },
    { id: "v02", name: "James", hours: 48, role: "staff" },
    { id: "v03", name: "Aisha", hours: 22, role: "volunteer" },
];

const COLUMNS = [
    { id: "id", header: "id", rowHeader: true, value: (row: Row) => row.id },
    { id: "name", header: "name", value: (row: Row) => row.name },
    { id: "hours", header: "hours", value: (row: Row) => row.hours, menu: <div>Hide</div> },
    { id: "role", header: "role", value: (row: Row) => row.role },
];

/**
 * A three-row table of people.
 * @returns the table in a sized box
 */
function People(): React.JSX.Element {
    return (
        <div style={{ height: 300, display: "flex" }}>
            <DataTable<Row> data={ROWS} columns={COLUMNS} getRowId={(row) => row.id} aria-label="People" />
        </div>
    );
}

describe("table rows", () => {
    it("says a selected row is selected on the cell that holds focus", async () => {
        await renderThemed(<People />);
        await userEvent.click(screen.getByRole("gridcell", { name: "Maria" }));
        expect(screen.getByRole("gridcell", { name: "Maria" }).closest('[role="row"]')).toHaveAttribute(
            "aria-selected",
            "true",
        );
        expect(document.activeElement).toHaveAttribute("aria-selected", "true");
        await userEvent.keyboard("{ArrowDown}");
        expect(document.activeElement).toHaveAttribute("aria-selected", "false");
    });

    it("End moves to the row's last cell and Home back to its first", async () => {
        await renderThemed(<People />);
        await userEvent.click(screen.getByRole("gridcell", { name: "James" }));
        await userEvent.keyboard("{End}");
        expect(document.activeElement?.textContent).toBe("staff");
        await userEvent.keyboard("{Home}");
        expect(document.activeElement?.textContent).toBe("v02");
    });

    it("names a column's options button on hover and draws it unlike the sort arrow", async () => {
        await renderThemed(<People />);
        const sort = screen.getByRole("button", { name: /^hours/ });
        await userEvent.click(sort);
        const header = sort.closest("th") as HTMLElement;
        const menu = within(header).getByTestId("data-table-header-menu");
        const arrow = within(header).getByTestId("data-table-sort-glyph");
        expect(menu.querySelector("svg")?.innerHTML).not.toBe(arrow.querySelector("svg")?.innerHTML);
        await userEvent.hover(menu);
        expect(await screen.findByRole("tooltip", {}, TOOLTIP_WAIT)).toHaveTextContent("Options for hours");
    });
});

describe("a disabled control says why on hover", () => {
    it("a disabled checkbox inside a tooltip shows its reason", async () => {
        await renderThemed(
            <Tooltip label="Stays on: style edges first">
                <div>
                    <Checkbox label="Style nodes" checked disabled onChange={() => undefined} />
                </div>
            </Tooltip>,
        );
        await userEvent.hover(screen.getByRole("checkbox", { name: "Style nodes" }), { force: true });
        expect(await screen.findByRole("tooltip", {}, TOOLTIP_WAIT)).toHaveTextContent("Stays on");
    });

    it("an aria-disabled icon button shows its reason", async () => {
        await renderThemed(
            <Tooltip label="Undo. Nothing to undo">
                <ActionIcon aria-label="Undo" aria-disabled data-disabled>
                    U
                </ActionIcon>
            </Tooltip>,
        );
        await userEvent.hover(screen.getByRole("button", { name: "Undo" }));
        expect(await screen.findByRole("tooltip", {}, TOOLTIP_WAIT)).toHaveTextContent("Nothing to undo");
    });
});

describe("a folder's caret", () => {
    // Figma: hidden at rest, drawn while the pointer is over the tree.
    it.each(["light", "dark"] as const)("is hidden at rest and drawn under the pointer (%s)", async (scheme) => {
        await renderThemed(
            <Tree
                items={[
                    { id: "folder", name: "Louvain", children: [{ id: "g1", name: "Group 1" }] },
                    { id: "leaf", name: "Everything" },
                ]}
            />,
            { scheme },
        );
        const folder = screen.getByRole("treeitem", { name: "Louvain" });
        const caret = within(folder).getByTestId("tree-caret");
        expect(caret.querySelector("svg")).not.toBeNull();
        expect(getComputedStyle(caret).visibility).toBe("hidden");
        await userEvent.hover(folder);
        await waitFor(() => {
            expect(getComputedStyle(caret).visibility).toBe("visible");
        });
    });
});

describe("a bound value with no glyph", () => {
    it("sits flush in its field, with no empty slot before it", async () => {
        await renderThemed(<VariablePill name="donations" width={120} onClick={() => undefined} />);
        const pill = screen.getByRole("button", { name: "donations" });
        const field = pill.closest(".cm-var-field") as HTMLElement;
        const gap = pill.getBoundingClientRect().left - field.getBoundingClientRect().left;
        expect(gap).toBeLessThanOrEqual(3);
    });
});
