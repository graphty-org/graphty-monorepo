/**
 * A StyleSelect laid out as a grid of glyphs, driven by the real keyboard in a real browser: the
 * arrows move in two dimensions, Enter picks, letters type ahead, and each cell is named by its
 * option's name.
 */
import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { StyleSelect } from "../../src";
import { renderThemed, resetHarness } from "../harness/measure";

/** 25 names, each starting with its own letter, so type-ahead has one answer per letter. */
const NAMES = [
    "Box",
    "Sphere",
    "Cylinder",
    "Cone",
    "Capsule",
    "Torus",
    "Knot",
    "Tetrahedron",
    "Octahedron",
    "Dodecahedron",
    "Icosahedron",
    "Rhombicuboctahedron",
    "Triangular prism",
    "Pentagonal prism",
    "Hexagonal prism",
    "Square pyramid",
    "Pentagonal pyramid",
    "Triangular dipyramid",
    "Pentagonal dipyramid",
    "Elongated square dipyramid",
    "Elongated pentagonal dipyramid",
    "Elongated pentagonal cupola",
    "Goldberg",
    "Geodesic",
    "Mesh",
];

const OPTIONS = NAMES.map((name, i) => ({
    value: `shape-${String(i)}`,
    label: name,
    glyph: (
        <svg viewBox="0 0 24 24" data-testid={`glyph-${String(i)}`}>
            <circle cx="12" cy="12" r="8" fill="currentColor" />
        </svg>
    ),
}));

/**
 * The name of the option the list's highlight is on.
 * @returns the highlighted option's accessible text
 */
function highlighted(): string {
    const combobox = screen.getByRole("combobox", { name: "Shape" });
    const id = combobox.getAttribute("aria-activedescendant");
    return id === null ? "" : (document.getElementById(id)?.textContent ?? "");
}

afterEach(resetHarness);

describe("StyleSelect grid", () => {
    it("moves in two dimensions with the arrow keys and picks with Enter", async () => {
        const onChange = vi.fn();
        await renderThemed(
            <StyleSelect
                label="Shape"
                defaultValue="shape-0"
                options={OPTIONS}
                layout="grid"
                columns={5}
                onChange={onChange}
            />,
        );
        await userEvent.tab();
        await userEvent.keyboard("{ArrowDown}");
        await waitFor(() => {
            expect(highlighted()).toBe("Box");
        });

        await userEvent.keyboard("{ArrowRight}");
        expect(highlighted()).toBe("Sphere");
        await userEvent.keyboard("{ArrowDown}");
        expect(highlighted()).toBe("Knot");
        await userEvent.keyboard("{ArrowDown}");
        expect(highlighted()).toBe("Rhombicuboctahedron");
        await userEvent.keyboard("{ArrowLeft}");
        expect(highlighted()).toBe("Icosahedron");
        // The first column's left edge holds.
        await userEvent.keyboard("{ArrowLeft}");
        expect(highlighted()).toBe("Icosahedron");
        await userEvent.keyboard("{ArrowUp}");
        expect(highlighted()).toBe("Torus");

        await userEvent.keyboard("{Enter}");
        expect(onChange).toHaveBeenCalledWith("shape-5");
    });

    it("lays the cells out in rows of the given columns", async () => {
        await renderThemed(
            <StyleSelect label="Shape" defaultValue="shape-0" options={OPTIONS} layout="grid" columns={5} />,
        );
        await userEvent.click(screen.getByRole("combobox", { name: "Shape" }));
        const cells = await screen.findAllByRole("option");
        expect(cells).toHaveLength(25);
        const first = cells[0].getBoundingClientRect();
        const second = cells[1].getBoundingClientRect();
        const below = cells[5].getBoundingClientRect();
        expect(second.top).toBeCloseTo(first.top, 0);
        expect(second.left).toBeGreaterThan(first.left);
        expect(below.left).toBeCloseTo(first.left, 0);
        expect(below.top).toBeGreaterThan(first.top);
    });

    it("names each cell by its option's name", async () => {
        await renderThemed(<StyleSelect label="Shape" defaultValue="shape-0" options={OPTIONS} layout="grid" />);
        await userEvent.click(screen.getByRole("combobox", { name: "Shape" }));
        for (const name of NAMES) {
            expect(await screen.findByRole("option", { name })).toBeInTheDocument();
        }
    });

    it("types ahead to the cell whose name starts with the letters typed", async () => {
        const onChange = vi.fn();
        await renderThemed(
            <StyleSelect label="Shape" defaultValue="shape-0" options={OPTIONS} layout="grid" onChange={onChange} />,
        );
        await userEvent.tab();
        await userEvent.keyboard("{ArrowDown}");
        await waitFor(() => {
            expect(highlighted()).toBe("Box");
        });
        await userEvent.keyboard("g");
        expect(highlighted()).toBe("Goldberg");
        await userEvent.keyboard("{Enter}");
        expect(onChange).toHaveBeenCalledWith("shape-22");
    });

    it("shows every name whole in a 240px panel, with the name as each cell's tooltip", async () => {
        await renderThemed(
            <div style={{ width: 240 }}>
                <StyleSelect label="Shape" defaultValue="shape-0" options={OPTIONS} layout="grid" columns={4} />
            </div>,
        );
        await userEvent.click(screen.getByRole("combobox", { name: "Shape" }));
        const cells = await screen.findAllByRole("option");
        expect(cells).toHaveLength(NAMES.length);
        cells.forEach((cell, i) => {
            const label = cell.querySelector<HTMLElement>(".cm-listbox-label");
            expect(label?.textContent).toBe(NAMES[i]);
            expect(label?.scrollWidth).toBeLessThanOrEqual(label?.clientWidth ?? 0);
            expect(label?.scrollHeight).toBeLessThanOrEqual(label?.clientHeight ?? 0);
            expect(cell.querySelector(`[title="${NAMES[i]}"]`)).not.toBeNull();
        });
    });

    it("never announces an option selected while nothing is chosen, and marks what lies beneath", async () => {
        await renderThemed(
            <StyleSelect
                label="Shape"
                defaultValue=""
                placeholder="Sphere"
                options={OPTIONS}
                layout="grid"
                columns={5}
            />,
        );
        await userEvent.tab();
        await userEvent.keyboard("{ArrowDown}");
        await waitFor(() => {
            expect(highlighted()).toBe("Box");
        });
        await userEvent.keyboard("{ArrowRight}{ArrowDown}");
        expect(highlighted()).toBe("Knot");
        const options = screen.getAllByRole("option", { hidden: true });
        expect(options.filter((option) => option.getAttribute("aria-selected") === "true")).toEqual([]);
        expect(screen.getByRole("option", { name: "Sphere" }).querySelector("[data-inherited]")).not.toBeNull();
    });

    it("keeps the chosen option selected while the highlight moves elsewhere", async () => {
        await renderThemed(
            <StyleSelect label="Shape" value="shape-1" defaultValue="" options={OPTIONS} layout="grid" columns={5} />,
        );
        await userEvent.tab();
        await userEvent.keyboard("{ArrowDown}");
        await waitFor(() => {
            expect(highlighted()).toBe("Sphere");
        });
        await userEvent.keyboard("{ArrowDown}");
        expect(highlighted()).toBe("Knot");
        const selected = screen
            .getAllByRole("option", { hidden: true })
            .filter((option) => option.getAttribute("aria-selected") === "true");
        expect(selected.map((option) => option.textContent)).toEqual(["Sphere"]);
    });
});
