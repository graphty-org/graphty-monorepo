import { describe, expect, it, vi } from "vitest";

import { render, screen } from "../../test/test-utils";
import { ViewDataModal } from "../data-view/ViewDataModal";
import { LoadDataModal } from "../LoadDataModal";
import { RunLayoutsModal } from "../RunLayoutsModal";

describe("Modal styling consistency", () => {
    describe("RunLayoutsModal", () => {
        it("uses standard modal styles with semantic variables", () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);
            const modal = screen.getByRole("dialog");
            expect(modal).toBeInTheDocument();

            // Check that no dark-X patterns are in inline styles
            const allElements = modal.querySelectorAll("*");
            allElements.forEach((el) => {
                const style = el.getAttribute("style") ?? "";
                expect(style).not.toMatch(/--mantine-color-dark-[0-9]/);
            });
        });
    });

    describe("ViewDataModal", () => {
        it("uses standard modal styles with semantic variables", () => {
            render(<ViewDataModal opened={true} onClose={vi.fn()} data={{ nodes: [], edges: [] }} />);
            const modal = screen.getByRole("dialog");
            expect(modal).toBeInTheDocument();

            // Check that no dark-X patterns are in inline styles
            const allElements = modal.querySelectorAll("*");
            allElements.forEach((el) => {
                const style = el.getAttribute("style") ?? "";
                expect(style).not.toMatch(/--mantine-color-dark-[0-9]/);
            });
        });
    });

    describe("LoadDataModal", () => {
        it("uses standard modal styles with semantic variables", () => {
            render(<LoadDataModal opened={true} onClose={vi.fn()} onLoad={vi.fn()} />);
            const modal = screen.getByRole("dialog");
            expect(modal).toBeInTheDocument();

            // Check that no dark-X patterns are in inline styles
            const allElements = modal.querySelectorAll("*");
            allElements.forEach((el) => {
                const style = el.getAttribute("style") ?? "";
                expect(style).not.toMatch(/--mantine-color-dark-[0-9]/);
            });
        });
    });
});
