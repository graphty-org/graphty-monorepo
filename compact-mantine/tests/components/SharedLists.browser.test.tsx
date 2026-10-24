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

/**
 * A computed color's channels.
 * @param color - an rgb() or rgba() string
 * @returns red, green, blue (0-255) and alpha (0-1)
 */
function channels(color: string): [number, number, number, number] {
    const [r, g, b, a = 1] = (color.match(/[\d.]+/g) ?? []).map(Number);
    return [r, g, b, a];
}

/**
 * WCAG contrast between a translucent ink and the opaque ground it is drawn on.
 * @param ink - the ink's computed color
 * @param ground - the ground's computed color
 * @returns the contrast ratio
 */
function contrast(ink: string, ground: string): number {
    const [r, g, b, a] = channels(ink);
    const base = channels(ground);
    const over = [r, g, b].map((c, i) => c * a + base[i] * (1 - a));
    const luminance = (rgb: number[]): number => {
        const [lr, lg, lb] = rgb.map((c) => {
            const s = c / 255;
            return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
    };
    const [hi, lo] = [luminance(over), luminance(base)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

/**
 * The first opaque background at or above an element (the page's white when none is).
 * @param element - where to start
 * @returns the computed background color
 */
function groundOf(element: Element): string {
    for (let at: Element | null = element; at !== null; at = at.parentElement) {
        const color = getComputedStyle(at).backgroundColor;
        if (channels(color)[3] === 1) {
            return color;
        }
    }
    return "rgb(255, 255, 255)";
}

afterEach(resetHarness);

describe("a list closes when focus leaves it", () => {
    it("Tab from an open list closes it, and focus is on the next control", async () => {
        await renderThemed(
            <div>
                {shapeField}
                <Button>Next</Button>
            </div>,
        );
        await userEvent.click(screen.getByRole("combobox", { name: /^Shape/ }));
        await screen.findByRole("listbox");
        await userEvent.tab();
        expect(document.activeElement).toBe(screen.getByRole("button", { name: "Next" }));
        await waitFor(() => {
            expect(screen.queryByRole("listbox")).toBeNull();
        });
    });

    it("Shift+Tab from an open list closes it too", async () => {
        await renderThemed(
            <div>
                <Button>Before</Button>
                {shapeField}
            </div>,
        );
        await userEvent.click(screen.getByRole("combobox", { name: /^Shape/ }));
        await screen.findByRole("listbox");
        await userEvent.tab({ shift: true });
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
        await userEvent.tab();
        await userEvent.tab({ shift: true });
        await userEvent.keyboard("{ArrowDown}");
        await screen.findByRole("listbox");
        await waitFor(() => {
            expect(announced()).toBe("Box");
        });
        expect(filled()).toEqual(["Box"]);
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
    it.each(["light", "dark"] as const)("is drawn at rest, at 3:1 against its row (%s)", async (scheme) => {
        await renderThemed(
            <Tree
                items={[
                    { id: "folder", name: "Louvain", children: [{ id: "g1", name: "Group 1" }] },
                    { id: "leaf", name: "Everything" },
                ]}
            />,
            { scheme },
        );
        const caret = within(screen.getByRole("treeitem", { name: "Louvain" })).getByTestId("tree-caret");
        expect(getComputedStyle(caret).visibility).toBe("visible");
        expect(caret.querySelector("svg")).not.toBeNull();
        expect(contrast(getComputedStyle(caret).color, groundOf(caret))).toBeGreaterThanOrEqual(3);
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
