import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

describe("probe", () => {
    it("logical props", () => {
        render(<div data-testid="p" style={{ paddingInline: 8, paddingBlock: 0, marginInlineStart: 2 }} />);
        const el = screen.getByTestId("p");
        console.log("style attr:", el.getAttribute("style"));
        console.log("computed padding-inline:", getComputedStyle(el).getPropertyValue("padding-inline"));
        console.log("computed padding-inline-start:", getComputedStyle(el).getPropertyValue("padding-inline-start"));
        console.log("computed margin-inline-start:", getComputedStyle(el).getPropertyValue("margin-inline-start"));
        expect(el).toHaveStyle({ paddingInline: "8px" });
    });
});
