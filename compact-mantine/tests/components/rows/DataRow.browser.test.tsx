/**
 * DataRow's accessible names, read where they come from.
 *
 * A row's name and value, and a header's label and unit, are separate spans inside a flex
 * button. A browser blockifies flex items, and the accessible-name computation puts a space
 * between block-level children, so the name reads "Most connected links". That depends on
 * computed layout, which JSDOM does not do: it reports the spans as inline and joins the text
 * with no space. So these assertions run in a real browser.
 */
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataRow, DataRowHeader } from "../../../src/components/rows/DataRow";
import { renderCompact as renderRow } from "../../harness/render";

describe("DataRow", () => {
    it("keeps the whole string as its accessible name, ellipsis or not", () => {
        renderRow(<DataRow name="Mrs_Henderson_from_the_house_on_the_corner" value="4" onClick={vi.fn()} />);

        // The ellipsis is a drawing: the element's text is still the whole
        // string, so a title is a convenience for a pointer rather than the
        // only way to the full name.
        expect(
            screen.getByRole("button", { name: "Mrs_Henderson_from_the_house_on_the_corner 4" }),
        ).toBeInTheDocument();
    });
});

describe("DataRowHeader", () => {
    it("becomes a button named by the column it heads", () => {
        renderRow(<DataRowHeader label="Most connected" unit="links" onSortChange={vi.fn()} />);

        const button = screen.getByRole("button", { name: "Most connected links" });
        expect(button.tagName).toBe("BUTTON");
        expect(button).toHaveAttribute("type", "button");
    });
});
