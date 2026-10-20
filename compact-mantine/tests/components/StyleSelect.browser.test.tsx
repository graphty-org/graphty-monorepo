/**
 * A StyleSelect laid out as a grid of glyphs, driven by the real keyboard in a real browser: the
 * arrows move in two dimensions, Enter picks, letters type ahead (and open a closed list), and each
 * cell is named by its option's name.
 */
import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { commands, userEvent } from "vitest/browser";

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
    const combobox = screen.getByRole("combobox", { name: /^Shape/ });
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
        await userEvent.click(screen.getByRole("combobox", { name: /^Shape/ }));
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
        await userEvent.click(screen.getByRole("combobox", { name: /^Shape/ }));
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

    it("highlights nothing and writes nothing when no name starts with the letters typed", async () => {
        const onChange = vi.fn();
        await renderThemed(
            <StyleSelect label="Shape" defaultValue="shape-1" options={OPTIONS} layout="grid" onChange={onChange} />,
        );
        await userEvent.tab();
        await userEvent.keyboard("{ArrowDown}");
        await waitFor(() => {
            expect(highlighted()).toBe("Sphere");
        });
        // "c" alone would land on Cylinder; no name starts with "cube".
        await userEvent.keyboard("cube");
        expect(highlighted()).toBe("");
        expect(document.querySelector("[data-combobox-selected]")).toBeNull();
        expect(document.querySelector(".cm-listbox-typed")?.textContent).toBe('No option starts with "cube"');
        await waitFor(() => {
            expect(document.querySelector('.cm-listbox [role="status"]')?.textContent).toBe(
                'No option starts with "cube"',
            );
        });
        await userEvent.keyboard("{Enter}");
        expect(onChange).not.toHaveBeenCalled();
    });

    it("shows the letters typed while the highlight follows them, and Enter picks the match", async () => {
        const onChange = vi.fn();
        await renderThemed(
            <StyleSelect label="Shape" defaultValue="shape-1" options={OPTIONS} layout="grid" onChange={onChange} />,
        );
        await userEvent.tab();
        await userEvent.keyboard("{ArrowDown}");
        await waitFor(() => {
            expect(highlighted()).toBe("Sphere");
        });
        await userEvent.keyboard("box");
        expect(highlighted()).toBe("Box");
        const line = document.querySelector<HTMLElement>(".cm-listbox-typed");
        expect(line?.textContent).toBe("box");
        expect(line?.checkVisibility()).toBe(true);
        await userEvent.keyboard("{Enter}");
        expect(onChange).toHaveBeenCalledWith("shape-0");
    });

    it("opens on a letter typed while closed and types ahead from the value in force", async () => {
        const onChange = vi.fn();
        await renderThemed(
            <StyleSelect label="Shape" defaultValue="shape-0" options={OPTIONS} layout="grid" onChange={onChange} />,
        );
        await userEvent.tab();
        await userEvent.keyboard("pent");
        await waitFor(() => {
            expect(screen.getByRole("combobox", { name: /^Shape/ })).toHaveAttribute("aria-expanded", "true");
            expect(highlighted()).toBe("Pentagonal prism");
        });
        await userEvent.keyboard("{Enter}");
        expect(onChange).toHaveBeenCalledWith("shape-13");
    });

    it("opens with no cell filled for a pointer that has not moved, until it moves", async () => {
        await renderThemed(
            <StyleSelect label="Shape" defaultValue="shape-24" options={OPTIONS} layout="grid" columns={4} />,
        );
        await userEvent.click(screen.getByRole("combobox", { name: /^Shape/ }));
        const list = await screen.findByRole("listbox");
        // The pointer rests where it clicked; a cell drawn under it is not hovered.
        expect(list.closest(".cm-listbox")).toHaveClass("cm-pointer-still");
        const cell = screen.getByRole("option", { name: "Sphere" });
        await userEvent.hover(cell);
        await waitFor(() => {
            expect(list.closest(".cm-listbox")).not.toHaveClass("cm-pointer-still");
        });
    });

    it("picks the cell clicked right after it opens, with no wait for a move", async () => {
        const onChange = vi.fn();
        await renderThemed(
            <StyleSelect label="Shape" defaultValue="shape-24" options={OPTIONS} layout="grid" onChange={onChange} />,
        );
        await userEvent.click(screen.getByRole("combobox", { name: /^Shape/ }));
        await userEvent.click(await screen.findByRole("option", { name: "Box" }));
        expect(onChange).toHaveBeenCalledWith("shape-0");
    });

    it("opens below its field, so the field and what is above it stay in sight", async () => {
        await renderThemed(
            <div style={{ paddingTop: 200 }}>
                <StyleSelect label="Shape" defaultValue="shape-24" options={OPTIONS} layout="grid" columns={4} />
            </div>,
        );
        const field = screen.getByRole("combobox", { name: /^Shape/ });
        await userEvent.click(field);
        const list = (await screen.findByRole("listbox")).closest(".cm-listbox");
        await waitFor(() => {
            const fieldBox = field.closest(".cm-input-wrapper")?.getBoundingClientRect();
            expect(list?.getBoundingClientRect().top).toBeGreaterThanOrEqual(fieldBox?.bottom ?? Infinity);
        });
    });

    it("shows every name whole in a 240px panel, with the name as each cell's tooltip", async () => {
        await renderThemed(
            <div style={{ width: 240 }}>
                <StyleSelect label="Shape" defaultValue="shape-0" options={OPTIONS} layout="grid" columns={4} />
            </div>,
        );
        await userEvent.click(screen.getByRole("combobox", { name: /^Shape/ }));
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

    it("never announces or checks an option while nothing is chosen", async () => {
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
        expect(document.querySelector(".cm-listbox [data-checked]")).toBeNull();
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

    it("reads as fixed while it cannot change: no caret, and its reason as its description", async () => {
        await renderThemed(
            <StyleSelect
                label="Role"
                defaultValue="shape-0"
                options={OPTIONS}
                disabled
                disabledReason="Set by the file."
            />,
        );
        const field = screen.getByRole("combobox", { name: /^Role/ });
        const caret = field.closest(".cm-input-wrapper")?.querySelector(".cm-field-caret");
        expect(caret).not.toBeNull();
        expect(getComputedStyle(caret as Element).visibility).toBe("hidden");
        expect(field).toHaveAccessibleDescription(/Set by the file/);
    });

    // Last in the file: once a touch is dispatched Chromium answers (hover: none) for the run.
    it("picks the cell a touch taps, with no pointer move before it", async () => {
        const onChange = vi.fn();
        await renderThemed(
            <StyleSelect label="Shape" defaultValue="shape-24" options={OPTIONS} layout="grid" onChange={onChange} />,
        );
        await userEvent.click(screen.getByRole("combobox", { name: /^Shape/ }));
        await screen.findByRole("option", { name: "Box" });
        await commands.touchTap('role=option[name="Box"]');
        await waitFor(() => {
            expect(onChange).toHaveBeenCalledWith("shape-0");
        });
    });
});
